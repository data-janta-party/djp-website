import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BeatNodes, RollerUrl } from './KineticSpeechBeatNodes';

describe('BeatNodes', () => {
  it('renders a line beat with stable id', () => {
    render(
      <BeatNodes
        beat={{
          kind: 'line',
          id: 'test-line',
          text: 'Hello India.',
          role: 'body',
          motion: 'rise',
          hold: 2,
        }}
      />,
    );
    expect(document.getElementById('test-line')).toBeTruthy();
    expect(screen.getByText('Hello India.')).toBeInTheDocument();
  });

  it('renders silence as null', () => {
    const { container } = render(
      <BeatNodes beat={{ kind: 'silence', id: 'test-silence', duration: 1 }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders sticky morph structure with beat-scoped dot ids', () => {
    render(
      <BeatNodes
        beat={{
          kind: 'sticky',
          id: 'test-sticky',
          prefix: 'Deadline',
          inline: true,
          steps: [
            { suffix: 'promised', hold: 2, dots: 3 },
            { suffix: 'extended', hold: 2, dots: 3 },
          ],
        }}
      />,
    );
    expect(document.getElementById('test-sticky')).toBeTruthy();
    expect(document.getElementById('test-sticky-prefix')).toBeTruthy();
    // Step-local dots scoped by step index (no cross-step collisions)
    expect(document.getElementById('test-sticky-s0-dot-0')).toBeTruthy();
    expect(document.getElementById('test-sticky-s1-dot-0')).toBeTruthy();
    // No colliding film tpl ids
    expect(document.querySelector('[id^="tpl-"]')).toBeNull();
  });

  it('renders project-delays cards with beat-scoped ids', () => {
    render(
      <BeatNodes
        beat={{
          kind: 'project-delays',
          id: 'test-delays',
          projects: [{ project: 'Bullet Train', years: '5 years' }],
          holdEach: 3,
          moreLabel: '1000+ more.',
          moreHold: 3,
        }}
      />,
    );
    expect(document.getElementById('test-delays')).toBeTruthy();
    expect(document.getElementById('test-delays-project-0')).toBeTruthy();
    expect(screen.getByText('Bullet Train')).toBeInTheDocument();
    expect(screen.getByText('1000+ more.')).toBeInTheDocument();
  });
});

describe('RollerUrl', () => {
  it('renders the roller root with slot-scoped cell ids', () => {
    render(<RollerUrl />);
    expect(document.getElementById('kinetic-roller')).toBeTruthy();
    expect(document.getElementById('kinetic-roller-slot-data')).toBeTruthy();
    expect(document.getElementById('kinetic-roller-cell-0-0')).toBeTruthy();
  });
});
