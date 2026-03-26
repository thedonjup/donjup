import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/db/server";

export const maxDuration = 60;

interface TopDrop {
  apt_name: string;
  region_name: string;
  trade_price: number;
  highest_price: number;
  change_rate: number;
  size_sqm: number;
}

interface RateSummary {
  rate_type: string;
  rate_value: number;
  change_bp: number;
}

interface VolumeSummary {
  region: string;
  count: number;
}

interface DailyReport {
  report_date: string;
  title: string;
  top_drops: TopDrop[];
  top_highs: TopDrop[];
  rate_summary: RateSummary[];
  volume_summary: VolumeSummary[];
}

function formatPrice(won: number): string {
  const eok = Math.floor(won / 100000000);
  const man = Math.floor((won % 100000000) / 10000);
  if (eok > 0 && man > 0) return `${eok}억${man.toLocaleString()}만`;
  if (eok > 0) return `${eok}억`;
  return `${man.toLocaleString()}만`;
}

function generateDcFm(report: DailyReport): { title: string; body: string } {
  const top = report.top_drops?.[0];
  if (!top) {
    return {
      title: `오늘 부동산 시장 요약 ㄷㄷ`,
      body: `특이사항 없음. 조용한 날이네\n\n[전체 순위: donjup.com]`,
    };
  }

  const dropPct = Math.abs(top.change_rate);
  const lines: string[] = [
    `와 ${top.apt_name} ${formatPrice(top.highest_price)}→${formatPrice(top.trade_price)} ㄷㄷ`,
    `최고가 대비 ${dropPct}% 폭락`,
    ``,
  ];

  if (report.top_drops.length > 1) {
    const second = report.top_drops[1];
    lines.push(
      `${second.apt_name}도 ${Math.abs(second.change_rate)}% 빠짐`
    );
  }

  if (report.rate_summary?.length > 0) {
    const r = report.rate_summary[0];
    const dir = r.change_bp > 0 ? "올랐고" : r.change_bp < 0 ? "내렸고" : "동결이고";
    lines.push(`금리는 ${dir}`);
  }

  if (report.volume_summary?.length > 0) {
    lines.push(
      `거래량은 ${report.volume_summary.slice(0, 3).map((v) => v.region).join(", ")} 순`
    );
  }

  lines.push(``, `[전체 순위: donjup.com]`);

  return {
    title: `${top.apt_name} ${dropPct}% 폭락 ㄷㄷㄷ`,
    body: lines.join("\n"),
  };
}

function generateNaverCafe(report: DailyReport): { title: string; body: string } {
  const today = report.report_date;
  const top = report.top_drops?.[0];

  const lines: string[] = [
    `안녕하세요, ${today} 부동산 시장 데일리 분석입니다.`,
    ``,
  ];

  if (report.top_drops?.length > 0) {
    lines.push(`■ 최고가 대비 하락 거래 TOP`);
    for (const d of report.top_drops.slice(0, 5)) {
      lines.push(
        `  - ${d.apt_name}(${d.region_name}, ${d.size_sqm}㎡): ${formatPrice(d.highest_price)} → ${formatPrice(d.trade_price)} (${Math.abs(d.change_rate)}% 하락)`
      );
    }
    lines.push(``);
  }

  if (report.top_highs?.length > 0) {
    lines.push(`■ 신고가 갱신`);
    for (const h of report.top_highs.slice(0, 3)) {
      lines.push(
        `  - ${h.apt_name}(${h.region_name}): ${formatPrice(h.trade_price)}`
      );
    }
    lines.push(``);
  }

  if (report.rate_summary?.length > 0) {
    lines.push(`■ 금리 동향`);
    for (const r of report.rate_summary) {
      const dir = r.change_bp > 0 ? "상승" : r.change_bp < 0 ? "하락" : "동결";
      lines.push(`  - ${r.rate_type}: ${r.rate_value}% (${dir} ${Math.abs(r.change_bp)}bp)`);
    }
    lines.push(``);
  }

  if (report.volume_summary?.length > 0) {
    lines.push(`■ 거래량 핫스팟 (최근 30일)`);
    for (const v of report.volume_summary.slice(0, 5)) {
      lines.push(`  - ${v.region}: ${v.count}건`);
    }
    lines.push(``);
  }

  lines.push(`전체 순위와 상세 데이터는 donjup.com 에서 확인하세요.`);

  const title = top
    ? `[${today}] ${top.apt_name} ${Math.abs(top.change_rate)}% 하락 외 | 데일리 부동산 분석`
    : `[${today}] 데일리 부동산 시장 분석`;

  return { title, body: lines.join("\n") };
}

function generateClien(report: DailyReport): { title: string; body: string } {
  const today = report.report_date;
  const top = report.top_drops?.[0];

  const lines: string[] = [`${today} 부동산 데이터 요약`, ``];

  if (report.top_drops?.length > 0) {
    lines.push(`[하락 거래]`);
    for (const d of report.top_drops.slice(0, 5)) {
      lines.push(
        `${d.apt_name} | ${d.region_name} | ${d.size_sqm}㎡ | ${formatPrice(d.trade_price)} | 최고가 대비 ${Math.abs(d.change_rate)}%↓`
      );
    }
    lines.push(``);
  }

  if (report.top_highs?.length > 0) {
    lines.push(`[신고가]`);
    for (const h of report.top_highs.slice(0, 3)) {
      lines.push(`${h.apt_name} | ${h.region_name} | ${formatPrice(h.trade_price)}`);
    }
    lines.push(``);
  }

  if (report.rate_summary?.length > 0) {
    lines.push(`[금리]`);
    for (const r of report.rate_summary) {
      lines.push(`${r.rate_type}: ${r.rate_value}% (${r.change_bp > 0 ? "+" : ""}${r.change_bp}bp)`);
    }
    lines.push(``);
  }

  lines.push(`출처: donjup.com`);

  const title = top
    ? `${today} 아파트 하락거래 데이터 (${top.apt_name} ${Math.abs(top.change_rate)}%↓ 외)`
    : `${today} 부동산 거래 데이터 요약`;

  return { title, body: lines.join("\n") };
}

function generateKakaoChat(report: DailyReport): { title: string; body: string } {
  const top = report.top_drops?.[0];
  if (!top) {
    return {
      title: "오늘의 부동산",
      body: `[오늘의 부동산] 특이사항 없음\ndounjup.com`,
    };
  }

  const lines: string[] = [
    `[오늘의 부동산] ${top.apt_name} ${Math.abs(top.change_rate)}% 폭락`,
  ];

  for (const d of report.top_drops.slice(0, 3)) {
    lines.push(`- ${d.apt_name} ${formatPrice(d.trade_price)} (${Math.abs(d.change_rate)}%↓)`);
  }

  if (report.rate_summary?.length > 0) {
    const r = report.rate_summary[0];
    lines.push(`- 금리 ${r.rate_value}%`);
  }

  lines.push(`donjup.com`);

  return {
    title: `${top.apt_name} ${Math.abs(top.change_rate)}% 폭락`,
    body: lines.join("\n"),
  };
}

function generateBlogDraft(report: DailyReport): { title: string; body: string } {
  const today = report.report_date;
  const top = report.top_drops?.[0];

  const lines: string[] = [
    `# ${today} 서울 아파트 실거래가 폭락·신고가 랭킹`,
    ``,
    `매일 업데이트되는 서울 아파트 실거래가 데이터를 분석합니다.`,
    ``,
  ];

  if (report.top_drops?.length > 0) {
    lines.push(`## 최고가 대비 하락 거래 TOP`);
    lines.push(``);
    lines.push(`아파트 실거래가가 역대 최고가 대비 크게 하락한 거래 목록입니다.`);
    lines.push(``);
    lines.push(`| 순위 | 아파트 | 지역 | 면적 | 최고가 | 거래가 | 하락률 |`);
    lines.push(`|------|--------|------|------|--------|--------|--------|`);
    for (let i = 0; i < Math.min(report.top_drops.length, 10); i++) {
      const d = report.top_drops[i];
      lines.push(
        `| ${i + 1} | ${d.apt_name} | ${d.region_name} | ${d.size_sqm}㎡ | ${formatPrice(d.highest_price)} | ${formatPrice(d.trade_price)} | ${Math.abs(d.change_rate)}% |`
      );
    }
    lines.push(``);
  }

  if (report.top_highs?.length > 0) {
    lines.push(`## 신고가 갱신 아파트`);
    lines.push(``);
    lines.push(`역대 최고 거래가를 경신한 아파트 목록입니다.`);
    lines.push(``);
    for (const h of report.top_highs.slice(0, 5)) {
      lines.push(`- **${h.apt_name}** (${h.region_name}): ${formatPrice(h.trade_price)}`);
    }
    lines.push(``);
  }

  if (report.rate_summary?.length > 0) {
    lines.push(`## 금리 동향`);
    lines.push(``);
    for (const r of report.rate_summary) {
      const dir = r.change_bp > 0 ? "상승" : r.change_bp < 0 ? "하락" : "동결";
      lines.push(`- **${r.rate_type}**: ${r.rate_value}% (${dir} ${Math.abs(r.change_bp)}bp)`);
    }
    lines.push(``);
  }

  if (report.volume_summary?.length > 0) {
    lines.push(`## 거래량 핫스팟 (최근 30일)`);
    lines.push(``);
    for (const v of report.volume_summary.slice(0, 5)) {
      lines.push(`- ${v.region}: ${v.count}건`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`더 자세한 데이터와 아파트별 시세 추이는 [돈줍(donjup.com)](https://donjup.com)에서 확인하세요.`);
  lines.push(``);
  lines.push(`대출 이자가 궁금하다면? [돈줍 금리 계산기](https://donjup.com/rate/calculator)에서 무료로 계산해보세요.`);

  const title = top
    ? `[${today}] 서울 아파트 폭락 순위 - ${top.apt_name} ${Math.abs(top.change_rate)}% 하락 | 실거래가 분석`
    : `[${today}] 서울 아파트 실거래가 분석 리포트`;

  return { title, body: lines.join("\n") };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  try {
    const { data: report, error: reportError } = await supabase
      .from("daily_reports")
      .select("report_date,title,top_drops,top_highs,rate_summary,volume_summary")
      .eq("report_date", today)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { success: false, error: "No daily report found for today" },
        { status: 404 }
      );
    }

    const typedReport = report as unknown as DailyReport;

    const platforms = [
      { platform: "dc_fm", ...generateDcFm(typedReport) },
      { platform: "naver_cafe", ...generateNaverCafe(typedReport) },
      { platform: "clien", ...generateClien(typedReport) },
      { platform: "kakao_chat", ...generateKakaoChat(typedReport) },
      { platform: "blog", ...generateBlogDraft(typedReport) },
    ];

    const rows = platforms.map((p) => ({
      report_date: today,
      platform: p.platform,
      title: p.title,
      body: p.body,
      link: "https://donjup.com",
      status: "pending",
    }));

    // 오늘 기존 데이터 삭제 후 삽입 (중복 방지)
    await supabase
      .from("seeding_queue")
      .delete()
      .eq("report_date", today);

    const { error: insertError } = await supabase
      .from("seeding_queue")
      .insert(rows);

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reportDate: today,
      generated: platforms.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
