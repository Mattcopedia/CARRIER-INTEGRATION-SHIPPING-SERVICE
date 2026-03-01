"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideRequestOption = decideRequestOption;
exports.mapDomainToUpsRatingRequest = mapDomainToUpsRatingRequest;
const config_1 = require("../../config");
const domain_1 = require("../../domain");
function splitAddressLines(street1, street2) {
    return [street1, street2].filter(Boolean);
}
function toUpsWeightUnit(unit) {
    return unit === "KG" ? "KGS" : "LBS";
}
function toUpsDimUnit(unit) {
    return unit;
}
/**
 * Domain service levels (carrier-agnostic) -> UPS service codes.
 * Expand as needed.
 *
 * This prevents your domain from leaking UPS-specific codes like "03".
 */
const UPS_SERVICE_LEVEL_MAP = {
    GROUND: "03",
    "2DAY": "02",
    NEXT_DAY: "01",
    "3DAY": "12",
    // add more as needed
};
function mapServiceLevelToUpsCode(serviceLevel) {
    const code = UPS_SERVICE_LEVEL_MAP[serviceLevel.toUpperCase()];
    if (!code) {
        throw new domain_1.CarrierError({
            code: "VALIDATION_ERROR",
            carrier: "UPS",
            message: `Unsupported UPS serviceLevel '${serviceLevel}'.`,
            details: {
                supported: Object.keys(UPS_SERVICE_LEVEL_MAP),
            },
        });
    }
    return code;
}
function decideRequestOption(req) {
    return req.serviceLevel ? "Rate" : "Shop";
}
function mapDomainToUpsRatingRequest(req) {
    const env = (0, config_1.loadEnv)();
    return {
        RateRequest: {
            Request: {
                TransactionReference: {
                    CustomerContext: env.APP_NAME ?? "carrier-integration-service",
                },
            },
            Shipment: {
                Shipper: {
                    ShipperNumber: env.UPS_SHIPPER_NUMBER || undefined,
                    Address: {
                        AddressLine: splitAddressLines(req.origin.street1, req.origin.street2),
                        City: req.origin.city,
                        StateProvinceCode: req.origin.state,
                        PostalCode: req.origin.postalCode,
                        CountryCode: req.origin.countryCode,
                    },
                },
                ShipTo: {
                    Address: {
                        AddressLine: splitAddressLines(req.destination.street1, req.destination.street2),
                        City: req.destination.city,
                        StateProvinceCode: req.destination.state,
                        PostalCode: req.destination.postalCode,
                        CountryCode: req.destination.countryCode,
                    },
                },
                ShipFrom: {
                    Address: {
                        AddressLine: splitAddressLines(req.origin.street1, req.origin.street2),
                        City: req.origin.city,
                        StateProvinceCode: req.origin.state,
                        PostalCode: req.origin.postalCode,
                        CountryCode: req.origin.countryCode,
                    },
                },
                PaymentDetails: {
                    ShipmentCharge: [
                        {
                            Type: "01",
                            BillShipper: { AccountNumber: env.UPS_BILLING_ACCOUNT },
                        },
                    ],
                },
                ...(req.serviceLevel
                    ? {
                        Service: {
                            Code: mapServiceLevelToUpsCode(req.serviceLevel),
                        },
                    }
                    : {}),
                Package: req.packages.map((p) => ({
                    PackagingType: {
                        Code: "02",
                        Description: "Customer Supplied Package",
                    },
                    ...(p.dimensions
                        ? {
                            Dimensions: {
                                UnitOfMeasurement: { Code: toUpsDimUnit(p.dimensions.unit) },
                                Length: String(p.dimensions.length),
                                Width: String(p.dimensions.width),
                                Height: String(p.dimensions.height),
                            },
                        }
                        : {}),
                    PackageWeight: {
                        UnitOfMeasurement: { Code: toUpsWeightUnit(p.weight.unit) },
                        Weight: String(p.weight.value),
                    },
                })),
            },
        },
    };
}
//# sourceMappingURL=ups.rating.mapper.js.map