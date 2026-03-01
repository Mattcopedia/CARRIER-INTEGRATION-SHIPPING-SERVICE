export type CarrierErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "CARRIER_ERROR"
  | "INTERNAL_ERROR";

export class CarrierError extends Error {
  readonly code: CarrierErrorCode;
  readonly carrier?: string;
  readonly details?: unknown;

  constructor(params: {
    message: string;
    code: CarrierErrorCode;
    carrier?: string;
    details?: unknown;
  }) {
    super(params.message);
    this.code = params.code;
    this.carrier = params.carrier;
    this.details = params.details;
  }
}

export function isCarrierError(err: unknown): err is CarrierError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as any).code === "string" &&
    "message" in err &&
    typeof (err as any).message === "string"
  );
}
