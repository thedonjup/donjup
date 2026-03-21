import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "돈줍 DonJup - 부동산 실거래가 & 금리 대시보드",
    template: "%s | 돈줍",
  },
  description:
    "매일 자동 업데이트되는 아파트 실거래가 폭락/신고가 랭킹과 대출 금리 정보. 오늘 가장 많이 떨어진 아파트를 확인하세요.",
  keywords: ["아파트 실거래가", "부동산", "대출 금리", "주담대", "아파트 시세"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-gray-900">
          돈줍
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/rate/calculator" className="hover:text-gray-900">
            금리계산기
          </Link>
          <Link href="/rate" className="hover:text-gray-900">
            금리현황
          </Link>
          <Link href="/daily/archive" className="hover:text-gray-900">
            데일리리포트
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-xs text-gray-400">
        <p>
          출처: 국토교통부 실거래가 공개시스템, 한국은행 ECOS
        </p>
        <p className="mt-1">
          본 서비스의 분석 데이터는 공공데이터를 가공한 것이며, 투자 판단의
          책임은 이용자에게 있습니다.
        </p>
        <p className="mt-2 text-gray-300">
          &copy; {new Date().getFullYear()} 돈줍(DonJup)
        </p>
      </div>
    </footer>
  );
}
