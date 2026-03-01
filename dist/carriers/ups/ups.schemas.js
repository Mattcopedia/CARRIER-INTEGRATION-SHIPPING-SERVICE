"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsErrorResponseSchema = exports.UpsTokenResponseSchema = void 0;
//Runtime validation for inputs
const zod_1 = require("zod");
exports.UpsTokenResponseSchema = zod_1.z.object({
    token_type: zod_1.z.string().min(1),
    issued_at: zod_1.z.string().min(1),
    client_id: zod_1.z.string().min(1),
    access_token: zod_1.z.string().min(1),
    scope: zod_1.z.string().optional(),
    expires_in: zod_1.z.string().min(1),
    refresh_count: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
});
exports.UpsErrorResponseSchema = zod_1.z.object({
    response: zod_1.z
        .object({
        errors: zod_1.z
            .array(zod_1.z.object({
            code: zod_1.z.string().min(1),
            message: zod_1.z.string().min(1),
        }))
            .optional(),
    })
        .optional(),
});
//# sourceMappingURL=ups.schemas.js.map