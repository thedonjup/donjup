import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const db = createServiceClient();
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "cardnews";

    let query = db
      .from("content_queue")
      .select("id, title, status, platform, created_at, content_type")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tab === "cardnews") {
      query = query.eq("content_type", "cardnews");
    } else if (tab === "seeding") {
      query = query.eq("content_type", "seeding");
    } else {
      // insta tab: cardnews that have been posted
      query = query.eq("content_type", "cardnews").eq("status", "posted");
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ items: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (e) {
    return NextResponse.json({ items: [], error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = createServiceClient();
    const body = await request.json();
    const { id, status } = body as { id: number; status: string };

    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }

    const { error } = await db
      .from("content_queue")
      .update({ status })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
