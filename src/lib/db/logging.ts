import { logger } from "@/lib/logger";
import {
  isDatabaseResourceLimitError,
  summarizeDatabaseError,
} from "@/lib/db/errors";

export type DatabaseLogLevel = "warn" | "error";

export function databaseLogLevel(error: unknown): DatabaseLogLevel {
  return isDatabaseResourceLimitError(error) ? "warn" : "error";
}

export function databaseLogContext(
  error: unknown,
  context: Record<string, unknown> = {}
): Record<string, unknown> & { summary: string } {
  return {
    ...context,
    summary: summarizeDatabaseError(error),
  };
}

export function logDatabaseFailure(
  message: string,
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  const logContext = databaseLogContext(error, context);

  if (databaseLogLevel(error) === "warn") {
    logger.warn(message, logContext);
    return;
  }

  logger.error(message, logContext);
}
