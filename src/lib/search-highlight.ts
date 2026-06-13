export interface SearchHighlightSegment {
  text: string;
  highlighted: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchHighlightSegments(
  text: string,
  query: string,
): SearchHighlightSegment[] {
  const terms = Array.from(new Set(query.split(/\s+/).map((part) => part.trim()).filter(Boolean)))
    .sort((a, b) => b.length - a.length);

  if (terms.length === 0 || text.length === 0) {
    return [{ text, highlighted: false }];
  }

  const pattern = new RegExp(terms.map(escapeRegExp).join("|"), "gi");
  const segments: SearchHighlightSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchText = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), highlighted: false });
    }

    segments.push({ text: matchText, highlighted: true });
    lastIndex = index + matchText.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return segments.length > 0 ? segments : [{ text, highlighted: false }];
}
