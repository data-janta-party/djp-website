import { z } from 'zod';

export const apiErrorBodySchema = z.object({
  error: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export const okResponseSchema = z.object({
  ok: z.literal(true),
});