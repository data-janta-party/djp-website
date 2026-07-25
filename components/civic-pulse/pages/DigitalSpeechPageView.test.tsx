import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { kineticSpeechCopy } from '@/lib/data/kinetic-speech';

import { DigitalSpeechPageView } from './DigitalSpeechPageView';

vi.mock('@/components/ui/compositions/civic-pulse/KineticSpeechFilm', () => ({
  KineticSpeechFilm: () => (
    <section id="kinetic-speech-film" aria-label={kineticSpeechCopy.a11y.region}>
      <div id="kinetic-controls">
        <button type="button">{kineticSpeechCopy.controls.mute}</button>
      </div>
    </section>
  ),
}));

describe('DigitalSpeechPageView', () => {
  it('renders the kinetic speech film shell without home sections', () => {
    render(<DigitalSpeechPageView />);
    expect(document.getElementById('digital-speech')).toBeInTheDocument();
    expect(document.getElementById('kinetic-speech-film')).toBeInTheDocument();
    // Page wires KineticSpeechFilm (mocked here as shell with controls).
    expect(screen.getByRole('button', { name: kineticSpeechCopy.controls.mute })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Which India do you choose/i })).not.toBeInTheDocument();
    expect(document.querySelectorAll('video')).toHaveLength(0);
  });
});
