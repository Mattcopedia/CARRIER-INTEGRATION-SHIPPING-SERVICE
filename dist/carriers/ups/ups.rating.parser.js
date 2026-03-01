"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUpsRateResponse = parseUpsRateResponse;
const domain_1 = require("../../domain");
const utils_1 = require("../../utils");
const ups_rating_schema_1 = require("./ups.rating.schema");
function parseUpsRateResponse(data) {
    const parsed = ups_rating_schema_1.UpsRateResponseSchema.safeParse(data);
    if (!parsed.success) {
        throw new domain_1.CarrierError({
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
            throw new domain_1.CarrierError({
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
                currency: charge.CurrencyCode,
            },
            estimatedDeliveryDate: (0, utils_1.yyyymmddToIso)(rs.TimeInTransit?.ServiceSummary?.EstimatedArrival?.Arrival?.Date),
        };
    });
}
//# sourceMappingURL=ups.rating.parser.js.map