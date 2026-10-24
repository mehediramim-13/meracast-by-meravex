import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { favoritesQuerySchema } from "@/lib/api/schemas";
import { weatherProvider } from "@/lib/api/provider";
import { jsonError, jsonOk } from "@/lib/api/route-utils";

export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = favoritesQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid favorite locations." } },
        { status: 400 },
      );
    }
    const summaries = await weatherProvider.favoriteSummaries(parsed.data.points);
    return jsonOk({ summaries }, 600, 1800);
  } catch (error) {
    return jsonError(error);
  }
}
