"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock("../../src/utils/logger.ts", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
const nock_1 = __importDefault(require("nock"));
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
    nock_1.default.disableNetConnect();
});
afterEach(() => {
    // Ensure mocks don't leak between tests
    nock_1.default.cleanAll();
});
afterAll(() => {
    // Restore normal behavior
    nock_1.default.enableNetConnect();
});
//# sourceMappingURL=setup.js.map