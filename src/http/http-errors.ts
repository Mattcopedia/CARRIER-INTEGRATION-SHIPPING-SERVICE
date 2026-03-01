export type HttpErrorCode = "HTTP_ERROR" | "NETWORK_ERROR" | "TIMEOUT";

export class HttpError extends Error {
  constructor(
    public readonly code: HttpErrorCode,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(code);
  }
}
