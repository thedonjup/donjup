/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * JSON-LD 구조화 데이터 공통 컴포넌트
 *
 * 사용법:
 *   <JsonLd data={structuredData} />
 *   <BreadcrumbJsonLd items={[{ name: "홈", href: "/" }, ...]} />
 *   <FaqJsonLd items={[{ question: "...", answer: "..." }]} />
 *   <ItemListJsonLd name="..." items={[{ name, url, position }]} />
 */

// ---------- 범용 JSON-LD ----------

export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------- BreadcrumbList ----------

interface BreadcrumbItem {
  name: string;
  href: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `https://donjup.com${item.href}`,
    })),
  };
  return <JsonLd data={data} />;
}

// ---------- FAQPage ----------

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
  return <JsonLd data={data} />;
}

// ---------- ItemList ----------

interface ItemListEntry {
  name: string;
  url: string;
  position?: number;
}

export function ItemListJsonLd({
  name,
  items,
}: {
  name: string;
  items: ItemListEntry[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: item.position ?? i + 1,
      name: item.name,
      url: item.url,
    })),
  };
  return <JsonLd data={data} />;
}
