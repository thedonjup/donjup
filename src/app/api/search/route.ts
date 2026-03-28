import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";
import { logger } from "@/lib/logger";

// 시/도 약칭 → region_code prefix 매핑
const SIDO_SEARCH_MAP: Record<string, string> = {};
for (const [code, sido] of Object.entries(REGION_HIERARCHY)) {
  // "서울", "서울특별시", "seoul" 모두 매핑
  SIDO_SEARCH_MAP[sido.shortName] = code;
  SIDO_SEARCH_MAP[sido.name] = code;
  SIDO_SEARCH_MAP[sido.slug] = code;
  // 시군구도 매핑
  for (const [sgCode, sgName] of Object.entries(sido.sigungu)) {
    SIDO_SEARCH_MAP[sgName] = sgCode; // "강남구" → "11680"
    // 축약형도 추가: "강남" → "11680"
    const short = sgName.replace(/[구시군]$/, "");
    if (short.length >= 2) SIDO_SEARCH_MAP[short] = sgCode;
  }
}

type SqlChunk = ReturnType<typeof sql>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  // New filter params
  const builtYearMin = searchParams.get("builtYearMin");
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  const sizeMin = searchParams.get("sizeMin");
  const sizeMax = searchParams.get("sizeMax");

  // Determine if we have any filter (allow filterOnly mode without text query)
  const hasFilters = builtYearMin || priceMin || priceMax || sizeMin || sizeMax;

  if (q.length === 0 && !hasFilters) {
    return NextResponse.json({ results: [] });
  }

  try {
    const conditions: SqlChunk[] = [];

    // Text search conditions (only if query provided)
    if (q.length > 0) {
      const parts = q.split(/\s+/).filter(Boolean);

      if (parts.length >= 2) {
        // 첫 단어: 지역, 나머지: 아파트명
        const regionPart = parts[0];
        const aptPart = parts.slice(1).join(" ");

        const sidoCode = SIDO_SEARCH_MAP[regionPart];
        if (sidoCode) {
          if (sidoCode.length === 2) {
            conditions.push(sql`c.region_code LIKE ${sidoCode + "%"}`);
          } else {
            conditions.push(sql`c.region_code = ${sidoCode}`);
          }
        } else {
          conditions.push(sql`(c.region_name ILIKE ${`%${regionPart}%`} OR c.dong_name ILIKE ${`%${regionPart}%`})`);
        }

        conditions.push(sql`c.apt_name ILIKE ${`%${aptPart}%`}`);
      } else {
        const keyword = parts[0];
        const sidoCode = SIDO_SEARCH_MAP[keyword];

        if (sidoCode) {
          if (sidoCode.length === 2) {
            conditions.push(sql`(c.region_code LIKE ${sidoCode + "%"} OR c.apt_name ILIKE ${`%${keyword}%`} OR c.dong_name ILIKE ${`%${keyword}%`})`);
          } else {
            conditions.push(sql`(c.region_code = ${sidoCode} OR c.apt_name ILIKE ${`%${keyword}%`} OR c.dong_name ILIKE ${`%${keyword}%`})`);
          }
        } else {
          conditions.push(sql`(c.apt_name ILIKE ${`%${keyword}%`} OR c.region_name ILIKE ${`%${keyword}%`} OR c.dong_name ILIKE ${`%${keyword}%`})`);
        }
      }
    }

    // Filter: built_year minimum
    if (builtYearMin) {
      const year = parseInt(builtYearMin, 10);
      if (!isNaN(year)) {
        conditions.push(sql`c.built_year >= ${year}`);
      }
    }

    // For price/size filters, we need to JOIN with apt_transactions
    const needsJoin = priceMin || priceMax || sizeMin || sizeMax;
    const txConditions: SqlChunk[] = [];

    if (priceMin) {
      const p = parseInt(priceMin, 10);
      if (!isNaN(p)) {
        txConditions.push(sql`t.trade_price >= ${p}`);
      }
    }
    if (priceMax) {
      const p = parseInt(priceMax, 10);
      if (!isNaN(p)) {
        txConditions.push(sql`t.trade_price <= ${p}`);
      }
    }
    if (sizeMin) {
      const s = parseFloat(sizeMin);
      if (!isNaN(s)) {
        txConditions.push(sql`t.size_sqm >= ${s}`);
      }
    }
    if (sizeMax) {
      const s = parseFloat(sizeMax);
      if (!isNaN(s)) {
        txConditions.push(sql`t.size_sqm <= ${s}`);
      }
    }

    const complexWhere = conditions.length > 0
      ? sql.join(conditions, sql` AND `)
      : sql`TRUE`;

    let query: SqlChunk;

    if (needsJoin) {
      const txWhere = txConditions.length > 0
        ? sql`AND ${sql.join(txConditions, sql` AND `)}`
        : sql``;
      query = sql`SELECT DISTINCT c.id, c.apt_name, c.region_code, c.region_name, c.dong_name, c.built_year, c.slug
             FROM apt_complexes c
             INNER JOIN apt_transactions t ON t.region_code = c.region_code AND t.apt_name = c.apt_name
             WHERE ${complexWhere} ${txWhere}
             ORDER BY c.apt_name LIMIT 50`;
    } else {
      query = sql`SELECT id, apt_name, region_code, region_name, dong_name, built_year, slug
             FROM apt_complexes c
             WHERE ${complexWhere}
             ORDER BY c.apt_name LIMIT 50`;
    }

    const result = await db.execute(query);

    return NextResponse.json({ results: result.rows });
  } catch (e) {
    logger.error("Search query failed", { error: e, route: "/api/search" });
    return NextResponse.json({ results: [], error: "검색 중 오류가 발생했습니다" }, { status: 500 });
  }
}
