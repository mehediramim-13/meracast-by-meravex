import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { coordinatesQuerySchema } from "@/lib/api/schemas";
import { weatherProvider } from "@/lib/api/provider";
import { jsonError, jsonOk } from "@/lib/api/route-utils";
import { stablePlaceId } from "@/lib/utils";
import type { Place } from "@/types/geo";

export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = coordinatesQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid coordinates or place metadata." } },
        { status: 400 },
      );
    }
    const query = parsed.data;
    const place: Place = {
      id: stablePlaceId(query.lat, query.lon),
      name: query.name ?? `${query.lat.toFixed(2)}, ${query.lon.toFixed(2)}`,
      country: query.country ?? "",
      countryCode: query.countryCode,
      admin1: query.admin1,
      latitude: query.lat,
      longitude: query.lon,
      timezone: "auto",
    };

    const weather = await weatherProvider.forecast({
      latitude: query.lat,
      longitude: query.lon,
      place,
    });
    return jsonOk(weather, 600, 1800);
  } catch (error) {
    return jsonError(error);
  }
}
