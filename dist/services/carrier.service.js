"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarrierService = void 0;
const domain_1 = require("../domain");
const utils_1 = require("../utils");
function isCarrier(carrier) {
    return carrier !== undefined;
}
class CarrierService {
    constructor() {
        this.carriers = new Map();
    }
    registerCarrier(carrier) {
        this.carriers.set(carrier.name, carrier);
    }
    async getRates(request) {
        // 1️⃣ Validate input
        const parsed = domain_1.RateRequestSchema.safeParse(request);
        if (!parsed.success) {
            throw new domain_1.CarrierError({
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
            throw new domain_1.CarrierError({
                code: "CARRIER_ERROR",
                message: "No carriers available to quote rates",
            });
        }
        // 3️⃣ Collect rates
        const results = [];
        for (const carrier of carriersToQuery) {
            try {
                let rates;
                if (carrier.rates?.getRates) {
                    rates = await carrier.rates.getRates(parsed.data);
                }
                else if (carrier.getRates) {
                    rates = await carrier.getRates(parsed.data);
                }
                else {
                    throw new domain_1.CarrierError({
                        code: "CARRIER_ERROR",
                        message: `Carrier '${carrier.name}' does not support rating`,
                        carrier: carrier.name,
                    });
                }
                results.push(...rates);
            }
            catch (error) {
                if ((0, domain_1.isCarrierError)(error)) {
                    throw error;
                }
                throw new domain_1.CarrierError({
                    code: "INTERNAL_ERROR",
                    message: "Unexpected carrier failure",
                    carrier: carrier.name,
                    details: error,
                });
            }
        }
        utils_1.logger.info("Rate request received", {
            carrier: request.carrier ?? "ALL",
            carriersToQuery: carriersToQuery.map((c) => c.name),
            packages: parsed.data.packages.length,
        });
        return results;
    }
}
exports.CarrierService = CarrierService;
//# sourceMappingURL=carrier.service.js.map