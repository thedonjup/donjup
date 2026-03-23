import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 동적 import로 테스트
    const pg = await import("postgres");
    const sql = pg.default(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
    const result = await sql`SELECT count(*) as cnt FROM apt_transactions`;
    await sql.end();
    return NextResponse.json({ count: result[0]?.cnt, ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.split("\n").slice(0, 3) }, { status: 500 });
  }
}
