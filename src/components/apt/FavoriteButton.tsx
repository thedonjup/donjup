"use client";

import { useState, useEffect } from "react";

interface FavoriteButtonProps {
  slug: string;
  aptName: string;
  regionName: string;
}

interface FavoriteItem {
  slug: string;
  aptName: string;
  regionName: string;
}

const STORAGE_KEY = "donjup-favorites";

function getFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFavorites(items: FavoriteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable
  }
}

export default function FavoriteButton({ slug, aptName, regionName }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const favorites = getFavorites();
    setIsFavorited(favorites.some((f) => f.slug === slug));
  }, [slug]);

  function handleToggle() {
    const favorites = getFavorites();
    const index = favorites.findIndex((f) => f.slug === slug);

    if (index >= 0) {
      favorites.splice(index, 1);
      setIsFavorited(false);
    } else {
      favorites.push({ slug, aptName, regionName });
      setIsFavorited(true);
    }

    setFavorites(favorites);
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={isFavorited ? "관심 단지 해제" : "관심 단지 등록"}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
      style={{
        borderColor: isFavorited ? "var(--color-semantic-rise)" : "var(--color-border)",
        color: isFavorited ? "var(--color-semantic-rise)" : "var(--color-text-secondary)",
        background: "var(--color-surface-card)",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={isFavorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
      {isFavorited ? "관심" : "관심 등록"}
    </button>
  );
}
