import logger from "../logger.js";
import config from "../config.js";

// ============================================================
// CUSTOM ERROR CLASSES
// ============================================================

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "External service error") {
    super(message, 502);
  }
}

// ============================================================
// GLOBAL ERROR HANDLER (4-arg Express middleware)
// ============================================================
export function globalErrorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  logger.error("Request error", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode,
    error: err.message,
    ...(isServerError ? { stack: err.stack } : {}),
  });

  const body = {
    error: isServerError && config.nodeEnv === "production"
      ? "Internal server error"
      : err.message,
  };

  if (config.nodeEnv !== "production" && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

// ============================================================
// PROCESS-LEVEL HANDLERS — log and exit gracefully
// ============================================================
export function registerProcessHandlers() {
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", {
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });
}
