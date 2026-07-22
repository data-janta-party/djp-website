import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/components/ui/atoms/Badge';

describe('Badge', () => {
  it('renders badge text', () => {
    render(<Badge>Template</Badge>);
    expect(screen.getByText('Template')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(<Badge variant="outline">Cloudflare</Badge>);
    expect(screen.getByText('Cloudflare')).toHaveClass('border');
  });
});