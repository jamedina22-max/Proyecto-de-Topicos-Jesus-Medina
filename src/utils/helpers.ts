import { RequestAspect, RequestContext } from '../types';

/**
 * Compone aspectos AOP en una cadena de responsabilidad.
 * Cada aspecto envuelve al siguiente hasta llegar al núcleo fetch.
 */
export class AspectChain {
  private readonly aspects: RequestAspect[];

  /**
   * @param aspects - Lista ordenada de aspectos. El primero se ejecuta primero.
   */
  constructor(aspects: RequestAspect[]) {
    this.aspects = aspects;
  }

  /**
   * Ejecuta la cadena completa de aspectos sobre la función núcleo.
   * @param context - Contexto de la petición.
   * @param core - Función que realiza fetch.
   */
  public async execute(
    context: RequestContext,
    core: () => Promise<Response>
  ): Promise<Response> {
    const run = this.aspects.reduceRight<() => Promise<Response>>(
      (next, aspect) => () => aspect.execute(context, next),
      core
    );

    return run();
  }
}

/**
 * Combina múltiples señales de aborto en una sola.
 * Compatible con entornos donde AbortSignal.any no está disponible.
 * @param signals - Señales a combinar.
 */
export function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  const validSignals = signals.filter(Boolean);

  if (validSignals.length === 0) {
    return new AbortController().signal;
  }

  if (validSignals.length === 1) {
    return validSignals[0];
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(validSignals);
  }

  const controller = new AbortController();

  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener(
      'abort',
      () => controller.abort(signal.reason),
      { once: true }
    );
  }

  return controller.signal;
}

/**
 * Construye una URL absoluta a partir de baseURL, path y query params.
 * @param baseURL - URL base opcional.
 * @param path - Ruta relativa o absoluta.
 * @param params - Parámetros de consulta opcionales.
 */
export function buildUrl(
  baseURL: string | undefined,
  path: string,
  params?: Record<string, string | number | boolean>
): string {
  const base = baseURL?.replace(/\/$/, '') ?? '';
  const normalizedPath = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  if (!params || Object.keys(params).length === 0) {
    return normalizedPath;
  }

  const url = new URL(normalizedPath);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

/**
 * Serializa el cuerpo de una petición según su tipo.
 * @param body - Cuerpo proporcionado por el consumidor.
 * @param headers - Cabeceras donde se puede establecer Content-Type.
 */
export function serializeBody(
  body: unknown,
  headers: Record<string, string>
): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return body as BodyInit;
  }

  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  return JSON.stringify(body);
}
