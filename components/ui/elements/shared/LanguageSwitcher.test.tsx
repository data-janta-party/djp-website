import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('renders language options and switches locale via shadcn Select', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const trigger = screen.getByLabelText(/Language/i);
    expect(trigger).toBeInTheDocument();
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'हिन्दी' }));
    expect(document.documentElement.lang).toBe('hi');
  });
});
