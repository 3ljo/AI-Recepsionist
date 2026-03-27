import { createClient } from "@supabase/supabase-js";
import config from "../config.js";
import logger from "../logger.js";

// ============================================================
// SUPABASE JWT AUTH MIDDLEWARE
// Verifies the user's session token from the frontend
// ============================================================

export function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  // Create a Supabase client with the user's token
  const supabaseUser = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  supabaseUser.auth
    .getUser(token)
    .then(({ data, error }) => {
      if (error || !data.user) {
        logger.warn("JWT auth failed", { error: error?.message });
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      // Attach user info to request
      req.user = data.user;
      req.userId = data.user.id;
      next();
    })
    .catch((err) => {
      logger.error("JWT auth error", { error: err.message });
      res.status(401).json({ error: "Authentication failed" });
    });
}
