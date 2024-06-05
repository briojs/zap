export type HTTPMethod =
  | "GET"
  | "HEAD"
  | "PATCH"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE";

export type ZapFetch = <T = any>(
  request: RequestInfo,
  options?: ZapFetchOptions,
) => Promise<ZapContext<T>>;

export interface ZapFetchOptions extends RequestInit, SharedOptions {}

export type MethodsShortcuts = Record<Lowercase<HTTPMethod>, ZapFetch>;

export interface ZapInstance extends MethodsShortcuts {}

export type SharedOptions = {
  headers?: HeadersInit;

  params?: Record<string, any>;

  query?: Record<string, any>;

  timeout?: number;

  responseType?: string;

  retry?: number | false;

  retryDelay?: number;

  duplex?: "half" | undefined;

  onRequest?: (ctx: ZapContext) => void | Promise<void>;
  onResponse?: (ctx: ZapContext) => void | Promise<void>;
};

export interface ZapOptions extends SharedOptions {
  baseUrl?: string;
}

export type ZapContext<T = any> = {
  request?: RequestInfo;
  response?: Response;
  error?: ZapErrorType<T>;
  options?: ZapFetchOptions;
  body?: T;
};

export interface ZapErrorType<T = any> extends Error, ZapContext<T> {}
