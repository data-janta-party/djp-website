import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IndiaVisionsReveal } from './IndiaVisionsReveal';

const words = [
  'Transparent',
  'Walkable',
  'Safe',
  'Accountable',
  'Faster',
  'Clean',
] as const;

describe('IndiaVisionsReveal', () => {
  it('fills the panel with a word cloud around the center phrase', () => {
    render(
      <div className="relative h-svh w-full">
        <IndiaVisionsReveal center="We want to fix India." words={words} />
      </div>,
    );

    expect(document.getElementById('story-india-visions-cloud')).toBeInTheDocument();
    expect(screen.getByText('We want to fix India.')).toBeInTheDocument();
    expect(screen.getByText('Transparent')).toBeInTheDocument();
    expect(screen.getByText('Walkable')).toBeInTheDocument();
    expect(screen.getByText('Safe')).toBeInTheDocument();
    expect(document.getElementById('story-india-visions-sentence')).not.toBeInTheDocument();
  });
});
