"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nock_1 = __importDefault(require("nock"));
const ups_carrier_1 = require("../../src/carriers/ups/ups.carrier");
const ups_client_1 = require("../../src/carriers/ups/ups.client");
const ups_token_provider_1 = require("../../src/carriers/ups/ups.token-provider");
const ups_rate_request_shop_json_1 = __importDefault(require("./fixtures/ups-rate-request.shop.json"));
const ups_rate_response_shop_json_1 = __importDefault(require("./fixtures/ups-rate-response.shop.json"));
const ups_token_json_1 = __importDefault(require("./fixtures/ups-token.json"));
// (Optional but recommended) add these fixtures if you create them
// import upsRateReq from "./fixtures/ups-rate-request.rate.json";
// import upsRateRes from "./fixtures/ups-rate-response.rate.json";
describe("UPS Rating integration (stubbed)", () => {
    const BASE_URL = "https://wwwcie.ups.com";
    let ORIGINAL_ENV;
    beforeEach(() => {
        ORIGINAL_ENV = { ...process.env };
        // OAuth
        process.env.UPS_OAUTH_URL = BASE_URL;
        process.env.UPS_CLIENT_ID = "test_client_id";
        process.env.UPS_CLIENT_SECRET = "test_client_secret";
        process.env.UPS_MERCHANT_ID = "123456";
        // Rating
        process.env.UPS_API_BASE_URL = BASE_URL;
        process.env.UPS_RATING_VERSION = "v2409";
        // keep tests fast
        process.env.UPS_HTTP_TIMEOUT_MS = "200";
        process.env.UPS_TOKEN_EXPIRY_SKEW_MS = "0";
        nock_1.default.cleanAll();
    });
    afterEach(() => {
        process.env = ORIGINAL_ENV;
        nock_1.default.cleanAll();
        nock_1.default.enableNetConnect();
    });
    it("builds correct UPS Shop request + parses normalized RateQuotes", async () => {
        // Token stub
        (0, nock_1.default)(BASE_URL).post("/security/v1/oauth/token").reply(200, ups_token_json_1.default);
        // Rating stub (Shop)
        const ratingScope = (0, nock_1.default)(BASE_URL)
            .post("/api/rating/v2409/Shop", (body) => {
            expect(body).toEqual(ups_rate_request_shop_json_1.default);
            return true;
        })
            .matchHeader("authorization", `Bearer ${ups_token_json_1.default.access_token}`)
            .matchHeader("content-type", /application\/json/)
            .reply(200, ups_rate_response_shop_json_1.default);
        const tokenProvider = new ups_token_provider_1.UpsTokenProvider();
        const client = new ups_client_1.UpsClient(tokenProvider);
        const carrier = new ups_carrier_1.UpsCarrier(client);
        const quotes = await carrier.getRates({
            origin: {
                street1: "123 Main St",
                street2: undefined,
                city: "TIMONIUM",
                state: "MD",
                postalCode: "21093",
                countryCode: "US",
            },
            destination: {
                street1: "456 Market St",
                street2: undefined,
                city: "Alpharetta",
                state: "GA",
                postalCode: "30005",
                countryCode: "US",
            },
            packages: [
                {
                    dimensions: { length: 5, width: 5, height: 5, unit: "IN" },
                    weight: { value: 1, unit: "LB" },
                },
            ],
            // ✅ IMPORTANT: no serviceLevel = Shop
        });
        expect(quotes).toEqual([
            {
                carrier: "UPS",
                serviceCode: "03",
                serviceName: "Ground",
                totalCharge: { amount: 12.34, currency: "USD" },
                estimatedDeliveryDate: undefined,
            },
            {
                carrier: "UPS",
                serviceCode: "02",
                serviceName: "2nd Day Air",
                totalCharge: { amount: 45.67, currency: "USD" },
                estimatedDeliveryDate: undefined,
            },
        ]);
        expect(ratingScope.isDone()).toBe(true);
    });
    it("uses requestOption=Rate when serviceLevel is provided and maps domain serviceLevel -> UPS service code", async () => {
        // Token stub
        (0, nock_1.default)(BASE_URL).post("/security/v1/oauth/token").reply(200, ups_token_json_1.default);
        // Here we verify Rate endpoint is called when serviceLevel exists.
        // We'll assert the Service.Code is UPS code (e.g. 'GROUND' -> '03').
        const ratingScope = (0, nock_1.default)(BASE_URL)
            .post("/api/rating/v2409/Rate", (body) => {
            expect(body?.RateRequest?.Shipment?.Service?.Code).toBe("03");
            return true;
        })
            .reply(200, ups_rate_response_shop_json_1.default); // reuse response fixture for simplicity
        const tokenProvider = new ups_token_provider_1.UpsTokenProvider();
        const client = new ups_client_1.UpsClient(tokenProvider);
        const carrier = new ups_carrier_1.UpsCarrier(client);
        await carrier.getRates({
            origin: {
                street1: "123 Main St",
                city: "TIMONIUM",
                state: "MD",
                postalCode: "21093",
                countryCode: "US",
            },
            destination: {
                street1: "456 Market St",
                city: "Alpharetta",
                state: "GA",
                postalCode: "30005",
                countryCode: "US",
            },
            packages: [{ weight: { value: 1, unit: "LB" } }],
            serviceLevel: "GROUND", // ✅ domain-friendly, NOT UPS-specific "03"
        });
        expect(ratingScope.isDone()).toBe(true);
    });
    it("maps 401 from rating endpoint to AUTH_ERROR (structured)", async () => {
        (0, nock_1.default)(BASE_URL).post("/security/v1/oauth/token").reply(200, ups_token_json_1.default);
        (0, nock_1.default)(BASE_URL)
            .post("/api/rating/v2409/Shop")
            .reply(401, {
            response: { errors: [{ code: "401", message: "Unauthorized" }] },
        });
        const tokenProvider = new ups_token_provider_1.UpsTokenProvider();
        const client = new ups_client_1.UpsClient(tokenProvider);
        const carrier = new ups_carrier_1.UpsCarrier(client);
        await expect(carrier.getRates({
            origin: {
                street1: "123 Main St",
                city: "TIMONIUM",
                state: "MD",
                postalCode: "21093",
                countryCode: "US",
            },
            destination: {
                street1: "456 Market St",
                city: "Alpharetta",
                state: "GA",
                postalCode: "30005",
                countryCode: "US",
            },
            packages: [{ weight: { value: 1, unit: "LB" } }],
        })).rejects.toMatchObject({
            code: "AUTH_ERROR",
            carrier: "UPS",
        });
    });
    it("fails with CARRIER_ERROR on malformed rating response", async () => {
        (0, nock_1.default)(BASE_URL).post("/security/v1/oauth/token").reply(200, ups_token_json_1.default);
        // missing RateResponse, schema should fail
        (0, nock_1.default)(BASE_URL).post("/api/rating/v2409/Shop").reply(200, { nope: true });
        const tokenProvider = new ups_token_provider_1.UpsTokenProvider();
        const client = new ups_client_1.UpsClient(tokenProvider);
        const carrier = new ups_carrier_1.UpsCarrier(client);
        await expect(carrier.getRates({
            origin: {
                street1: "123 Main St",
                city: "TIMONIUM",
                state: "MD",
                postalCode: "21093",
                countryCode: "US",
            },
            destination: {
                street1: "456 Market St",
                city: "Alpharetta",
                state: "GA",
                postalCode: "30005",
                countryCode: "US",
            },
            packages: [{ weight: { value: 1, unit: "LB" } }],
        })).rejects.toMatchObject({
            code: "CARRIER_ERROR",
            carrier: "UPS",
            message: "UPS rating response schema invalid",
        });
    });
    it("maps 500 from rating endpoint to CARRIER_ERROR (structured)", async () => {
        // Token stub
        (0, nock_1.default)(BASE_URL).post("/security/v1/oauth/token").reply(200, ups_token_json_1.default);
        // Rating stub -> 500
        (0, nock_1.default)(BASE_URL)
            .post("/api/rating/v2409/Shop")
            .reply(500, { error: "UPS internal error" });
        const tokenProvider = new ups_token_provider_1.UpsTokenProvider();
        const client = new ups_client_1.UpsClient(tokenProvider);
        const carrier = new ups_carrier_1.UpsCarrier(client);
        await expect(carrier.getRates({
            origin: {
                street1: "123 Main St",
                city: "TIMONIUM",
                state: "MD",
                postalCode: "21093",
                countryCode: "US",
            },
            destination: {
                street1: "456 Market St",
                city: "Alpharetta",
                state: "GA",
                postalCode: "30005",
                countryCode: "US",
            },
            packages: [{ weight: { value: 1, unit: "LB" } }],
        })).rejects.toMatchObject({
            code: "CARRIER_ERROR",
            carrier: "UPS",
            // message is produced by UpsClient for non-2xx
            message: expect.stringContaining("UPS API request failed"),
        });
    });
    it("fails with CARRIER_ERROR when rating returns non-JSON text", async () => {
        // Token stub
        (0, nock_1.default)(BASE_URL).post("/security/v1/oauth/token").reply(200, ups_token_json_1.default);
        // Rating returns text/plain instead of JSON
        (0, nock_1.default)(BASE_URL)
            .post("/api/rating/v2409/Shop")
            .matchHeader("authorization", /Bearer\s+/)
            .reply(200, "NOT_JSON", { "Content-Type": "text/plain" });
        const tokenProvider = new ups_token_provider_1.UpsTokenProvider();
        const client = new ups_client_1.UpsClient(tokenProvider);
        const carrier = new ups_carrier_1.UpsCarrier(client);
        await expect(carrier.getRates({
            origin: {
                street1: "123 Main St",
                city: "TIMONIUM",
                state: "MD",
                postalCode: "21093",
                countryCode: "US",
            },
            destination: {
                street1: "456 Market St",
                city: "Alpharetta",
                state: "GA",
                postalCode: "30005",
                countryCode: "US",
            },
            packages: [{ weight: { value: 1, unit: "LB" } }],
        })).rejects.toMatchObject({
            code: "CARRIER_ERROR",
            carrier: "UPS",
            // this comes from parseUpsRateResponse schema validation
            message: "UPS rating response schema invalid",
        });
    });
});
//# sourceMappingURL=ups-rate.test.js.map