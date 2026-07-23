import { z } from 'zod';

/** Phone: optional, digits and common separators only. */
const volunteerPhoneSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^[\d\s+\-().]*$/)
  .optional()
  .or(z.literal(''));

/**
 * Anti-bot honeypot: real users leave this empty (field is hidden in the UI).
 * Bots that autofill every input trip the check (silent success — no DB write).
 */
const volunteerHoneypotSchema = z.string().max(200).optional().or(z.literal(''));

export const volunteerInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .string()
    .trim()
    .min(1)
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  phone: volunteerPhoneSchema,
  city: z.string().trim().min(1).max(120),
  interest: z.string().trim().min(1).max(1000),
  website: volunteerHoneypotSchema,
});

/** Visible form fields (excludes honeypot). */
export type VolunteerVisibleField = 'name' | 'email' | 'phone' | 'city' | 'interest';

export const volunteerVisibleFields = [
  'name',
  'email',
  'phone',
  'city',
  'interest',
] as const satisfies readonly VolunteerVisibleField[];

export type VolunteerFieldErrorCode =
  | 'required'
  | 'invalidEmail'
  | 'invalidPhone'
  | 'tooLong';

function issueToErrorCode(issue: z.ZodIssue): VolunteerFieldErrorCode {
  if (issue.code === 'too_big') {
    return 'tooLong';
  }
  if (issue.code === 'too_small') {
    return 'required';
  }
  if (issue.code === 'invalid_string') {
    if (issue.validation === 'email') {
      return 'invalidEmail';
    }
    if (issue.validation === 'regex') {
      return 'invalidPhone';
    }
  }
  if (issue.code === 'invalid_type') {
    return 'required';
  }
  return 'required';
}

/**
 * Collect the first validation error code per visible field.
 * Returns `null` when the payload is valid (honeypot issues are ignored for UI).
 */
export function collectVolunteerFieldErrors(
  data: unknown,
): Partial<Record<VolunteerVisibleField, VolunteerFieldErrorCode>> | null {
  const parsed = volunteerInputSchema.safeParse(data);
  if (parsed.success) {
    return null;
  }

  const fieldErrors: Partial<Record<VolunteerVisibleField, VolunteerFieldErrorCode>> = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (
      typeof field !== 'string' ||
      !(volunteerVisibleFields as readonly string[]).includes(field) ||
      fieldErrors[field as VolunteerVisibleField]
    ) {
      continue;
    }
    fieldErrors[field as VolunteerVisibleField] = issueToErrorCode(issue);
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}
