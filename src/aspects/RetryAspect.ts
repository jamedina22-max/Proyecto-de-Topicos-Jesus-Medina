import {
  FetchClientError,
  delay,
  isRetryableNetworkError,
  isRetryableStatus,
} from '../errors/FetchClientError';
import { RequestAspect, RequestContext } from '../types';

/**
 * Aspecto AOP que reintenta peticiones fallidas por errores 5xx o de red.
 * Implementa una estrategia de reintento con backoff exponencial simple.
 */
export class RetryAspect implements RequestAspect {
  /** @inheritdoc */
  public readonly name = 'RetryAspect';

  /**
   * Ejecuta la petición reintentando hasta agotar los intentos configurados.
   * @param context - Contexto de la petición.
   * @param next - Siguiente eslabón de la cadena.
   */
  public async execute(
    context: RequestContext,
    next: () => Promise<Response>
  ): Promise<Response> {
    const maxAttempts = Math.max(1, context.retries);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      context.attempt = attempt;

      try {
        const response = await next();

        if (isRetryableStatus(response.status) && attempt < maxAttempts) {
          await delay(context.retryDelay * attempt);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;

        if (isRetryableNetworkError(error) && attempt < maxAttempts) {
          await delay(context.retryDelay * attempt);
          continue;
        }

        throw error;
      }
    }

    if (lastError instanceof FetchClientError) {
      throw lastError;
    }

    throw new FetchClientError('La petición falló tras agotar los reintentos', {
      url: context.url,
      method: context.method,
      attempt: maxAttempts,
      cause: lastError,
    });
  }
}
