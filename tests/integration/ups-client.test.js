"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nock_1 = __importDefault(require("nock"));
const auth_1 = require("../../src/auth");
const ups_client_1 = require("../../src/carriers/ups/ups.client");
describe("UpsClient", () => {
    const BASE_URL = "https://wwwcie.ups.com";
    beforeEach(() => {
        process.env.UPS_API_BASE_URL = BASE_URL;
        process.env.UPS_OAUTH_URL = BASE_URL;
        process.env.UPS_CLIENT_ID = "x";
        process.env.UPS_CLIENT_SECRET = "y";
        process.env.UPS_HTTP_TIMEOUT_MS = "200";
        process.env.UPS_TOKEN_EXPIRY_SKEW_MS = "0";
        process.env.UPS_MERCHANT_ID = "123456";
    });
    afterEach(() => {
        nock_1.default.cleanAll();
    });
    it("adds Bearer token and x-merchant-id header", async () => {
        const scope = (0, nock_1.default)(BASE_URL, {
            reqheaders: {
                authorization: "Bearer test_token",
                "x-merchant-id": "123456",
            },
        })
            .get("/some/endpoint")
            .reply(200, { ok: true });
        const client = new ups_client_1.UpsClient(new auth_1.StaticTokenProvider("test_token"));
        const res = await client.request({
            method: "GET",
            path: "/some/endpoint",
        });
        expect(res.ok).toBe(true);
        expect(scope.isDone()).toBe(true);
    });
    it("maps 401 to AUTH_ERROR", async () => {
        (0, nock_1.default)(BASE_URL)
            .get("/secure")
            .reply(401, {
            response: { errors: [{ code: "401", message: "Unauthorized" }] },
        });
        const client = new ups_client_1.UpsClient(new auth_1.StaticTokenProvider("bad"));
        await expect(client.request({ method: "GET", path: "/secure" })).rejects.toMatchObject({ code: "AUTH_ERROR", carrier: "UPS" });
    });
    it("maps timeout to NETWORK_ERROR", async () => {
        (0, nock_1.default)(BASE_URL).get("/slow").delayConnection(500).reply(200, { ok: true });
        const client = new ups_client_1.UpsClient(new auth_1.StaticTokenProvider("t"));
        await expect(client.request({ method: "GET", path: "/slow" })).rejects.toMatchObject({ code: "NETWORK_ERROR", carrier: "UPS" });
    });
});
//# sourceMappingURL=ups-client.test.js.map