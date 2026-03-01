"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../src/auth");
describe("TokenProvider", () => {
    it("StaticTokenProvider returns the token", async () => {
        const provider = new auth_1.StaticTokenProvider("abc123");
        await expect(provider.getAccessToken()).resolves.toBe("abc123");
    });
});
//# sourceMappingURL=token-provider.test.js.map