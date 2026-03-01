import nock from "nock";

import { UpsCarrier } from "../../src/carriers/ups/ups.carrier";
import { UpsClient } from "../../src/carriers/ups/ups.client";
import { UpsTokenProvider } from "../../src/carriers/ups/ups.token-provider";

import upsShopReq from "./fixtures/ups-rate-request.shop.json";
import upsShopRes from "./fixtures/ups-rate-response.shop.json";
import tokenFixture from "./fixtures/ups-token.json";

// (Optional but recommended) add these fixtures if you create them
// import upsRateReq from "./fixtures/ups-rate-request.rate.json";
// import upsRateRes from "./fixtures/ups-rate-response.rate.json";

describe("UPS Rating integration (stubbed)", () => {
  const BASE_URL = "https://wwwcie.ups.com";

  let ORIGINAL_ENV: NodeJS.ProcessEnv;

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

    nock.cleanAll();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("builds correct UPS Shop request + parses normalized RateQuotes", async () => {
    // Token stub
    nock(BASE_URL).post("/security/v1/oauth/token").reply(200, tokenFixture);

    // Rating stub (Shop)
    const ratingScope = nock(BASE_URL)
      .post("/api/rating/v2409/Shop", (body) => {
        expect(body).toEqual(upsShopReq);
        return true;
      })
      .matchHeader("authorization", `Bearer ${tokenFixture.access_token}`)
      .matchHeader("content-type", /application\/json/)
      .reply(200, upsShopRes);

    const tokenProvider = new UpsTokenProvider();
    const client = new UpsClient(tokenProvider);
    const carrier = new UpsCarrier(client);

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
    nock(BASE_URL).post("/security/v1/oauth/token").reply(200, tokenFixture);

    // Here we verify Rate endpoint is called when serviceLevel exists.
    // We'll assert the Service.Code is UPS code (e.g. 'GROUND' -> '03').
    const ratingScope = nock(BASE_URL)
      .post("/api/rating/v2409/Rate", (body: any) => {
        expect(body?.RateRequest?.Shipment?.Service?.Code).toBe("03");
        return true;
      })
      .reply(200, upsShopRes); // reuse response fixture for simplicity

    const tokenProvider = new UpsTokenProvider();
    const client = new UpsClient(tokenProvider);
    const carrier = new UpsCarrier(client);

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
    nock(BASE_URL).post("/security/v1/oauth/token").reply(200, tokenFixture);

    nock(BASE_URL)
      .post("/api/rating/v2409/Shop")
      .reply(401, {
        response: { errors: [{ code: "401", message: "Unauthorized" }] },
      });

    const tokenProvider = new UpsTokenProvider();
    const client = new UpsClient(tokenProvider);
    const carrier = new UpsCarrier(client);

    await expect(
      carrier.getRates({
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
      }),
    ).rejects.toMatchObject({
      code: "AUTH_ERROR",
      carrier: "UPS",
    });
  });

  it("fails with CARRIER_ERROR on malformed rating response", async () => {
    nock(BASE_URL).post("/security/v1/oauth/token").reply(200, tokenFixture);

    // missing RateResponse, schema should fail
    nock(BASE_URL).post("/api/rating/v2409/Shop").reply(200, { nope: true });

    const tokenProvider = new UpsTokenProvider();
    const client = new UpsClient(tokenProvider);
    const carrier = new UpsCarrier(client);

    await expect(
      carrier.getRates({
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
      }),
    ).rejects.toMatchObject({
      code: "CARRIER_ERROR",
      carrier: "UPS",
      message: "UPS rating response schema invalid",
    });
  });

  it("maps 500 from rating endpoint to CARRIER_ERROR (structured)", async () => {
    // Token stub
    nock(BASE_URL).post("/security/v1/oauth/token").reply(200, tokenFixture);

    // Rating stub -> 500
    nock(BASE_URL)
      .post("/api/rating/v2409/Shop")
      .reply(500, { error: "UPS internal error" });

    const tokenProvider = new UpsTokenProvider();
    const client = new UpsClient(tokenProvider);
    const carrier = new UpsCarrier(client);

    await expect(
      carrier.getRates({
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
      }),
    ).rejects.toMatchObject({
      code: "CARRIER_ERROR",
      carrier: "UPS",
      // message is produced by UpsClient for non-2xx
      message: expect.stringContaining("UPS API request failed"),
    });
  });

  it("fails with CARRIER_ERROR when rating returns non-JSON text", async () => {
    // Token stub
    nock(BASE_URL).post("/security/v1/oauth/token").reply(200, tokenFixture);

    // Rating returns text/plain instead of JSON
    nock(BASE_URL)
      .post("/api/rating/v2409/Shop")
      .matchHeader("authorization", /Bearer\s+/)
      .reply(200, "NOT_JSON", { "Content-Type": "text/plain" });

    const tokenProvider = new UpsTokenProvider();
    const client = new UpsClient(tokenProvider);
    const carrier = new UpsCarrier(client);

    await expect(
      carrier.getRates({
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
      }),
    ).rejects.toMatchObject({
      code: "CARRIER_ERROR",
      carrier: "UPS",
      // this comes from parseUpsRateResponse schema validation
      message: "UPS rating response schema invalid",
    });
  });
});
