import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { coordinatesQuerySchema } from "@/lib/api/schemas";
import { weatherProvider } from "@/lib/api/provider";
import { jsonError, jsonOk } from "@/lib/api/route-utils";

export const revalidate = 900;

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = coordinatesQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid coordinates." } },
        { status: 400 },
      );
    }
    const air = await weatherProvider.airQuality({
      latitude: parsed.data.lat,
      longitude: parsed.data.lon,
    });
    return jsonOk(air, 900, 1800);
  } catch (error) {
    return jsonError(error);
  }
}
