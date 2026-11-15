# EarthSonic — NASA Data Sources, Provenance & Acoustic Mapping Documentation

## 1. Data Provenance & Transparency Principle

EarthSonic is built around **strict honesty about data provenance**. Every observation series returned by the backend or displayed in the frontend carries a machine-validated provenance envelope (`DataStatus`) and is labeled visibly in the UI via `DataStatusBadge.tsx`.

EarthSonic **never** invents NASA endpoints, dataset names, dates, URLs, or mission attributions, and **never** presents snapshot, device-cached, or demonstration data as live NASA data.

---

## 2. The Four Data Status Labels (`DataStatus`)

| `DataStatus` Enum | Visible UI Badge Label | Exact Meaning & When Displayed |
| :--- | :--- | :--- |
| `LIVE_SOURCE` | **LIVE SOURCE DATA** | Retrieved directly from the upstream NASA endpoint during the current server cache TTL window (`6 hours`) and validated against `@earthsonic/shared` Zod schemas. |
| `CACHED_SOURCE_SNAPSHOT` | **CACHED SOURCE SNAPSHOT** | Upstream NASA endpoint timed out or was unreachable from the backend; served from the committed, verified NASA snapshot in `/server/data/snapshots/*.json` with its original retrieval timestamp (`retrievedAt`). |
| `SAVED_ON_DEVICE` | **SAVED ON THIS DEVICE** | The EarthSonic backend was unreachable from the user's browser; loaded from a previously validated server response saved in the browser's `localStorage` (`< 30 days` old), displaying both the saved timestamp and its original status (`LIVE_SOURCE` or `CACHED_SOURCE_SNAPSHOT`). |
| `LOCAL_DEMONSTRATION` | **LOCAL DEMONSTRATION DATA** | Both the EarthSonic backend and device storage were unavailable (or the user clicked **Switch to Demonstration Data**); uses bundled local demonstration curves (`web/src/data/fallbackData.ts`), explicitly labeled as simulated and not NASA observations. |

---

## 3. Verified Upstream NASA Data Sources

### Source 1: NASA GISS Surface Temperature Analysis (`GISTEMP v4`)
- **Experience:** `temperature` (*Global Surface Temperature Anomaly*)
- **Provider:** NASA Goddard Institute for Space Studies (GISS)
- **Live Upstream URL (Verified HTTP 200, No Key Required):**
  - `https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv`
- **Reference Portal:**
  - `https://data.giss.nasa.gov/gistemp/`
- **Variables Extracted:**
  - Primary: `J-D` (January–December Global Annual Mean Land-Ocean Temperature Anomaly in `°C`)
  - Secondary: `DJF` (December–February Boreal Winter Mean Anomaly in `°C`)
  - Tertiary: `JJA` (June–August Boreal Summer Mean Anomaly in `°C`)
- **Reference Baseline Period:** `1951-1980`
- **Missing Value Handling:** `"***"` cells in the CSV (such as unrecorded future months in the current calendar year) are converted to `null` — **never coerced to `0`**.
- **Documented Normalization Range:** `[-0.5 °C, +1.5 °C]`
- **Committed Snapshot Fallback:** `/server/data/snapshots/gistemp.json`

### Source 2: NASA Langley POWER API (`MERRA-2` Monthly Assimilation) — Equatorial Pacific
- **Experience:** `ocean` (*Equatorial Pacific Ocean & ENSO Dynamics*)
- **Provider:** NASA Langley Research Center (LaRC) Prediction Of Worldwide Energy Resources (POWER) / GMAO MERRA-2
- **Live Upstream URL (Verified HTTP 200, No Key Required):**
  - `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,WS10M,PRECTOTCORR&community=RE&longitude=-140&latitude=0&start=2022&end=2024&format=JSON`
- **Reference Portal:**
  - `https://power.larc.nasa.gov/`
- **Variables Extracted:**
  - Primary: `T2M` (2-Meter Surface Air Temperature over the Niño 3.4 Equatorial Pacific sector `0°N, 140°W`, in `°C`)
  - Secondary: `WS10M` (10-Meter Wind Speed in `m/s`)
  - Tertiary: `PRECTOTCORR` (MERRA-2 Bias-Corrected Total Precipitation Rate in `mm/day`)
- **Missing Value Handling:** `-999` fill values are converted to `null`.
- **Documented Normalization Range:** `[23.0 °C, 30.0 °C]`
- **Committed Snapshot Fallback:** `/server/data/snapshots/power-ocean.json`

### Source 3: NASA Langley POWER API (`MERRA-2` Monthly Assimilation) — Tropical Atlantic Monsoon
- **Experience:** `atmosphere` (*Tropical Precipitation & Monsoon Wind Dynamics*)
- **Provider:** NASA Langley Research Center (LaRC) POWER Project / GMAO MERRA-2
- **Live Upstream URL (Verified HTTP 200, No Key Required):**
  - `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=PRECTOTCORR,WS10M,T2M_RANGE&community=RE&longitude=-45&latitude=5&start=2022&end=2024&format=JSON`
- **Variables Extracted:**
  - Primary: `PRECTOTCORR` (MERRA-2 Bias-Corrected Total Precipitation Rate in `mm/day` — true ratio scale)
  - Secondary: `WS10M` (10-Meter Wind Speed in `m/s`)
  - Tertiary: `T2M_RANGE` (Diurnal Temperature Range in `°C`)
- **Missing Value Handling:** `-999` fill values are converted to `null`.
- **Documented Normalization Range:** `[0.0 mm/day, 18.0 mm/day]`
- **Committed Snapshot Fallback:** `/server/data/snapshots/power-atmosphere.json`

### Source 4: NASA Global Imagery Browse Services (`GIBS`) & Earth Information Center (`earth.gov`)
- **Provider:** NASA EOSDIS Global Imagery Browse Services (GIBS) / NASA Earth Observatory / Earth Information Center (`https://earth.gov`)
- **Visual Frame Layers Used:**
  - `AIRS_L3_Surface_Air_Temperature_Daily_Day` (Aqua AIRS Surface Air Temperature)
  - `GHRSST_L4_MUR_Sea_Surface_Temperature` (Multi-scale Ultra-high Resolution Sea Surface Temperature)
  - `IMERG_Precipitation_Rate` (GPM IMERG Precipitation Rate)
- **Interactive Deep Links:** Each visual frame links directly to NASA Worldview (`https://worldview.earthdata.nasa.gov/`) and the NASA Earth Information Center (`https://earth.gov`).

### Source 5: 3D Globe Earth Surface, Cloud & Night-Lights Textures
- **Earth Day Surface:** NASA Visible Earth *Blue Marble Next Generation* (`land_ocean_ice`, public-domain NASA imagery; mirrored via `three-globe` MIT-licensed example assets and stored locally as `2048x1024` desktop / `1024x512` mobile JPEGs in `/web/public/textures/earth-day-*.jpg`).
- **Night City Lights:** NASA Earth Observatory *Black Marble* (`dnb_land_ocean_ice`, public-domain NASA/NOAA Suomi NPP VIIRS imagery; mirrored via `three-globe` MIT-licensed example assets in `/web/public/textures/earth-night-*.jpg`).
- **Topography, Ocean Specular Mask & Cloud Cover:** NASA Visible Earth global elevation, bathymetry/water mask, and cloud cover composited maps (public-domain NASA imagery; mirrored via `three-globe` / `mrdoob/three.js` MIT-licensed example texture packs in `/web/public/textures/earth-bump-*.jpg`, `earth-specular-*.jpg`, `earth-clouds-*.jpg`).
- **Required Credit:** On-screen attribution reads `"Earth imagery: NASA Visible Earth / Blue Marble"` in the 3D globe canvas footer.

### Source 6: Offline Geographic Gazetteer (`web/src/data/earthsonic-gazetteer.json`)
- **Populated Places & Administrative Codes:** [GeoNames](https://www.geonames.org/) `cities15000.zip`, `admin1CodesASCII.txt`, and `countryInfo.txt` (`https://download.geonames.org/export/dump/`) — **Creative Commons Attribution 4.0 License (CC BY 4.0)**, verified via `https://download.geonames.org/export/dump/readme.txt`.
- **Countries, First-Level Regions, Marine Basins & Physical Geography:** [Natural Earth](https://www.naturalearthdata.com/) `ne_110m_admin_0_countries`, `ne_50m_admin_1_states_provinces_lakes`, `ne_50m_geography_marine_polys`, and `ne_50m_geography_regions_polys` (`https://github.com/nvkelso/natural-earth-vector`) — **Public Domain**, verified via `LICENSE.md`.
- **Processing & Privacy:** Coordinates are rounded and simplified for offline spatial indexing (`~656 KB` gzipped, lazy-loaded only when globe/location features are used). Lookup runs 100% locally inside the browser and never transmits user coordinates externally by default.

---

## 4. Mathematical Normalization & Comparison Rules (`@earthsonic/shared`)

1. **Min-Max Clamped Normalization:**
   $$\text{normalized} = \text{clamp}\left(\frac{\text{value} - \text{min}}{\text{max} - \text{min}}, 0, 1\right)$$
   - If `value === null` or `Number.isNaN(value)`, `normalizeObservationValue` returns `null`.
   - If `min >= max` (invalid range), it returns `0.5` safely without dividing by zero.
2. **Comparison Percentage Guard:**
   - `computeObservationComparison` calculates `percentChange` **only** when `isRatioScale === true` (e.g., `mm/day` precipitation) **and** `observationA.value > 0`.
   - For interval-scale measurements (`°C` temperature or temperature anomaly), percentage change is mathematically undefined; `percentChange` is `null` and `percentChangeSkippedReason` explains why.
