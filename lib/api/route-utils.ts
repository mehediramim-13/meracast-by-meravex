import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { ApiError, toApiError } from "./errors";

export function jsonOk(data: unknown, maxAge = 600, staleWhileRevalidate = 1800): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    },
  });
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Some parameters were missing or invalid.",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  const apiError = toApiError(error);
  const headers: Record<string, string> = {};
  if (apiError.retryAfter) headers["Retry-After"] = String(Math.round(apiError.retryAfter));
  return NextResponse.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message,
        retryable: apiError.retryable,
      },
    },
    { status: apiError.status, headers },
  );
}

export function parseQuery<T>(url: string, schema: ZodSchema<T>): T {
  const params = Object.fromEntries(new URL(url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw new ApiError("The request parameters were invalid.", {
      status: 400,
      code: "BAD_REQUEST",
      retryable: false,
      cause: parsed.error,
    });
  }
  return parsed.data;
}

export function coordsFromQuery(url: string): { lat: number; lon: number } {
  const params = new URL(url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new ApiError("Latitude or longitude is invalid.", {
      status: 400,
      code: "BAD_REQUEST",
    });
  }
  return { lat, lon };
}
