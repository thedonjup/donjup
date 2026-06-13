import { eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/lib/db";
import { dailyReports, pushSubscriptions } from "@/lib/db/schema";
import { formatKstDate } from "@/lib/kst-date";

type DailyReportPushRow = {
  summary: string | null;
  top_drops: unknown;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type SendDailyReportPushOptions = {
  now?: Date;
  env?: NodeJS.ProcessEnv;
  webpushClient?: typeof webpush;
};

type SendDailyReportPushResult =
  | {
      success: true;
      message: string;
      pushSent: 0;
    }
  | {
      success: true;
      reportDate: string;
      pushSent: number;
      pushFailed: number;
      totalSubscribers: number;
    };

function getTopDropAptName(topDrops: unknown): string | null {
  if (!Array.isArray(topDrops) || topDrops.length === 0) return null;
  const first = topDrops[0];
  if (!first || typeof first !== "object") return null;
  const aptName = (first as { apt_name?: unknown }).apt_name;

  return typeof aptName === "string" && aptName.trim() ? aptName : null;
}

export function hasPushVapidConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export function shouldDeleteExpiredSubscription(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const statusCode = (error as { statusCode?: unknown }).statusCode;

  return statusCode === 410 || statusCode === 404;
}

export function buildDailyReportPushPayload(report: DailyReportPushRow): string {
  const topDropAptName = getTopDropAptName(report.top_drops);

  return JSON.stringify({
    title: "오늘의 부동산 리포트가 도착했습니다",
    body: topDropAptName
      ? `${topDropAptName} 폭락 외 - ${report.summary || "오늘의 시장 분석을 확인하세요"}`
      : report.summary || "오늘의 부동산 시장 분석을 확인해보세요",
    url: "/daily/archive",
  });
}

async function sendNotification(
  sub: PushSubscriptionRow,
  payload: string,
  webpushClient: typeof webpush
) {
  return webpushClient
    .sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      payload
    )
    .catch(async (error: unknown) => {
      if (shouldDeleteExpiredSubscription(error)) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, sub.endpoint));
      }
      throw error;
    });
}

export async function sendDailyReportPush({
  now = new Date(),
  env = process.env,
  webpushClient = webpush,
}: SendDailyReportPushOptions = {}): Promise<SendDailyReportPushResult> {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID configuration");
  }

  webpushClient.setVapidDetails("mailto:admin@donjup.com", publicKey, privateKey);

  const today = formatKstDate(now);
  const reportRows = await db
    .select({
      title: dailyReports.title,
      summary: dailyReports.summary,
      top_drops: dailyReports.topDrops,
    })
    .from(dailyReports)
    .where(eq(dailyReports.reportDate, today))
    .limit(1);

  const report = reportRows[0];
  if (!report) {
    return {
      success: true,
      message: "No report for today, skipping push",
      pushSent: 0,
    };
  }

  const subs = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions);

  if (!subs || subs.length === 0) {
    return {
      success: true,
      message: "No subscribers",
      pushSent: 0,
    };
  }

  const payload = buildDailyReportPushPayload(report);
  const results = await Promise.allSettled(
    subs.map((sub) => sendNotification(sub, payload, webpushClient))
  );

  return {
    success: true,
    reportDate: today,
    pushSent: results.filter((result) => result.status === "fulfilled").length,
    pushFailed: results.filter((result) => result.status === "rejected").length,
    totalSubscribers: subs.length,
  };
}
