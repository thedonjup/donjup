import { NextResponse } from "next/server";

const cache = new Map<string, { lat: number; lng: number; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "address 파라미터가 필요합니다" },
      { status: 400 },
    );
  }

  // Check cache
  const cached = cache.get(address);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ lat: cached.lat, lng: cached.lng });
  }

  const restKey = process.env.KAKAO_REST_KEY;
  if (!restKey) {
    return NextResponse.json(
      { error: "KAKAO_REST_KEY가 설정되지 않았습니다" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: { Authorization: `KakaoAK ${restKey}` },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Kakao API 오류: ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();

    if (!data.documents || data.documents.length === 0) {
      return NextResponse.json(
        { error: "주소를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const doc = data.documents[0];
    const lat = parseFloat(doc.y);
    const lng = parseFloat(doc.x);

    // Store in cache
    cache.set(address, { lat, lng, ts: Date.now() });

    return NextResponse.json({ lat, lng });
  } catch {
    return NextResponse.json(
      { error: "지오코딩 요청 실패" },
      { status: 500 },
    );
  }
}
