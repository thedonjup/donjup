import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import Script from "next/script";
import ThemeProvider from "@/components/providers/ThemeProvider";
import AuthProvider from "@/components/providers/AuthProvider";
import MobileNav, { ThemeToggle } from "@/components/layout/MobileNav";
import UserMenu from "@/components/auth/UserMenu";
import PushPrompt from "@/components/PushPrompt";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://donjup.com"),
  title: {
    default: "돈줍 DonJup - 부동산 실거래가 & 금리 대시보드",
    template: "%s | 돈줍",
  },
  description:
    "매일 자동 업데이트되는 전국 아파트 실거래가 폭락/신고가 랭킹과 대출 금리 정보. 오늘 가장 많이 떨어진 아파트를 확인하세요.",
  keywords: ["전국 아파트 실거래가", "부동산", "대출 금리", "주담대", "아파트 시세", "돈줍", "부동산 폭락", "서울 아파트", "부산 아파트", "대구 아파트", "경기 아파트", "인천 아파트"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "돈줍 DonJup",
    title: "돈줍 - 부동산 실거래가 폭락/신고가 랭킹",
    description: "매일 자동 업데이트되는 전국 아파트 폭락·신고가 랭킹과 금리 변동 정보",
    images: [{ url: "/logo.svg", width: 512, height: 512, alt: "돈줍 로고" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@donjup.official",
    title: "돈줍 - 부동산 실거래가 & 금리 대시보드",
    description: "매일 자동 업데이트되는 아파트 폭락/신고가 랭킹과 금리 변동 정보",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/logo.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  },
  other: {
    "google-adsense-account": "ca-pub-7637714403564102",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('donjup-theme');if(t)document.documentElement.setAttribute('data-theme',t);else if(matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()`,
          }}
        />
        {process.env.NEXT_PUBLIC_ADSENSE_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none"
        >
          본문으로 건너뛰기
        </a>
        <ThemeProvider>
          <AuthProvider>
          {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
            <Script
              src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=services,clusterer`}
              strategy="afterInteractive"
            />
          )}
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
          <Header />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
          <PushPrompt />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b" style={{ borderColor: "var(--color-border)", background: "var(--color-header-bg)", backdropFilter: "blur(12px)" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">
            ₩
          </div>
          <span className="text-lg font-extrabold tracking-tight t-text">
            돈줍
          </span>
        </Link>

        {/* Desktop Navigation — 1024px 이상에서만 표시 */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          <NavLink href="/today">오늘거래</NavLink>
          <NavLink href="/new-highs">신고가</NavLink>
          <NavLink href="/market">지역별</NavLink>
          <NavLink href="/rent">전월세</NavLink>
          <NavLink href="/rate">금리</NavLink>
          <NavLink href="/map">지도</NavLink>
          <HeaderSearchForm />
          <ThemeToggle />
          <UserMenu />
        </nav>

        {/* Mobile + Tablet: 1024px 미만 */}
        <div className="flex items-center gap-1 lg:hidden">
          <MobileSearchToggle />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors t-text-secondary hover:t-text"
      style={{ color: "var(--color-text-secondary)" }}
    >
      {children}
    </Link>
  );
}

function HeaderSearchForm() {
  return (
    <form action="/search" method="GET" className="ml-1">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          name="q"
          placeholder="아파트 검색"
          aria-label="아파트 검색"
          className="w-32 rounded-lg border py-1.5 pl-8 pr-2 text-xs transition focus:w-48 focus:outline-none focus:ring-2 focus:ring-brand-500"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface-card)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>
    </form>
  );
}

function MobileSearchToggle() {
  return (
    <a
      href="/search"
      className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
      style={{ color: "var(--color-text-secondary)" }}
      aria-label="검색"
    >
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </a>
  );
}

function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-black text-white">
              ₩
            </div>
            <span className="text-sm font-bold t-text">돈줍</span>
            <span className="text-xs t-text-tertiary">DonJup</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            <Link href="/today" className="transition hover:opacity-80">
              오늘의 거래
            </Link>
            <Link href="/new-highs" className="transition hover:opacity-80">
              오늘의 신고가
            </Link>
            <Link href="/market" className="transition hover:opacity-80">
              지역별 시세
            </Link>
            <Link href="/rent" className="transition hover:opacity-80">
              전월세 시세
            </Link>
            <Link href="/trend" className="transition hover:opacity-80">
              트렌드
            </Link>
            <Link href="/themes" className="transition hover:opacity-80">
              테마 컬렉션
            </Link>
            <Link href="/compare" className="transition hover:opacity-80">
              단지 비교
            </Link>
            <Link href="/rate" className="transition hover:opacity-80">
              금리 현황
            </Link>
            <Link href="/rate/calculator" className="transition hover:opacity-80">
              대출 계산기
            </Link>
            <Link href="/daily/archive" className="transition hover:opacity-80">
              데일리 리포트
            </Link>
            <Link href="/map" className="transition hover:opacity-80">
              지도
            </Link>
            <Link href="/search" className="transition hover:opacity-80">
              검색
            </Link>
            <Link href="/about" className="transition hover:opacity-80">
              서비스 소개
            </Link>
            <Link href="/privacy" className="transition hover:opacity-80">
              개인정보처리방침
            </Link>
            <a
              href="https://instagram.com/donjup.official"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:opacity-80"
            >
              Instagram
            </a>
          </div>
        </div>

        <div className="mt-6 border-t pt-6 text-center text-xs" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}>
          <p>
            출처: 국토교통부 실거래가 공개시스템 · 한국은행 ECOS
          </p>
          <p className="mt-1">
            본 서비스의 분석 데이터는 공공데이터를 가공한 것이며, 투자 판단의
            책임은 이용자에게 있습니다.
          </p>
          <p className="mt-2" style={{ color: "var(--color-text-tertiary)", opacity: 0.6 }}>
            &copy; {new Date().getFullYear()} 돈줍(DonJup). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
