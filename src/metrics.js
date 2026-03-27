// ============================================================
// REQUEST METRICS — in-memory counters, reset daily
// ============================================================

const routeMetrics = {};
const toolMetrics = {};
const businessMetrics = {};

let lastReset = Date.now();

function checkDailyReset() {
  const now = new Date();
  const resetDate = new Date(lastReset);
  if (now.getDate() !== resetDate.getDate()) {
    Object.keys(routeMetrics).forEach((k) => delete routeMetrics[k]);
    Object.keys(toolMetrics).forEach((k) => delete toolMetrics[k]);
    Object.keys(businessMetrics).forEach((k) => delete businessMetrics[k]);
    lastReset = Date.now();
  }
}

function getOrCreateRoute(route) {
  if (!routeMetrics[route]) {
    routeMetrics[route] = {
      count: 0,
      errors: 0,
      totalLatency: 0,
      latencies: [],
    };
  }
  return routeMetrics[route];
}

function getOrCreateTool(tool) {
  if (!toolMetrics[tool]) {
    toolMetrics[tool] = {
      count: 0,
      errors: 0,
      totalDuration: 0,
    };
  }
  return toolMetrics[tool];
}

function getOrCreateBusiness(businessId) {
  if (!businessMetrics[businessId]) {
    businessMetrics[businessId] = {
      calls: 0,
      bookings: 0,
      cancellations: 0,
    };
  }
  return businessMetrics[businessId];
}

function calculateP95(latencies) {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

// ============================================================
// Public API
// ============================================================

export function recordRequest(route, latencyMs, isError = false) {
  checkDailyReset();
  const m = getOrCreateRoute(route);
  m.count++;
  m.totalLatency += latencyMs;
  m.latencies.push(latencyMs);
  // Keep only last 1000 latencies for p95 calculation
  if (m.latencies.length > 1000) m.latencies.shift();
  if (isError) m.errors++;
}

export function recordToolExecution(toolName, durationMs, isError = false) {
  checkDailyReset();
  const m = getOrCreateTool(toolName);
  m.count++;
  m.totalDuration += durationMs;
  if (isError) m.errors++;
}

export function recordBusinessEvent(businessId, event) {
  checkDailyReset();
  const m = getOrCreateBusiness(businessId);
  if (event === "call") m.calls++;
  else if (event === "booking") m.bookings++;
  else if (event === "cancellation") m.cancellations++;
}

export function getMetricsSummary() {
  checkDailyReset();

  const routes = {};
  for (const [route, m] of Object.entries(routeMetrics)) {
    routes[route] = {
      request_count: m.count,
      avg_latency_ms: m.count > 0 ? Math.round(m.totalLatency / m.count) : 0,
      error_count: m.errors,
      p95_latency_ms: calculateP95(m.latencies),
    };
  }

  const tools = {};
  for (const [tool, m] of Object.entries(toolMetrics)) {
    tools[tool] = {
      execution_count: m.count,
      avg_duration_ms: m.count > 0 ? Math.round(m.totalDuration / m.count) : 0,
      error_rate: m.count > 0 ? +(m.errors / m.count * 100).toFixed(1) : 0,
    };
  }

  return { routes, tools, businesses: businessMetrics };
}

// ============================================================
// Express middleware for automatic route tracking
// ============================================================
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const latency = Date.now() - start;
    const route = `${req.method} ${req.route?.path || req.path}`;
    const isError = res.statusCode >= 400;
    recordRequest(route, latency, isError);
  });
  next();
}
