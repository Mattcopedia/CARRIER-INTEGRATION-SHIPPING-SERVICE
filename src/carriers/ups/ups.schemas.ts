//Runtime validation for inputs
import { z } from "zod";

export const UpsTokenResponseSchema = z.object({
  token_type: z.string().min(1),
  issued_at: z.string().min(1),
  client_id: z.string().min(1),
  access_token: z.string().min(1),
  scope: z.string().optional(),
  expires_in: z.string().min(1),
  refresh_count: z.string().optional(),
  status: z.string().optional(),
});

export const UpsErrorResponseSchema = z.object({
  response: z
    .object({
      errors: z
        .array(
          z.object({
            code: z.string().min(1),
            message: z.string().min(1),
          }),
        )
        .optional(),
    })
    .optional(),
});
