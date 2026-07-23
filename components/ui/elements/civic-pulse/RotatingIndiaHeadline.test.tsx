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

  it('renders lead, first adjective, and plain India trail', () => {
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
    // Mobile: lead and adjective+India are separate lines; India stays plain white.
    expect(document.getElementById('join-india-lead')?.className).toMatch(/block/);
    expect(document.getElementById('join-india-line2')?.className).toMatch(/block/);
    const india = document.getElementById('join-india-trail');
    expect(india).toHaveTextContent('India.');
    expect(india).toHaveClass('text-white');
    expect(india).not.toHaveClass('kinetic-tiranga');
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
