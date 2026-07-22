import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IndiaMap } from '@/components/ui/elements/shared/IndiaMap';

describe('IndiaMap', () => {
  it('renders an accessible SVG with country outline', () => {
    render(<IndiaMap title="Map of India" />);
    expect(screen.getByRole('img', { name: 'Map of India' })).toBeInTheDocument();
    expect(document.getElementById('india-map')).toBeInTheDocument();
    expect(document.getElementById('india-map-country')).toBeInTheDocument();
    expect(document.getElementById('india-map-states')).toBeInTheDocument();
  });

  it('hides state borders when showStates is false', () => {
    render(<IndiaMap showStates={false} />);
    expect(document.getElementById('india-map-country')).toBeInTheDocument();
    expect(document.getElementById('india-map-states')).not.toBeInTheDocument();
  });

  it('projects markers and paths into the SVG', () => {
    render(
      <IndiaMap
        markers={[{ id: 'del', lat: 28.6139, lon: 77.209, label: 'Delhi' }]}
        paths={[
          {
            id: 'delhi-mumbai',
            coordinates: [
              [77.209, 28.6139],
              [72.8777, 19.076],
            ],
          },
        ]}
      />,
    );

    const marker = document.getElementById('india-map-marker-del');
    expect(marker).toBeInTheDocument();
    expect(marker?.getAttribute('transform')).toMatch(/translate\(/);

    const path = document.getElementById('india-map-path-delhi-mumbai');
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute('points')).toBeTruthy();
  });

  it('renders fill layer when showFill is true', () => {
    render(<IndiaMap showFill />);
    expect(document.getElementById('india-map-fill')).toBeInTheDocument();
  });
});
