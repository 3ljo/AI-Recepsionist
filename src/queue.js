import config from "./config.js";
import logger from "./logger.js";

// ============================================================
// REQUEST QUEUE — limits concurrent Claude API calls
// ============================================================

const MAX_CONCURRENT = config.maxConcurrentAiCalls;
const MAX_PENDING = 50;

let activeCalls = 0;
const pending = [];

export function getQueueDepth() {
  return pending.length;
}

export function getActiveCalls() {
  return activeCalls;
}

export function enqueue(fn) {
  return new Promise((resolve, reject) => {
    const task = { fn, resolve, reject };

    if (activeCalls < MAX_CONCURRENT) {
      runTask(task);
    } else if (pending.length < MAX_PENDING) {
      pending.push(task);
      logger.info("Request queued", {
        queueDepth: pending.length,
        activeCalls,
      });
    } else {
      reject(new Error("QUEUE_FULL"));
    }
  });
}

async function runTask(task) {
  activeCalls++;
  try {
    const result = await task.fn();
    task.resolve(result);
  } catch (err) {
    task.reject(err);
  } finally {
    activeCalls--;
    // Process next in queue
    if (pending.length > 0) {
      const next = pending.shift();
      runTask(next);
    }
  }
}
