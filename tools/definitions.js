// ============================================================
// TOOL DEFINITIONS — what Claude can do during a call
// These get sent to Claude so it knows what actions are available
// ============================================================

const tools = [
  {
    name: "check_availability",
    description:
      "Check if rooms/resources are available for specific dates. Use this when a caller asks about availability or wants to book. Returns available rooms with prices, or empty if fully booked.",
    input_schema: {
      type: "object",
      properties: {
        check_in: {
          type: "string",
          description: "Check-in date in YYYY-MM-DD format",
        },
        check_out: {
          type: "string",
          description:
            "Check-out date in YYYY-MM-DD format. Optional — defaults to check_in + 1 day",
        },
        guest_count: {
          type: "integer",
          description: "Number of guests. Defaults to 1",
          default: 1,
        },
      },
      required: ["check_in"],
    },
  },

  {
    name: "find_next_available",
    description:
      "When the requested dates are not available, find the NEXT available date. Use this to suggest alternative dates to the caller. Searches up to 30 days ahead.",
    input_schema: {
      type: "object",
      properties: {
        from_date: {
          type: "string",
          description:
            "Start searching from this date (YYYY-MM-DD). Usually the date the caller originally wanted.",
        },
        guest_count: {
          type: "integer",
          description: "Number of guests. Defaults to 1",
          default: 1,
        },
      },
      required: ["from_date"],
    },
  },

  {
    name: "book_room",
    description:
      "Confirm and create a booking. Only use this AFTER: 1) checking availability, 2) the caller has confirmed they want to book, 3) you have their name. Always confirm details with the caller before booking.",
    input_schema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "UUID of the room/resource to book (from check_availability results)",
        },
        check_in: {
          type: "string",
          description: "Check-in date YYYY-MM-DD",
        },
        check_out: {
          type: "string",
          description: "Check-out date YYYY-MM-DD",
        },
        guest_name: {
          type: "string",
          description: "Full name of the guest",
        },
        guest_phone: {
          type: "string",
          description: "Guest phone number (often the caller's number)",
        },
        guest_count: {
          type: "integer",
          description: "Number of guests",
          default: 1,
        },
        notes: {
          type: "string",
          description: "Any special requests or notes from the caller",
        },
      },
      required: ["resource_id", "check_in", "check_out", "guest_name"],
    },
  },

  {
    name: "cancel_booking",
    description:
      "Cancel an existing booking. Use when a caller wants to cancel their reservation. Search by guest name or phone to find the booking first.",
    input_schema: {
      type: "object",
      properties: {
        guest_name: {
          type: "string",
          description: "Name of the guest who made the booking",
        },
        guest_phone: {
          type: "string",
          description: "Phone number used for the booking",
        },
      },
      required: [],
    },
  },
];

export default tools;
