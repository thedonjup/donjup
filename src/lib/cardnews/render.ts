import { ImageResponse } from "next/og";
import React from "react";
import { Cover } from "./templates/cover";
import { RankItemCard } from "./templates/rank-item";
import { Cta, type CtaVariant } from "./templates/cta";
import type { CardType, RankItem } from "./types";

const NOTO_SANS_KR_URL =
  "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLGC.ttf";

async function loadFont(): Promise<ArrayBuffer> {
  const res = await fetch(NOTO_SANS_KR_URL);
  return res.arrayBuffer();
}

const SIZE = { width: 1080, height: 1080 };

async function renderToBuffer(element: React.ReactElement): Promise<Buffer> {
  const fontData = await loadFont();

  const response = new ImageResponse(element, {
    ...SIZE,
    fonts: [
      {
        name: "Noto Sans KR",
        data: fontData,
        weight: 700,
        style: "normal",
      },
    ],
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateCardNews(
  date: string,
  cardType: CardType,
  items: RankItem[]
): Promise<Buffer[]> {
  const top3 = items.slice(0, 3).map((item, i) => ({
    ...item,
    rank: i + 1,
  }));

  const buffers: Buffer[] = [];

  // 1. Cover
  buffers.push(
    await renderToBuffer(React.createElement(Cover, { date, cardType }))
  );

  // 2. Rank items (up to 3)
  for (const item of top3) {
    buffers.push(
      await renderToBuffer(
        React.createElement(RankItemCard, { item, cardType })
      )
    );
  }

  // 3. CTA (날짜 기반 A/B/C/D 로테이션)
  const variants: CtaVariant[] = ["A", "B", "C", "D"];
  const hash = date.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const variant = variants[hash % variants.length];
  buffers.push(await renderToBuffer(React.createElement(Cta, { variant })));

  return buffers;
}
