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

  {
    name: "modify_booking",
    description:
      "Modify an existing booking — change dates or room. Finds the booking by guest name or phone, then updates it. Checks availability for new dates before modifying.",
    input_schema: {
      type: "object",
      properties: {
        guest_name: {
          type: "string",
          description: "Name of the guest whose booking to modify",
        },
        guest_phone: {
          type: "string",
          description: "Phone number used for the booking",
        },
        new_check_in: {
          type: "string",
          description: "New check-in date YYYY-MM-DD (optional if only changing room)",
        },
        new_check_out: {
          type: "string",
          description: "New check-out date YYYY-MM-DD (optional if only changing room)",
        },
        new_resource_id: {
          type: "string",
          description: "UUID of the new room (optional if only changing dates)",
        },
      },
      required: [],
    },
  },

  {
    name: "get_business_info",
    description:
      "Get information about the business to answer guest questions about amenities, policies, directions, contact info, hours, parking, dining, etc. Use when the caller asks about the property.",
    input_schema: {
      type: "object",
      properties: {
        question_type: {
          type: "string",
          enum: [
            "amenities",
            "policies",
            "directions",
            "contact",
            "hours",
            "parking",
            "dining",
          ],
          description: "The type of information the caller is asking about",
        },
      },
      required: ["question_type"],
    },
  },

  {
    name: "transfer_to_human",
    description:
      "Transfer the call to a human staff member. Use when the caller explicitly requests a human, when you cannot resolve their issue, or for complaints that need manager attention.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Why the transfer is needed",
        },
        priority: {
          type: "string",
          enum: ["normal", "urgent"],
          description: "Priority level — use urgent for complaints or time-sensitive issues",
        },
      },
      required: ["reason"],
    },
  },

  {
    name: "send_confirmation",
    description:
      "Send a booking confirmation via SMS to the guest's phone number. Use after a successful booking when the caller provides their phone number, or when they ask for a confirmation text.",
    input_schema: {
      type: "object",
      properties: {
        booking_id: {
          type: "string",
          description: "The booking ID to send confirmation for",
        },
        phone_number: {
          type: "string",
          description: "Phone number to send the SMS to",
        },
      },
      required: ["booking_id", "phone_number"],
    },
  },
];

export default tools;
