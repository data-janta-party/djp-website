'use server';

import { eq } from 'drizzle-orm';

import { DbUnavailableError, getDb, volunteers } from '@/lib/db';
import { createJsonLogger } from '@/lib/logging';
import {
  collectVolunteerFieldErrors,
  volunteerInputSchema,
  type VolunteerFieldErrorCode,
  type VolunteerVisibleField,
} from '@/lib/schemas/volunteer';

const logger = createJsonLogger({
  service: 'volunteer-action',
  defaultContext: { action: 'submitVolunteerApplication' },
});

export type VolunteerResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<VolunteerVisibleField, VolunteerFieldErrorCode>>;
    };

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
      fieldErrors: collectVolunteerFieldErrors(input) ?? undefined,
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
