import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/client";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const type = parseInt(searchParams.get("type") || "1", 10);

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
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

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
            conditions.push(`c.region_code LIKE $${paramIdx}`);
            values.push(`${sidoCode}%`);
          } else {
            conditions.push(`c.region_code = $${paramIdx}`);
            values.push(sidoCode);
          }
        } else {
          conditions.push(`(c.region_name ILIKE $${paramIdx} OR c.dong_name ILIKE $${paramIdx})`);
          values.push(`%${regionPart}%`);
        }
        paramIdx++;

        conditions.push(`c.apt_name ILIKE $${paramIdx}`);
        values.push(`%${aptPart}%`);
        paramIdx++;
      } else {
        const keyword = parts[0];
        const sidoCode = SIDO_SEARCH_MAP[keyword];

        if (sidoCode) {
          if (sidoCode.length === 2) {
            conditions.push(`(c.region_code LIKE $${paramIdx} OR c.apt_name ILIKE $${paramIdx + 1} OR c.dong_name ILIKE $${paramIdx + 1})`);
            values.push(`${sidoCode}%`, `%${keyword}%`);
            paramIdx += 2;
          } else {
            conditions.push(`(c.region_code = $${paramIdx} OR c.apt_name ILIKE $${paramIdx + 1} OR c.dong_name ILIKE $${paramIdx + 1})`);
            values.push(sidoCode, `%${keyword}%`);
            paramIdx += 2;
          }
        } else {
          conditions.push(`(c.apt_name ILIKE $${paramIdx} OR c.region_name ILIKE $${paramIdx} OR c.dong_name ILIKE $${paramIdx})`);
          values.push(`%${keyword}%`);
          paramIdx++;
        }
      }
    }

    // Filter: built_year minimum
    if (builtYearMin) {
      const year = parseInt(builtYearMin, 10);
      if (!isNaN(year)) {
        conditions.push(`c.built_year >= $${paramIdx}`);
        values.push(year);
        paramIdx++;
      }
    }

    // For price/size filters, we need to JOIN with apt_transactions
    const needsJoin = priceMin || priceMax || sizeMin || sizeMax;
    const txConditions: string[] = [];

    if (priceMin) {
      const p = parseInt(priceMin, 10);
      if (!isNaN(p)) {
        txConditions.push(`t.trade_price >= $${paramIdx}`);
        values.push(p);
        paramIdx++;
      }
    }
    if (priceMax) {
      const p = parseInt(priceMax, 10);
      if (!isNaN(p)) {
        txConditions.push(`t.trade_price <= $${paramIdx}`);
        values.push(p);
        paramIdx++;
      }
    }
    if (sizeMin) {
      const s = parseFloat(sizeMin);
      if (!isNaN(s)) {
        txConditions.push(`t.size_sqm >= $${paramIdx}`);
        values.push(s);
        paramIdx++;
      }
    }
    if (sizeMax) {
      const s = parseFloat(sizeMax);
      if (!isNaN(s)) {
        txConditions.push(`t.size_sqm <= $${paramIdx}`);
        values.push(s);
        paramIdx++;
      }
    }

    const complexWhere = conditions.length > 0 ? conditions.join(" AND ") : "TRUE";

    let sql: string;

    if (needsJoin) {
      // JOIN with transactions for price/size filtering
      const txWhere = txConditions.length > 0 ? `AND ${txConditions.join(" AND ")}` : "";
      sql = `SELECT DISTINCT c.id, c.apt_name, c.region_code, c.region_name, c.dong_name, c.built_year, c.slug
             FROM apt_complexes c
             INNER JOIN apt_transactions t ON t.region_code = c.region_code AND t.apt_name = c.apt_name
             WHERE ${complexWhere} ${txWhere}
             ORDER BY c.apt_name LIMIT 50`;
    } else {
      sql = `SELECT id, apt_name, region_code, region_name, dong_name, built_year, slug
             FROM apt_complexes c
             WHERE ${complexWhere}
             ORDER BY c.apt_name LIMIT 50`;
    }

    const result = await getPool().query(sql, values);

    return NextResponse.json({ results: result.rows });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e.message });
  }
}
