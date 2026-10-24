import { ApiError } from "./errors";

interface FetchJsonOptions {
  timeoutMs?: number;
  revalidate?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Server-side JSON fetcher. Uses Next's fetch cache, an abort timeout,
 * upstream retry for transient failures and normalized ApiError semantics.
 */
export async function fetchJson(
  url: string,
  { timeoutMs = 12_000, revalidate = 600, headers, signal }: FetchJsonOptions = {},
): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();

    if (signal) {
      if (signal.aborted) controller.abort();
      signal.addEventListener("abort", abortFromCaller, { once: true });
    }

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "MeraCast/1.0 (https://meracast.vercel.app)",
          ...headers,
        },
        signal: controller.signal,
        next: { revalidate },
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 30);
        throw new ApiError("The weather provider is rate-limiting requests.", {
          status: 429,
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: Number.isFinite(retryAfter) ? retryAfter : 30,
        });
      }

      if (!response.ok) {
        throw new ApiError(`Weather provider returned ${response.status}.`, {
          status: response.status >= 500 ? 502 : response.status,
          code: response.status >= 500 ? "UPSTREAM_ERROR" : "BAD_REQUEST",
          retryable: response.status >= 500,
        });
      }

      return (await response.json()) as unknown;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && !error.retryable) throw error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new ApiError("The weather service timed out.", {
      status: 504,
      code: "UPSTREAM_TIMEOUT",
      retryable: true,
      cause: lastError,
    });
  }
  throw new ApiError("Could not reach the weather service.", {
    status: 502,
    code: "NETWORK_ERROR",
    retryable: true,
    cause: lastError,
  });
}

export function buildUrl(base: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}
