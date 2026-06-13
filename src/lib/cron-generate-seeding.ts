import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyReports, seedingQueue, type NewSeedingQueue } from "@/lib/db/schema";
import { formatKrw } from "@/lib/format";
import { formatKstDate } from "@/lib/kst-date";

export type SeedingPlatform = "dc_fm" | "naver_cafe" | "clien" | "kakao_chat" | "blog";

export type SeedingDraft = {
  platform: SeedingPlatform;
  title: string;
  body: string;
};

type TopDrop = {
  apt_name: string;
  region_name: string;
  trade_price: number;
  highest_price: number;
  change_rate: number;
  size_sqm: number;
};

type RateSummary = {
  rate_type: string;
  rate_value: number;
  change_bp: number;
};

type VolumeSummary = {
  region: string;
  count: number;
};

export type SeedingDailyReport = {
  report_date: string;
  title: string;
  top_drops: TopDrop[];
  top_highs: TopDrop[];
  rate_summary: RateSummary[];
  volume_summary: VolumeSummary[];
};

type GenerateDailyReportSeedingOptions = {
  now?: Date;
};

type GenerateDailyReportSeedingResult =
  | {
      success: true;
      reportDate: string;
      generated: number;
    }
  | {
      success: false;
      error: string;
      status: 404;
    };

function generateDcFm(report: SeedingDailyReport): SeedingDraft {
  const top = report.top_drops?.[0];
  if (!top) {
    return {
      platform: "dc_fm",
      title: "오늘 부동산 시장 요약 ㄷㄷ",
      body: "특이사항 없음. 조용한 날이네\n\n[전체 순위: donjup.com]",
    };
  }

  const dropPct = Math.abs(top.change_rate);
  const lines: string[] = [
    `와 ${top.apt_name} ${formatKrw(top.highest_price)}→${formatKrw(top.trade_price)} ㄷㄷ`,
    `최고가 대비 ${dropPct}% 폭락`,
    "",
  ];

  if (report.top_drops.length > 1) {
    const second = report.top_drops[1];
    lines.push(`${second.apt_name}도 ${Math.abs(second.change_rate)}% 빠짐`);
  }

  if (report.rate_summary?.length > 0) {
    const rate = report.rate_summary[0];
    const dir = rate.change_bp > 0 ? "올랐고" : rate.change_bp < 0 ? "내렸고" : "동결이고";
    lines.push(`금리는 ${dir}`);
  }

  if (report.volume_summary?.length > 0) {
    lines.push(
      `거래량은 ${report.volume_summary.slice(0, 3).map((v) => v.region).join(", ")} 순`
    );
  }

  lines.push("", "[전체 순위: donjup.com]");

  return {
    platform: "dc_fm",
    title: `${top.apt_name} ${dropPct}% 폭락 ㄷㄷㄷ`,
    body: lines.join("\n"),
  };
}

function generateNaverCafe(report: SeedingDailyReport): SeedingDraft {
  const today = report.report_date;
  const top = report.top_drops?.[0];
  const lines: string[] = [
    `안녕하세요, ${today} 부동산 시장 데일리 분석입니다.`,
    "",
  ];

  if (report.top_drops?.length > 0) {
    lines.push("■ 최고가 대비 하락 거래 TOP");
    for (const drop of report.top_drops.slice(0, 5)) {
      lines.push(
        `  - ${drop.apt_name}(${drop.region_name}, ${drop.size_sqm}㎡): ${formatKrw(drop.highest_price)} → ${formatKrw(drop.trade_price)} (${Math.abs(drop.change_rate)}% 하락)`
      );
    }
    lines.push("");
  }

  if (report.top_highs?.length > 0) {
    lines.push("■ 신고가 갱신");
    for (const high of report.top_highs.slice(0, 3)) {
      lines.push(`  - ${high.apt_name}(${high.region_name}): ${formatKrw(high.trade_price)}`);
    }
    lines.push("");
  }

  if (report.rate_summary?.length > 0) {
    lines.push("■ 금리 동향");
    for (const rate of report.rate_summary) {
      const dir = rate.change_bp > 0 ? "상승" : rate.change_bp < 0 ? "하락" : "동결";
      lines.push(`  - ${rate.rate_type}: ${rate.rate_value}% (${dir} ${Math.abs(rate.change_bp)}bp)`);
    }
    lines.push("");
  }

  if (report.volume_summary?.length > 0) {
    lines.push("■ 거래량 핫스팟 (최근 30일)");
    for (const volume of report.volume_summary.slice(0, 5)) {
      lines.push(`  - ${volume.region}: ${volume.count}건`);
    }
    lines.push("");
  }

  lines.push("전체 순위와 상세 데이터는 donjup.com 에서 확인하세요.");

  return {
    platform: "naver_cafe",
    title: top
      ? `[${today}] ${top.apt_name} ${Math.abs(top.change_rate)}% 하락 외 | 데일리 부동산 분석`
      : `[${today}] 데일리 부동산 시장 분석`,
    body: lines.join("\n"),
  };
}

function generateClien(report: SeedingDailyReport): SeedingDraft {
  const today = report.report_date;
  const top = report.top_drops?.[0];
  const lines: string[] = [`${today} 부동산 데이터 요약`, ""];

  if (report.top_drops?.length > 0) {
    lines.push("[하락 거래]");
    for (const drop of report.top_drops.slice(0, 5)) {
      lines.push(
        `${drop.apt_name} | ${drop.region_name} | ${drop.size_sqm}㎡ | ${formatKrw(drop.trade_price)} | 최고가 대비 ${Math.abs(drop.change_rate)}%↓`
      );
    }
    lines.push("");
  }

  if (report.top_highs?.length > 0) {
    lines.push("[신고가]");
    for (const high of report.top_highs.slice(0, 3)) {
      lines.push(`${high.apt_name} | ${high.region_name} | ${formatKrw(high.trade_price)}`);
    }
    lines.push("");
  }

  if (report.rate_summary?.length > 0) {
    lines.push("[금리]");
    for (const rate of report.rate_summary) {
      lines.push(`${rate.rate_type}: ${rate.rate_value}% (${rate.change_bp > 0 ? "+" : ""}${rate.change_bp}bp)`);
    }
    lines.push("");
  }

  lines.push("출처: donjup.com");

  return {
    platform: "clien",
    title: top
      ? `${today} 아파트 하락거래 데이터 (${top.apt_name} ${Math.abs(top.change_rate)}%↓ 외)`
      : `${today} 부동산 거래 데이터 요약`,
    body: lines.join("\n"),
  };
}

function generateKakaoChat(report: SeedingDailyReport): SeedingDraft {
  const top = report.top_drops?.[0];
  if (!top) {
    return {
      platform: "kakao_chat",
      title: "오늘의 부동산",
      body: "[오늘의 부동산] 특이사항 없음\ndonjup.com",
    };
  }

  const lines: string[] = [
    `[오늘의 부동산] ${top.apt_name} ${Math.abs(top.change_rate)}% 폭락`,
  ];

  for (const drop of report.top_drops.slice(0, 3)) {
    lines.push(`- ${drop.apt_name} ${formatKrw(drop.trade_price)} (${Math.abs(drop.change_rate)}%↓)`);
  }

  if (report.rate_summary?.length > 0) {
    const rate = report.rate_summary[0];
    lines.push(`- 금리 ${rate.rate_value}%`);
  }

  lines.push("donjup.com");

  return {
    platform: "kakao_chat",
    title: `${top.apt_name} ${Math.abs(top.change_rate)}% 폭락`,
    body: lines.join("\n"),
  };
}

function generateBlogDraft(report: SeedingDailyReport): SeedingDraft {
  const today = report.report_date;
  const top = report.top_drops?.[0];
  const lines: string[] = [
    `# ${today} 서울 아파트 실거래가 폭락·신고가 랭킹`,
    "",
    "매일 업데이트되는 서울 아파트 실거래가 데이터를 분석합니다.",
    "",
  ];

  if (report.top_drops?.length > 0) {
    lines.push("## 최고가 대비 하락 거래 TOP");
    lines.push("");
    lines.push("아파트 실거래가가 역대 최고가 대비 크게 하락한 거래 목록입니다.");
    lines.push("");
    lines.push("| 순위 | 아파트 | 지역 | 면적 | 최고가 | 거래가 | 하락률 |");
    lines.push("|------|--------|------|------|--------|--------|--------|");
    for (let index = 0; index < Math.min(report.top_drops.length, 10); index++) {
      const drop = report.top_drops[index];
      lines.push(
        `| ${index + 1} | ${drop.apt_name} | ${drop.region_name} | ${drop.size_sqm}㎡ | ${formatKrw(drop.highest_price)} | ${formatKrw(drop.trade_price)} | ${Math.abs(drop.change_rate)}% |`
      );
    }
    lines.push("");
  }

  if (report.top_highs?.length > 0) {
    lines.push("## 신고가 갱신 아파트");
    lines.push("");
    lines.push("역대 최고 거래가를 경신한 아파트 목록입니다.");
    lines.push("");
    for (const high of report.top_highs.slice(0, 5)) {
      lines.push(`- **${high.apt_name}** (${high.region_name}): ${formatKrw(high.trade_price)}`);
    }
    lines.push("");
  }

  if (report.rate_summary?.length > 0) {
    lines.push("## 금리 동향");
    lines.push("");
    for (const rate of report.rate_summary) {
      const dir = rate.change_bp > 0 ? "상승" : rate.change_bp < 0 ? "하락" : "동결";
      lines.push(`- **${rate.rate_type}**: ${rate.rate_value}% (${dir} ${Math.abs(rate.change_bp)}bp)`);
    }
    lines.push("");
  }

  if (report.volume_summary?.length > 0) {
    lines.push("## 거래량 핫스팟 (최근 30일)");
    lines.push("");
    for (const volume of report.volume_summary.slice(0, 5)) {
      lines.push(`- ${volume.region}: ${volume.count}건`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("더 자세한 데이터와 아파트별 시세 추이는 [돈줍(donjup.com)](https://donjup.com)에서 확인하세요.");
  lines.push("");
  lines.push("대출 이자가 궁금하다면? [돈줍 금리 계산기](https://donjup.com/rate/calculator)에서 무료로 계산해보세요.");

  return {
    platform: "blog",
    title: top
      ? `[${today}] 서울 아파트 폭락 순위 - ${top.apt_name} ${Math.abs(top.change_rate)}% 하락 | 실거래가 분석`
      : `[${today}] 서울 아파트 실거래가 분석 리포트`,
    body: lines.join("\n"),
  };
}

export function generateSeedingDrafts(report: SeedingDailyReport): SeedingDraft[] {
  return [
    generateDcFm(report),
    generateNaverCafe(report),
    generateClien(report),
    generateKakaoChat(report),
    generateBlogDraft(report),
  ];
}

export function toSeedingQueueRows(
  reportDate: string,
  drafts: SeedingDraft[]
): NewSeedingQueue[] {
  return drafts.map((draft) => ({
    reportDate,
    platform: draft.platform,
    title: draft.title,
    body: draft.body,
    link: "https://donjup.com",
    status: "pending",
  }));
}

export async function generateDailyReportSeeding({
  now = new Date(),
}: GenerateDailyReportSeedingOptions = {}): Promise<GenerateDailyReportSeedingResult> {
  const today = formatKstDate(now);
  const reportRows = await db
    .select({
      report_date: dailyReports.reportDate,
      title: dailyReports.title,
      top_drops: dailyReports.topDrops,
      top_highs: dailyReports.topHighs,
      rate_summary: dailyReports.rateSummary,
      volume_summary: dailyReports.volumeSummary,
    })
    .from(dailyReports)
    .where(eq(dailyReports.reportDate, today))
    .limit(1);

  const report = reportRows[0];
  if (!report) {
    return {
      success: false,
      error: "No daily report found for today",
      status: 404,
    };
  }

  const drafts = generateSeedingDrafts(report as unknown as SeedingDailyReport);
  const rows = toSeedingQueueRows(today, drafts);

  await db
    .delete(seedingQueue)
    .where(eq(seedingQueue.reportDate, today));

  await db.insert(seedingQueue).values(rows);

  return {
    success: true,
    reportDate: today,
    generated: drafts.length,
  };
}
