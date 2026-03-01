export type UpsRatingRequestOption = "Rate" | "Shop";

export interface UpsRatingRequest {
  RateRequest: {
    Request: {
      TransactionReference?: {
        CustomerContext?: string;
      };
    };
    Shipment: {
      Shipper: {
        ShipperNumber?: string;
        Address: UpsAddress;
      };
      ShipTo: {
        Address: UpsAddress & { ResidentialAddressIndicator?: "" };
      };
      ShipFrom?: {
        Address: UpsAddress;
      };
      PaymentDetails: {
        ShipmentCharge: Array<{
          Type: "01";
          BillShipper: { AccountNumber: string };
        }>;
      };
      Service?: {
        Code: string;
        Description?: string;
      };
      Package: UpsPackage[]; // for simplicity always array (UPS allows array)
    };
  };
}

export interface UpsAddress {
  AddressLine: string[];
  City?: string;
  StateProvinceCode?: string;
  PostalCode?: string;
  CountryCode: string;
}

export interface UpsPackage {
  PackagingType: { Code: string; Description?: string };
  Dimensions?: {
    UnitOfMeasurement: { Code: "IN" | "CM"; Description?: string };
    Length: string;
    Width: string;
    Height: string;
  };
  PackageWeight: {
    UnitOfMeasurement: { Code: "LBS" | "KGS"; Description?: string };
    Weight: string;
  };
}

export interface UpsRateResponse {
  RateResponse: {
    Response: {
      ResponseStatus: { Code: string; Description: string };
    };
    RatedShipment: Array<{
      Service: { Code: string; Description?: string };
      TotalCharges?: { CurrencyCode: string; MonetaryValue: string };
      TransportationCharges?: { CurrencyCode: string; MonetaryValue: string };
      TimeInTransit?: {
        ServiceSummary?: {
          EstimatedArrival?: { Arrival?: { Date?: string } };
        };
      };
    }>;
  };
}
