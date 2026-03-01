import { z } from "zod";

export const AddressSchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  countryCode: z.string().length(2),
});

export const PackageSchema = z.object({
  weight: z.object({
    value: z.number().positive(),
    unit: z.enum(["LB", "KG"]),
  }),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
      unit: z.enum(["IN", "CM"]),
    })
    .optional(),
});

export const RateRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(PackageSchema).min(1),
  serviceLevel: z.string().optional(),
  carrier: z.string().optional(),
});

export const CurrencySchema = z.enum([
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "NGN",
]);
