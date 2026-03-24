import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "아파트 비교",
  description: "관심 아파트의 실거래가, 시세 변동, 매매 이력을 나란히 비교하세요.",
  alternates: { canonical: "/compare" },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
