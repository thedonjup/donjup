import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/api/coupang";

const KEYWORDS: Record<string, string> = {
  interior: "인테리어 소품",
  moving: "이사 준비물",
  book: "부동산 투자 책",
  appliance: "가전제품 인기",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? "book";
    const keyword = KEYWORDS[category] ?? KEYWORDS.book;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "4"), 10);

    const products = await searchProducts(keyword, limit);

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Coupang products API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
