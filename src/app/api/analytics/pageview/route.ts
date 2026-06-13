import { NextRequest, NextResponse } from "next/server";
import { isAllowedSiteRequest } from "@/lib/api/site-origin";
import { recordPageview } from "@/lib/analytics-pageview";
import {
  pageviewClientFingerprint,
  shouldRecordPageview,
} from "@/lib/analytics-pageview-dedupe";
import { parsePageviewRequest } from "@/lib/analytics-pageview-request";
import { logDatabaseFailure } from "@/lib/db/logging";
import {
  pageviewWriteSampleRate,
  pageviewWriteWeight,
  shouldSamplePageviewWrite,
} from "@/lib/pageview-write-sampling";

export async function POST(request: NextRequest) {
  if (!isAllowedSiteRequest(request.headers)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = parsePageviewRequest(await request.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const clientFingerprint = pageviewClientFingerprint(request.headers);
    const sampleRate = pageviewWriteSampleRate();

    if (
      shouldRecordPageview({
        clientFingerprint,
        pagePath: parsed.pagePath,
      }) &&
      shouldSamplePageviewWrite({
        clientFingerprint,
        pagePath: parsed.pagePath,
        sampleRate,
      })
    ) {
      try {
        await recordPageview(
          parsed.pagePath,
          parsed.pageType,
          undefined,
          pageviewWriteWeight(sampleRate)
        );
      } catch (e) {
        logDatabaseFailure("Failed to track page view", e, {
          route: "/api/analytics/pageview",
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
