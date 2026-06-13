import { DATA_UNAVAILABLE_MESSAGE } from "@/lib/public-api-error";
import type { Metadata } from "next";

export type DetailDataKind = "sale" | "rent" | "nearby";

export interface DetailDataStateCopy {
  kind: DetailDataKind;
  title: string;
  description: string;
}

export interface DetailPageUnavailableCopy {
  title: string;
  description: string;
  retryLabel: string;
  searchLabel: string;
}

const DETAIL_DATA_STATE_COPY: Record<DetailDataKind, DetailDataStateCopy> = {
  sale: {
    kind: "sale",
    title: "실거래 데이터를 불러오지 못했습니다",
    description: DATA_UNAVAILABLE_MESSAGE,
  },
  rent: {
    kind: "rent",
    title: "전월세 데이터를 불러오지 못했습니다",
    description: "매매 실거래는 볼 수 있지만 전월세 이력은 잠시 후 다시 확인해 주세요.",
  },
  nearby: {
    kind: "nearby",
    title: "주변 단지 데이터를 불러오지 못했습니다",
    description: "상세 정보는 계속 볼 수 있지만 같은 동네 다른 단지 목록은 잠시 지연되고 있습니다.",
  },
};

export function detailDataStateCopy(kind: DetailDataKind): DetailDataStateCopy {
  return DETAIL_DATA_STATE_COPY[kind];
}

export function detailUnavailableStates(states: {
  sale: boolean;
  rent: boolean;
  nearby: boolean;
}): DetailDataStateCopy[] {
  return (["sale", "rent", "nearby"] as const)
    .filter((kind) => states[kind])
    .map(detailDataStateCopy);
}

export function detailPageUnavailableCopy(): DetailPageUnavailableCopy {
  return {
    title: "단지 정보를 불러오지 못했습니다",
    description: DATA_UNAVAILABLE_MESSAGE,
    retryLabel: "다시 시도",
    searchLabel: "단지 검색",
  };
}

export function aptDetailUnavailableMetadata(canonicalPath?: string): Metadata {
  const copy = detailPageUnavailableCopy();

  return {
    title: `${copy.title} | 돈줍`,
    description: copy.description,
    ...(canonicalPath ? { alternates: { canonical: canonicalPath } } : {}),
    openGraph: {
      title: copy.title,
      description: copy.description,
      siteName: "돈줍 DonJup",
      locale: "ko_KR",
      type: "website",
    },
  };
}
