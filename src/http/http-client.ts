import axios, { AxiosError, Method } from "axios";
import { HttpError } from "./http-errors";

export interface HttpRequestOptions {
  baseURL: string;
  method: Method;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
  timeoutMs?: number;

  /**
   * Optional HTTP Basic Auth (needed for UPS token endpoint)
   */
  basicAuth?: {
    username: string;
    password: string;
  };

  /**
   * If true, do not parse JSON; return text.
   */
  returnText?: boolean;
}

export class HttpClient {
  async request<T = unknown>(opts: HttpRequestOptions): Promise<T> {
    try {
      const response = await axios.request({
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
        return response.data as T;
      }

      throw new HttpError("HTTP_ERROR", response.status, response.data);
    } catch (err) {
      if (err instanceof HttpError) throw err;

      if (axios.isAxiosError(err)) {
        const ax = err as AxiosError;
        const isTimeout =
          ax.code === "ECONNABORTED" ||
          (typeof ax.message === "string" &&
            ax.message.toLowerCase().includes("timeout"));

        throw new HttpError(
          isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
          undefined,
          {
            axiosCode: ax.code,
            message: ax.message,
          },
        );
      }

      throw err;
    }
  }
}
