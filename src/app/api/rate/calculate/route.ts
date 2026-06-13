import { NextResponse } from "next/server";
import { isAllowedSiteRequest } from "@/lib/api/site-origin";
import { calculateLoanResponse } from "@/lib/loan-calculation-result";
import { parseLoanCalculationRequest } from "@/lib/loan-calculation-request";

export async function POST(request: Request) {
  if (!isAllowedSiteRequest(request.headers)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = parseLoanCalculationRequest(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    return NextResponse.json(calculateLoanResponse(parsed.input, parsed.type));
  } catch {
    return NextResponse.json(
      { error: "?붿껌??泥섎━?????놁뒿?덈떎." },
      { status: 400 }
    );
  }
}
