export type DamApiPath = "/api/dam/stats" | "/api/dam/data";

interface DamErrorBody {
  error?: unknown;
  message?: unknown;
}

export function createDamAuthHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}` };
}

function getDamErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const { error, message } = body as DamErrorBody;
    if (typeof error === "string" && error.trim()) return error;
    if (typeof message === "string" && message.trim()) return message;
  }

  return `HTTP ${status}`;
}

export async function fetchDamApi<T>(path: DamApiPath, idToken: string): Promise<T> {
  const res = await fetch(path, {
    headers: createDamAuthHeaders(idToken),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(getDamErrorMessage(body, res.status));
  }

  return res.json() as Promise<T>;
}
