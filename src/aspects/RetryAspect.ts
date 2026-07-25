import {
  FetchClientError,
  delay,
  isRetryableNetworkError,
  isRetryableStatus,
} from '../errors/FetchClientError';
import { RequestAspect, RequestContext } from '../types';

export class RetryAspect implements RequestAspect {
  /** @inheritdoc */
  public readonly name = 'RetryAspect';

 
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
