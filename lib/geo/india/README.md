# India geo assets

## Files

| File | Role |
|------|------|
| `data/india-country.json` | Dissolved national outline (country stroke) |
| `data/india-states-clean.json` | State/UT polygons for internal borders + fill |
| `data/india-states.json` | Source TopoJSON (Indian observed borders); kept as provenance |

## Source

- **Upstream:** [AbhinavSwami28/india-official-geojson](https://github.com/AbhinavSwami28/india-official-geojson) (`india-states.topojson`)
- **Border policy:** Indian observed borders (J&K + Ladakh claimed extent, Aksai Chin, full Arunachal), as curated upstream.

## Why country is pre-dissolved

The source TopoJSON merges J&K/Ladakh from a separate dataset. Those polygons **do not share arcs** with Himachal/Punjab, so a raw exterior mesh treats the southern J&K edge as a **national** border and leaves hundreds of multipolygon crumbs that stroke as dots.

`india-country.geojson` is built offline with mapshaper:

```bash
# from FeatureCollection of states
mapshaper states.geojson \
  -buffer 5km \
  -dissolve \
  -explode \
  -filter '… keep large mainland + major island components …' \
  -simplify dp 4% keep-shapes \
  -o india-country.json
```


The buffer closes the topology gap so the national outline is continuous through Kashmir without a false southern seam.

State borders use cleaned per-state polygons (not the exterior mesh), so the J&K–Himachal line appears only when `showStates` is on.

## QA checklist

- [ ] No dense interior dots on country-only view
- [ ] No heavy line under J&K when `showStates={false}`
- [ ] J&K/Ladakh full claimed outline present
- [ ] State borders include J&K southern edge when `showStates`
- [ ] Andaman & Nicobar chain visible (including southern Nicobar)
- [ ] Lakshadweep islands visible west of Kerala
