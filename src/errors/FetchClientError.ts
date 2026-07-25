export class FetchClientError extends Error {
  public readonly status?: number;
  public readonly url: string;
  public readonly method: string;
  public readonly attempt: number;
  public readonly response?: Response;
  public readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      url: string;
      method: string;
      attempt: number;
      response?: Response;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'FetchClientError';
    this.status = options.status;
    this.url = options.url;
    this.method = options.method;
    this.attempt = options.attempt;
    this.response = options.response;
    this.cause = options.cause;
  }
}

export class TimeoutError extends FetchClientError {
  public readonly timeoutMs: number;

  constructor(url: string, method: string, timeoutMs: number, attempt: number) {
    super(`La petición excedió el tiempo límite de ${timeoutMs}ms`, {
      url,
      method,
      attempt,
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export function isRetryableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

export function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof FetchClientError && error.cause !== undefined) {
    return isRetryableNetworkError(error.cause);
  }

  if (error instanceof TimeoutError) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return false;
  }

  return false;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
