import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';

describe('Select', () => {
  it('opens and selects an option', async () => {
    const user = userEvent.setup();
    render(
      <Select defaultValue="en">
        <SelectTrigger aria-label="Language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="hi">हिन्दी</SelectItem>
        </SelectContent>
      </Select>,
    );

    await user.click(screen.getByLabelText('Language'));
    await user.click(await screen.findByRole('option', { name: 'हिन्दी' }));
    expect(screen.getByLabelText('Language')).toHaveTextContent('हिन्दी');
  });
});
