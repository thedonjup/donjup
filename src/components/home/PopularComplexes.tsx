import Link from "next/link";

interface PopularItem {
  page_path: string;
  page_type: string | null;
  view_count: number;
}

interface PopularComplexesProps {
  items: PopularItem[];
}

export default function PopularComplexes({ items }: PopularComplexesProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border t-border t-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold t-text">인기 단지 TOP</h2>
        <span className="text-[10px] t-text-tertiary">최근 7일 조회수</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item, i) => {
          const pathParts = item.page_path.split("/");
          const slug = pathParts[3] ?? "";
          const slugParts = slug.split("-");
          const displayName =
            slugParts.length > 1
              ? decodeURIComponent(slugParts.slice(1).join(" "))
              : decodeURIComponent(slug);

          return (
            <Link
              key={item.page_path}
              href={item.page_path}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-[var(--color-surface-elevated)]"
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                  i < 3 ? "bg-brand-600 text-white" : "t-elevated t-text-tertiary"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate text-sm font-medium t-text">
                {displayName}
              </span>
              <span className="flex-shrink-0 text-xs tabular-nums t-text-tertiary">
                {item.view_count.toLocaleString()}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
