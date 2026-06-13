import { DATA_UNAVAILABLE_MESSAGE } from "@/lib/public-api-error";

export type MapFilter = "all" | "drop" | "high";

export interface MapEmptyStateCopy {
  title: string;
  description: string;
}

const FILTER_EMPTY_COPY: Record<MapFilter, MapEmptyStateCopy> = {
  all: {
    title: "표시할 지도 거래가 없습니다",
    description: "최근 좌표가 연결된 거래가 생기면 지도에 자동으로 표시됩니다.",
  },
  drop: {
    title: "급락/하락 거래가 없습니다",
    description: "현재 조건에 맞는 하락 신호가 없어 전체 거래를 함께 확인해 보세요.",
  },
  high: {
    title: "신고가 거래가 없습니다",
    description: "현재 조건에 맞는 신고가 신호가 없어 전체 거래를 함께 확인해 보세요.",
  },
};

export function mapEmptyStateCopy(
  dataUnavailable: boolean,
  filter: MapFilter = "all"
): MapEmptyStateCopy {
  if (dataUnavailable) {
    return {
      title: "지도 데이터를 불러오지 못했습니다",
      description: DATA_UNAVAILABLE_MESSAGE,
    };
  }

  return FILTER_EMPTY_COPY[filter];
}
