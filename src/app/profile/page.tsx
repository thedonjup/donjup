"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import LoginModal from "@/components/auth/LoginModal";
import { getRecentComplexes, type RecentComplexItem } from "@/lib/recent-complexes";

interface FavoriteItem {
  govtComplexId?: string;
  slug?: string; // legacy
  aptName: string;
  regionName: string;
}

function getStoredFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem("donjup-favorites");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getStoredRecentComplexes(): RecentComplexItem[] {
  if (typeof window === "undefined") return [];

  try {
    return getRecentComplexes();
  } catch {
    return [];
  }
}

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [favorites] = useState<FavoriteItem[]>(getStoredFavorites);
  const [recentComplexes] = useState<RecentComplexItem[]>(getStoredRecentComplexes);
  const [showLogin, setShowLogin] = useState(true);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div
          className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand-600"
          style={{ borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
          로그인이 필요합니다
        </p>
        <LoginModal open={showLogin} onClose={() => { setShowLogin(false); router.replace("/"); }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Profile header */}
      <div
        className="rounded-2xl border p-6"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-card)",
        }}
      >
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full"
              referrerPolicy="no-referrer"
              unoptimized
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
              {(user.displayName ?? user.email ?? "U")[0]}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold t-text">
              {user.displayName ?? "사용자"}
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {user.email}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-surface-elevated)]"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Favorites */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold t-text">관심 단지</h2>
        {favorites.length === 0 ? (
          <div
            className="rounded-2xl border py-12 text-center"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-card)",
            }}
          >
            <p
              className="text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              아직 관심 단지가 없습니다.
            </p>
            <Link
              href="/"
              className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              단지 둘러보기
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((f, i) => (
              <Link
                key={f.govtComplexId ?? f.slug ?? i}
                href={f.govtComplexId ? `/apt/${f.govtComplexId}` : `/apt/${f.slug}`}
                className="card-hover rounded-2xl border p-4 transition-colors"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface-card)",
                }}
              >
                <p className="font-bold t-text text-sm truncate">
                  {f.aptName}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {f.regionName}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-bold t-text">최근 본 단지</h2>
        {recentComplexes.length === 0 ? (
          <div
            className="rounded-2xl border py-10 text-center"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-card)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
              최근 본 단지가 아직 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentComplexes.map((item) => (
              <Link
                key={item.govtComplexId}
                href={`/apt/${item.govtComplexId}`}
                className="card-hover rounded-2xl border p-4 transition-colors"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface-card)",
                }}
              >
                <p className="font-bold t-text text-sm truncate">{item.aptName}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {item.regionName}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
