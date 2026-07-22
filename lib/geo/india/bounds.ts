import type { MultiPoint } from 'geojson';

/** SVG canvas size for the fixed all-India view (portrait-friendly). */
export const INDIA_MAP_WIDTH = 1000;
export const INDIA_MAP_HEIGHT = 1100;
export const INDIA_MAP_PADDING = 28;

/** `viewBox` string for the India map SVG. */
export const INDIA_VIEWBOX = `0 0 ${INDIA_MAP_WIDTH} ${INDIA_MAP_HEIGHT}` as const;

/**
 * Geographic extent used to fit the projection (lon/lat WGS84).
 *
 * Prefer MultiPoint corners over a Polygon: d3-geo treats GeoJSON
 * counter-clockwise rings as the exterior complement on the sphere, which
 * makes fitExtent shrink India to a speck in the corner.
 */
const INDIA_GEO_EXTENT = {
  /** West of Gujarat / more margin for Lakshadweep. */
  minLon: 66.8,
  /** East of Arunachal / Andaman chain. */
  maxLon: 98.2,
  /** South of Indira Point / southern Nicobar. */
  minLat: 5.8,
  /** North of Ladakh. */
  maxLat: 37.5,
} as const;

/** Corner points of INDIA_GEO_EXTENT for d3 `fitExtent` (winding-safe). */
export function indiaExtentMultiPoint(): MultiPoint {
  const { minLon, maxLon, minLat, maxLat } = INDIA_GEO_EXTENT;
  return {
    type: 'MultiPoint',
    coordinates: [
      [minLon, minLat],
      [maxLon, minLat],
      [maxLon, maxLat],
      [minLon, maxLat],
    ],
  };
}
