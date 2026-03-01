import { z } from "zod";

export const UpsOAuthEnvSchema = z.object({
  UPS_OAUTH_URL: z.string().url(),
  UPS_CLIENT_ID: z.string().min(1),
  UPS_CLIENT_SECRET: z.string().min(1),
  UPS_MERCHANT_ID: z.string().min(1).optional(),

  UPS_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  UPS_TOKEN_EXPIRY_SKEW_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(30000),
});

export type UpsOAuthEnv = z.infer<typeof UpsOAuthEnvSchema>;

export function loadUpsOAuthEnv(processEnv = process.env): UpsOAuthEnv {
  const parsed = UpsOAuthEnvSchema.safeParse(processEnv);
  if (!parsed.success) {
    throw new Error(
      `Invalid UPS OAuth environment variables: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}
