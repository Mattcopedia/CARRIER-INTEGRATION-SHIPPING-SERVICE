import { z } from "zod";

export const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z.object({
      ResponseStatus: z.object({
        Code: z.string().min(1),
        Description: z.string().min(1),
      }),
    }),
    RatedShipment: z.array(
      z.object({
        Service: z.object({
          Code: z.string().min(1),
          Description: z.string().optional(),
        }),
        TotalCharges: z
          .object({
            CurrencyCode: z.string().min(3),
            MonetaryValue: z.string().min(1),
          })
          .optional(),
        TransportationCharges: z
          .object({
            CurrencyCode: z.string().min(3),
            MonetaryValue: z.string().min(1),
          })
          .optional(),
        TimeInTransit: z
          .object({
            ServiceSummary: z
              .object({
                EstimatedArrival: z
                  .object({
                    Arrival: z
                      .object({
                        Date: z.string().optional(), // YYYYMMDD
                      })
                      .optional(),
                  })
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    ),
  }),
});
