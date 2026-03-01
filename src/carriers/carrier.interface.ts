import { RateQuote, RateRequest } from "../domain";

/**
 * Operation contracts (extend over time)
 */
export interface RatesOperation {
  getRates(request: RateRequest): Promise<RateQuote[]>;
}

// placeholders for future ops (define types when you implement them)
export interface TrackingOperation {
  // track(request: TrackRequest): Promise<TrackResult>;
}

export interface LabelsOperation {
  // purchaseLabel(request: LabelRequest): Promise<LabelResult>;
}

export interface AddressValidationOperation {
  // validateAddress(request: AddressValidationRequest): Promise<AddressValidationResult>;
}

export interface Carrier {
  /** Unique carrier identifier (e.g. "UPS", "FEDEX") */
  readonly name: string;

  /**
   * each carrier can implement the ops it supports.
   */
  readonly rates?: RatesOperation;
  readonly tracking?: TrackingOperation;
  readonly labels?: LabelsOperation;
  readonly addressValidation?: AddressValidationOperation;

  getRates?(request: RateRequest): Promise<RateQuote[]>;
}
