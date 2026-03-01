import { loadEnv } from "../../config";
import { CarrierError, RateRequest } from "../../domain";
import { UpsRatingRequest, UpsRatingRequestOption } from "./ups.rating.types";

function splitAddressLines(street1: string, street2?: string): string[] {
  return [street1, street2].filter(Boolean) as string[];
}

function toUpsWeightUnit(unit: "LB" | "KG"): "LBS" | "KGS" {
  return unit === "KG" ? "KGS" : "LBS";
}

function toUpsDimUnit(unit: "IN" | "CM"): "IN" | "CM" {
  return unit;
}

/**
 * Domain service levels (carrier-agnostic) -> UPS service codes.
 * Expand as needed.
 *
 * This prevents your domain from leaking UPS-specific codes like "03".
 */
const UPS_SERVICE_LEVEL_MAP: Record<string, string> = {
  GROUND: "03",
  "2DAY": "02",
  NEXT_DAY: "01",
  "3DAY": "12",
  // add more as needed
};

function mapServiceLevelToUpsCode(serviceLevel: string): string {
  const code = UPS_SERVICE_LEVEL_MAP[serviceLevel.toUpperCase()];
  if (!code) {
    throw new CarrierError({
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

export function decideRequestOption(req: RateRequest): UpsRatingRequestOption {
  return req.serviceLevel ? "Rate" : "Shop";
}

export function mapDomainToUpsRatingRequest(
  req: RateRequest,
): UpsRatingRequest {
  const env = loadEnv();

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
            AddressLine: splitAddressLines(
              req.origin.street1,
              req.origin.street2,
            ),
            City: req.origin.city,
            StateProvinceCode: req.origin.state,
            PostalCode: req.origin.postalCode,
            CountryCode: req.origin.countryCode,
          },
        },
        ShipTo: {
          Address: {
            AddressLine: splitAddressLines(
              req.destination.street1,
              req.destination.street2,
            ),
            City: req.destination.city,
            StateProvinceCode: req.destination.state,
            PostalCode: req.destination.postalCode,
            CountryCode: req.destination.countryCode,
          },
        },
        ShipFrom: {
          Address: {
            AddressLine: splitAddressLines(
              req.origin.street1,
              req.origin.street2,
            ),
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
