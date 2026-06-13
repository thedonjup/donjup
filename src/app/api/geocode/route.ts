import { NextResponse } from "next/server";
import { isAllowedSiteRequest } from "@/lib/api/site-origin";
import { geocodeAddress } from "@/lib/geocode-address";
import { parseBoundedTextQuery } from "@/lib/public-query";

export async function GET(request: Request) {
  if (!isAllowedSiteRequest(request.headers)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const address = parseBoundedTextQuery(searchParams.get("address"), {
    minLength: 2,
    maxLength: 120,
  });

  if (!address) {
    return NextResponse.json(
      { error: "Invalid address" },
      { status: 400 }
    );
  }

  const result = await geocodeAddress(address);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ lat: result.lat, lng: result.lng });
}
