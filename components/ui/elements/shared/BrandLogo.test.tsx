import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  it('renders d.j.p shorthand with accessible full brand name', () => {
    render(<BrandLogo />);
    expect(screen.getByLabelText('data.janta.party')).toBeInTheDocument();
    expect(screen.getByText('d.j.p')).toBeInTheDocument();
  });

  it('accepts a custom accessible label', () => {
    render(<BrandLogo label="DJP" id="custom-logo" />);
    expect(screen.getByLabelText('DJP')).toHaveAttribute('id', 'custom-logo');
  });

  it('defaults to the black (black bg, white type) variant', () => {
    render(<BrandLogo />);
    expect(screen.getByLabelText('data.janta.party')).toHaveAttribute('data-variant', 'black');
  });

  it('supports the white (white bg, black type) variant', () => {
    render(<BrandLogo variant="white" />);
    expect(screen.getByLabelText('data.janta.party')).toHaveAttribute('data-variant', 'white');
  });
});
