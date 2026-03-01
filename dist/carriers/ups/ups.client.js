"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsClient = void 0;
const config_1 = require("../../config");
const domain_1 = require("../../domain");
const http_client_1 = require("../../http/http-client");
const http_errors_1 = require("../../http/http-errors");
const utils_1 = require("../../utils");
const ups_schemas_1 = require("./ups.schemas");
class UpsClient {
    constructor(tokenProvider) {
        this.tokenProvider = tokenProvider;
        this.carrierName = "UPS";
        this.http = new http_client_1.HttpClient();
    }
    /**
     * Performs an authenticated UPS request.
     * - injects Bearer token
     * - adds x-merchant-id if configured
     * - maps HttpError -> CarrierError
     */
    async request(opts) {
        const env = (0, config_1.loadEnv)();
        const token = await this.tokenProvider.getAccessToken();
        const start = (0, utils_1.nowMs)();
        try {
            const data = await this.http.request({
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
            utils_1.logger.info("UPS API request succeeded", {
                method: opts.method,
                path: opts.path,
                ms: (0, utils_1.nowMs)() - start,
            });
            // If caller asked for text but server sent JSON, still ok (data is whatever axios returned)
            // If caller asked for JSON but server sent text, HttpClient returns string; caller can parse at op layer.
            return data;
        }
        catch (err) {
            utils_1.logger.error("UPS API request failed", {
                method: opts.method,
                path: opts.path,
                ms: (0, utils_1.nowMs)() - start,
                err,
            });
            if (err instanceof domain_1.CarrierError)
                throw err;
            if (err instanceof http_errors_1.HttpError) {
                // timeouts / network
                if (err.code === "TIMEOUT") {
                    throw new domain_1.CarrierError({
                        code: "NETWORK_ERROR",
                        carrier: this.carrierName,
                        message: "UPS request timed out",
                        details: err.details,
                    });
                }
                if (err.code === "NETWORK_ERROR") {
                    throw new domain_1.CarrierError({
                        code: "NETWORK_ERROR",
                        carrier: this.carrierName,
                        message: "UPS request network error",
                        details: err.details,
                    });
                }
                // HTTP_ERROR: non-2xx status
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
                    message: `UPS API request failed (${status})`,
                    details: {
                        status,
                        path: opts.path,
                        upsErrors: upsErr,
                        responseBody: err.details,
                    },
                });
            }
            throw new domain_1.CarrierError({
                code: "INTERNAL_ERROR",
                carrier: this.carrierName,
                message: "Unexpected error while calling UPS API",
                details: err,
            });
        }
    }
    buildUrl(path, query) {
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        if (!query)
            return normalizedPath;
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (value === undefined)
                continue;
            params.set(key, String(value));
        }
        const qs = params.toString();
        return qs ? `${normalizedPath}?${qs}` : normalizedPath;
    }
    parseUpsError(data) {
        const parsed = ups_schemas_1.UpsErrorResponseSchema.safeParse(data);
        if (!parsed.success)
            return undefined;
        return parsed.data;
    }
}
exports.UpsClient = UpsClient;
//# sourceMappingURL=ups.client.js.map