import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 소개",
  description: "돈줍(DonJup) - 매일 자동 업데이트되는 부동산 실거래가 폭락/신고가 랭킹과 금리 정보 서비스",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">돈줍(DonJup) 소개</h1>

      <section className="mt-8 space-y-4 text-gray-700">
        <p>
          <strong>돈줍</strong>은 매일 자동으로 업데이트되는 부동산 실거래가 분석
          서비스입니다. 국토교통부 공공데이터와 한국은행 금리 데이터를 자동
          수집하여, 아파트 폭락/신고가 랭킹과 대출 금리 변동 정보를 제공합니다.
        </p>

        <h2 className="mt-8 text-xl font-bold">서비스 특징</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>매일 자동 업데이트</strong> — 공공데이터를 자동 수집하여 최신
            실거래가 정보를 제공합니다.
          </li>
          <li>
            <strong>극단적 데이터 필터링</strong> — 최고가 대비 폭락 거래, 신고가
            갱신 거래를 자동으로 추출합니다.
          </li>
          <li>
            <strong>금리 대시보드</strong> — 기준금리, COFIX, CD금리 등 주요 금리
            지표를 한눈에 확인할 수 있습니다.
          </li>
          <li>
            <strong>대출 이자 계산기</strong> — 원리금균등/원금균등/만기일시 3가지
            방식을 비교할 수 있습니다.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-bold">데이터 출처</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>국토교통부 실거래가 공개시스템 (공공데이터포털)</li>
          <li>한국은행 경제통계시스템 (ECOS)</li>
        </ul>

        <h2 className="mt-8 text-xl font-bold">면책 조항</h2>
        <p>
          본 서비스에서 제공하는 데이터는 공공데이터를 가공한 참고 자료이며,
          투자 판단의 근거로 사용할 수 없습니다. 투자에 따른 손실은 투자자
          본인에게 귀속됩니다.
        </p>

        <h2 className="mt-8 text-xl font-bold">연락처</h2>
        <p>문의: donjupkr@gmail.com</p>
      </section>
    </div>
  );
}
