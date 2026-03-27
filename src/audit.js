import supabase from "./supabase.js";
import logger from "./logger.js";

// ============================================================
// AUDIT LOG — tracks all state-changing actions
// ============================================================

export async function auditLog(action, details = {}) {
  try {
    const entry = {
      business_id: details.businessId || null,
      call_id: details.callId || null,
      action,
      details: {
        ...details,
        // Remove redundant fields from details JSONB
        businessId: undefined,
        callId: undefined,
      },
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("audit_log").insert(entry);

    if (error) {
      logger.warn("Failed to write audit log", { action, error: error.message });
    }
  } catch (err) {
    // Audit logging should never break the main flow
    logger.warn("Audit log error", { action, error: err.message });
  }
}
