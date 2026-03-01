import qs from "qs";
import { TokenProvider } from "../../auth";
import { loadUpsOAuthEnv } from "../../config/ups-env";
import { CarrierError } from "../../domain";
import { HttpClient } from "../../http/http-client";
import { HttpError } from "../../http/http-errors";
import { UpsErrorResponseSchema, UpsTokenResponseSchema } from "./ups.schemas";
import { UpsErrorResponse } from "./ups.types";

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

export class UpsTokenProvider implements TokenProvider {
  private cached?: CachedToken;
  private inFlight?: Promise<string>;
  private readonly carrierName = "UPS";

  private readonly http = new HttpClient();

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cached && now < this.cached.expiresAtMs) {
      return this.cached.accessToken;
    }

    if (this.inFlight) return this.inFlight;

    this.inFlight = this.fetchAndCacheToken().finally(() => {
      this.inFlight = undefined;
    });

    return this.inFlight;
  }

  private async fetchAndCacheToken(): Promise<string> {
    const env = loadUpsOAuthEnv();
    try {
      const data = await this.http.request<unknown>({
        baseURL: env.UPS_OAUTH_URL,
        method: "POST",
        url: "/security/v1/oauth/token",
        timeoutMs: env.UPS_HTTP_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(env.UPS_MERCHANT_ID
            ? { "x-merchant-id": env.UPS_MERCHANT_ID }
            : {}),
        },
        // Basic Auth uses client_id/client_secret
        basicAuth: {
          username: env.UPS_CLIENT_ID,
          password: env.UPS_CLIENT_SECRET,
        },
        // form encoded body
        body: qs.stringify({ grant_type: "client_credentials" }),
      });

      const parsed = UpsTokenResponseSchema.safeParse(data);
      if (!parsed.success) {
        throw new CarrierError({
          code: "CARRIER_ERROR",
          carrier: this.carrierName,
          message: "UPS token response schema invalid",
          details: parsed.error.format(),
        });
      }

      const token = parsed.data.access_token;
      const expiresInSec = Number(parsed.data.expires_in);

      if (!Number.isFinite(expiresInSec) || expiresInSec <= 0) {
        throw new CarrierError({
          code: "CARRIER_ERROR",
          carrier: this.carrierName,
          message: "UPS token response expires_in is invalid",
          details: { expires_in: parsed.data.expires_in },
        });
      }

      const skew = env.UPS_TOKEN_EXPIRY_SKEW_MS;
      const expiresAtMs = Date.now() + expiresInSec * 1000 - skew;

      this.cached = { accessToken: token, expiresAtMs };
      return token;
    } catch (err) {
      if (err instanceof CarrierError) throw err;

      // Transport-level errors -> carrier-level errors
      if (err instanceof HttpError) {
        if (err.code === "TIMEOUT") {
          throw new CarrierError({
            code: "NETWORK_ERROR",
            carrier: this.carrierName,
            message: "UPS token request timed out",
            details: err.details,
          });
        }

        if (err.code === "NETWORK_ERROR") {
          throw new CarrierError({
            code: "NETWORK_ERROR",
            carrier: this.carrierName,
            message: "UPS token request network error",
            details: err.details,
          });
        }

        // HTTP_ERROR means non-2xx with status + body in err
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
          message: `UPS token request failed (${status})`,
          details: { status, upsErrors: upsErr, responseBody: err.details },
        });
      }

      throw new CarrierError({
        code: "INTERNAL_ERROR",
        carrier: this.carrierName,
        message: "Unexpected error while requesting UPS token",
        details: err,
      });
    }
  }

  private parseUpsError(data: unknown): UpsErrorResponse | undefined {
    const parsed = UpsErrorResponseSchema.safeParse(data);
    if (!parsed.success) return undefined;
    return parsed.data as UpsErrorResponse;
  }
}
