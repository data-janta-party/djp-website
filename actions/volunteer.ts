'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { DbUnavailableError, getDb, volunteers } from '@/lib/db';
import { createJsonLogger } from '@/lib/logging';

const logger = createJsonLogger({
  service: 'volunteer-action',
  defaultContext: { action: 'submitVolunteerApplication' },
});

/** Phone: optional, digits and common separators only. */
const phoneSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^[\d\s+\-().]*$/, 'Invalid phone')
  .optional()
  .or(z.literal(''));

/**
 * Anti-bot honeypot: real users leave this empty (field is hidden in the UI).
 * Bots that autofill every input trip the check (silent success — no DB write).
 */
const honeypotSchema = z.string().max(200).optional().or(z.literal(''));

const volunteerInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  phone: phoneSchema,
  city: z.string().trim().min(1).max(120),
  interest: z.string().trim().min(1).max(1000),
  website: honeypotSchema,
});

export type VolunteerResult =
  | { ok: true }
  | { ok: false; error: string };

function isUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('unique constraint') ||
    message.includes('constraint failed') ||
    message.includes('sqlite_constraint')
  );
}

export async function submitVolunteerApplication(input: unknown): Promise<VolunteerResult> {
  const parsed = volunteerInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please check your details and try again.',
    };
  }

  const { name, email, phone, city, interest, website } = parsed.data;

  // Honeypot filled → treat as bot. Silent success avoids teaching bots the trap.
  if (website && website.length > 0) {
    logger.warn('honeypot triggered; dropping submission');
    return { ok: true };
  }

  try {
    const db = getDb();

    const existing = await db
      .select({ id: volunteers.id })
      .from(volunteers)
      .where(eq(volunteers.email, email))
      .limit(1);

    if (existing.length > 0) {
      logger.info('duplicate email rejected');
      return {
        ok: false,
        error: 'An application with this email is already registered.',
      };
    }

    await db.insert(volunteers).values({
      name,
      email,
      phone: phone && phone.length > 0 ? phone : null,
      city,
      interest,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      logger.warn('database unavailable on volunteer submit', {
        reason: error.message,
      });
      return {
        ok: false,
        error: 'Volunteer signup is temporarily unavailable. Please try again later.',
      };
    }

    if (isUniqueConstraintError(error)) {
      logger.info('duplicate email rejected (constraint race)');
      return {
        ok: false,
        error: 'An application with this email is already registered.',
      };
    }

    logger.error('volunteer insert failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
    return {
      ok: false,
      error: 'Something went wrong saving your application. Please try again.',
    };
  }

  logger.info('volunteer application stored');
  return { ok: true };
}
