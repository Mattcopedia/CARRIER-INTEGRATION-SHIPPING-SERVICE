"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    APP_NAME: zod_1.z.string().min(1),
    UPS_OAUTH_URL: zod_1.z.string().url(),
    UPS_API_BASE_URL: zod_1.z.string().url(),
    UPS_CLIENT_ID: zod_1.z.string().min(1),
    UPS_CLIENT_SECRET: zod_1.z.string().min(1),
    UPS_MERCHANT_ID: zod_1.z.string().min(1).optional(),
    UPS_HTTP_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(10000),
    UPS_TOKEN_EXPIRY_SKEW_MS: zod_1.z.coerce
        .number()
        .int()
        .nonnegative()
        .default(30000),
    UPS_RATING_VERSION: zod_1.z.string().default("v2409"),
    UPS_RATING_ADDITIONALINFO: zod_1.z.string().optional(),
    UPS_TRANS_ID: zod_1.z.string().optional(),
    UPS_TRANSACTION_SRC: zod_1.z.string().default("testing"),
    UPS_BILLING_ACCOUNT: zod_1.z.string().min(1),
    UPS_SHIPPER_NUMBER: zod_1.z.string().optional(),
});
function loadEnv(processEnv = process.env) {
    const parsed = EnvSchema.safeParse(processEnv);
    if (!parsed.success) {
        throw new Error(`Invalid environment variables: ${parsed.error.message}`);
    }
    return parsed.data;
}
//# sourceMappingURL=env.js.map