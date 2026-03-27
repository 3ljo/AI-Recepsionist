import supabase from "../src/supabase.js";
import { validateToolParams } from "../src/middleware/validate.js";
import logger from "../src/logger.js";
import { auditLog } from "../src/audit.js";
import { recordToolExecution, recordBusinessEvent } from "../src/metrics.js";

// ============================================================
// TOOL HANDLERS — execute the actual database operations
// Each function matches a tool name from definitions.js
// All Supabase calls wrapped with try/catch and timeout
// ============================================================

const DB_TIMEOUT_MS = 10000;
const DB_DOWN_MESSAGE =
  "I'm unable to check our system right now. Can I take your number and call you back?";

async function withTimeout(promise, ms = DB_TIMEOUT_MS) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Database operation timed out")), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Check room availability for given dates
 */
async function check_availability(params, businessId) {
  const { check_in, check_out, guest_count = 1 } = params;

  try {
    const { data, error } = await withTimeout(
      supabase.rpc("check_availability", {
        p_business_id: businessId,
        p_check_in: check_in,
        p_check_out: check_out || null,
        p_guest_count: guest_count,
      })
    );

    if (error) {
      logger.error("check_availability error", { error: error.message });
      return { error: "Failed to check availability. Please try again." };
    }

    if (!data || data.length === 0) {
      return {
        available: false,
        message: `No rooms available for ${check_in}${check_out ? ` to ${check_out}` : ""}`,
      };
    }

    return {
      available: true,
      rooms: data.map((r) => ({
        resource_id: r.resource_id,
        name: r.resource_name,
        type: r.resource_type,
        description: r.description,
        capacity: r.capacity,
        price: `${r.price_per_unit} per ${r.price_unit}`,
      })),
    };
  } catch (err) {
    logger.error("check_availability exception", { error: err.message });
    return { error: DB_DOWN_MESSAGE };
  }
}

/**
 * Find next available date when requested dates are full
 */
async function find_next_available(params, businessId) {
  const { from_date, guest_count = 1 } = params;

  try {
    const { data, error } = await withTimeout(
      supabase.rpc("find_next_available", {
        p_business_id: businessId,
        p_from_date: from_date,
        p_guest_count: guest_count,
        p_max_search_days: 30,
      })
    );

    if (error) {
      logger.error("find_next_available error", { error: error.message });
      return { error: "Failed to search for available dates." };
    }

    if (!data || data.length === 0) {
      return {
        found: false,
        message: "Unfortunately, no availability found in the next 30 days.",
      };
    }

    return {
      found: true,
      next_date: data[0].available_date,
      options: data.map((r) => ({
        resource_id: r.resource_id,
        name: r.resource_name,
        price: r.price_per_unit,
        date: r.available_date,
      })),
    };
  } catch (err) {
    logger.error("find_next_available exception", { error: err.message });
    return { error: DB_DOWN_MESSAGE };
  }
}

/**
 * Create a confirmed booking
 */
async function book_room(params, businessId) {
  const {
    resource_id,
    check_in,
    check_out,
    guest_name,
    guest_phone,
    guest_count = 1,
    notes,
  } = params;

  try {
    // Double-check availability before booking (prevents race conditions)
    const avail = await check_availability(
      { check_in, check_out, guest_count },
      businessId
    );

    if (!avail.available) {
      return {
        success: false,
        message: "Sorry, that room just became unavailable. Let me find another option.",
      };
    }

    const roomStillOpen = avail.rooms?.find((r) => r.resource_id === resource_id);
    if (!roomStillOpen) {
      return {
        success: false,
        message: "That specific room was just taken. Let me suggest an alternative.",
        alternatives: avail.rooms,
      };
    }

    const { data: resource } = await withTimeout(
      supabase
        .from("resources")
        .select("price_per_unit")
        .eq("id", resource_id)
        .single()
    );

    const nights = Math.ceil(
      (new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = resource ? resource.price_per_unit * nights : null;

    const { data, error } = await withTimeout(
      supabase
        .from("bookings")
        .insert({
          business_id: businessId,
          resource_id,
          check_in,
          check_out,
          guest_name,
          guest_phone: guest_phone || null,
          guest_count,
          notes: notes || null,
          total_price: totalPrice,
          status: "confirmed",
          booked_via: "ai_phone",
        })
        .select()
        .single()
    );

    if (error) {
      logger.error("book_room error", { error: error.message });
      return { success: false, message: "Booking failed. Please try again." };
    }

    // Audit log
    await auditLog("booking_created", {
      businessId,
      bookingId: data.id,
      guestName: guest_name,
      room: roomStillOpen.name,
      checkIn: check_in,
      checkOut: check_out,
    });

    recordBusinessEvent(businessId, "booking");

    return {
      success: true,
      booking_id: data.id,
      confirmation: {
        guest_name,
        room: roomStillOpen.name,
        check_in,
        check_out,
        nights,
        total_price: totalPrice,
        status: "confirmed",
      },
    };
  } catch (err) {
    logger.error("book_room exception", { error: err.message });
    return { error: DB_DOWN_MESSAGE };
  }
}

/**
 * Cancel an existing booking by guest name or phone
 */
async function cancel_booking(params, businessId) {
  const { guest_name, guest_phone } = params;

  try {
    let query = supabase
      .from("bookings")
      .select("*, resources(name)")
      .eq("business_id", businessId)
      .eq("status", "confirmed");

    if (guest_name) {
      query = query.ilike("guest_name", `%${guest_name}%`);
    }
    if (guest_phone) {
      query = query.eq("guest_phone", guest_phone);
    }

    const { data: bookings, error } = await withTimeout(query);

    if (error) {
      logger.error("cancel_booking search error", { error: error.message });
      return { success: false, message: "Failed to search for booking." };
    }

    if (!bookings || bookings.length === 0) {
      return {
        success: false,
        message: "No active booking found with that name or phone number.",
      };
    }

    if (bookings.length > 1) {
      return {
        success: false,
        multiple_found: true,
        bookings: bookings.map((b) => ({
          id: b.id,
          room: b.resources?.name,
          check_in: b.check_in,
          check_out: b.check_out,
          guest_name: b.guest_name,
        })),
        message: "Multiple bookings found. Please ask which one to cancel.",
      };
    }

    const booking = bookings[0];
    const { error: updateError } = await withTimeout(
      supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id)
    );

    if (updateError) {
      logger.error("cancel_booking update error", { error: updateError.message });
      return { success: false, message: "Failed to cancel the booking." };
    }

    await auditLog("booking_cancelled", {
      businessId,
      bookingId: booking.id,
      guestName: booking.guest_name,
      room: booking.resources?.name,
    });

    recordBusinessEvent(businessId, "cancellation");

    return {
      success: true,
      cancelled: {
        booking_id: booking.id,
        guest_name: booking.guest_name,
        room: booking.resources?.name,
        check_in: booking.check_in,
        check_out: booking.check_out,
      },
    };
  } catch (err) {
    logger.error("cancel_booking exception", { error: err.message });
    return { error: DB_DOWN_MESSAGE };
  }
}

/**
 * Modify an existing booking — change dates or room
 */
async function modify_booking(params, businessId) {
  const { guest_name, guest_phone, new_check_in, new_check_out, new_resource_id } = params;

  try {
    // Find the existing booking
    let query = supabase
      .from("bookings")
      .select("*, resources(name)")
      .eq("business_id", businessId)
      .eq("status", "confirmed");

    if (guest_name) query = query.ilike("guest_name", `%${guest_name}%`);
    if (guest_phone) query = query.eq("guest_phone", guest_phone);

    const { data: bookings, error } = await withTimeout(query);

    if (error || !bookings || bookings.length === 0) {
      return {
        success: false,
        message: "No active booking found with that name or phone number.",
      };
    }

    if (bookings.length > 1) {
      return {
        success: false,
        multiple_found: true,
        bookings: bookings.map((b) => ({
          id: b.id,
          room: b.resources?.name,
          check_in: b.check_in,
          check_out: b.check_out,
          guest_name: b.guest_name,
        })),
        message: "Multiple bookings found. Please ask which one to modify.",
      };
    }

    const booking = bookings[0];
    const checkIn = new_check_in || booking.check_in;
    const checkOut = new_check_out || booking.check_out;
    const resourceId = new_resource_id || booking.resource_id;

    // Check availability for new dates/room
    const avail = await check_availability(
      { check_in: checkIn, check_out: checkOut, guest_count: booking.guest_count },
      businessId
    );

    if (!avail.available) {
      return {
        success: false,
        message: "The new dates aren't available. Would you like me to check other options?",
      };
    }

    const roomAvailable = avail.rooms?.find((r) => r.resource_id === resourceId);
    if (!roomAvailable) {
      return {
        success: false,
        message: "That room isn't available for the new dates.",
        alternatives: avail.rooms,
      };
    }

    // Get price for recalculation
    const { data: resource } = await withTimeout(
      supabase
        .from("resources")
        .select("price_per_unit")
        .eq("id", resourceId)
        .single()
    );

    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = resource ? resource.price_per_unit * nights : null;

    const { error: updateError } = await withTimeout(
      supabase
        .from("bookings")
        .update({
          resource_id: resourceId,
          check_in: checkIn,
          check_out: checkOut,
          total_price: totalPrice,
        })
        .eq("id", booking.id)
    );

    if (updateError) {
      logger.error("modify_booking update error", { error: updateError.message });
      return { success: false, message: "Failed to modify the booking." };
    }

    await auditLog("booking_modified", {
      businessId,
      bookingId: booking.id,
      guestName: booking.guest_name,
      oldDates: `${booking.check_in} to ${booking.check_out}`,
      newDates: `${checkIn} to ${checkOut}`,
    });

    return {
      success: true,
      modified: {
        booking_id: booking.id,
        guest_name: booking.guest_name,
        room: roomAvailable.name,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        total_price: totalPrice,
      },
    };
  } catch (err) {
    logger.error("modify_booking exception", { error: err.message });
    return { error: DB_DOWN_MESSAGE };
  }
}

/**
 * Get business information to answer guest questions
 */
async function get_business_info(params, businessId) {
  const { question_type } = params;

  try {
    const { data, error } = await withTimeout(
      supabase
        .from("business_info")
        .select("content")
        .eq("business_id", businessId)
        .eq("info_type", question_type)
        .single()
    );

    if (error || !data) {
      return {
        info: "I don't have that information on hand, but I can connect you with someone who does.",
      };
    }

    return { info: data.content };
  } catch (err) {
    logger.error("get_business_info exception", { error: err.message });
    return {
      info: "I'm having trouble looking that up. Let me connect you with our team.",
    };
  }
}

/**
 * Transfer call to a human staff member
 */
async function transfer_to_human(params, businessId) {
  const { reason, priority = "normal" } = params;

  await auditLog("call_transferred", {
    businessId,
    reason,
    priority,
  });

  logger.info("Transfer to human requested", {
    businessId,
    reason,
    priority,
  });

  return {
    success: true,
    message: "Transferring you now. One moment please.",
    transfer_initiated: true,
    priority,
  };
}

/**
 * Send booking confirmation via SMS
 */
async function send_confirmation(params, businessId) {
  const { booking_id, phone_number } = params;

  try {
    // Fetch booking details
    const { data: booking, error } = await withTimeout(
      supabase
        .from("bookings")
        .select("*, resources(name)")
        .eq("id", booking_id)
        .eq("business_id", businessId)
        .single()
    );

    if (error || !booking) {
      return {
        success: false,
        message: "Couldn't find that booking to send confirmation.",
      };
    }

    // Insert into pending_notifications for later processing
    await withTimeout(
      supabase.from("pending_notifications").insert({
        business_id: businessId,
        type: "sms_confirmation",
        recipient: phone_number,
        payload: {
          guest_name: booking.guest_name,
          room: booking.resources?.name,
          check_in: booking.check_in,
          check_out: booking.check_out,
          total_price: booking.total_price,
        },
        status: "pending",
        created_at: new Date().toISOString(),
      })
    );

    logger.info("Confirmation SMS queued", {
      bookingId: booking_id,
      phone: phone_number,
    });

    return {
      success: true,
      message: "Confirmation text will be sent shortly.",
    };
  } catch (err) {
    logger.error("send_confirmation exception", { error: err.message });
    return {
      success: false,
      message: "I wasn't able to send the text right now, but your booking is confirmed.",
    };
  }
}

// ============================================================
// ROUTER — maps tool names to handler functions
// ============================================================
const toolHandlers = {
  check_availability,
  find_next_available,
  book_room,
  cancel_booking,
  modify_booking,
  get_business_info,
  transfer_to_human,
  send_confirmation,
};

export async function executeTool(toolName, params, businessId) {
  const handler = toolHandlers[toolName];
  if (!handler) {
    return { error: `Unknown tool: ${toolName}` };
  }

  // Validate tool parameters
  const validationErrors = validateToolParams(toolName, params);
  if (validationErrors) {
    logger.warn("Tool validation failed", { toolName, errors: validationErrors });
    return { error: `Invalid parameters: ${validationErrors.join(", ")}` };
  }

  logger.info("Executing tool", { toolName, params });

  const start = Date.now();
  const result = await handler(params, businessId);
  const duration = Date.now() - start;

  logger.info("Tool result", { toolName, duration_ms: duration });
  recordToolExecution(toolName, duration, !!result.error);

  return result;
}

export default toolHandlers;
