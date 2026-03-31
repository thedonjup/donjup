"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { isAdmin } from "@/lib/admin/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/dam", label: "대시보드", icon: "📊" },
  { href: "/dam/content", label: "콘텐츠 관리", icon: "📝" },
  { href: "/dam/cron", label: "크론잡 관리", icon: "⏰" },
  { href: "/dam/data", label: "데이터 품질", icon: "🔍" },
  { href: "/dam/users", label: "회원 관리", icon: "👥" },
  { href: "/dam/comments", label: "댓글 관리", icon: "💬" },
  { href: "/dam/settings", label: "설정", icon: "⚙️" },
];

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const admin = isAdmin(user?.email ?? null);

  useEffect(() => {
    if (!loading && !admin) {
      const timeout = setTimeout(() => {
        router.push("/");
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [loading, admin, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          <p style={{ color: "var(--color-text-secondary)" }}>권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-5xl">🚫</div>
          <h1 className="mb-2 text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            접근 권한이 없습니다
          </h1>
          <p className="mb-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            관리자 계정으로 로그인해 주세요.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside
        className="hidden w-60 flex-shrink-0 flex-col border-r md:flex"
        style={{
          background: "var(--color-hero-via)",
          borderColor: "var(--color-admin-border)",
        }}
      >
        {/* Top bar */}
        <div className="flex h-14 items-center justify-between border-b px-4" style={{ borderColor: "var(--color-admin-border)" }}>
          <span className="text-sm font-bold text-white">돈줍 관리자</span>
          <Link
            href="/"
            className="rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-white"
          >
            사이트로 &rarr;
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dam" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-brand-600 text-white"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info */}
        <div className="border-t p-3" style={{ borderColor: "var(--color-admin-border)" }}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">
                {user?.displayName || "관리자"}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex border-t md:hidden"
        style={{ background: "var(--color-hero-via)", borderColor: "var(--color-admin-border)" }}
      >
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dam" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                isActive ? "text-brand-400" : "text-slate-400"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label.replace(" 관리", "")}</span>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0" style={{ background: "var(--color-surface-page)" }}>
        <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
