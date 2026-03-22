import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대출 이자 계산기",
  description:
    "주택담보대출 월 상환액을 원리금균등·원금균등·만기일시 방식별로 비교 계산하세요. 금리 변동 시뮬레이션 포함.",
  keywords: [
    "대출 이자 계산기",
    "주담대 계산기",
    "원리금균등 계산",
    "원금균등 계산",
    "월 상환액",
    "대출 상환 스케줄",
  ],
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
