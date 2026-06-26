/**
 * JSON-LD 구조화 데이터 공통 컴포넌트
 *
 * 사용법:
 *   <JsonLd data={structuredData} />
 *   <BreadcrumbJsonLd items={[{ name: "홈", href: "/" }, ...]} />
 *   <FaqJsonLd items={[{ question: "...", answer: "..." }]} />
 *   <ItemListJsonLd name="..." items={[{ name, url, position }]} />
 *   <FinancialProductJsonLd name="..." description="..." url="..." />
 *   <DatasetJsonLd name="..." description="..." url="..." />
 */

// ---------- 범용 JSON-LD ----------

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLdData = { [key: string]: JsonLdValue };

export function serializeJsonLd(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
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

// ---------- FinancialProduct ----------

export function FinancialProductJsonLd({
  name,
  description,
  url,
  providerName = "돈줍",
  annualPercentageRate,
}: {
  name: string;
  description: string;
  url: string;
  providerName?: string;
  annualPercentageRate?: number | null;
}) {
  const data: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name,
    description,
    url,
    provider: {
      "@type": "Organization",
      name: providerName,
      url: "https://donjup.com",
    },
  };

  if (annualPercentageRate !== null && annualPercentageRate !== undefined) {
    data.interestRate = {
      "@type": "QuantitativeValue",
      value: annualPercentageRate,
      unitText: "PERCENT",
    };
  }

  return <JsonLd data={data} />;
}

// ---------- Dataset ----------

export function DatasetJsonLd({
  name,
  description,
  url,
  keywords,
  temporalCoverage,
}: {
  name: string;
  description: string;
  url: string;
  keywords?: string[];
  temporalCoverage?: string | null;
}) {
  const data: JsonLdData = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url,
    creator: {
      "@type": "Organization",
      name: "돈줍",
      url: "https://donjup.com",
    },
    isAccessibleForFree: true,
    license: "https://www.data.go.kr/ugs/selectPortalPolicyView.do",
  };

  if (keywords && keywords.length > 0) {
    data.keywords = keywords;
  }
  if (temporalCoverage) {
    data.temporalCoverage = temporalCoverage;
  }

  return <JsonLd data={data} />;
}
