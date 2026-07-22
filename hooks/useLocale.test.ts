import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useLocale } from './useLocale';

describe('useLocale', () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('defaults to English', async () => {
    const { result } = renderHook(() => useLocale());
    await waitFor(() => {
      expect(result.current.locale).toBe('en');
    });
    expect(result.current.messages.home.panel1).toMatch(/India deserves better options/i);
  });

  it('switches locale and updates messages', async () => {
    const { result } = renderHook(() => useLocale());

    act(() => {
      result.current.setLocale('hi');
    });

    await waitFor(() => {
      expect(result.current.locale).toBe('hi');
    });
    expect(result.current.messages.nav.volunteer).toContain('स्वयंसेवक');
    expect(document.documentElement.lang).toBe('hi');
  });
});
