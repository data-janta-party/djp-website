import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppShell } from '@/components/ui/compositions/layout/AppShell';

describe('AppShell', () => {
  it('renders shell chrome and children', () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.getByText(/data\.janta\.party/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
  });

  it('renders optional navbar when provided', () => {
    render(
      <AppShell navbar={<nav aria-label="Custom nav">Nav</nav>}>
        <p>Body</p>
      </AppShell>,
    );

    expect(screen.getByRole('navigation', { name: 'Custom nav' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
