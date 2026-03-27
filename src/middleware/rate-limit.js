// ============================================================
// IN-MEMORY SLIDING WINDOW RATE LIMITER
// No external dependencies
// ============================================================

// Store: key -> array of timestamps
const windows = new Map();

// Clean old entries periodically (every 60s)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of windows) {
    const filtered = timestamps.filter((t) => now - t < 60000);
    if (filtered.length === 0) {
      windows.delete(key);
    } else {
      windows.set(key, filtered);
    }
  }
}, 60000);

function checkRateLimit(key, maxRequests, windowMs = 60000) {
  const now = Date.now();
  const timestamps = windows.get(key) || [];

  // Remove timestamps outside the window
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= maxRequests) {
    // Calculate when the oldest request in window expires
    const oldestInWindow = valid[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  valid.push(now);
  windows.set(key, valid);
  return { allowed: true };
}

export function rateLimiter(maxRequests, keyFn) {
  return (req, res, next) => {
    const key = keyFn(req);
    const result = checkRateLimit(key, maxRequests);

    if (!result.allowed) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        error: "Rate limit exceeded",
        retry_after: result.retryAfter,
      });
    }

    next();
  };
}

// Pre-configured limiters
export const chatRateLimit = (limit) =>
  rateLimiter(limit, (req) => `chat:${req.headers["x-api-key"] || req.ip}`);

export const vapiRateLimit = (limit) =>
  rateLimiter(limit, (req) => `vapi:${req.ip}`);

export const statusRateLimit = (limit) =>
  rateLimiter(limit, (req) => `status:${req.ip}`);
