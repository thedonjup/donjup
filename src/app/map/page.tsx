import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import KakaoMap from "@/components/map/KakaoMap";
import type { MapTransaction } from "@/components/map/KakaoMap";

export const metadata: Metadata = {
  title: "지도로 보는 실거래가",
  description:
    "전국 아파트 실거래가를 지도에서 확인하세요. 폭락, 하락, 신고가 단지를 한눈에 파악할 수 있습니다.",
  openGraph: {
    title: "돈줍 - 지도로 보는 실거래가",
    description: "전국 아파트 실거래가를 지도에서 확인하세요.",
  },
};

export default async function MapPage() {
  const supabase = await createClient();

  // Fetch recent transactions that have geocoded complexes
  const { data: transactions } = await supabase
    .from("apt_transactions")
    .select(
      `
      id,
      apt_name,
      region_name,
      trade_price,
      change_rate,
      is_new_high,
      size_sqm,
      trade_date,
      complex_id,
      apt_complexes!inner (
        dong_name,
        slug,
        latitude,
        longitude
      )
    `,
    )
    .not("apt_complexes.latitude", "is", null)
    .not("apt_complexes.longitude", "is", null)
    .order("trade_date", { ascending: false })
    .limit(500);

  const mapTransactions: MapTransaction[] = (transactions ?? []).map((t: any) => ({
    id: t.id,
    apt_name: t.apt_name,
    region_name: t.region_name,
    dong_name: t.apt_complexes?.dong_name ?? null,
    trade_price: t.trade_price,
    change_rate: t.change_rate,
    is_new_high: t.is_new_high,
    slug: t.apt_complexes?.slug ?? "",
    latitude: t.apt_complexes?.latitude,
    longitude: t.apt_complexes?.longitude,
    size_sqm: t.size_sqm,
    trade_date: t.trade_date,
  }));

  return <KakaoMap transactions={mapTransactions} />;
}
