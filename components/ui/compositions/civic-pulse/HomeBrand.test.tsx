import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeBrand } from './HomeBrand';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('HomeBrand', () => {
  it('renders two brand panels and digital speech CTA', () => {
    render(<HomeBrand />);

    expect(screen.getByRole('region', { name: /data.janta.party/i })).toBeInTheDocument();
    expect(screen.getByText(/India deserves better options/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Let's build the India we deserve/i),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('[data-home-step]')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Digital speech/i })).toHaveAttribute(
      'href',
      '/speech',
    );
  });
});
