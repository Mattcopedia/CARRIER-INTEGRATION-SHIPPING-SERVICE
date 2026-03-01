//HTTP calls only
import { Method } from "axios";
import { TokenProvider } from "../../auth";
import { loadEnv } from "../../config";
import { CarrierError } from "../../domain";
import { HttpClient } from "../../http/http-client";
import { HttpError } from "../../http/http-errors";
import { logger, nowMs } from "../../utils";
import { UpsErrorResponseSchema } from "./ups.schemas";
import { UpsErrorResponse } from "./ups.types";

export type UpsRequestOptions = {
  method: Method;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: unknown;

  returnText?: boolean;
};

export class UpsClient {
  private readonly carrierName = "UPS";
  private readonly http = new HttpClient();

  constructor(private readonly tokenProvider: TokenProvider) {}

  /**
   * Performs an authenticated UPS request.
   * - injects Bearer token
   * - adds x-merchant-id if configured
   * - maps HttpError -> CarrierError
   */
  async request<T = unknown>(opts: UpsRequestOptions): Promise<T> {
    const env = loadEnv();
    const token = await this.tokenProvider.getAccessToken();
    const start = nowMs();

    try {
      const data = await this.http.request<T>({
        baseURL: env.UPS_API_BASE_URL,
        method: opts.method,
        url: this.buildUrl(opts.path, opts.query),
        timeoutMs: env.UPS_HTTP_TIMEOUT_MS,
        headers: {
          ...(env.UPS_MERCHANT_ID
            ? { "x-merchant-id": env.UPS_MERCHANT_ID }
            : {}),
          Authorization: `Bearer ${token}`,
          ...(opts.headers ?? {}),
        },
        body: opts.body,
        returnText: opts.returnText,
      });

      logger.info("UPS API request succeeded", {
        method: opts.method,
        path: opts.path,
        ms: nowMs() - start,
      });

      // If caller asked for text but server sent JSON, still ok (data is whatever axios returned)
      // If caller asked for JSON but server sent text, HttpClient returns string; caller can parse at op layer.
      return data;
    } catch (err) {
      logger.error("UPS API request failed", {
        method: opts.method,
        path: opts.path,
        ms: nowMs() - start,
        err,
      });
      if (err instanceof CarrierError) throw err;

      if (err instanceof HttpError) {
        // timeouts / network
        if (err.code === "TIMEOUT") {
          throw new CarrierError({
            code: "NETWORK_ERROR",
            carrier: this.carrierName,
            message: "UPS request timed out",
            details: err.details,
          });
        }

        if (err.code === "NETWORK_ERROR") {
          throw new CarrierError({
            code: "NETWORK_ERROR",
            carrier: this.carrierName,
            message: "UPS request network error",
            details: err.details,
          });
        }

        // HTTP_ERROR: non-2xx status
        const status = err.status ?? 0;
        const upsErr = this.parseUpsError(err.details);

        const code =
          status === 401 || status === 403
            ? "AUTH_ERROR"
            : status === 429
              ? "RATE_LIMITED"
              : "CARRIER_ERROR";

        throw new CarrierError({
          code,
          carrier: this.carrierName,
          message: `UPS API request failed (${status})`,
          details: {
            status,
            path: opts.path,
            upsErrors: upsErr,
            responseBody: err.details,
          },
        });
      }

      throw new CarrierError({
        code: "INTERNAL_ERROR",
        carrier: this.carrierName,
        message: "Unexpected error while calling UPS API",
        details: err,
      });
    }
  }

  private buildUrl(path: string, query?: UpsRequestOptions["query"]): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (!query) return normalizedPath;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      params.set(key, String(value));
    }

    const qs = params.toString();
    return qs ? `${normalizedPath}?${qs}` : normalizedPath;
  }

  private parseUpsError(data: unknown): UpsErrorResponse | undefined {
    const parsed = UpsErrorResponseSchema.safeParse(data);
    if (!parsed.success) return undefined;
    return parsed.data as UpsErrorResponse;
  }
}
