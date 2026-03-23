"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

interface FavoriteItem {
  slug: string;
  aptName: string;
  regionName: string;
}

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("donjup-favorites");
      if (raw) {
        setFavorites(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

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

  if (!user) return null;

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
            <img
              src={user.photoURL}
              alt=""
              className="h-16 w-16 rounded-full"
              referrerPolicy="no-referrer"
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
            {favorites.map((f) => (
              <Link
                key={f.slug}
                href={`/apt/${f.slug}`}
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
    </div>
  );
}
