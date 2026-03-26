type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { raw: String(err) };
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();

  const entry: LogEntry = { level, message, timestamp, ...context };

  if (context?.error !== undefined) {
    entry.error = formatError(context.error);
  }

  if (process.env.NODE_ENV === "development") {
    const consoleFn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "debug"
            ? console.debug
            : console.log;
    consoleFn(`[${level.toUpperCase()}] ${message}`, context ?? "");
  } else {
    process.stdout.write(JSON.stringify(entry) + "\n");
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    log("error", message, context),
};

export { sendSlackAlert } from "@/lib/alert";
