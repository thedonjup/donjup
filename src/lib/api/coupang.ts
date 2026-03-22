import crypto from "crypto";

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY ?? "";
const SECRET_KEY = process.env.COUPANG_SECRET_KEY ?? "";
const AF_CODE = process.env.COUPANG_AF_CODE ?? "";

interface CoupangProduct {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  categoryName: string;
  isRocket: boolean;
}

function generateHmac(method: string, path: string, query: string): string {
  const datetime = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z/, "Z");

  const message = `${datetime}${method}${path}${query}`;
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(message)
    .digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`;
}

export async function searchProducts(
  keyword: string,
  limit: number = 5
): Promise<CoupangProduct[]> {
  if (!ACCESS_KEY || !SECRET_KEY) return [];

  const path = "/v2/providers/affiliate_open_api/apis/openapi/products/search";
  const query = `keyword=${encodeURIComponent(keyword)}&limit=${limit}&subId=${AF_CODE}`;

  const authorization = generateHmac("GET", path, query);

  try {
    const res = await fetch(
      `https://api-gateway.coupang.com${path}?${query}`,
      {
        headers: { Authorization: authorization },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) return [];

    const json = await res.json();
    const items = json.data ?? [];

    return items.map((item: Record<string, unknown>) => ({
      productId: item.productId,
      productName: item.productName,
      productPrice: item.productPrice,
      productImage: item.productImage,
      productUrl: item.productUrl,
      categoryName: item.categoryName ?? "",
      isRocket: item.isRocket ?? false,
    }));
  } catch {
    return [];
  }
}

export function generateDeepLink(originalUrl: string): string {
  if (!AF_CODE) return originalUrl;
  return `https://link.coupang.com/re/AFFTDP?lptag=${AF_CODE}&pageKey=${encodeURIComponent(originalUrl)}`;
}
