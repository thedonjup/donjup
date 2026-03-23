import Link from "next/link";
import type { Metadata } from "next";
import { formatPrice, formatSizeWithPyeong } from "@/lib/format";
import AdSlot from "@/components/ads/AdSlot";
import PropertyTypeFilter from "@/components/PropertyTypeFilter";

type SearchPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  if (query) {
    return {
      title: `"${query}" 아파트 검색 결과`,
      description: `"${query}" 관련 전국 아파트 실거래가, 시세 변동, 매매 이력을 확인하세요. 돈줍에서 아파트 시세를 한눈에 비교.`,
      keywords: [
        `${query} 아파트`,
        `${query} 실거래가`,
        `${query} 시세`,
        "아파트 검색",
        "아파트 실거래가",
        "아파트 시세 조회",
      ],
    };
  }

  return {
    title: "아파트 검색",
    description:
      "전국 아파트를 검색하고 실거래가, 시세 변동, 매매 이력을 확인하세요. 아파트명으로 간편 검색.",
    keywords: [
      "아파트 검색",
      "아파트 실거래가 검색",
      "아파트 시세 조회",
      "전국 아파트",
      "부동산 검색",
    ],
  };
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const { q, type: typeParam } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const propertyType = typeof typeParam === "string" ? parseInt(typeParam, 10) : 1;
  const validType = [0, 1, 2, 3].includes(propertyType) ? propertyType : 1;

  let results: Array<{
    id: string;
    apt_name: string;
    region_code: string;
    region_name: string;
    dong_name: string | null;
    sido_name: string | null;
    sigungu_name: string | null;
    built_year: number | null;
    slug: string;
    latest_trade_price: number | null;
  }> = [];

  if (query.length > 0) {
    try {
      // 서버사이드 검색 API 호출 (시/도명 매핑 + 부분 매칭 지원)
      const origin = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
      const res = await fetch(
        `${origin}/api/search?q=${encodeURIComponent(query)}&type=${validType}`,
        { next: { revalidate: 300 } }
      );
      const json = await res.json();
      results = (json.results ?? []).map((d: any) => ({
        ...d,
        sido_name: null,
        sigungu_name: null,
        latest_trade_price: null,
      }));
    } catch {
      // DB 연결 실패 또는 타임아웃 시 빈 데이터로 페이지 렌더링
    }
  }

  return (
    <div>
      <PropertyTypeFilter currentType={validType} />
      <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block h-5 w-1.5 rounded-full bg-brand-600" />
          <h1 className="text-2xl font-extrabold t-text">아파트 검색</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          지역 + 아파트명으로 검색하여 실거래가를 확인하세요
        </p>
      </div>

      {/* Search Form */}
      <form action="/search" method="GET" className="mb-8">
        {validType !== 1 && <input type="hidden" name="type" value={validType} />}
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="지역+아파트명 검색 (예: 동대문 두산, 강남 원베일리, 송파 주공)"
            aria-label="아파트 검색어 입력"
            className="flex-1 rounded-xl border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-card)",
              color: "var(--color-text-primary)",
            }}
            autoFocus
          />
          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            검색
          </button>
        </div>
      </form>

      {/* Results */}
      {query.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl text-2xl" style={{ background: "var(--color-surface-elevated)" }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--color-text-tertiary)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="mt-4 font-semibold t-text">아파트명 또는 지역명을 검색하세요</p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            전국 아파트의 실거래가와 시세 변동을 확인할 수 있습니다
          </p>
        </div>
      ) : results.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed p-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="font-semibold t-text">&ldquo;{query}&rdquo; 검색 결과가 없습니다</p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            다른 검색어로 다시 시도해 주세요
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            &ldquo;{query}&rdquo; 검색 결과 {results.length}건
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((apt) => (
              <Link
                key={apt.id}
                href={`/apt/${apt.region_code}/${apt.slug}`}
                className="card-hover block rounded-2xl border p-5 transition"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface-card)",
                }}
              >
                <p className="font-bold t-text truncate">{apt.apt_name}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {[apt.sido_name, apt.sigungu_name, apt.dong_name]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  {apt.built_year && (
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {apt.built_year}년 준공
                    </span>
                  )}
                  {apt.latest_trade_price ? (
                    <span className="text-sm font-bold tabular-nums t-text">
                      {formatPrice(apt.latest_trade_price)}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      거래 정보 없음
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <AdSlot slotId="search-infeed" format="infeed" className="mt-6" />
        </>
      )}
    </div>
    </div>
  );
}
