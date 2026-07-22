import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JOIN_ADJECTIVE_HOLD_MS } from '@/lib/data/join-india-adjectives';

import { RotatingIndiaHeadline } from './RotatingIndiaHeadline';

describe('RotatingIndiaHeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders lead, first adjective, and trail', () => {
    render(
      <RotatingIndiaHeadline
        ariaLabel="Let's build Transparent India."
        reducedMotion
      />,
    );
    expect(screen.getByRole('heading', { name: /Let's build Transparent India/i })).toBeInTheDocument();
    expect(document.getElementById('join-headline')).toBeInTheDocument();
    expect(screen.getByText("Let's build")).toBeInTheDocument();
    expect(screen.getAllByText('Transparent').length).toBeGreaterThan(0);
    expect(screen.getByText('India.')).toBeInTheDocument();
  });

  it('rotates to the next adjective after the hold', () => {
    render(
      <RotatingIndiaHeadline
        ariaLabel="Let's build Transparent India."
        reducedMotion={false}
        words={['Transparent', 'Accountable', 'Digital']}
      />,
    );
    expect(screen.getAllByText('Transparent').length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(JOIN_ADJECTIVE_HOLD_MS + 50);
    });

    expect(screen.getAllByText('Accountable').length).toBeGreaterThan(0);
  });
});
