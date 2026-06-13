import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "아파트 비교",
  description: "관심 아파트를 최대 3개까지 선택해 최근 거래가, 최고가, 전월세 참고값, 거래 건수를 나란히 비교하세요.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "아파트 비교",
    description: "후보 단지의 최근 거래가와 전월세 참고값을 한 화면에서 비교하세요.",
    url: "/compare",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "아파트 비교",
    description: "관심 단지 후보를 나란히 놓고 가격과 거래 신호를 비교하세요.",
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
