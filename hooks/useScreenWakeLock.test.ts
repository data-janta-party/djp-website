import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScreenWakeLock } from './useScreenWakeLock';

type MockSentinel = {
  released: boolean;
  release: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

function installWakeLock() {
  const sentinels: MockSentinel[] = [];
  const request = vi.fn(async () => {
    const listeners = new Map<string, () => void>();
    const sentinel: MockSentinel = {
      released: false,
      release: vi.fn(async () => {
        sentinel.released = true;
        listeners.get('release')?.();
      }),
      addEventListener: vi.fn((type: string, listener: () => void) => {
        if (type === 'release') {
          listeners.set(type, listener);
        }
      }),
    };
    sentinels.push(sentinel);
    return sentinel;
  });

  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request },
  });

  return { request, sentinels };
}

describe('useScreenWakeLock', () => {
  let visibility = 'visible';

  beforeEach(() => {
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
      () => visibility as DocumentVisibilityState,
    );
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    vi.restoreAllMocks();
  });

  it('requests a screen wake lock when active', async () => {
    const { request, sentinels } = installWakeLock();
    renderHook(() => useScreenWakeLock(true));

    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledWith('screen');
    });
    expect(sentinels).toHaveLength(1);
    expect(sentinels[0]?.released).toBe(false);
  });

  it('does not request when inactive', async () => {
    const { request } = installWakeLock();
    renderHook(() => useScreenWakeLock(false));

    await Promise.resolve();
    expect(request).not.toHaveBeenCalled();
  });

  it('releases on unmount or when deactivated', async () => {
    const { request, sentinels } = installWakeLock();
    const { rerender, unmount } = renderHook(
      ({ active }) => useScreenWakeLock(active),
      { initialProps: { active: true } },
    );

    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });

    rerender({ active: false });
    await vi.waitFor(() => {
      expect(sentinels[0]?.release).toHaveBeenCalled();
    });

    request.mockClear();
    rerender({ active: true });
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });

    unmount();
    await vi.waitFor(() => {
      expect(sentinels[1]?.release).toHaveBeenCalled();
    });
  });

  it('re-requests after the document becomes visible again', async () => {
    const { request, sentinels } = installWakeLock();
    renderHook(() => useScreenWakeLock(true));

    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });

    // Simulate browser auto-release on hide.
    await sentinels[0]!.release();
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  it('no-ops when Wake Lock API is missing', async () => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    expect(() => renderHook(() => useScreenWakeLock(true))).not.toThrow();
    await Promise.resolve();
  });
});
