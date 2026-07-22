import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/atoms/Button';
import { EmptyState } from '@/components/ui/elements/shared/EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items yet" description="Add your first item." />);
    expect(screen.getByText('No items yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first item.')).toBeInTheDocument();
  });

  it('renders optional action', () => {
    render(
      <EmptyState
        title="No items yet"
        description="Add your first item."
        action={<Button>Add item</Button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });
});