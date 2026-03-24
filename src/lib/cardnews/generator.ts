/**
 * Card news content generator.
 *
 * Orchestrates fetching today's top drop/high data from daily_reports,
 * rendering card news images via the template pipeline, and preparing
 * the caption + hashtags for social distribution.
 *
 * Usage:
 *   const result = await generateDailyCardNews(supabase);
 *   // result.buffers  — PNG image buffers (cover + rank cards + CTA)
 *   // result.caption  — formatted caption string
 *   // result.hashtags — array of hashtag words (without #)
 *   // result.cardType — "drop" | "high"
 */

import { generateCardNews } from "./render";
import type { CardType, RankItem } from "./types";
import type { DbClient } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardNewsResult {
  buffers: Buffer[];
  caption: string;
  hashtags: string[];
  cardType: CardType;
  reportDate: string;
  items: RankItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveCardType(date: Date): CardType | null {
  const day = date.getDay(); // 0=Sun … 6=Sat
  if (day === 0 || day === 6) return null; // weekend — skip
  return [1, 3, 5].includes(day) ? "drop" : "high";
}

function buildCaption(
  date: string,
  cardType: CardType,
  items: RankItem[]
): string {
  const icon = cardType === "drop" ? "\uD83D\uDCC9" : "\uD83D\uDCC8";
  const label = cardType === "drop" ? "\uD3ED\uB77D" : "\uC2E0\uACE0\uAC00";

  const lines = [
    `${icon} ${date} ${label} \uC544\uD30C\uD2B8 TOP ${items.length}`,
    "",
    ...items.map((item, i) => {
      const pct = Math.abs(item.change_rate).toFixed(1);
      const sign = item.change_rate < 0 ? "-" : "+";
      return `${i + 1}\uC704 ${item.apt_name} (${item.region_name}) ${sign}${pct}%`;
    }),
    "",
    "\uD83D\uDC49 \uB354 \uB9CE\uC740 \uB370\uC774\uD130: donjup.com",
  ];
  return lines.join("\n");
}

function buildHashtags(cardType: CardType, items: RankItem[]): string[] {
  const base = [
    "\uB3C8\uC90D",
    "\uBD80\uB3D9\uC0B0",
    "\uC544\uD30C\uD2B8",
    cardType === "drop" ? "\uD3ED\uB77D" : "\uC2E0\uACE0\uAC00",
    "\uBD80\uB3D9\uC0B0\uD22C\uC790",
    "\uC2E4\uAC70\uB798\uAC00",
    "\uC544\uD30C\uD2B8\uC2E4\uAC70\uB798",
    "\uBD80\uB3D9\uC0B0\uC815\uBCF4",
  ];
  const aptTags = items.map((item) => item.apt_name.replace(/\s/g, ""));
  return [...base, ...aptTags];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Generate card news for the given date (defaults to today).
 * Returns null if the day is a weekend (no content scheduled).
 */
export async function generateDailyCardNews(
  db: DbClient,
  targetDate?: Date
): Promise<CardNewsResult | null> {
  const date = targetDate ?? new Date();
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  const cardType = resolveCardType(date);
  if (!cardType) return null; // weekend

  // Fetch today's report
  const { data: report, error: reportError } = await db
    .from("daily_reports")
    .select("top_drops,top_highs")
    .eq("report_date", dateStr)
    .single();

  if (reportError || !report) {
    throw new Error(`No daily report found for ${dateStr}`);
  }

  const rawItems =
    cardType === "drop" ? report.top_drops : report.top_highs;

  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error(`No ${cardType} data in report for ${dateStr}`);
  }

  // Map to RankItem (top 3)
  const items: RankItem[] = rawItems
    .slice(0, 3)
    .map((item: Record<string, unknown>, i: number) => ({
      rank: i + 1,
      apt_name: item.apt_name as string,
      region_name: item.region_name as string,
      highest_price: item.highest_price as number,
      trade_price: item.trade_price as number,
      change_rate: item.change_rate as number,
      size_sqm: item.size_sqm as number | undefined,
    }));

  // Render images (cover + 3 rank cards + CTA = 5 PNG buffers)
  const displayDate = dateStr.replace(/-/g, ".");
  const buffers = await generateCardNews(displayDate, cardType, items);

  return {
    buffers,
    caption: buildCaption(dateStr, cardType, items),
    hashtags: buildHashtags(cardType, items),
    cardType,
    reportDate: dateStr,
    items,
  };
}
