import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`SELECT count(*) as cnt FROM apt_transactions`;
    return NextResponse.json({ count: result[0]?.cnt, ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
