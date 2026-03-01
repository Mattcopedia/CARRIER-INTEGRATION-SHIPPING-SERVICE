"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsTokenProvider = void 0;
const qs_1 = __importDefault(require("qs"));
const ups_env_1 = require("../../config/ups-env");
const domain_1 = require("../../domain");
const http_client_1 = require("../../http/http-client");
const http_errors_1 = require("../../http/http-errors");
const ups_schemas_1 = require("./ups.schemas");
class UpsTokenProvider {
    constructor() {
        this.carrierName = "UPS";
        this.http = new http_client_1.HttpClient();
    }
    async getAccessToken() {
        const now = Date.now();
        if (this.cached && now < this.cached.expiresAtMs) {
            return this.cached.accessToken;
        }
        if (this.inFlight)
            return this.inFlight;
        this.inFlight = this.fetchAndCacheToken().finally(() => {
            this.inFlight = undefined;
        });
        return this.inFlight;
    }
    async fetchAndCacheToken() {
        const env = (0, ups_env_1.loadUpsOAuthEnv)();
        try {
            const data = await this.http.request({
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
                body: qs_1.default.stringify({ grant_type: "client_credentials" }),
            });
            const parsed = ups_schemas_1.UpsTokenResponseSchema.safeParse(data);
            if (!parsed.success) {
                throw new domain_1.CarrierError({
                    code: "CARRIER_ERROR",
                    carrier: this.carrierName,
                    message: "UPS token response schema invalid",
                    details: parsed.error.format(),
                });
            }
            const token = parsed.data.access_token;
            const expiresInSec = Number(parsed.data.expires_in);
            if (!Number.isFinite(expiresInSec) || expiresInSec <= 0) {
                throw new domain_1.CarrierError({
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
        }
        catch (err) {
            if (err instanceof domain_1.CarrierError)
                throw err;
            // Transport-level errors -> carrier-level errors
            if (err instanceof http_errors_1.HttpError) {
                if (err.code === "TIMEOUT") {
                    throw new domain_1.CarrierError({
                        code: "NETWORK_ERROR",
                        carrier: this.carrierName,
                        message: "UPS token request timed out",
                        details: err.details,
                    });
                }
                if (err.code === "NETWORK_ERROR") {
                    throw new domain_1.CarrierError({
                        code: "NETWORK_ERROR",
                        carrier: this.carrierName,
                        message: "UPS token request network error",
                        details: err.details,
                    });
                }
                // HTTP_ERROR means non-2xx with status + body in err
                const status = err.status ?? 0;
                const upsErr = this.parseUpsError(err.details);
                const code = status === 401 || status === 403
                    ? "AUTH_ERROR"
                    : status === 429
                        ? "RATE_LIMITED"
                        : "CARRIER_ERROR";
                throw new domain_1.CarrierError({
                    code,
                    carrier: this.carrierName,
                    message: `UPS token request failed (${status})`,
                    details: { status, upsErrors: upsErr, responseBody: err.details },
                });
            }
            throw new domain_1.CarrierError({
                code: "INTERNAL_ERROR",
                carrier: this.carrierName,
                message: "Unexpected error while requesting UPS token",
                details: err,
            });
        }
    }
    parseUpsError(data) {
        const parsed = ups_schemas_1.UpsErrorResponseSchema.safeParse(data);
        if (!parsed.success)
            return undefined;
        return parsed.data;
    }
}
exports.UpsTokenProvider = UpsTokenProvider;
//# sourceMappingURL=ups.token-provider.js.map