import { mergeAbortSignals } from '../utils/helpers';
import { RequestAspect, RequestContext } from '../types';
import { TimeoutError } from '../errors/FetchClientError';

/** Aspecto que cancela la petición si supera el timeout configurado en el contexto. */
export class TimeoutAspect implements RequestAspect {

  public readonly name = 'TimeoutAspect';

  /**
   * Envuelve la ejecución con un temporizador de aborto.
   * @param context - Contexto de la petición.
   * @param next - Siguiente función en la cadena.
   */
  public async execute(
    context: RequestContext,
    next: () => Promise<Response>
  ): Promise<Response> {
    if (context.timeout <= 0) {
      return next();
    }

    const timeoutController = new AbortController();
    const externalSignal = context.signal;
    const timeoutSignal = timeoutController.signal;

    context.signal = externalSignal
      ? mergeAbortSignals([externalSignal, timeoutSignal])
      : timeoutSignal;

    const timeoutId = setTimeout(() => timeoutController.abort(), context.timeout);

    try {
      return await next();
    } catch (error) {
      if (timeoutSignal.aborted) {
        throw new TimeoutError(
          context.url,
          context.method,
          context.timeout,
          context.attempt
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
