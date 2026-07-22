import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CivicPulseNavbar } from './CivicPulseNavbar';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('CivicPulseNavbar', () => {
  it('renders brand logo, language switcher, speech and volunteer links', () => {
    render(<CivicPulseNavbar />);
    expect(screen.getByLabelText('data.janta.party')).toBeInTheDocument();
    expect(screen.getByText('d.j.p')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Language/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Digital speech/i })).toHaveAttribute(
      'href',
      '/speech',
    );
    expect(screen.getByRole('link', { name: /Volunteer/i })).toHaveAttribute(
      'href',
      '#volunteer',
    );
  });
});

