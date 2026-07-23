import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('opens a dropdown on button press and switches locale', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const trigger = screen.getByRole('button', { name: /Language/i });
    expect(trigger).toBeInTheDocument();
    // Icon-only: selected locale is not shown on the button.
    expect(trigger).not.toHaveTextContent(/English|हिन्दी/i);
    expect(document.getElementById('language-switcher-translate-indic')).toBeInTheDocument();

    // Dropdown is closed until pressed.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(trigger);

    const menu = await screen.findByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'हिन्दी' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'हिन्दी' }));
    expect(document.documentElement.lang).toBe('hi');
  });
});
