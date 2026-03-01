import { CarrierError, RateQuote } from "../../domain";
import { yyyymmddToIso } from "../../utils";
import { UpsRateResponseSchema } from "./ups.rating.schema";

export function parseUpsRateResponse(data: unknown): RateQuote[] {
  const parsed = UpsRateResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new CarrierError({
      code: "CARRIER_ERROR",
      carrier: "UPS",
      message: "UPS rating response schema invalid",
      details: parsed.error.format(),
    });
  }

  const rated = parsed.data.RateResponse.RatedShipment;

  return rated.map((rs) => {
    const charge = rs.TotalCharges ?? rs.TransportationCharges;

    if (!charge) {
      throw new CarrierError({
        code: "CARRIER_ERROR",
        carrier: "UPS",
        message: "UPS rated shipment missing charge fields",
        details: rs,
      });
    }

    return {
      carrier: "UPS",
      serviceCode: rs.Service.Code,
      serviceName: rs.Service.Description ?? rs.Service.Code,
      totalCharge: {
        amount: Number(charge.MonetaryValue),
        currency: charge.CurrencyCode as any,
      },
      estimatedDeliveryDate: yyyymmddToIso(
        rs.TimeInTransit?.ServiceSummary?.EstimatedArrival?.Arrival?.Date,
      ),
    };
  });
}
