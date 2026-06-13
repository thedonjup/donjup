import { NextResponse } from "next/server";
import { formatLogError } from "@/lib/logging/safe-error";

export const SERVICE_UNAVAILABLE_ERROR = "Service temporarily unavailable";
export const UNAUTHORIZED_ERROR = "Unauthorized";

type SafeErrorPayloadOptions = {
  includeSuccess?: boolean;
};

type SafeErrorResponseOptions = SafeErrorPayloadOptions & {
  status?: number;
};

export function safeErrorMessage(error: unknown): string {
  return formatLogError(error).summary;
}

export function safeErrorListItem(label: string | null, error: unknown): string {
  const message = safeErrorMessage(error);
  return label ? `${label}: ${message}` : message;
}

export function safeErrorPayload(
  error: unknown,
  options: SafeErrorPayloadOptions = {},
): { error: string; success?: false } {
  return {
    ...(options.includeSuccess ? { success: false as const } : {}),
    error: safeErrorMessage(error),
  };
}

export function safeErrorResponse(
  error: unknown,
  options: SafeErrorResponseOptions = {},
): NextResponse {
  return NextResponse.json(safeErrorPayload(error, options), {
    status: options.status ?? 500,
  });
}

export function serviceUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: SERVICE_UNAVAILABLE_ERROR },
    { status: 503 },
  );
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: UNAUTHORIZED_ERROR },
    { status: 401 },
  );
}
