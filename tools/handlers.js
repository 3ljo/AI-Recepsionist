import supabase from "../src/supabase.js";

// ============================================================
// TOOL HANDLERS — execute the actual database operations
// Each function matches a tool name from definitions.js
// ============================================================

/**
 * Check room availability for given dates
 */
async function check_availability(params, businessId) {
  const { check_in, check_out, guest_count = 1 } = params;

  const { data, error } = await supabase.rpc("check_availability", {
    p_business_id: businessId,
    p_check_in: check_in,
    p_check_out: check_out || null,
    p_guest_count: guest_count,
  });

  if (error) {
    console.error("check_availability error:", error);
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
}

/**
 * Find next available date when requested dates are full
 */
async function find_next_available(params, businessId) {
  const { from_date, guest_count = 1 } = params;

  const { data, error } = await supabase.rpc("find_next_available", {
    p_business_id: businessId,
    p_from_date: from_date,
    p_guest_count: guest_count,
    p_max_search_days: 30,
  });

  if (error) {
    console.error("find_next_available error:", error);
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

  // Verify the specific room is still in the available list
  const roomStillOpen = avail.rooms?.find((r) => r.resource_id === resource_id);
  if (!roomStillOpen) {
    return {
      success: false,
      message: "That specific room was just taken. Let me suggest an alternative.",
      alternatives: avail.rooms,
    };
  }

  // Get price for total calculation
  const { data: resource } = await supabase
    .from("resources")
    .select("price_per_unit")
    .eq("id", resource_id)
    .single();

  const nights = Math.ceil(
    (new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24)
  );
  const totalPrice = resource ? resource.price_per_unit * nights : null;

  // Create the booking
  const { data, error } = await supabase
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
    .single();

  if (error) {
    console.error("book_room error:", error);
    return { success: false, message: "Booking failed. Please try again." };
  }

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
}

/**
 * Cancel an existing booking by guest name or phone
 */
async function cancel_booking(params, businessId) {
  const { guest_name, guest_phone } = params;

  // Find the booking
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

  const { data: bookings, error } = await query;

  if (error) {
    console.error("cancel_booking search error:", error);
    return { success: false, message: "Failed to search for booking." };
  }

  if (!bookings || bookings.length === 0) {
    return {
      success: false,
      message: "No active booking found with that name or phone number.",
    };
  }

  // If multiple bookings found, return them for the caller to choose
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

  // Cancel the single booking
  const booking = bookings[0];
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id);

  if (updateError) {
    console.error("cancel_booking update error:", updateError);
    return { success: false, message: "Failed to cancel the booking." };
  }

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
}

// ============================================================
// ROUTER — maps tool names to handler functions
// ============================================================
const toolHandlers = {
  check_availability,
  find_next_available,
  book_room,
  cancel_booking,
};

export async function executeTool(toolName, params, businessId) {
  const handler = toolHandlers[toolName];
  if (!handler) {
    return { error: `Unknown tool: ${toolName}` };
  }

  console.log(`\n🔧 Executing tool: ${toolName}`);
  console.log(`   Params:`, JSON.stringify(params, null, 2));

  const result = await handler(params, businessId);

  console.log(`   Result:`, JSON.stringify(result, null, 2));
  return result;
}

export default toolHandlers;
