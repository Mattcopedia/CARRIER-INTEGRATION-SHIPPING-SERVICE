jest.mock("../../src/utils/logger.ts", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import nock from "nock";

/**
 * Global HTTP test setup.
 * Prevents real outbound HTTP calls during tests.
 */
beforeEach(() => {
  process.env.APP_NAME ??= "carrier-integration-service";
  process.env.UPS_BILLING_ACCOUNT ??= "123456";
  process.env.UPS_SHIPPER_NUMBER ??= "123456";
  process.env.UPS_RATING_VERSION ??= "v2409";
});

beforeAll(() => {
  // Block real HTTP requests
  nock.disableNetConnect();
});

afterEach(() => {
  // Ensure mocks don't leak between tests
  nock.cleanAll();
});

afterAll(() => {
  // Restore normal behavior
  nock.enableNetConnect();
});
