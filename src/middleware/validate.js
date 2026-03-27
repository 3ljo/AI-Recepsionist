// ============================================================
// INPUT VALIDATION & SANITIZATION MIDDLEWARE
// ============================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Strip control characters (except newlines/tabs), trim whitespace
function sanitizeString(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

function validationError(res, message) {
  return res.status(400).json({ error: message });
}

// ============================================================
// Route-specific validators
// ============================================================

export function validateChat(req, res, next) {
  const { message, call_id, business_id } = req.body;

  if (!message || typeof message !== "string") {
    return validationError(res, "message is required and must be a string");
  }

  const sanitized = sanitizeString(message);
  if (sanitized.length === 0) {
    return validationError(res, "message cannot be empty");
  }
  if (sanitized.length > 2000) {
    return validationError(res, "message must be 2000 characters or fewer");
  }

  if (call_id !== undefined && typeof call_id !== "string") {
    return validationError(res, "call_id must be a string");
  }

  if (business_id !== undefined) {
    if (typeof business_id !== "string" || !UUID_REGEX.test(business_id)) {
      return validationError(res, "business_id must be a valid UUID");
    }
  }

  // Apply sanitized values
  req.body.message = sanitized;
  if (call_id) req.body.call_id = sanitizeString(call_id);

  next();
}

export function validateEndCall(req, res, next) {
  const { call_id, business_id } = req.body;

  if (!call_id || typeof call_id !== "string") {
    return validationError(res, "call_id is required and must be a string");
  }

  if (business_id !== undefined) {
    if (typeof business_id !== "string" || !UUID_REGEX.test(business_id)) {
      return validationError(res, "business_id must be a valid UUID");
    }
  }

  req.body.call_id = sanitizeString(call_id);

  next();
}

// ============================================================
// Tool parameter validation (called from handlers)
// ============================================================

export function validateToolParams(toolName, params) {
  const errors = [];

  switch (toolName) {
    case "check_availability":
      if (!params.check_in || !ISO_DATE_REGEX.test(params.check_in)) {
        errors.push("check_in must be a valid date (YYYY-MM-DD)");
      }
      if (
        params.check_out &&
        !ISO_DATE_REGEX.test(params.check_out)
      ) {
        errors.push("check_out must be a valid date (YYYY-MM-DD)");
      }
      if (params.guest_count !== undefined) {
        const gc = Number(params.guest_count);
        if (!Number.isInteger(gc) || gc < 1 || gc > 20) {
          errors.push("guest_count must be between 1 and 20");
        }
      }
      break;

    case "find_next_available":
      if (!params.from_date || !ISO_DATE_REGEX.test(params.from_date)) {
        errors.push("from_date must be a valid date (YYYY-MM-DD)");
      }
      if (params.guest_count !== undefined) {
        const gc = Number(params.guest_count);
        if (!Number.isInteger(gc) || gc < 1 || gc > 20) {
          errors.push("guest_count must be between 1 and 20");
        }
      }
      break;

    case "book_room":
      if (!params.resource_id || !UUID_REGEX.test(params.resource_id)) {
        errors.push("resource_id must be a valid UUID");
      }
      if (!params.check_in || !ISO_DATE_REGEX.test(params.check_in)) {
        errors.push("check_in must be a valid date (YYYY-MM-DD)");
      }
      if (!params.check_out || !ISO_DATE_REGEX.test(params.check_out)) {
        errors.push("check_out must be a valid date (YYYY-MM-DD)");
      }
      if (!params.guest_name || typeof params.guest_name !== "string") {
        errors.push("guest_name is required");
      }
      if (params.guest_count !== undefined) {
        const gc = Number(params.guest_count);
        if (!Number.isInteger(gc) || gc < 1 || gc > 20) {
          errors.push("guest_count must be between 1 and 20");
        }
      }
      break;

    case "cancel_booking":
      if (!params.guest_name && !params.guest_phone) {
        errors.push("guest_name or guest_phone is required");
      }
      break;

    case "modify_booking":
      if (!params.guest_name && !params.guest_phone) {
        errors.push("guest_name or guest_phone is required to find the booking");
      }
      if (params.new_check_in && !ISO_DATE_REGEX.test(params.new_check_in)) {
        errors.push("new_check_in must be a valid date (YYYY-MM-DD)");
      }
      if (params.new_check_out && !ISO_DATE_REGEX.test(params.new_check_out)) {
        errors.push("new_check_out must be a valid date (YYYY-MM-DD)");
      }
      if (params.new_resource_id && !UUID_REGEX.test(params.new_resource_id)) {
        errors.push("new_resource_id must be a valid UUID");
      }
      break;

    case "get_business_info":
      const validTypes = [
        "amenities", "policies", "directions", "contact",
        "hours", "parking", "dining",
      ];
      if (!params.question_type || !validTypes.includes(params.question_type)) {
        errors.push(`question_type must be one of: ${validTypes.join(", ")}`);
      }
      break;

    case "transfer_to_human":
      if (!params.reason || typeof params.reason !== "string") {
        errors.push("reason is required");
      }
      if (params.priority && !["normal", "urgent"].includes(params.priority)) {
        errors.push("priority must be normal or urgent");
      }
      break;

    case "send_confirmation":
      if (!params.booking_id) {
        errors.push("booking_id is required");
      }
      if (!params.phone_number || typeof params.phone_number !== "string") {
        errors.push("phone_number is required");
      }
      break;
  }

  return errors.length > 0 ? errors : null;
}
