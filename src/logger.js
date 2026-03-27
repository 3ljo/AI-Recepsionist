import config from "./config.js";
import crypto from "crypto";

// ============================================================
// STRUCTURED LOGGER — lightweight, zero-dependency
// JSON output in production, pretty-print in development
// ============================================================

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[config.logLevel] ?? LEVELS.info;
const isProduction = config.nodeEnv === "production";

function formatLog(level, msg, ctx = {}) {
  if (LEVELS[level] < currentLevel) return null;

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ctx: Object.keys(ctx).length > 0 ? ctx : undefined,
  };

  if (isProduction) {
    return JSON.stringify(entry);
  }

  // Pretty-print for development
  const timestamp = entry.ts.split("T")[1].replace("Z", "");
  const levelTag = level.toUpperCase().padEnd(5);
  const ctxStr = entry.ctx ? ` ${JSON.stringify(entry.ctx)}` : "";
  return `[${timestamp}] ${levelTag} ${msg}${ctxStr}`;
}

const logger = {
  debug(msg, ctx) {
    const line = formatLog("debug", msg, ctx);
    if (line) console.debug(line);
  },
  info(msg, ctx) {
    const line = formatLog("info", msg, ctx);
    if (line) console.info(line);
  },
  warn(msg, ctx) {
    const line = formatLog("warn", msg, ctx);
    if (line) console.warn(line);
  },
  error(msg, ctx) {
    const line = formatLog("error", msg, ctx);
    if (line) console.error(line);
  },
};

// ============================================================
// Request ID middleware — generates UUID per request
// ============================================================
export function requestIdMiddleware(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.set("X-Request-Id", req.requestId);
  next();
}

export default logger;
