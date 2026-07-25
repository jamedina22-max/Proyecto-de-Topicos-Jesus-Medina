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

export class FetchClient {
  private readonly config: Required<
    Pick<FetchClientConfig, 'retries' | 'retryDelay'>
  > &
    FetchClientConfig;

  private readonly aspectChain: AspectChain;
  private readonly fetchExecutor: FetchExecutor;


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

 
  public get(path: string, options: RequestOptions = {}): Promise<Response> {
    return this.request('GET', path, options);
  }


  public post(path: string, options: RequestOptions = {}): Promise<Response> {
    return this.request('POST', path, options);
  }

  
  public put(path: string, options: RequestOptions = {}): Promise<Response> {
    return this.request('PUT', path, options);
  }

  public patch(
    path: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    return this.request('PATCH', path, options);
  }

  
  public delete(
    path: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    return this.request('DELETE', path, options);
  }


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


export function createFetchClient(config?: FetchClientConfig): FetchClient {
  return new FetchClient(config);
}
