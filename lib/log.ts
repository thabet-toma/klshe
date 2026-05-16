export type LogLevel = "info" | "warn" | "error";

type LogEntry = {
  level: LogLevel;
  event: string;
  data?: Record<string, unknown>;
  ts: string;
};

/**
 * Fire-and-forget logger.
 * - Never throws, never awaits in the hot path.
 * - In production, pipe to Sentry/Datadog/etc. via a side-channel.
 * - In development, logs to console.
 */
function emit(entry: LogEntry) {
  if (process.env.NODE_ENV !== "production") {
    const fn = entry.level === "error" ? console.error : entry.level === "warn" ? console.warn : console.log;
    fn(`[jetek:${entry.level}] ${entry.event}`, entry.data ?? "");
    return;
  }
  // Production: fire-and-forget to stdout (captured by Vercel / Sentry)
  // Use queueMicrotask to avoid blocking the response
  queueMicrotask(() => {
    try {
      const line = JSON.stringify(entry);
      if (entry.level === "error") console.error(line);
      else if (entry.level === "warn") console.warn(line);
      else console.log(line);
    } catch {
      // swallow — logging must never crash the app
    }
  });
}

export const log = {
  info: (event: string, data?: Record<string, unknown>) =>
    emit({ level: "info", event, data, ts: new Date().toISOString() }),
  warn: (event: string, data?: Record<string, unknown>) =>
    emit({ level: "warn", event, data, ts: new Date().toISOString() }),
  error: (event: string, data?: Record<string, unknown>) =>
    emit({ level: "error", event, data, ts: new Date().toISOString() }),
};
