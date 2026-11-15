export interface FetchRetryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

/**
 * Fetches an external resource with an 8-second AbortController timeout
 * and up to 2 retries with exponential backoff.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? Number(process.env.UPSTREAM_TIMEOUT_MS || 8000);
  const maxRetries = options.maxRetries ?? 2;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'EarthSonic-SpaceApps2026/1.0 (https://github.com/earthsonic)',
          ...options.headers
        }
      });
      clearTimeout(timer);

      if (response.ok) {
        return response;
      }

      // Do not retry 4xx client errors (except 429 rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`Upstream HTTP ${response.status} from ${url}`);
      }

      lastError = new Error(`Upstream HTTP ${response.status} from ${url}`);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
    }

    if (attempt < maxRetries) {
      const backoffMs = 250 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch ${url} after ${maxRetries + 1} attempts`);
}
