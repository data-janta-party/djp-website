import { geoMercator, geoPath, type GeoPermissibleObjects, type GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';

import indiaCountry from '@/lib/geo/india/data/india-country.json';
import indiaStates from '@/lib/geo/india/data/india-states-clean.json';
import {
  INDIA_MAP_HEIGHT,
  INDIA_MAP_PADDING,
  INDIA_MAP_WIDTH,
  indiaExtentMultiPoint,
} from '@/lib/geo/india/bounds';
import type { LonLat, ProjectedPoint } from '@/lib/geo/india/types';

type StateProps = { NAME_1?: string };

const countryCollection = indiaCountry as FeatureCollection<Polygon | MultiPolygon>;
const statesCollection = indiaStates as FeatureCollection<Geometry, StateProps>;

/** Dissolved national outline (topology gaps closed via offline buffer-dissolve). */
const indiaCountryGeometry: MultiPolygon = (() => {
  const coordinates: MultiPolygon['coordinates'] = [];
  for (const feature of countryCollection.features) {
    const { geometry } = feature;
    if (geometry.type === 'Polygon') {
      coordinates.push(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      coordinates.push(...geometry.coordinates);
    }
  }
  return { type: 'MultiPolygon', coordinates };
})();

let projectionSingleton: GeoProjection | null = null;

/**
 * Shared Mercator projection fitted to fixed India lon/lat corner points.
 * Do not fit FeatureCollections: mapshaper/simplified polygons can invert on the
 * sphere and make fitExtent target the whole world (tiny map in the corner).
 */
function getIndiaProjection(): GeoProjection {
  if (!projectionSingleton) {
    projectionSingleton = geoMercator().fitExtent(
      [
        [INDIA_MAP_PADDING, INDIA_MAP_PADDING],
        [INDIA_MAP_WIDTH - INDIA_MAP_PADDING, INDIA_MAP_HEIGHT - INDIA_MAP_PADDING],
      ],
      indiaExtentMultiPoint(),
    );
  }
  return projectionSingleton;
}

function pathGenerator() {
  return geoPath(getIndiaProjection());
}

/** Project a lon/lat pair into SVG coordinates, or `null` if unprojectable. */
export function projectIndiaPoint(lon: number, lat: number): ProjectedPoint | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }
  const projected = getIndiaProjection()([lon, lat]);
  if (!projected) {
    return null;
  }
  const [x, y] = projected;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
}

/** Project a path of [lon, lat] points to an SVG `points` string for `<polyline>`. */
export function projectIndiaPolyline(coordinates: LonLat[]): string | null {
  if (coordinates.length < 2) {
    return null;
  }
  const parts: string[] = [];
  for (const [lon, lat] of coordinates) {
    const point = projectIndiaPoint(lon, lat);
    if (!point) {
      return null;
    }
    parts.push(`${point.x},${point.y}`);
  }
  return parts.join(' ');
}

function indiaGeoPathD(object: GeoPermissibleObjects): string {
  return pathGenerator()(object) ?? '';
}

/** Precomputed SVG path for the national outline (no interior crumbs / false J&K seam). */
export const indiaCountryOutlinePathD = indiaGeoPathD(indiaCountryGeometry);

/**
 * Precomputed state/UT paths (polygon strokes + optional fill).
 * Includes J&K–Himachal / J&K–Punjab edges that are missing from raw TopoJSON topology.
 */
export const indiaStateFillPaths: { id: string; name: string; d: string }[] =
  statesCollection.features.flatMap((feature, index) => {
    const name = feature.properties?.NAME_1 ?? `state-${index}`;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const d = indiaGeoPathD(feature as Feature);
    if (!d) {
      return [];
    }
    return [
      {
        id: slug || `state-${index}`,
        name,
        d,
      },
    ];
  });

/** Combined path `d` for all state borders (single paint). */
export const indiaStateBordersPathD = indiaStateFillPaths.map((s) => s.d).join('');
