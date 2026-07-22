/** GeoJSON coordinate order: [longitude, latitude]. */
export type LonLat = [longitude: number, latitude: number];

export type ProjectedPoint = {
  x: number;
  y: number;
};

export type IndiaMapMarker = {
  id: string;
  lat: number;
  lon: number;
  label?: string;
  className?: string;
};

export type IndiaMapPath = {
  id: string;
  /** Sequence of [lon, lat] in GeoJSON order. */
  coordinates: LonLat[];
  className?: string;
};
