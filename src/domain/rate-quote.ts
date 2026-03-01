import { CurrencyCode } from "./currency";

export interface RateQuote {
  carrier: string; // "UPS", "FEDEX"
  serviceCode: string; // "GROUND"
  serviceName: string; // "UPS Ground"
  totalCharge: {
    amount: number;
    currency: CurrencyCode; // "USD"
  };
  estimatedDeliveryDate?: string; // ISO date
}
