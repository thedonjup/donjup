import { isDatabaseResourceLimitError } from "@/lib/db/errors";

const MAX_LOG_ERROR_SUMMARY_LENGTH = 180;
const DB_CODE_PATTERN = /^[0-9A-Z]{5}$/i;

type SafeLogError = {
  name: string;
  summary: string;
  code?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function getStringProp(value: unknown, key: string): string | null {
  const prop = asRecord(value)?.[key];
  return typeof prop === "string" ? prop : null;
}

function walkErrorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;

  for (let i = 0; i < 5 && current !== undefined && current !== null; i += 1) {
    chain.push(current);
    current = asRecord(current)?.cause;
  }

  return chain;
}

function truncate(value: string): string {
  return value.length > MAX_LOG_ERROR_SUMMARY_LENGTH
    ? `${value.slice(0, MAX_LOG_ERROR_SUMMARY_LENGTH - 1)}…`
    : value;
}

function redactSensitiveValues(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(token|secret|password|api[_-]?key|access[_-]?token)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/\b(postgres(?:ql)?:\/\/)([^@\s]+)@/gi, "$1[redacted]@");
}

function looksLikeSqlMessage(message: string): boolean {
  return /failed query|params:|select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from/i.test(
    message,
  );
}

export function formatLogError(error: unknown): SafeLogError {
  const chain = walkErrorChain(error);
  const name =
    chain.map((item) => getStringProp(item, "name")).find(Boolean) ??
    (error instanceof Error ? error.name : "Error");
  const code = chain.map((item) => getStringProp(item, "code")).find(Boolean);
  const rawMessage =
    chain.map((item) => getStringProp(item, "message")).find(Boolean) ??
    (typeof error === "string" ? error : "unknown error");

  if (isDatabaseResourceLimitError(error)) {
    return {
      name,
      ...(code ? { code } : {}),
      summary: "database resource limit reached",
    };
  }

  if ((code && DB_CODE_PATTERN.test(code)) || looksLikeSqlMessage(rawMessage)) {
    return {
      name,
      ...(code ? { code } : {}),
      summary: "database error",
    };
  }

  return {
    name,
    ...(code ? { code } : {}),
    summary: truncate(redactSensitiveValues(rawMessage)),
  };
}
