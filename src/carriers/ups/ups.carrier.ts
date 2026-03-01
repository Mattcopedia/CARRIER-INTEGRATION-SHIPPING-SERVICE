//Orchestration for different providers
import { loadEnv } from "../../config";
import {
  CarrierError,
  RateQuote,
  RateRequest,
  RateRequestSchema,
} from "../../domain";
import { logger } from "../../utils";
import { Carrier } from "../carrier.interface";
import { UpsClient } from "./ups.client";
import {
  decideRequestOption,
  mapDomainToUpsRatingRequest,
} from "./ups.rating.mapper";
import { parseUpsRateResponse } from "./ups.rating.parser";

export class UpsCarrier implements Carrier {
  readonly name = "UPS";

  constructor(private readonly client: UpsClient) {}

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const parsed = RateRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new CarrierError({
        code: "VALIDATION_ERROR",
        carrier: this.name,
        message: "Invalid rate request",
        details: parsed.error.format(),
      });
    }

    const env = loadEnv();
    const option = decideRequestOption(parsed.data);
    const body = mapDomainToUpsRatingRequest(parsed.data);

    logger.info("Requesting UPS rates", {
      carrier: this.name,
      requestOption: option,
      hasServiceLevel: Boolean(parsed.data.serviceLevel),
      packages: parsed.data.packages.length,
      origin: {
        countryCode: parsed.data.origin.countryCode,
        postalCode: parsed.data.origin.postalCode,
      },
      destination: {
        countryCode: parsed.data.destination.countryCode,
        postalCode: parsed.data.destination.postalCode,
      },
    });

    const response = await this.client.request({
      method: "POST",
      path: `/api/rating/${env.UPS_RATING_VERSION}/${option}`,
      query: env.UPS_RATING_ADDITIONALINFO
        ? { additionalinfo: env.UPS_RATING_ADDITIONALINFO }
        : undefined,
      headers: {
        "Content-Type": "application/json",
        transId: env.UPS_TRANS_ID ?? "test-trans-id",
        transactionSrc: env.UPS_TRANSACTION_SRC ?? "testing",
      },
      body,
    });

    const quotes = parseUpsRateResponse(response);

    logger.info("UPS rates received", {
      carrier: this.name,
      count: quotes.length,
      services: quotes.map((q) => q.serviceCode),
    });

    return quotes;
  }
}
