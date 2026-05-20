const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 200;

const RETRYABLE_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "UND_ERR_SOCKET"]);
const RETRYABLE_MESSAGES = ["fetch failed", "other side closed"];

function hasRetryableCode(error: Error): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return typeof code === "string" && RETRYABLE_CODES.has(code);
}

function hasRetryableMessage(msg: string): boolean {
  return RETRYABLE_MESSAGES.some((pattern) => msg.includes(pattern));
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (hasRetryableCode(error) || hasRetryableMessage(error.message)) return true;
  const { cause } = error;
  if (cause instanceof Error) {
    return hasRetryableCode(cause) || hasRetryableMessage(cause.message);
  }
  return false;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => { globalThis.setTimeout(resolve, ms); });
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await globalThis.fetch(input, init);
    } catch (error) {
      if (attempt === MAX_RETRIES || !isRetryableError(error)) throw error;
      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw new Error("fetchWithRetry: unreachable");
}
