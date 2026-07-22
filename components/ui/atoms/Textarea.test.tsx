import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders with accessible name', () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
  });
});
