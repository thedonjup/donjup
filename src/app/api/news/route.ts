import { searchNews } from "@/lib/api/naver-news";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return Response.json(
      { error: "q 파라미터가 필요합니다" },
      { status: 400 }
    );
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);

  try {
    const items = await searchNews(query, ac.signal);
    clearTimeout(timer);
    return Response.json(items);
  } catch {
    clearTimeout(timer);
    return Response.json([], { status: 200 });
  }
}
