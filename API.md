# EarthSonic Backend API Documentation (`/api/v1`)

The EarthSonic backend (`@earthsonic/server`) is a Node.js + TypeScript + Fastify service that retrieves, validates, normalizes, and caches real NASA Earth science observations while enforcing strict data provenance reporting (`LIVE_SOURCE` vs `CACHED_SOURCE_SNAPSHOT`).

All endpoints are versioned under `/api/v1` and return JSON validated by shared Zod schemas (`@earthsonic/shared`).

---

## Base URL

- **Local Development:** `http://127.0.0.1:3001/api/v1`
- **Configured via Frontend Env:** `VITE_API_BASE_URL`

---

## Error Envelope

All error responses (`400`, `404`, `429`, `500`) return a consistent JSON envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid experience ID",
    "details": []
  }
}
```

---

## Endpoints

### 1. `GET /api/v1/health`

Returns service health, process uptime (in seconds), and API version.

**Example Response (`200 OK`):**
```json
{
  "status": "ok",
  "uptime": 142.58,
  "version": "1.0.0"
}
```

---

### 2. `GET /api/v1/experiences`

Returns metadata for all three EarthSonic interactive sonification experiences (`temperature`, `ocean`, `atmosphere`).

**Example Response (`200 OK`):**
```json
{
  "experiences": [
    {
      "id": "temperature",
      "title": "Global Surface Temperature Anomaly",
      "subtitle": "GISTEMP v4 Land-Ocean Temperature Index (1880–Present)",
      "earthSystemDomain": "Land & Ocean Cryosphere / Surface Energy Balance",
      "primaryDatasetName": "GISS Surface Temperature Analysis (GISTEMP v4)",
      "agency": "NASA Goddard Institute for Space Studies (GISS)",
      "primaryUnit": "°C",
      "isRatioScale": false,
      "referencePeriod": "1951-1980",
      "documentedRange": {
        "min": -0.5,
        "max": 1.5,
        "basis": "Documented historical global annual anomaly range (-0.50 °C to +1.50 °C relative to 1951-1980)"
      }
    }
  ]
}
```

---

### 3. `GET /api/v1/experiences/:id`

Returns metadata for a single experience (`temperature` | `ocean` | `atmosphere`).

- **Path Parameters:** `id` (`temperature`, `ocean`, or `atmosphere`)

---

### 4. `GET /api/v1/experiences/:id/series`

Returns normalized time-series observations and full provenance metadata for the requested experience.

- **Path Parameters:** `id` (`temperature`, `ocean`, or `atmosphere`)
- **Query Parameters (Optional, validated via Zod):**
  - `start`: Start year (`1880`–`2030`)
  - `end`: End year (`1880`–`2030`)
  - `lat`: Latitude (`-90` to `90`, used by NASA POWER experiences)
  - `lon`: Longitude (`-180` to `180`, used by NASA POWER experiences)

**Normalization Formula:**
$$\text{normalized} = \text{clamp}\left(\frac{\text{value} - \text{min}}{\text{max} - \text{min}}, 0, 1\right)$$
Missing upstream observations (`"***"` in GISTEMP or `-999` in NASA POWER) are returned with `value: null` and `normalized: null` (never coerced to `0`).

**Example Response (`200 OK`):**
```json
{
  "experienceId": "temperature",
  "variable": "Global Land-Ocean Temperature Anomaly (J-D Annual Mean)",
  "unit": "°C",
  "isRatioScale": false,
  "documentedRange": {
    "min": -0.5,
    "max": 1.5,
    "basis": "Documented historical global annual anomaly range (-0.50 °C to +1.50 °C relative to 1951-1980 baseline)"
  },
  "observations": [
    {
      "date": "1880-07-15",
      "value": -0.17,
      "normalized": 0.165,
      "secondaryValue": -0.09,
      "tertiaryValue": 0.24,
      "annotation": "Early Industrial Baseline"
    },
    {
      "date": "2024-07-15",
      "value": 1.28,
      "normalized": 0.89,
      "secondaryValue": 1.47,
      "tertiaryValue": 1.15,
      "annotation": "Warmest Year in Modern Instrumental Record"
    }
  ],
  "provenance": {
    "dataStatus": "LIVE_SOURCE",
    "provider": "NASA Goddard Institute for Space Studies (GISS) — GISTEMP v4",
    "sourceUrl": "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv",
    "retrievedAt": "2026-11-15T05:14:22.104Z",
    "referencePeriod": "1951-1980",
    "processing": [
      "Parsed NASA GISS GLB.Ts+dSST.csv table rows from 1880 to present",
      "Converted missing value markers (\"***\") to null (never coerced to 0)",
      "Normalized values to [0, 1] against documented range [-0.5 °C, +1.5 °C]"
    ]
  }
}
```

---

### 5. `GET /api/v1/experiences/:id/frame`

Returns authentic NASA GIBS WMTS / Worldview visual frames and attribution metadata for the requested experience.

**Example Response (`200 OK`):**
```json
{
  "experienceId": "temperature",
  "frames": [
    {
      "id": "gibs-AIRS_L3_Surface_Air_Temperature_Daily_Day",
      "title": "AIRS Surface Air Temperature (Daytime, Monthly/Daily Composite)",
      "date": "2024-07-15",
      "imageUrl": "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/AIRS_L3_Surface_Air_Temperature_Daily_Day/default/2024-07-15/2km/0/0/0.png",
      "fallbackImageUrl": "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~orig.jpg",
      "layerName": "AIRS_L3_Surface_Air_Temperature_Daily_Day",
      "worldviewUrl": "https://worldview.earthdata.nasa.gov/?l=AIRS_L3_Surface_Air_Temperature_Daily_Day,Reference_Labels_15m,Coastlines_15m&t=2024-07-15",
      "eicUrl": "https://earth.gov",
      "attribution": "NASA Earth Observatory / NASA GIBS / Aqua AIRS Science Team"
    }
  ]
}
```

---

### 6. `GET /api/v1/experiences/:id/mapping`

Single source of truth for the **HOW THE SOUND IS CREATED** transparency panel, documenting how each scientific variable maps to Web Audio API synthesis parameters.

**Example Response (`200 OK`):**
```json
{
  "experienceId": "temperature",
  "mappings": [
    {
      "variableName": "Global Land-Ocean Surface Temperature Anomaly (J-D)",
      "variableUnit": "°C",
      "variableRange": { "min": -0.5, "max": 1.5 },
      "audioParameter": "Lead Harmonic Pitch & Low-Pass Filter Cutoff",
      "audioRange": { "min": 130.81, "max": 523.25, "unit": "Hz" },
      "curve": "exponential",
      "explanation": "Colder anomalies (-0.50 °C) produce a low C3 fundamental (130.81 Hz). As warming anomalies rise toward +1.30 °C, pitch ascends across two octaves to C5 (523.25 Hz)."
    }
  ],
  "disclaimer": "Acoustic mappings are artistic and educational design choices created for EarthSonic and are not official NASA scientific standards."
}
```

---

### 7. `POST /api/v1/compare`

Computes mathematical comparison metrics and acoustic deltas between two observations (`indexA` and `indexB`) for the **HEAR THE CHANGE** comparison studio.

- **Mathematical Rule:** `percentChange` is computed **only** when the dataset unit is a true ratio scale (`isRatioScale: true`, e.g., `mm/day` or `m/s`) and the baseline observation is strictly positive (`valA > 0`). For interval-scale temperature anomalies (`°C`), `percentChange` is always `null` (`percentChangeSkippedReason` explains why).

**Example Request:**
```json
{
  "experienceId": "temperature",
  "indexA": 0,
  "indexB": 15
}
```

---

### 8. `GET /api/v1/sources`

Returns structured documentation of all upstream NASA data providers, endpoints, parameters, missing-value markers, and licensing used by the application.
