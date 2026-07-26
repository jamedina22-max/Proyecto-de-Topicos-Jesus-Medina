/** Error general lanzado por el cliente cuando una petición falla. */
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

/** Error lanzado cuando una petición supera el tiempo máximo de espera configurado. */
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

/**
 * Indica si un código de estado HTTP debe provocar un reintento.
 * @param status - Código de estado HTTP.
 */
export function isRetryableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Indica si un error de red debe provocar un reintento.
 * @param error - Error capturado durante la petición.
 */
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

/**
 * Devuelve una promesa que se resuelve después de {@link ms} milisegundos.
 * @param ms - Tiempo de espera en milisegundos.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
