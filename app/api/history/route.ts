import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { historyQuerySchema } from "@/lib/api/schemas";
import { weatherProvider } from "@/lib/api/provider";
import { jsonError, jsonOk } from "@/lib/api/route-utils";

export const revalidate = 86_400;

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = historyQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid historical request." } },
        { status: 400 },
      );
    }
    const comparison = await weatherProvider.climate({
      latitude: parsed.data.lat,
      longitude: parsed.data.lon,
      date: parsed.data.date,
    });
    return jsonOk(comparison, 86_400, 604_800);
  } catch (error) {
    return jsonError(error);
  }
}
