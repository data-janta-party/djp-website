import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CivicPulseHomePageView } from './CivicPulseHomePageView';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/actions/volunteer', () => ({
  submitVolunteerApplication: vi.fn(async () => ({ ok: true })),
}));

describe('CivicPulseHomePageView', () => {
  it('renders brand panels, contribute CTAs, volunteer form, and speech link', () => {
    render(<CivicPulseHomePageView />);
    expect(screen.getByText(/India deserves better options/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Let's build the India we deserve/i),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('[data-home-step]')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Digital speech/i })).toHaveAttribute(
      'href',
      '/speech',
    );
    expect(screen.getByText(/Contribute with code/i)).toBeInTheDocument();
    expect(screen.getByText(/Contribute with your skills/i)).toBeInTheDocument();
    expect(screen.queryByText(/Contribute with data/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open GitHub/i })).toHaveAttribute(
      'href',
      'https://github.com/datajantaparty',
    );
    expect(screen.getByRole('heading', { name: /Stand with us/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.queryByText(/brightest minds/i)).not.toBeInTheDocument();
  });
});
