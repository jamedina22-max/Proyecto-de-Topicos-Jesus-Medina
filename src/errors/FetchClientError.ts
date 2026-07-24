/**
 * Error controlado lanzado por la librería cuando una petición falla.
 */
export class FetchClientError extends Error {
  /** Código de estado HTTP si la respuesta fue recibida. */
  public readonly status?: number;
  /** URL de la petición que originó el error. */
  public readonly url: string;
  /** Método HTTP utilizado. */
  public readonly method: string;
  /** Número de intento en el que ocurrió el fallo definitivo. */
  public readonly attempt: number;
  /** Respuesta HTTP original cuando existe. */
  public readonly response?: Response;
  /** Error de red subyacente cuando aplica. */
  public readonly cause?: unknown;

  /**
   * Crea una nueva instancia de error del cliente.
   * @param message - Mensaje descriptivo del error.
   * @param options - Metadatos adicionales del fallo.
   */
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

/**
 * Error específico cuando una petición excede el tiempo máximo configurado.
 */
export class TimeoutError extends FetchClientError {
  /** Tiempo límite configurado en milisegundos. */
  public readonly timeoutMs: number;

  /**
   * @param url - URL de la petición cancelada.
   * @param method - Método HTTP utilizado.
   * @param timeoutMs - Tiempo límite configurado.
   * @param attempt - Número de intento actual.
   */
  constructor(
    url: string,
    method: string,
    timeoutMs: number,
    attempt: number
  ) {
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
 * Indica si un código de estado HTTP debe provocar reintento automático.
 * @param status - Código de estado HTTP recibido.
 */
export function isRetryableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Indica si un error de red debe provocar reintento automático.
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
 * Espera un número de milisegundos antes de continuar.
 * @param ms - Milisegundos a esperar.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
