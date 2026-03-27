import supabase from "../supabase.js";
import logger from "../logger.js";

// ============================================================
// MULTI-TENANCY MIDDLEWARE
// Resolves and validates business_id on every request
// ============================================================

// Cache validated business IDs (5 min TTL)
const businessCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function validateBusiness(businessId) {
  const cached = businessCache.get(businessId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.valid;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .single();

  const valid = !error && !!data;
  businessCache.set(businessId, {
    valid,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return valid;
}

export function resolveTenant(req, res, next) {
  const businessId =
    req.body?.business_id || req.query?.business_id;

  if (!businessId) {
    return res.status(400).json({
      error: "business_id is required",
    });
  }

  validateBusiness(businessId)
    .then((valid) => {
      if (!valid) {
        logger.warn("Invalid business_id", { businessId });
        return res.status(400).json({ error: "Invalid business_id" });
      }
      req.businessId = businessId;
      next();
    })
    .catch((err) => {
      logger.error("Tenant resolution error", { error: err.message });
      res.status(500).json({ error: "Internal server error" });
    });
}
