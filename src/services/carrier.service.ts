import { Carrier } from "../carriers/carrier.interface";
import {
  CarrierError,
  RateQuote,
  RateRequest,
  RateRequestSchema,
  isCarrierError,
} from "../domain";
import { logger } from "../utils";

function isCarrier(carrier: Carrier | undefined): carrier is Carrier {
  return carrier !== undefined;
}

export class CarrierService {
  private readonly carriers = new Map<string, Carrier>();

  registerCarrier(carrier: Carrier): void {
    this.carriers.set(carrier.name, carrier);
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    // 1️⃣ Validate input
    const parsed = RateRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new CarrierError({
        code: "VALIDATION_ERROR",
        message: "Invalid rate request",
        details: parsed.error.format(),
      });
    }

    // 2️⃣ Determine which carriers to query
    const carriersToQuery = request.carrier
      ? [this.carriers.get(request.carrier)].filter(isCarrier)
      : Array.from(this.carriers.values());

    if (carriersToQuery.length === 0) {
      throw new CarrierError({
        code: "CARRIER_ERROR",
        message: "No carriers available to quote rates",
      });
    }

    // 3️⃣ Collect rates
    const results: RateQuote[] = [];

    for (const carrier of carriersToQuery) {
      try {
        let rates: RateQuote[];
        if (carrier.rates?.getRates) {
          rates = await carrier.rates.getRates(parsed.data);
        } else if (carrier.getRates) {
          rates = await carrier.getRates(parsed.data);
        } else {
          throw new CarrierError({
            code: "CARRIER_ERROR",
            message: `Carrier '${carrier.name}' does not support rating`,
            carrier: carrier.name,
          });
        }

        results.push(...rates);
      } catch (error) {
        if (isCarrierError(error)) {
          throw error;
        }

        throw new CarrierError({
          code: "INTERNAL_ERROR",
          message: "Unexpected carrier failure",
          carrier: carrier.name,
          details: error,
        });
      }
    }
    logger.info("Rate request received", {
      carrier: request.carrier ?? "ALL",
      carriersToQuery: carriersToQuery.map((c) => c.name),
      packages: parsed.data.packages.length,
    });
    return results;
  }
}
