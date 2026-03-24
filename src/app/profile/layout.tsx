import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "내 프로필",
  description: "돈줍 프로필 - 관심 아파트, 알림 설정, 계정 관리",
  alternates: { canonical: "/profile" },
  robots: { index: false, follow: false },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
