"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nock_1 = __importDefault(require("nock"));
const ups_1 = require("../../src/carriers/ups");
describe("UPS OAuth Client Credentials - UpsTokenProvider", () => {
    const BASE_URL = "https://wwwcie.ups.com";
    beforeEach(() => {
        // Required env configuration
        process.env.UPS_OAUTH_URL = BASE_URL;
        process.env.UPS_CLIENT_ID = "test_client_id";
        process.env.UPS_CLIENT_SECRET = "test_client_secret";
        process.env.UPS_MERCHANT_ID = "123456";
        // keep tests fast
        process.env.UPS_HTTP_TIMEOUT_MS = "200";
        process.env.UPS_TOKEN_EXPIRY_SKEW_MS = "0";
    });
    afterEach(() => {
        nock_1.default.cleanAll();
        jest.useRealTimers();
    });
    /**
     * ---------------------------------------------------------
     * SUCCESS CASE
     * ---------------------------------------------------------
     */
    it("acquires token and builds correct UPS request", async () => {
        const scope = (0, nock_1.default)(BASE_URL, {
            reqheaders: {
                "content-type": "application/x-www-form-urlencoded",
                "x-merchant-id": "123456",
                authorization: (value) => typeof value === "string" && value.startsWith("Basic "),
            },
        })
            .post("/security/v1/oauth/token", "grant_type=client_credentials")
            .reply(200, {
            token_type: "Bearer",
            issued_at: "1706710921672",
            client_id: "test_client_id",
            access_token: "access_token_1",
            expires_in: "14399",
            status: "approved",
        });
        const provider = new ups_1.UpsTokenProvider();
        const token = await provider.getAccessToken();
        expect(token).toBe("access_token_1");
        expect(scope.isDone()).toBe(true);
    });
    /**
     * ---------------------------------------------------------
     * TOKEN REUSE (CACHE)
     * ---------------------------------------------------------
     */
    it("reuses cached token when still valid", async () => {
        const scope = (0, nock_1.default)(BASE_URL).post("/security/v1/oauth/token").reply(200, {
            token_type: "Bearer",
            issued_at: "1706710921672",
            client_id: "test_client_id",
            access_token: "cached_token",
            expires_in: "14399",
            status: "approved",
        });
        const provider = new ups_1.UpsTokenProvider();
        const t1 = await provider.getAccessToken();
        const t2 = await provider.getAccessToken();
        expect(t1).toBe("cached_token");
        expect(t2).toBe("cached_token");
        // Only one HTTP call should occur
        expect(scope.isDone()).toBe(true);
    });
    /**
     * ---------------------------------------------------------
     * TOKEN REFRESH AFTER EXPIRY
     * ---------------------------------------------------------
     */
    it("refreshes token after expiry", async () => {
        // ✅ Keep real timers so HTTP/nock can resolve normally
        const baseNow = Date.parse("2026-01-01T00:00:00Z");
        const nowSpy = jest.spyOn(Date, "now").mockReturnValue(baseNow);
        try {
            const first = (0, nock_1.default)(BASE_URL).post("/security/v1/oauth/token").reply(200, {
                token_type: "Bearer",
                issued_at: "1706710921672",
                client_id: "test_client_id",
                access_token: "token_1",
                expires_in: "1",
                status: "approved",
            });
            const second = (0, nock_1.default)(BASE_URL)
                .post("/security/v1/oauth/token")
                .reply(200, {
                token_type: "Bearer",
                issued_at: "1706710921672",
                client_id: "test_client_id",
                access_token: "token_2",
                expires_in: "14399",
                status: "approved",
            });
            const provider = new ups_1.UpsTokenProvider();
            const t1 = await provider.getAccessToken();
            expect(t1).toBe("token_1");
            // ✅ Advance “time” beyond expiry without fake timers
            nowSpy.mockReturnValue(baseNow + 1500);
            const t2 = await provider.getAccessToken();
            expect(t2).toBe("token_2");
            expect(first.isDone()).toBe(true);
            expect(second.isDone()).toBe(true);
        }
        finally {
            nowSpy.mockRestore();
        }
    }, 10000);
    /**
     * ---------------------------------------------------------
     * AUTH FAILURE (401 / 403)
     * ---------------------------------------------------------
     */
    it("maps 401 response to AUTH_ERROR", async () => {
        (0, nock_1.default)(BASE_URL)
            .post("/security/v1/oauth/token")
            .reply(401, {
            response: {
                errors: [{ code: "401", message: "Unauthorized" }],
            },
        });
        const provider = new ups_1.UpsTokenProvider();
        await expect(provider.getAccessToken()).rejects.toMatchObject({
            code: "AUTH_ERROR",
            carrier: "UPS",
        });
    });
    /**
     * ---------------------------------------------------------
     * RATE LIMITING
     * ---------------------------------------------------------
     */
    it("maps 429 response to RATE_LIMITED", async () => {
        (0, nock_1.default)(BASE_URL)
            .post("/security/v1/oauth/token")
            .reply(429, {
            response: {
                errors: [{ code: "429", message: "Too many requests" }],
            },
        });
        const provider = new ups_1.UpsTokenProvider();
        await expect(provider.getAccessToken()).rejects.toMatchObject({
            code: "RATE_LIMITED",
            carrier: "UPS",
        });
    });
    /**
     * ---------------------------------------------------------
     * NETWORK TIMEOUT
     * ---------------------------------------------------------
     */
    it("throws NETWORK_ERROR on timeout", async () => {
        (0, nock_1.default)(BASE_URL)
            .post("/security/v1/oauth/token")
            .delayConnection(500)
            .reply(200, {});
        const provider = new ups_1.UpsTokenProvider();
        await expect(provider.getAccessToken()).rejects.toMatchObject({
            code: "NETWORK_ERROR",
            carrier: "UPS",
        });
    });
    /**
     * ---------------------------------------------------------
     * MALFORMED SUCCESS RESPONSE
     * ---------------------------------------------------------
     */
    it("throws CARRIER_ERROR for malformed UPS response", async () => {
        (0, nock_1.default)(BASE_URL).post("/security/v1/oauth/token").reply(200, {
            token_type: "Bearer",
        });
        const provider = new ups_1.UpsTokenProvider();
        await expect(provider.getAccessToken()).rejects.toMatchObject({
            code: "CARRIER_ERROR",
            carrier: "UPS",
        });
    });
    /**
     * ---------------------------------------------------------
     * CONCURRENT REQUEST PROTECTION
     * ---------------------------------------------------------
     */
    it("prevents token stampede (single request for concurrent calls)", async () => {
        const scope = (0, nock_1.default)(BASE_URL)
            .post("/security/v1/oauth/token")
            .delay(50)
            .reply(200, {
            token_type: "Bearer",
            issued_at: "1706710921672",
            client_id: "test_client_id",
            access_token: "shared_token",
            expires_in: "14399",
            status: "approved",
        });
        const provider = new ups_1.UpsTokenProvider();
        const [a, b, c] = await Promise.all([
            provider.getAccessToken(),
            provider.getAccessToken(),
            provider.getAccessToken(),
        ]);
        expect(a).toBe("shared_token");
        expect(b).toBe("shared_token");
        expect(c).toBe("shared_token");
        expect(scope.isDone()).toBe(true);
    });
});
//# sourceMappingURL=ups-auth.test.js.map