import { RetryAspect } from '../aspects/RetryAspect';
import { TimeoutAspect } from '../aspects/TimeoutAspect';
import { FetchClientError } from '../errors/FetchClientError';
import {
  FetchClientConfig,
  FetchExecutor,
  HttpMethod,
  RequestContext,
  RequestOptions,
} from '../types';
import { AspectChain, buildUrl, serializeBody } from '../utils/helpers';

/**
 * Cliente HTTP avanzado sobre fetch nativo con soporte de timeout y reintentos.
 */
export class FetchClient {
  private readonly config: Required<
    Pick<FetchClientConfig, 'retries' | 'retryDelay'>
  > &
    FetchClientConfig;

  private readonly aspectChain: AspectChain;
  private readonly fetchExecutor: FetchExecutor;

  /**
   * @param config - Configuración global del cliente (baseURL, timeout, retries, etc.).
   * @param fetchExecutor - Implementación de fetch (por defecto globalThis.fetch).
   */
  constructor(
    config: FetchClientConfig = {},
    fetchExecutor: FetchExecutor = globalThis.fetch.bind(globalThis)
  ) {
    this.config = {
      retries: 1,
      retryDelay: 300,
      ...config,
    };
    this.fetchExecutor = fetchExecutor;
    this.aspectChain = new AspectChain([
      new RetryAspect(),
      new TimeoutAspect(),
    ]);
  }


  /**
   * Realiza una petición GET.
   * @param path - Ruta relativa o absoluta.
   * @param options - Opciones de la petición.
   */
  public get(path: string, options: RequestOptions = {}): Promise<Response> {
    return this.request('GET', path, options);
  }

  /**
   * Realiza una petición POST.
   * @param path - Ruta relativa o absoluta.
   * @param options - Opciones de la petición (incluye body).
   */
  public post(path: string, options: RequestOptions = {}): Promise<Response> {
    return this.request('POST', path, options);
  }

  /**
   * Realiza una petición PUT.
   * @param path - Ruta relativa o absoluta.
   * @param options - Opciones de la petición (incluye body).
   */
  public put(path: string, options: RequestOptions = {}): Promise<Response> {
    return this.request('PUT', path, options);
  }

  /**
   * Realiza una petición PATCH.
   * @param path - Ruta relativa o absoluta.
   * @param options - Opciones de la petición (incluye body).
   */
  public patch(
    path: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    return this.request('PATCH', path, options);
  }

  /**
   * Realiza una petición DELETE.
   * @param path - Ruta relativa o absoluta.
   * @param options - Opciones de la petición.
   */
  public delete(
    path: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    return this.request('DELETE', path, options);
  }


  /**
   * Realiza una petición HTTP con el método indicado.
   * @param method - Método HTTP (GET, POST, PUT, PATCH, DELETE).
   * @param path - Ruta relativa o absoluta.
   * @param options - Opciones de la petición.
   */
  public request(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const headers: Record<string, string> = {
      ...(this.config.headers ?? {}),
      ...(options.headers ?? {}),
    };

    const url = buildUrl(this.config.baseURL, path, options.params);
    const body = serializeBody(options.body, headers);

    const context: RequestContext = {
      url,
      method,
      headers,
      body,
      timeout: options.timeout ?? this.config.timeout ?? 0,
      retries: options.retries ?? this.config.retries ?? 1,
      retryDelay: options.retryDelay ?? this.config.retryDelay ?? 300,
      signal: options.signal,
      attempt: 1,
    };

    return this.aspectChain.execute(context, () => this.executeFetch(context));
  }


  /**
   * Ejecuta el fetch nativo con el contexto dado.
   * @param context - Contexto interno de la petición.
   */
  private async executeFetch(context: RequestContext): Promise<Response> {
    try {
      const init: RequestInit = {
        method: context.method,
        headers: context.headers,
        signal: context.signal,
      };

      if (context.body !== undefined && context.method !== 'GET') {
        init.body = context.body;
      }

      return await this.fetchExecutor(context.url, init);
    } catch (error) {
      if (error instanceof FetchClientError) {
        throw error;
      }

      throw new FetchClientError('Error de red durante la petición', {
        url: context.url,
        method: context.method,
        attempt: context.attempt,
        cause: error,
      });
    }
  }
}


/**
 * Crea y retorna una nueva instancia de {@link FetchClient}.
 * @param config - Configuración opcional del cliente.
 */
export function createFetchClient(config?: FetchClientConfig): FetchClient {
  return new FetchClient(config);
}
