import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Script from "next/script";

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
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`}
            </Script>
          </>
        )}
        {process.env.NEXT_PUBLIC_ADSENSE_ID && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">
            ₩
          </div>
          <span className="text-lg font-extrabold tracking-tight text-dark-900">
            돈줍
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink href="/market">지역별</NavLink>
          <NavLink href="/rate">금리현황</NavLink>
          <NavLink href="/rate/calculator">계산기</NavLink>
          <NavLink href="/daily/archive">데일리</NavLink>
        </nav>

        {/* Mobile nav */}
        <nav className="flex items-center gap-3 sm:hidden text-sm">
          <Link href="/market" className="text-gray-600">지역별</Link>
          <Link href="/rate/calculator" className="text-gray-600">계산기</Link>
          <Link href="/daily/archive" className="text-gray-600">데일리</Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-surface-100 hover:text-dark-900"
    >
      {children}
    </Link>
  );
}

function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-black text-white">
              ₩
            </div>
            <span className="text-sm font-bold text-dark-900">돈줍</span>
            <span className="text-xs text-gray-400">DonJup</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <Link href="/about" className="transition hover:text-gray-600">
              서비스 소개
            </Link>
            <Link href="/privacy" className="transition hover:text-gray-600">
              개인정보처리방침
            </Link>
            <a
              href="https://instagram.com/donjupkr"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-gray-600"
            >
              Instagram
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-surface-100 pt-6 text-center text-xs text-gray-400">
          <p>
            출처: 국토교통부 실거래가 공개시스템 · 한국은행 ECOS
          </p>
          <p className="mt-1">
            본 서비스의 분석 데이터는 공공데이터를 가공한 것이며, 투자 판단의
            책임은 이용자에게 있습니다.
          </p>
          <p className="mt-2 text-gray-300">
            &copy; {new Date().getFullYear()} 돈줍(DonJup). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
