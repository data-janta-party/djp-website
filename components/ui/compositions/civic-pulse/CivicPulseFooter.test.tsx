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
  it('renders brand logo, footer nav, contact link, and copyright', () => {
    render(<CivicPulseFooter />);

    expect(document.getElementById('civic-pulse-footer')).toBeInTheDocument();
    expect(screen.getByLabelText('data.janta.party')).toBeInTheDocument();
    expect(screen.getByText('d.j.p')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Footer navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contact/i })).toHaveAttribute(
      'href',
      'mailto:datajantaparty@gmail.com',
    );
    expect(screen.getByText('© 2026 data.janta.party.')).toBeInTheDocument();
  });

  it('applies optional className to the footer', () => {
    render(<CivicPulseFooter className="extra-footer-class" />);

    expect(document.getElementById('civic-pulse-footer')).toHaveClass('extra-footer-class');
  });
});
