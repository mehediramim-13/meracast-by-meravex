import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { reverseQuerySchema } from "@/lib/api/schemas";
import { weatherProvider } from "@/lib/api/provider";
import { jsonError, jsonOk } from "@/lib/api/route-utils";

export const revalidate = 86_400;

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = reverseQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid pin coordinates." } },
        { status: 400 },
      );
    }
    const place = await weatherProvider.reverseGeocode(
      parsed.data.lat,
      parsed.data.lon,
      parsed.data.lang ?? "en",
    );
    if (!place) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No place name found for this point." } },
        { status: 404 },
      );
    }
    return jsonOk(place, 86_400, 604_800);
  } catch (error) {
    return jsonError(error);
  }
}
