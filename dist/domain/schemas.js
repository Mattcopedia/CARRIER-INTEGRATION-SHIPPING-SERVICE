"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencySchema = exports.RateRequestSchema = exports.PackageSchema = exports.AddressSchema = void 0;
const zod_1 = require("zod");
exports.AddressSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    company: zod_1.z.string().optional(),
    street1: zod_1.z.string().min(1),
    street2: zod_1.z.string().optional(),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().optional(),
    postalCode: zod_1.z.string().min(1),
    countryCode: zod_1.z.string().length(2),
});
exports.PackageSchema = zod_1.z.object({
    weight: zod_1.z.object({
        value: zod_1.z.number().positive(),
        unit: zod_1.z.enum(["LB", "KG"]),
    }),
    dimensions: zod_1.z
        .object({
        length: zod_1.z.number().positive(),
        width: zod_1.z.number().positive(),
        height: zod_1.z.number().positive(),
        unit: zod_1.z.enum(["IN", "CM"]),
    })
        .optional(),
});
exports.RateRequestSchema = zod_1.z.object({
    origin: exports.AddressSchema,
    destination: exports.AddressSchema,
    packages: zod_1.z.array(exports.PackageSchema).min(1),
    serviceLevel: zod_1.z.string().optional(),
    carrier: zod_1.z.string().optional(),
});
exports.CurrencySchema = zod_1.z.enum([
    "USD",
    "EUR",
    "GBP",
    "CAD",
    "AUD",
    "NGN",
]);
//# sourceMappingURL=schemas.js.map