import {
  INDIA_VIEWBOX,
  indiaCountryOutlinePathD,
  indiaStateBordersPathD,
  indiaStateFillPaths,
  projectIndiaPoint,
  projectIndiaPolyline,
  type IndiaMapMarker,
  type IndiaMapPath,
} from '@/lib/geo/india';
import { cn } from '@/lib/utils';

export type { IndiaMapMarker, IndiaMapPath };

export type IndiaMapProps = React.HTMLAttributes<SVGSVGElement> & {
  /** Draw internal state/UT borders. Default true. */
  showStates?: boolean;
  markers?: IndiaMapMarker[];
  paths?: IndiaMapPath[];
  /** Accessible name for the SVG. */
  title?: string;
  className?: string;
  countryStrokeWidth?: number;
  stateStrokeWidth?: number;
  pathStrokeWidth?: number;
  markerRadius?: number;
  /** Optional faint fill under the outline. */
  showFill?: boolean;
};

/**
 * Outline map of India at a fixed all-country scale.
 *
 * Stroke color follows `currentColor` / theme (`text-foreground`).
 * Pass lat/lon markers and [lon, lat] paths for overlays.
 *
 * @example
 * ```tsx
 * import { IndiaMap } from '@/components/ui/elements/shared/IndiaMap';
 *
 * <IndiaMap
 *   markers={[{ id: 'del', lat: 28.6139, lon: 77.209, label: 'Delhi' }]}
 *   paths={[{ id: 'route', coordinates: [[77.209, 28.6139], [72.8777, 19.076]] }]}
 * />
 * ```
 */
export function IndiaMap({
  showStates = true,
  markers = [],
  paths = [],
  title = 'Map of India',
  className,
  countryStrokeWidth = 1.5,
  stateStrokeWidth = 0.75,
  pathStrokeWidth = 1.25,
  markerRadius = 4,
  showFill = false,
  id = 'india-map',
  ...props
}: IndiaMapProps) {
  const projectedMarkers = markers.flatMap((marker) => {
    const point = projectIndiaPoint(marker.lon, marker.lat);
    if (!point) {
      return [];
    }
    return [{ marker, point }];
  });

  const projectedPaths = paths.flatMap((pathItem) => {
    const points = projectIndiaPolyline(pathItem.coordinates);
    if (!points) {
      return [];
    }
    return [{ pathItem, points }];
  });

  return (
    <svg
      id={id}
      viewBox={INDIA_VIEWBOX}
      role="img"
      aria-label={title}
      className={cn('h-auto w-full text-foreground', className)}
      {...props}
    >
      <title id="tpl-components-ui-elements-shared-india-map-l83-c7">{title}</title>

      {showFill ? (
        <g id="india-map-fill" fill="currentColor" fillOpacity={0.04} stroke="none">
          {indiaStateFillPaths.map((state) => (
            <path key={state.id} id={`india-map-fill-${state.id}`} d={state.d} />
          ))}
        </g>
      ) : null}

      {showStates ? (
        <g
          id="india-map-states"
          fill="none"
          stroke="currentColor"
          strokeWidth={stateStrokeWidth}
          strokeLinejoin="round"
          strokeLinecap="butt"
          opacity={0.4}
        >
          {/* Combined path keeps a single paint; state ids live on fill layer when shown */}
          <path id="india-map-states-path" d={indiaStateBordersPathD} />
        </g>
      ) : null}

      <path
        id="india-map-country"
        d={indiaCountryOutlinePathD}
        fill="none"
        stroke="currentColor"
        strokeWidth={countryStrokeWidth}
        strokeLinejoin="round"
        strokeLinecap="butt"
      />

      {projectedPaths.length > 0 ? (
        <g id="india-map-paths" fill="none" stroke="currentColor" strokeWidth={pathStrokeWidth}>
          {projectedPaths.map(({ pathItem, points }) => (
            <polyline
              key={pathItem.id}
              id={`india-map-path-${pathItem.id}`}
              points={points}
              className={pathItem.className}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </g>
      ) : null}

      {projectedMarkers.length > 0 ? (
        <g id="india-map-markers" fill="currentColor">
          {projectedMarkers.map(({ marker, point }) => (
            <g
              key={marker.id}
              id={`india-map-marker-${marker.id}`}
              className={marker.className}
              transform={`translate(${point.x} ${point.y})`}
            >
              <circle id={`india-map-marker-dot-${marker.id}`} r={markerRadius} />
              {marker.label ? (
                <title id={`india-map-marker-title-${marker.id}`}>{marker.label}</title>
              ) : null}
            </g>
          ))}
        </g>
      ) : null}
    </svg>
  );
}
