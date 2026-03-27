import crypto from "crypto";
import supabase from "../supabase.js";

// ============================================================
// API KEY AUTHENTICATION MIDDLEWARE
// Validates x-api-key header against hashed keys in Supabase
// ============================================================

// In-memory cache: hash -> { isValid, expiresAt }
const keyCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function hashKey(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function getCachedResult(keyHash) {
  const cached = keyCache.get(keyHash);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    keyCache.delete(keyHash);
    return null;
  }
  return cached.isValid;
}

function setCachedResult(keyHash, isValid) {
  keyCache.set(keyHash, {
    isValid,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function validateApiKey(apiKey) {
  const keyHash = hashKey(apiKey);

  // Check cache first
  const cached = getCachedResult(keyHash);
  if (cached !== null) return cached;

  // Query Supabase
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, business_id")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    setCachedResult(keyHash, false);
    return false;
  }

  // Update last_used_at (fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  setCachedResult(keyHash, true);
  return true;
}

export function apiKeyAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }

  validateApiKey(apiKey)
    .then((valid) => {
      if (!valid) {
        return res.status(401).json({ error: "Invalid or missing API key" });
      }
      next();
    })
    .catch(() => {
      res.status(401).json({ error: "Invalid or missing API key" });
    });
}
