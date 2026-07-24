/**
 * Opciones de configuración global del cliente HTTP.
 */
export interface FetchClientConfig {
  /** URL base que se antepone a todas las rutas relativas. */
  baseURL?: string;
  /** Tiempo máximo de espera en milisegundos antes de cancelar la petición. */
  timeout?: number;
  /** Número total de intentos (incluye el primero). Por defecto: 1. */
  retries?: number;
  /** Retraso base entre reintentos en milisegundos. Por defecto: 300. */
  retryDelay?: number;
  /** Cabeceras HTTP por defecto para todas las peticiones. */
  headers?: Record<string, string>;
}

/**
 * Opciones específicas de una petición HTTP individual.
 */
export interface RequestOptions {
  /** Cabeceras adicionales o de reemplazo para esta petición. */
  headers?: Record<string, string>;
  /** Cuerpo de la petición (objeto serializable o texto). */
  body?: unknown;
  /** Parámetros de consulta que se añaden a la URL. */
  params?: Record<string, string | number | boolean>;
  /** Sobrescribe el timeout global para esta petición. */
  timeout?: number;
  /** Sobrescribe el número de reintentos para esta petición. */
  retries?: number;
  /** Sobrescribe el retraso entre reintentos para esta petición. */
  retryDelay?: number;
  /** Señal externa de aborto compatible con AbortController. */
  signal?: AbortSignal;
}

/**
 * Métodos HTTP soportados por el cliente.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Contexto interno que atraviesa la cadena de aspectos (AOP).
 */
export interface RequestContext {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: BodyInit;
  timeout: number;
  retries: number;
  retryDelay: number;
  signal?: AbortSignal;
  attempt: number;
}

/**
 * Función núcleo que ejecuta fetch. Permite inyectar dependencias en pruebas.
 */
export type FetchExecutor = (
  url: string,
  init: RequestInit
) => Promise<Response>;

/**
 * Aspecto transversal (AOP) que puede envolver la ejecución de una petición.
 */
export interface RequestAspect {
  /** Nombre descriptivo del aspecto para depuración. */
  readonly name: string;
  /**
   * Envuelve la ejecución siguiente en la cadena de aspectos.
   * @param context - Contexto de la petición actual.
   * @param next - Función que continúa la cadena.
   */
  execute(
    context: RequestContext,
    next: () => Promise<Response>
  ): Promise<Response>;
}
