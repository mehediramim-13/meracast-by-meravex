import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { gridQuerySchema } from "@/lib/api/schemas";
import { weatherProvider } from "@/lib/api/provider";
import { jsonError, jsonOk } from "@/lib/api/route-utils";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = gridQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid map sample points." } },
        { status: 400 },
      );
    }
    const points = await weatherProvider.windGrid(parsed.data.points);
    return jsonOk({ points }, 300, 900);
  } catch (error) {
    return jsonError(error);
  }
}
