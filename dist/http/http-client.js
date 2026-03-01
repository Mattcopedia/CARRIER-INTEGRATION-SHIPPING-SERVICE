"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const http_errors_1 = require("./http-errors");
class HttpClient {
    async request(opts) {
        try {
            const response = await axios_1.default.request({
                baseURL: opts.baseURL,
                method: opts.method,
                url: opts.url,
                headers: opts.headers,
                params: opts.query,
                data: opts.body,
                timeout: opts.timeoutMs,
                auth: opts.basicAuth,
                responseType: opts.returnText ? "text" : "json",
                validateStatus: () => true,
            });
            if (response.status >= 200 && response.status < 300) {
                return response.data;
            }
            throw new http_errors_1.HttpError("HTTP_ERROR", response.status, response.data);
        }
        catch (err) {
            if (err instanceof http_errors_1.HttpError)
                throw err;
            if (axios_1.default.isAxiosError(err)) {
                const ax = err;
                const isTimeout = ax.code === "ECONNABORTED" ||
                    (typeof ax.message === "string" &&
                        ax.message.toLowerCase().includes("timeout"));
                throw new http_errors_1.HttpError(isTimeout ? "TIMEOUT" : "NETWORK_ERROR", undefined, {
                    axiosCode: ax.code,
                    message: ax.message,
                });
            }
            throw err;
        }
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=http-client.js.map