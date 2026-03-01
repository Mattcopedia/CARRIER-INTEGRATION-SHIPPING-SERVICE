"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsCarrier = void 0;
//Orchestration for different providers
const config_1 = require("../../config");
const domain_1 = require("../../domain");
const utils_1 = require("../../utils");
const ups_rating_mapper_1 = require("./ups.rating.mapper");
const ups_rating_parser_1 = require("./ups.rating.parser");
class UpsCarrier {
    constructor(client) {
        this.client = client;
        this.name = "UPS";
    }
    async getRates(request) {
        const parsed = domain_1.RateRequestSchema.safeParse(request);
        if (!parsed.success) {
            throw new domain_1.CarrierError({
                code: "VALIDATION_ERROR",
                carrier: this.name,
                message: "Invalid rate request",
                details: parsed.error.format(),
            });
        }
        const env = (0, config_1.loadEnv)();
        const option = (0, ups_rating_mapper_1.decideRequestOption)(parsed.data);
        const body = (0, ups_rating_mapper_1.mapDomainToUpsRatingRequest)(parsed.data);
        utils_1.logger.info("Requesting UPS rates", {
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
        const quotes = (0, ups_rating_parser_1.parseUpsRateResponse)(response);
        utils_1.logger.info("UPS rates received", {
            carrier: this.name,
            count: quotes.length,
            services: quotes.map((q) => q.serviceCode),
        });
        return quotes;
    }
}
exports.UpsCarrier = UpsCarrier;
//# sourceMappingURL=ups.carrier.js.map