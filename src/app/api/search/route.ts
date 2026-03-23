import { NextResponse } from "next/server";
import { Pool } from "pg";
import { REGION_HIERARCHY } from "@/lib/constants/region-codes";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 3,
});

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

  if (q.length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    const parts = q.split(/\s+/).filter(Boolean);
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (parts.length >= 2) {
      // 첫 단어: 지역, 나머지: 아파트명
      const regionPart = parts[0];
      const aptPart = parts.slice(1).join(" ");

      // 지역 매칭: region_code prefix OR region_name OR dong_name
      const sidoCode = SIDO_SEARCH_MAP[regionPart];
      if (sidoCode) {
        if (sidoCode.length === 2) {
          // 시/도 코드 (2자리) → region_code가 해당 prefix로 시작
          conditions.push(`region_code LIKE $${paramIdx}`);
          values.push(`${sidoCode}%`);
        } else {
          // 시군구 코드 (5자리) → 정확히 매칭
          conditions.push(`region_code = $${paramIdx}`);
          values.push(sidoCode);
        }
      } else {
        // 매핑 안 되면 텍스트 검색
        conditions.push(`(region_name ILIKE $${paramIdx} OR dong_name ILIKE $${paramIdx})`);
        values.push(`%${regionPart}%`);
      }
      paramIdx++;

      // 아파트명 부분 매칭
      conditions.push(`apt_name ILIKE $${paramIdx}`);
      values.push(`%${aptPart}%`);
      paramIdx++;
    } else {
      // 단일 키워드: 모든 필드에서 검색
      const keyword = parts[0];
      const sidoCode = SIDO_SEARCH_MAP[keyword];

      if (sidoCode) {
        if (sidoCode.length === 2) {
          conditions.push(`(region_code LIKE $${paramIdx} OR apt_name ILIKE $${paramIdx + 1} OR dong_name ILIKE $${paramIdx + 1})`);
          values.push(`${sidoCode}%`, `%${keyword}%`);
          paramIdx += 2;
        } else {
          conditions.push(`(region_code = $${paramIdx} OR apt_name ILIKE $${paramIdx + 1} OR dong_name ILIKE $${paramIdx + 1})`);
          values.push(sidoCode, `%${keyword}%`);
          paramIdx += 2;
        }
      } else {
        conditions.push(`(apt_name ILIKE $${paramIdx} OR region_name ILIKE $${paramIdx} OR dong_name ILIKE $${paramIdx})`);
        values.push(`%${keyword}%`);
        paramIdx++;
      }
    }

    // property_type 필터
    if (type !== 0) {
      conditions.push(`property_type = $${paramIdx}`);
      values.push(type);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT id, apt_name, region_code, region_name, dong_name, built_year, slug
                 FROM apt_complexes ${where}
                 ORDER BY apt_name LIMIT 50`;

    const result = await pool.query(sql, values);

    return NextResponse.json({ results: result.rows });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e.message });
  }
}
