const MAX_SUMMARY_LENGTH = 180;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function getStringProp(value: unknown, key: string): string | null {
  const record = asRecord(value);
  const prop = record?.[key];
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

function truncate(message: string): string {
  return message.length > MAX_SUMMARY_LENGTH
    ? `${message.slice(0, MAX_SUMMARY_LENGTH - 1)}…`
    : message;
}

function databaseErrorDetails(error: unknown): {
  code: string | null;
  message: string;
} {
  const chain = walkErrorChain(error);
  const code = chain.map((item) => getStringProp(item, "code")).find(Boolean);
  const message =
    chain.map((item) => getStringProp(item, "message")).find(Boolean) ??
    (typeof error === "string" ? error : "unknown database error");

  return {
    code: code ?? null,
    message,
  };
}

export function isDatabaseResourceLimitError(error: unknown): boolean {
  const { code, message } = databaseErrorDetails(error);

  return (
    code === "53300" ||
    message.includes("Request Unit limit") ||
    message.includes("maximum number of allowed connections is 0")
  );
}

export function databaseErrorStatus(error: unknown): 500 | 503 {
  return isDatabaseResourceLimitError(error) ? 503 : 500;
}

export function publicDatabaseError(error: unknown): {
  status: 500 | 503;
  code: "DB_UNAVAILABLE" | "INTERNAL_ERROR";
  message: string;
} {
  if (databaseErrorStatus(error) === 503) {
    return {
      status: 503,
      code: "DB_UNAVAILABLE",
      message: "데이터베이스를 일시적으로 사용할 수 없습니다.",
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "서버 오류가 발생했습니다",
  };
}

export function summarizeDatabaseError(error: unknown): string {
  const { code, message } = databaseErrorDetails(error);

  if (isDatabaseResourceLimitError(error)) {
    return "database resource limit reached";
  }

  return truncate(code ? `${code}: ${message}` : message);
}
