import { StaticTokenProvider } from "../../src/auth";

describe("TokenProvider", () => {
  it("StaticTokenProvider returns the token", async () => {
    const provider = new StaticTokenProvider("abc123");
    await expect(provider.getAccessToken()).resolves.toBe("abc123");
  });
});
