import { eq } from "drizzle-orm";
import { generateCardNews } from "@/lib/cardnews/render";
import type { CardType, RankItem } from "@/lib/cardnews/types";
import { db } from "@/lib/db";
import { contentQueue, dailyReports } from "@/lib/db/schema";
import { uploadMultipleToBlob } from "@/lib/storage";

export type GenerateCardnewsBody =
  | {
      success: true;
      message: "Weekend skip";
    }
  | {
      success: true;
      reportDate: string;
      cardType: CardType;
      images: number;
      storageUrls: string[];
    }
  | {
      success: false;
      message: "No report" | "No items";
    };

export type GenerateCardnewsResult = {
  status: number;
  body: GenerateCardnewsBody;
};

function reportDateFromDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function cardnewsTypeForDay(dayOfWeek: number): CardType {
  return dayOfWeek % 2 === 1 ? "drop" : "high";
}

function cardnewsContentType(cardType: CardType): string {
  return `cardnews_${cardType}`;
}

function cardnewsCaption(reportDate: string, cardType: CardType): string {
  const label = cardType === "drop" ? "\ud3ed\ub77d" : "\ud2b8\ub77d";
  return `${reportDate} ${label} Apt Ranking\n\n#donjup #realestate`;
}

export async function generateDailyCardnews(
  now = new Date()
): Promise<GenerateCardnewsResult> {
  const reportDate = reportDateFromDate(now);
  const dayOfWeek = now.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      status: 200,
      body: { success: true, message: "Weekend skip" },
    };
  }

  const cardType = cardnewsTypeForDay(dayOfWeek);
  const reports = await db
    .select({
      topDrops: dailyReports.topDrops,
      topHighs: dailyReports.topHighs,
    })
    .from(dailyReports)
    .where(eq(dailyReports.reportDate, reportDate))
    .limit(1);

  const report = reports[0];
  if (!report) {
    return {
      status: 404,
      body: { success: false, message: "No report" },
    };
  }

  const rawItems = cardType === "drop" ? report.topDrops : report.topHighs;
  const items = Array.isArray(rawItems) ? (rawItems as RankItem[]) : [];
  if (items.length === 0) {
    return {
      status: 200,
      body: { success: false, message: "No items" },
    };
  }

  const images = await generateCardNews(reportDate, cardType, items.slice(0, 10));
  const storageUrls = await uploadMultipleToBlob(
    `cardnews/${reportDate}/${cardType}`,
    images
  );

  await db.insert(contentQueue).values({
    reportDate,
    contentType: cardnewsContentType(cardType),
    storageUrls,
    caption: cardnewsCaption(reportDate, cardType),
    hashtags: ["realestate", "apt", "donjup"],
    status: "ready",
  });

  return {
    status: 200,
    body: {
      success: true,
      reportDate,
      cardType,
      images: storageUrls.length,
      storageUrls,
    },
  };
}
