"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsOAuthEnvSchema = void 0;
exports.loadUpsOAuthEnv = loadUpsOAuthEnv;
const zod_1 = require("zod");
exports.UpsOAuthEnvSchema = zod_1.z.object({
    UPS_OAUTH_URL: zod_1.z.string().url(),
    UPS_CLIENT_ID: zod_1.z.string().min(1),
    UPS_CLIENT_SECRET: zod_1.z.string().min(1),
    UPS_MERCHANT_ID: zod_1.z.string().min(1).optional(),
    UPS_HTTP_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(10000),
    UPS_TOKEN_EXPIRY_SKEW_MS: zod_1.z.coerce
        .number()
        .int()
        .nonnegative()
        .default(30000),
});
function loadUpsOAuthEnv(processEnv = process.env) {
    const parsed = exports.UpsOAuthEnvSchema.safeParse(processEnv);
    if (!parsed.success) {
        throw new Error(`Invalid UPS OAuth environment variables: ${parsed.error.message}`);
    }
    return parsed.data;
}
//# sourceMappingURL=ups-env.js.map