import { describe, expect, it } from 'vitest';

import { INDIA_MAP_HEIGHT, INDIA_MAP_WIDTH } from '@/lib/geo/india/bounds';
import {
  indiaCountryOutlinePathD,
  indiaStateBordersPathD,
  indiaStateFillPaths,
  projectIndiaPoint,
  projectIndiaPolyline,
} from '@/lib/geo/india/project';

describe('projectIndiaPoint', () => {
  it('projects Delhi inside the India viewBox at a usable scale', () => {
    const point = projectIndiaPoint(77.209, 28.6139);
    expect(point).not.toBeNull();
    expect(point!.x).toBeGreaterThan(INDIA_MAP_WIDTH * 0.15);
    expect(point!.x).toBeLessThan(INDIA_MAP_WIDTH * 0.85);
    expect(point!.y).toBeGreaterThan(INDIA_MAP_HEIGHT * 0.05);
    expect(point!.y).toBeLessThan(INDIA_MAP_HEIGHT * 0.55);
  });

  it('projects Mumbai inside the India viewBox at a usable scale', () => {
    const point = projectIndiaPoint(72.8777, 19.076);
    expect(point).not.toBeNull();
    expect(point!.x).toBeGreaterThan(INDIA_MAP_WIDTH * 0.1);
    expect(point!.x).toBeLessThan(INDIA_MAP_WIDTH * 0.7);
    expect(point!.y).toBeGreaterThan(INDIA_MAP_HEIGHT * 0.25);
    expect(point!.y).toBeLessThan(INDIA_MAP_HEIGHT * 0.85);
  });

  it('returns null for non-finite coordinates', () => {
    expect(projectIndiaPoint(Number.NaN, 20)).toBeNull();
    expect(projectIndiaPoint(77, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('projectIndiaPolyline', () => {
  it('builds a polyline string for two valid points', () => {
    const points = projectIndiaPolyline([
      [77.209, 28.6139],
      [72.8777, 19.076],
    ]);
    expect(points).toMatch(/^\d+(\.\d+)?,\d+(\.\d+)? \d+(\.\d+)?,\d+(\.\d+)?$/);
  });

  it('returns null for fewer than two points', () => {
    expect(projectIndiaPolyline([[77.209, 28.6139]])).toBeNull();
  });
});

describe('precomputed India paths', () => {
  it('has a country outline with mainland + island groups (not crumb-filled)', () => {
    expect(indiaCountryOutlinePathD.length).toBeGreaterThan(100);
    const moveCommands = (indiaCountryOutlinePathD.match(/M/g) ?? []).length;
    // Mainland + Andaman/Nicobar + Lakshadweep islands — dozens of parts, not hundreds of crumbs.
    expect(moveCommands).toBeGreaterThan(5);
    expect(moveCommands).toBeLessThan(120);
  });

  it('has state border path data for major units', () => {
    expect(indiaStateBordersPathD.length).toBeGreaterThan(100);
    expect(indiaStateFillPaths.length).toBeGreaterThanOrEqual(28);
    expect(indiaStateFillPaths.every((s) => s.d.length > 0 && s.id.length > 0)).toBe(true);
  });
});
