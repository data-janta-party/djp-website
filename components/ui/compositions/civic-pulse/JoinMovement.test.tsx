import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { contributeLinkMeta, joinSectionId } from '@/lib/data/civic-pulse';

import { JoinMovement } from './JoinMovement';

describe('JoinMovement', () => {
  it('renders left-aligned white rotating headline and code/skills cards only', () => {
    render(<JoinMovement />);

    expect(screen.getByRole('region', { name: /Join the movement/i })).toBeInTheDocument();
    expect(document.getElementById(joinSectionId)).toBeInTheDocument();
    expect(screen.queryByText(/This generation built Digital India/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Let's build Transparent India/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Join the movement\./i)).toBeInTheDocument();

    // Headline is white (not emerald)
    const headline = document.getElementById('join-headline');
    expect(headline?.className).toMatch(/text-white/);
    expect(headline?.className).not.toMatch(/emerald/);

    // Only code + skills cards
    expect(contributeLinkMeta.map((l) => l.kind)).toEqual(['code', 'skills']);
    expect(document.getElementById('contribute-code')).toBeInTheDocument();
    expect(document.getElementById('contribute-skills')).toBeInTheDocument();
    expect(document.getElementById('contribute-data')).not.toBeInTheDocument();
    expect(document.getElementById('contribute-apps')).not.toBeInTheDocument();
    expect(document.getElementById('contribute-money')).not.toBeInTheDocument();

    expect(screen.getByText(/Contribute with code/i)).toBeInTheDocument();
    expect(screen.getByText(/Contribute with your skills/i)).toBeInTheDocument();
    expect(screen.queryByText(/Contribute with data/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Download our apps/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contribute with money/i)).not.toBeInTheDocument();

    // Tagline removed
    expect(
      screen.queryByText(/We're not selling hope/i),
    ).not.toBeInTheDocument();
    expect(document.getElementById('join-tagline')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Open GitHub/i })).toHaveAttribute(
      'href',
      'https://github.com/datajantaparty',
    );
    expect(screen.getByRole('link', { name: /^Volunteer$/i })).toHaveAttribute(
      'href',
      '#volunteer',
    );
  });
});
