import { NextRequest, NextResponse } from "next/server";
import {
  calcEqualPayment,
  calcEqualPrincipal,
  calcBullet,
  type LoanInput,
} from "@/lib/calculator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { principal, rate, years, type } = body as {
      principal: number;
      rate: number;
      years: number;
      type?: string;
    };

    // 입력값 검증
    if (!principal || !rate || !years) {
      return NextResponse.json(
        { error: "principal, rate, years는 필수입니다." },
        { status: 400 }
      );
    }

    if (principal <= 0 || principal > 10_000_000_000) {
      return NextResponse.json(
        { error: "대출 원금은 1원~100억원 사이여야 합니다." },
        { status: 400 }
      );
    }

    if (rate <= 0 || rate > 30) {
      return NextResponse.json(
        { error: "금리는 0~30% 사이여야 합니다." },
        { status: 400 }
      );
    }

    if (years <= 0 || years > 50) {
      return NextResponse.json(
        { error: "상환 기간은 1~50년 사이여야 합니다." },
        { status: 400 }
      );
    }

    const input: LoanInput = { principal, rate, years };

    const results = {
      equal_payment: calcEqualPayment(input),
      equal_principal: calcEqualPrincipal(input),
      bullet: calcBullet(input),
    };

    // 특정 타입만 요청한 경우
    if (type && type in results) {
      return NextResponse.json(results[type as keyof typeof results]);
    }

    // 전체 비교 (스케줄은 처음 12개월만)
    return NextResponse.json({
      input: { principal, rate, years },
      comparison: {
        equal_payment: {
          monthlyPayment: results.equal_payment.monthlyPayment,
          totalInterest: results.equal_payment.totalInterest,
          totalPayment: results.equal_payment.totalPayment,
        },
        equal_principal: {
          monthlyPayment: results.equal_principal.monthlyPayment,
          totalInterest: results.equal_principal.totalInterest,
          totalPayment: results.equal_principal.totalPayment,
        },
        bullet: {
          monthlyPayment: results.bullet.monthlyPayment,
          totalInterest: results.bullet.totalInterest,
          totalPayment: results.bullet.totalPayment,
        },
      },
      schedule_preview: results.equal_payment.schedule.slice(0, 12),
    });
  } catch {
    return NextResponse.json(
      { error: "요청을 처리할 수 없습니다." },
      { status: 400 }
    );
  }
}
