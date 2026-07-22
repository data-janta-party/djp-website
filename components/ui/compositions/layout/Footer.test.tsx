import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from '@/components/ui/compositions/layout/Footer';

describe('Footer', () => {
  it('renders product footer copy', () => {
    render(<Footer />);
    expect(screen.getByText(/data\.janta\.party/i)).toBeInTheDocument();
  });
});
