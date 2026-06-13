export type AdminCronRunResult = {
  success: boolean;
  route: string;
  status: number;
  result: unknown;
};

type AdminCronRunOptions = {
  cronSecret: string;
  fetchCron?: typeof fetch;
  requestUrl: string;
  route: string;
};

type EnvWithCronSecret = Record<string, string | undefined>;

export function getAdminCronSecret(env: EnvWithCronSecret = process.env): string | null {
  const cronSecret = env.CRON_SECRET?.trim();
  return cronSecret || null;
}

function parseCronResult(text: string): unknown {
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function runAdminCronRoute({
  cronSecret,
  fetchCron = fetch,
  requestUrl,
  route,
}: AdminCronRunOptions): Promise<AdminCronRunResult> {
  const cronUrl = new URL(`/api/cron/${route}`, requestUrl);
  const response = await fetchCron(cronUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${cronSecret}` },
    cache: "no-store",
  });
  const text = await response.text();

  return {
    success: response.ok,
    route,
    status: response.status,
    result: parseCronResult(text),
  };
}
