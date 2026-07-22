import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Label } from './Label';

describe('Label', () => {
  it('renders label text', () => {
    render(<Label>Full name</Label>);
    expect(screen.getByText('Full name')).toBeInTheDocument();
  });
});
