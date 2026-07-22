import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VolunteerForm } from './VolunteerForm';

vi.mock('@/actions/volunteer', () => ({
  submitVolunteerApplication: vi.fn(async (input: { email: string }) => {
    if (!input.email.includes('@')) {
      return { ok: false, error: 'Please check your details and try again.' };
    }
    return { ok: true };
  }),
}));

describe('VolunteerForm', () => {
  it('renders volunteer form fields', () => {
    render(<VolunteerForm />);
    expect(screen.getByRole('heading', { name: /Stand with us/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/How will you help/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I am in/i })).toBeInTheDocument();
  });

  it('shows success state after valid submission', async () => {
    const user = userEvent.setup();
    render(<VolunteerForm />);

    await user.type(screen.getByLabelText(/Full name/i), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/^Email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/City/i), 'Pune');
    await user.type(screen.getByLabelText(/How will you help/i), 'Research');
    await user.click(screen.getByRole('button', { name: /I am in/i }));

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });
});
