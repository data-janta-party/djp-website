import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
  it('renders with accessible name', () => {
    render(<Input aria-label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
