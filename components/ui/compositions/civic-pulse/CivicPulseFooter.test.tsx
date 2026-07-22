import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CivicPulseFooter } from './CivicPulseFooter';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('CivicPulseFooter', () => {
  it('renders brand footer content', () => {
    render(<CivicPulseFooter />);
    expect(screen.getByLabelText('data.janta.party')).toBeInTheDocument();
    expect(screen.getByText('d.j.p')).toBeInTheDocument();
    expect(screen.getByText(/© 2026 data.janta.party/i)).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });
});
