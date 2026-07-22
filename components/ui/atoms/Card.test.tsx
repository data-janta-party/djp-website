import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/atoms/Card';

describe('Card', () => {
  it('renders card content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>data.janta.party</CardTitle>
        </CardHeader>
        <CardContent>Demo content</CardContent>
      </Card>,
    );

    expect(screen.getByText('data.janta.party')).toBeInTheDocument();
    expect(screen.getByText('Demo content')).toBeInTheDocument();
  });
});