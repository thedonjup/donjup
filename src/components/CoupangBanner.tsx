"use client";

import { useEffect, useState } from "react";

interface Product {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  categoryName: string;
  isRocket: boolean;
}

interface CoupangBannerProps {
  category?: "book" | "interior" | "moving" | "appliance";
  limit?: number;
  title?: string;
  className?: string;
}

export default function CoupangBanner({
  category = "book",
  limit = 3,
  title = "추천 상품",
  className = "",
}: CoupangBannerProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`/api/coupang/products?category=${category}&limit=${limit}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [category, limit]);

  if (products.length === 0) return null;

  return (
    <div className={className}>
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-text-tertiary)" }}>
          {title}
        </p>
        <div className="space-y-3">
          {products.map((p) => (
            <a
              key={p.productId}
              href={p.productUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex items-center gap-3 group"
            >
              <img
                src={p.productImage}
                alt={p.productName}
                width={56}
                height={56}
                className="rounded-lg object-cover flex-shrink-0"
                style={{ width: 56, height: 56 }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate group-hover:underline"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {p.productName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {p.productPrice.toLocaleString()}원
                  </span>
                  {p.isRocket && (
                    <span className="text-[10px] font-bold text-blue-500">로켓배송</span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-center" style={{ color: "var(--color-text-tertiary)" }}>
          이 포스팅은 쿠팡 파트너스 활동의 일환으로 일정 커미션을 받을 수 있습니다
        </p>
      </div>
    </div>
  );
}
