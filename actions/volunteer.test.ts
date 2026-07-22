import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertValuesMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn(() => ({ values: insertValuesMock })));
const selectLimitMock = vi.hoisted(() => vi.fn());
const selectWhereMock = vi.hoisted(() => vi.fn(() => ({ limit: selectLimitMock })));
const selectFromMock = vi.hoisted(() => vi.fn(() => ({ where: selectWhereMock })));
const selectMock = vi.hoisted(() => vi.fn(() => ({ from: selectFromMock })));
const getDbMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    getDb: getDbMock,
  };
});

import { DbUnavailableError } from '@/lib/db';
import { submitVolunteerApplication } from './volunteer';

describe('submitVolunteerApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValuesMock.mockResolvedValue(undefined);
    selectLimitMock.mockResolvedValue([]);
    getDbMock.mockReturnValue({ insert: insertMock, select: selectMock });
  });

  it('accepts a valid volunteer application and stores it in D1', async () => {
    const result = await submitVolunteerApplication({
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      phone: '+91 90000 00000',
      city: 'Pune',
      interest: 'Data research and outreach',
    });

    expect(result).toEqual({ ok: true });
    expect(getDbMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+91 90000 00000',
        city: 'Pune',
        interest: 'Data research and outreach',
        createdAt: expect.any(String),
      }),
    );
  });

  it('stores null phone when phone is empty', async () => {
    const result = await submitVolunteerApplication({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '',
      city: 'Pune',
      interest: 'Help',
    });

    expect(result).toEqual({ ok: true });
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: null,
      }),
    );
  });

  it('rejects invalid email without writing to the database', async () => {
    const result = await submitVolunteerApplication({
      name: 'Ada',
      email: 'not-an-email',
      city: 'Pune',
      interest: 'Help',
    });

    expect(result.ok).toBe(false);
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('rejects empty name without writing to the database', async () => {
    const result = await submitVolunteerApplication({
      name: '   ',
      email: 'ada@example.com',
      city: 'Pune',
      interest: 'Help',
    });

    expect(result.ok).toBe(false);
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('rejects invalid phone characters without writing to the database', async () => {
    const result = await submitVolunteerApplication({
      name: 'Ada',
      email: 'ada@example.com',
      phone: 'call-me<script>',
      city: 'Pune',
      interest: 'Help',
    });

    expect(result.ok).toBe(false);
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('returns an error when the email is already registered', async () => {
    selectLimitMock.mockResolvedValue([{ id: 1 }]);

    const result = await submitVolunteerApplication({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      city: 'Pune',
      interest: 'Help',
    });

    expect(result).toEqual({
      ok: false,
      error: 'An application with this email is already registered.',
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('returns an error when insert hits a unique constraint race', async () => {
    insertValuesMock.mockRejectedValue(new Error('UNIQUE constraint failed: volunteers.email'));

    const result = await submitVolunteerApplication({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      city: 'Pune',
      interest: 'Help',
    });

    expect(result).toEqual({
      ok: false,
      error: 'An application with this email is already registered.',
    });
  });

  it('silently accepts honeypot submissions without writing', async () => {
    const result = await submitVolunteerApplication({
      name: 'Bot',
      email: 'bot@example.com',
      city: 'Nowhere',
      interest: 'Spam',
      website: 'https://spam.example',
    });

    expect(result).toEqual({ ok: true });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it('returns a friendly error when D1 is unavailable', async () => {
    getDbMock.mockImplementation(() => {
      throw new DbUnavailableError('D1 binding "DB" is not configured');
    });

    const result = await submitVolunteerApplication({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      city: 'Pune',
      interest: 'Help',
    });

    expect(result).toEqual({
      ok: false,
      error: 'Volunteer signup is temporarily unavailable. Please try again later.',
    });
  });

  it('returns a friendly error when the insert fails', async () => {
    insertValuesMock.mockRejectedValue(new Error('D1 write failed'));

    const result = await submitVolunteerApplication({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      city: 'Pune',
      interest: 'Help',
    });

    expect(result).toEqual({
      ok: false,
      error: 'Something went wrong saving your application. Please try again.',
    });
  });
});
