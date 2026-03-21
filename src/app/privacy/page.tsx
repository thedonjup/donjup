import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "돈줍(DonJup) 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-gray-500">시행일: 2026년 3월 22일</p>

      <div className="mt-8 space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900">1. 수집하는 개인정보</h2>
          <p className="mt-2">
            돈줍은 서비스 제공을 위해 최소한의 정보만 수집합니다.
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>웹 푸시 알림 구독 시: 브라우저 푸시 토큰 (개인 식별 불가)</li>
            <li>자동 수집: 방문 페이지, 방문 시간, 브라우저 유형 (Google Analytics)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900">2. 개인정보의 이용 목적</h2>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>서비스 이용 통계 분석 및 서비스 개선</li>
            <li>관심 단지 폭락 알림 발송 (웹 푸시 구독 시)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900">3. 개인정보의 보유 및 파기</h2>
          <p className="mt-2">
            수집된 데이터는 서비스 운영 기간 동안 보유하며, 서비스 종료 시
            지체없이 파기합니다. 웹 푸시 구독 해제 시 관련 토큰은 즉시 삭제됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900">4. 제3자 서비스</h2>
          <p className="mt-2">돈줍은 아래 제3자 서비스를 이용합니다.</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Google Analytics — 방문 통계 분석</li>
            <li>Google AdSense — 광고 표시</li>
            <li>Supabase — 데이터 저장</li>
            <li>Vercel — 웹사이트 호스팅</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900">5. 쿠키 사용</h2>
          <p className="mt-2">
            돈줍은 서비스 개선 및 광고 제공을 위해 쿠키를 사용할 수 있습니다.
            브라우저 설정에서 쿠키를 비활성화할 수 있으나, 일부 기능이 제한될 수
            있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900">6. 문의</h2>
          <p className="mt-2">
            개인정보 관련 문의: donjupkr@gmail.com
          </p>
        </section>
      </div>
    </div>
  );
}
