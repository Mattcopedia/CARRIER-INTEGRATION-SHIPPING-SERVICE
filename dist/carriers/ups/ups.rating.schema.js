"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsRateResponseSchema = void 0;
const zod_1 = require("zod");
exports.UpsRateResponseSchema = zod_1.z.object({
    RateResponse: zod_1.z.object({
        Response: zod_1.z.object({
            ResponseStatus: zod_1.z.object({
                Code: zod_1.z.string().min(1),
                Description: zod_1.z.string().min(1),
            }),
        }),
        RatedShipment: zod_1.z.array(zod_1.z.object({
            Service: zod_1.z.object({
                Code: zod_1.z.string().min(1),
                Description: zod_1.z.string().optional(),
            }),
            TotalCharges: zod_1.z
                .object({
                CurrencyCode: zod_1.z.string().min(3),
                MonetaryValue: zod_1.z.string().min(1),
            })
                .optional(),
            TransportationCharges: zod_1.z
                .object({
                CurrencyCode: zod_1.z.string().min(3),
                MonetaryValue: zod_1.z.string().min(1),
            })
                .optional(),
            TimeInTransit: zod_1.z
                .object({
                ServiceSummary: zod_1.z
                    .object({
                    EstimatedArrival: zod_1.z
                        .object({
                        Arrival: zod_1.z
                            .object({
                            Date: zod_1.z.string().optional(), // YYYYMMDD
                        })
                            .optional(),
                    })
                        .optional(),
                })
                    .optional(),
            })
                .optional(),
        })),
    }),
});
//# sourceMappingURL=ups.rating.schema.js.map