import { describe, expect, it } from 'vitest';

import { collectVolunteerFieldErrors, volunteerInputSchema } from './volunteer';

describe('volunteerInputSchema', () => {
  it('accepts a valid application and lowercases email', () => {
    const result = volunteerInputSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      phone: '+91 90000 00000',
      city: 'Pune',
      interest: 'Data research',
      website: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('ada@example.com');
    }
  });

  it('rejects empty required fields', () => {
    const result = volunteerInputSchema.safeParse({
      name: '   ',
      email: '',
      phone: '',
      city: '',
      interest: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('collectVolunteerFieldErrors', () => {
  it('returns null for valid input', () => {
    expect(
      collectVolunteerFieldErrors({
        name: 'Ada',
        email: 'ada@example.com',
        phone: '',
        city: 'Pune',
        interest: 'Help',
      }),
    ).toBeNull();
  });

  it('maps empty fields to required', () => {
    expect(
      collectVolunteerFieldErrors({
        name: '',
        email: '',
        phone: '',
        city: '',
        interest: '',
      }),
    ).toEqual({
      name: 'required',
      email: 'required',
      city: 'required',
      interest: 'required',
    });
  });

  it('maps invalid email and phone codes', () => {
    expect(
      collectVolunteerFieldErrors({
        name: 'Ada',
        email: 'not-an-email',
        phone: 'call-me<script>',
        city: 'Pune',
        interest: 'Help',
      }),
    ).toEqual({
      email: 'invalidEmail',
      phone: 'invalidPhone',
    });
  });

  it('maps overlong values to tooLong', () => {
    expect(
      collectVolunteerFieldErrors({
        name: 'A'.repeat(121),
        email: 'ada@example.com',
        phone: '',
        city: 'Pune',
        interest: 'Help',
      }),
    ).toEqual({
      name: 'tooLong',
    });
  });
});
