import {
  ZapContext,
  ZapErrorType,
  ZapFetch,
  ZapInstance,
  ZapOptions,
} from "./types.ts";
import { withBase, withQuery } from "ufo";

const methods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch",
];
const payloadMethods = new Set(["PATCH", "POST", "PUT", "DELETE"]);
const retryCodes = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const isJSONSerializable = (value: any) => {
  const t = typeof value;
  return t === "undefined"
    ? false
    : t === "string" || t === "number" || t === "boolean" || value === null
      ? true
      : t !== "object"
        ? false
        : Array.isArray(value) ||
            value.constructor?.name === "Object" ||
            typeof value.toJSON === "function"
          ? true
          : !value.buffer;
};

const isStream = (value: any) =>
  ("pipeTo" in (value as ReadableStream) &&
    typeof (value as ReadableStream).pipeTo === "function") ||
  //   @ts-ignore
  typeof (value as Readable).pipe === "function";

export class ZapError<T> extends Error implements ZapErrorType<T> {
  constructor(message: string, opts?: { cause: unknown }) {
    super(message, opts);
    this.name = "ZapError";
    this.message = message;

    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}

export interface ZapError<T = any> extends ZapErrorType<T> {}

export const createZapError = <T = any>(ctx: ZapContext<T>) => {
  const errorMessage =
    ctx.error?.message ||
    ctx.error?.toString() ||
    // @ts-ignore
    ctx.body?.statusMessage ||
    // @ts-ignore
    ctx.body?.message ||
    "An error occurred";
  const method =
    (ctx.request as Request)?.method || ctx.options?.method || "GET";

  const message = `[${method}: ${ctx.response?.status}]: ${errorMessage}`;
  let fetchError: ZapError<T> = new ZapError(
    message,
    ctx.error ? { cause: ctx.error } : undefined,
  );

  for (const key in ctx) {
    Object.defineProperty(fetchError, key, {
      value: ctx[key as keyof ZapContext<T>],
      enumerable: false,
    });
  }

  return fetchError;
};

export const createZapFetch = <T>(options: ZapOptions = {}): ZapInstance => {
  const handleError = async (ctx: ZapContext) => {
    const isAbort =
      (ctx.error && ctx.error.name === "AbortError" && !ctx.options?.timeout) ||
      false;

    if (ctx.options?.retry !== false && !isAbort) {
      const retries =
        typeof ctx.options?.retry === "number"
          ? ctx.options?.retry
          : payloadMethods.has(ctx.options?.method!)
            ? 0
            : 1;

      const responseCode = ctx.response?.status || 500;
      if (retries > 0 && retryCodes.has(responseCode)) {
        if (ctx.options?.retryDelay)
          await new Promise((resolve) =>
            setTimeout(resolve, ctx.options?.retryDelay),
          );
        return zapFetch(ctx.request as Request, {
          ...ctx.options,
          retry: retries - 1,
        });
      }
    }

    throw createZapError(ctx);
  };

  const zapFetch: ZapFetch = async (_request, _options) => {
    const ctx: ZapContext = {
      request: _request,
      response: new Response(),
      error: undefined,
      options:
        {
          ...options,
          ..._options,
          method: _options?.method?.toUpperCase(),
          params: {
            ...options.params,
            ..._options?.params,
          },
          query: {
            ...options.query,
            ..._options?.query,
          },
          headers: {
            ...options.headers,
            ..._options?.headers,
          },
        } ?? {},
    };

    if (ctx.options?.onRequest) await ctx.options.onRequest(ctx);

    if (typeof _request === "string") {
      let _req: string;
      _req = options.baseUrl ? withBase(options.baseUrl, _request) : _request;

      if (ctx.options?.query || ctx.options?.params) {
        _req = withQuery(_req, {
          ...ctx.options.params,
          ...ctx.options.query,
        });
      }

      ctx.request = _req;
    }

    if (ctx.options?.body && payloadMethods.has(ctx.options.method!)) {
      if (isJSONSerializable(ctx.options.body)) {
        ctx.options.body =
          typeof ctx.options.body === "string"
            ? ctx.options.body
            : JSON.stringify(ctx.options.body);
        ctx.options.headers = new Headers(ctx.options.headers || {});

        if (!ctx.options.headers.has("content-type"))
          ctx.options.headers.set("content-type", "application/json");
        if (!ctx.options.headers.has("accept"))
          ctx.options.headers.set("accept", "application/json");
      } else if (isStream(ctx.options.body)) {
        if (!ctx.options.duplex) {
          ctx.options.duplex = "half";
        }
      }
    }

    let abortTimeout: Timer | undefined;
    if (ctx.options?.timeout && !ctx.options?.signal) {
      const controller = new AbortController();
      abortTimeout = setTimeout(
        () =>
          controller.abort(
            new Error(
              "[TimeoutError]: The operation was aborted due to timeout",
            ),
          ),
        ctx.options.timeout,
      );
      ctx.options.signal = controller.signal;
    }

    try {
      ctx.response = await fetch(ctx.request as Request, ctx.options);
    } catch (error) {
      ctx.error = error as Error;

      return handleError(ctx);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }

    let body: any;
    if (ctx.response?.body && ctx.options?.method !== "HEAD") {
      const _contentType =
        ctx.response.headers.get("content-type")?.split(";").shift() || "";
      const type = _contentType.includes("json")
        ? "json"
        : _contentType.includes("text/") ||
            _contentType.includes("xml") ||
            _contentType.includes("html") ||
            _contentType === "image/svg"
          ? "text"
          : "blob";
      body =
        // @ts-ignore
        await ctx.response[ctx.options?.responseType || type]();
    }
    ctx.body = body;

    if (ctx.options?.onResponse) await ctx.options.onResponse(ctx);

    if (ctx.response.status >= 400 && ctx.response.status < 600) {
      return await handleError(ctx);
    }

    return ctx;
  };

  const zap: ZapInstance = {} as ZapInstance;
  for (const method of methods) {
    //   @ts-ignore
    zap[method] = (url: string, options?: RequestInit) =>
      zapFetch(url, { ...options, method });
  }

  return zap;
};
