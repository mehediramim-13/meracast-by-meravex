import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { geocodeQuerySchema } from "@/lib/api/schemas";
import { weatherProvider } from "@/lib/api/provider";
import { jsonError, jsonOk } from "@/lib/api/route-utils";

export const revalidate = 86_400;

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = geocodeQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Search needs a city or region name." } },
        { status: 400 },
      );
    }
    const results = await weatherProvider.searchPlaces(
      parsed.data.q,
      parsed.data.lang ?? "en",
      parsed.data.count ?? 8,
    );
    return jsonOk({ results }, 86_400, 604_800);
  } catch (error) {
    return jsonError(error);
  }
}
