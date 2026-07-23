import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VolunteerForm } from './VolunteerForm';

const submitVolunteerApplication = vi.fn(async (input: { email: string }) => {
  if (!input.email.includes('@')) {
    return {
      ok: false as const,
      error: 'Please check your details and try again.',
      fieldErrors: { email: 'invalidEmail' as const },
    };
  }
  return { ok: true as const };
});

vi.mock('@/actions/volunteer', () => ({
  submitVolunteerApplication: (input: { email: string }) => submitVolunteerApplication(input),
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

  it('shows field-level errors when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<VolunteerForm />);

    await user.click(screen.getByRole('button', { name: /I am in/i }));

    expect(await screen.findAllByText('This field is required.')).toHaveLength(4);
    expect(screen.getByText('Please check your details and try again.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/City/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/How will you help/i)).toHaveAttribute('aria-invalid', 'true');
    expect(submitVolunteerApplication).not.toHaveBeenCalled();
  });

  it('shows email validation reason for invalid email', async () => {
    const user = userEvent.setup();
    render(<VolunteerForm />);

    await user.type(screen.getByLabelText(/Full name/i), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/^Email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/City/i), 'Pune');
    await user.type(screen.getByLabelText(/How will you help/i), 'Research');
    await user.click(screen.getByRole('button', { name: /I am in/i }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(submitVolunteerApplication).not.toHaveBeenCalled();
  });

  it('shows phone validation reason for invalid phone', async () => {
    const user = userEvent.setup();
    render(<VolunteerForm />);

    await user.type(screen.getByLabelText(/Full name/i), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/^Email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/Phone/i), 'call-me<script>');
    await user.type(screen.getByLabelText(/City/i), 'Pune');
    await user.type(screen.getByLabelText(/How will you help/i), 'Research');
    await user.click(screen.getByRole('button', { name: /I am in/i }));

    expect(
      await screen.findByText(/Enter a valid phone number/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toHaveAttribute('aria-invalid', 'true');
    expect(submitVolunteerApplication).not.toHaveBeenCalled();
  });

  it('clears a field error when the user edits that field', async () => {
    const user = userEvent.setup();
    render(<VolunteerForm />);

    await user.click(screen.getByRole('button', { name: /I am in/i }));
    expect(await screen.findAllByText('This field is required.')).toHaveLength(4);

    await user.type(screen.getByLabelText(/Full name/i), 'Ada');
    expect(screen.getByLabelText(/Full name/i)).not.toHaveAttribute('aria-invalid');
    expect(screen.getAllByText('This field is required.')).toHaveLength(3);
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
    expect(submitVolunteerApplication).toHaveBeenCalledOnce();
  });
});
