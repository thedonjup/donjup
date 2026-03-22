import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import Script from "next/script";
import ThemeProvider from "@/components/providers/ThemeProvider";
import MobileNav, { ThemeToggle } from "@/components/layout/MobileNav";
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
    "매일 자동 업데이트되는 아파트 실거래가 폭락/신고가 랭킹과 대출 금리 정보. 오늘 가장 많이 떨어진 아파트를 확인하세요.",
  keywords: ["아파트 실거래가", "부동산", "대출 금리", "주담대", "아파트 시세", "돈줍", "부동산 폭락"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "돈줍 DonJup",
    title: "돈줍 - 부동산 실거래가 폭락/신고가 랭킹",
    description: "매일 자동 업데이트되는 서울 아파트 폭락·신고가 랭킹과 금리 변동 정보",
  },
  twitter: {
    card: "summary_large_image",
    title: "돈줍 - 부동산 실거래가 & 금리 대시보드",
    description: "매일 자동 업데이트되는 아파트 폭락/신고가 랭킹과 금리 변동 정보",
  },
  icons: {
    icon: "/favicon.ico",
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
        <ThemeProvider>
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
          <main className="flex-1">{children}</main>
          <Footer />
          <PushPrompt />
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

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink href="/market">지역별</NavLink>
          <NavLink href="/rate">금리현황</NavLink>
          <NavLink href="/rate/calculator">계산기</NavLink>
          <NavLink href="/daily/archive">데일리</NavLink>
          <ThemeToggle />
        </nav>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex items-center gap-1 sm:hidden">
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
          <div className="flex items-center gap-6 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            <Link href="/about" className="transition hover:opacity-80">
              서비스 소개
            </Link>
            <Link href="/privacy" className="transition hover:opacity-80">
              개인정보처리방침
            </Link>
            <a
              href="https://instagram.com/donjupkr"
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
