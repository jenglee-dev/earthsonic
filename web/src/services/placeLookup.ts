export type PlaceType =
  | 'city'
  | 'region'
  | 'country'
  | 'ocean'
  | 'sea'
  | 'polar'
  | 'unknown';

export type PlaceSource = 'offline' | 'osm';

export interface PlaceLookupResult {
  placeName: string;
  adminRegion: string;
  country: string;
  nearestPlace: string | null;
  distanceKm: number | null;
  type: PlaceType;
  lat: number;
  lon: number;
  formattedCoords: string;
  source: PlaceSource;
  sourceLabel: string;
}

export interface PlaceSearchItem {
  id: string;
  placeName: string;
  subtitle: string;
  lat: number;
  lon: number;
  type: PlaceType;
  popK: number;
}

// Tuple from bundled JSON: [name, adminIdx, countryIdx, latE2, lonE2, popK]
type RawCityTuple = [string, number, number, number, number, number];

interface SimplifiedRing {
  b: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  p: number[]; // flattened [lon, lat, lon, lat, ...]
}

interface MarinePoly {
  n: string;
  k: 'ocean' | 'sea';
  r: SimplifiedRing[];
}

interface CountryPoly {
  n: string;
  c: string;
  s: string;
  r: SimplifiedRing[];
}

interface Admin1Poly {
  n: string;
  co: string;
  r: SimplifiedRing[];
}

interface GeoRegionPoly {
  n: string;
  k: string;
  r: SimplifiedRing[];
}

interface GazetteerBundle {
  meta: { sources: string[] };
  countries: string[];
  admins: string[];
  cities: RawCityTuple[];
  marines: MarinePoly[];
  countryPolys: CountryPoly[];
  admin1Polys: Admin1Poly[];
  geoRegions: GeoRegionPoly[];
}

interface IndexedState {
  bundle: GazetteerBundle;
  // 10-degree spatial buckets: 36 lon cols (-180..180) x 18 lat rows (-90..90)
  grid: number[][];
  searchIndex: PlaceSearchItem[];
}

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const GRID_STEP_DEG = 10;
const GRID_COLS = 36;
const GRID_ROWS = 18;

let indexPromise: Promise<IndexedState> | null = null;
let loadedState: IndexedState | null = null;

export function normalizeLongitude(lon: number): number {
  if (!Number.isFinite(lon)) return 0;
  let wrapped = ((lon + 180) % 360 + 360) % 360 - 180;
  if (Object.is(wrapped, -0) || wrapped === -180) {
    wrapped = lon >= 180 ? -180 : lon <= -180 ? -180 : wrapped;
  }
  return Number(wrapped.toFixed(4));
}

export function isValidCoordinate(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90;
}

export function formatCoords(lat: number, lon: number): string {
  if (!isValidCoordinate(lat, lon)) {
    return 'Invalid coordinates';
  }
  const safeLat = Math.max(-90, Math.min(90, lat));
  const safeLon = normalizeLongitude(lon);
  const latHem = safeLat >= 0 ? 'N' : 'S';
  const lonHem = safeLon >= 0 ? 'E' : 'W';
  return `${Math.abs(safeLat).toFixed(2)}° ${latHem}, ${Math.abs(safeLon).toFixed(2)}° ${lonHem}`;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  let dLonDeg = lon2 - lon1;
  if (dLonDeg > 180) dLonDeg -= 360;
  if (dLonDeg < -180) dLonDeg += 360;
  const dLon = dLonDeg * DEG_TO_RAD;
  const rLat1 = lat1 * DEG_TO_RAD;
  const rLat2 = lat2 * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_KM * c;
}

function pointInRing(lon: number, lat: number, ring: SimplifiedRing): boolean {
  const [minX, minY, maxX, maxY] = ring.b;
  if (lat < minY || lat > maxY) return false;
  // Support bbox check cleanly (also check antimeridian-shifted lon)
  if (lon < minX || lon > maxX) return false;

  const pts = ring.p;
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i];
    const yi = pts[i + 1];
    const xj = pts[j];
    const yj = pts[j + 1];
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInFeature(lon: number, lat: number, rings: SimplifiedRing[]): boolean {
  for (let i = 0; i < rings.length; i++) {
    if (pointInRing(lon, lat, rings[i])) return true;
  }
  return false;
}

function ringCentroid(rings: SimplifiedRing[]): { lat: number; lon: number } {
  const first = rings[0];
  if (!first) return { lat: 0, lon: 0 };
  const [minX, minY, maxX, maxY] = first.b;
  return {
    lon: Number(((minX + maxX) / 2).toFixed(2)),
    lat: Number(((minY + maxY) / 2).toFixed(2))
  };
}

function toGridColRow(lat: number, lon: number): { col: number; row: number } {
  const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor((lon + 180) / GRID_STEP_DEG)));
  const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((lat + 90) / GRID_STEP_DEG)));
  return { col, row };
}

function buildSpatialIndex(bundle: GazetteerBundle): IndexedState {
  const grid: number[][] = Array.from({ length: GRID_COLS * GRID_ROWS }, () => []);
  for (let i = 0; i < bundle.cities.length; i++) {
    const c = bundle.cities[i];
    const lat = c[3] / 100;
    const lon = c[4] / 100;
    const { col, row } = toGridColRow(lat, lon);
    grid[row * GRID_COLS + col].push(i);
  }

  // Precompute lightweight search index combining top natural regions, oceans, countries & cities
  const searchIndex: PlaceSearchItem[] = [];

  // Key polar endpoints
  searchIndex.push(
    {
      id: 'polar-north',
      placeName: 'North Pole (Arctic Ocean)',
      subtitle: 'High Arctic Polar Region',
      lat: 90,
      lon: 0,
      type: 'polar',
      popK: 50000
    },
    {
      id: 'polar-south',
      placeName: 'South Pole (East Antarctica)',
      subtitle: 'Antarctic Plateau',
      lat: -90,
      lon: 0,
      type: 'polar',
      popK: 50000
    }
  );

  for (let i = 0; i < bundle.marines.length; i++) {
    const m = bundle.marines[i];
    const center = ringCentroid(m.r);
    searchIndex.push({
      id: `marine-${i}`,
      placeName: m.n,
      subtitle: m.k === 'ocean' ? 'Ocean Basin' : 'Sea / Coastal Basin',
      lat: center.lat,
      lon: center.lon,
      type: m.k,
      popK: m.k === 'ocean' ? 20000 : 8000
    });
  }

  for (let i = 0; i < bundle.geoRegions.length; i++) {
    const g = bundle.geoRegions[i];
    const center = ringCentroid(g.r);
    searchIndex.push({
      id: `georegion-${i}`,
      placeName: g.n,
      subtitle: g.k,
      lat: center.lat,
      lon: center.lon,
      type: 'region',
      popK: 6000
    });
  }

  for (let i = 0; i < bundle.countryPolys.length; i++) {
    const c = bundle.countryPolys[i];
    const center = ringCentroid(c.r);
    searchIndex.push({
      id: `country-${i}`,
      placeName: c.n,
      subtitle: c.s || c.c || 'Country',
      lat: center.lat,
      lon: center.lon,
      type: 'country',
      popK: 10000
    });
  }

  // Include all bundled GeoNames cities (ordered by population desc)
  for (let i = 0; i < bundle.cities.length; i++) {
    const [name, ai, ci, latE2, lonE2, popK] = bundle.cities[i];
    const admin = bundle.admins[ai] || '';
    const country = bundle.countries[ci] || '';
    searchIndex.push({
      id: `city-${i}`,
      placeName: name,
      subtitle: admin && country ? `${admin}, ${country}` : country || admin || 'City',
      lat: latE2 / 100,
      lon: lonE2 / 100,
      type: 'city',
      popK
    });
  }

  return { bundle, grid, searchIndex };
}

/**
 * Lazy-loads the compact offline gazetteer bundle (~656 KB gzipped) on first globe/place use.
 */
export async function ensureGazetteerLoaded(): Promise<IndexedState> {
  if (loadedState) return loadedState;
  if (!indexPromise) {
    indexPromise = import('../data/earthsonic-gazetteer.json').then((mod) => {
      const bundle = (mod.default || mod) as unknown as GazetteerBundle;
      loadedState = buildSpatialIndex(bundle);
      return loadedState;
    });
  }
  return indexPromise;
}

export function preloadPlaceLookup(): void {
  void ensureGazetteerLoaded();
}

function findNearestCity(
  state: IndexedState,
  lat: number,
  lon: number,
  maxRings = 4
): { city: RawCityTuple; distKm: number } | null {
  const { bundle, grid } = state;
  const { col, row } = toGridColRow(lat, lon);

  let bestIdx = -1;
  let bestDist = Infinity;

  // Scan expanding grid rings; near poles (|lat| >= 70) sweep full row range because meridians converge
  const maxR = Math.abs(lat) >= 70 ? Math.max(maxRings, 5) : maxRings;
  for (let radius = 0; radius <= maxR; radius++) {
    const rowStart = Math.max(0, row - radius);
    const rowEnd = Math.min(GRID_ROWS - 1, row + radius);
    const colSpan = Math.abs(lat) >= 70 && radius >= 2 ? 18 : radius;

    for (let r = rowStart; r <= rowEnd; r++) {
      for (let dc = -colSpan; dc <= colSpan; dc++) {
        // Only evaluate ring perimeter on radius > 0 except full sweep near pole
        if (
          radius > 0 &&
          colSpan === radius &&
          Math.abs(r - row) !== radius &&
          Math.abs(dc) !== radius
        ) {
          continue;
        }
        const c = ((col + dc) % GRID_COLS + GRID_COLS) % GRID_COLS;
        const bucket = grid[r * GRID_COLS + c];
        for (let k = 0; k < bucket.length; k++) {
          const idx = bucket[k];
          const tup = bundle.cities[idx];
          const d = haversineKm(lat, lon, tup[3] / 100, tup[4] / 100);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = idx;
          }
        }
      }
    }
    if (bestIdx !== -1 && bestDist <= Math.max(30, radius * 400)) {
      break;
    }
  }

  if (bestIdx === -1) return null;
  return { city: bundle.cities[bestIdx], distKm: bestDist };
}

function lookupMarineFallback(lat: number, lon: number): { name: string; type: 'ocean' | 'sea' } | null {
  // Deterministic oceanic basin guard only when a point lies inside narrow coastal gaps outside 50m polygons
  if (lat >= 66.5) return { name: 'Arctic Ocean', type: 'ocean' };
  if (lat <= -60) return { name: 'Southern Ocean', type: 'ocean' };
  if (lon >= 20 && lon <= 120 && lat <= 30) return { name: 'Indian Ocean', type: 'ocean' };
  if (lon > -70 && lon < 20) {
    return {
      name: lat >= 0 ? 'North Atlantic Ocean' : 'South Atlantic Ocean',
      type: 'ocean'
    };
  }
  return {
    name: lat >= 0 ? 'North Pacific Ocean' : 'South Pacific Ocean',
    type: 'ocean'
  };
}

export function resolvePlaceFromState(
  state: IndexedState,
  rawLat: number,
  rawLon: number
): PlaceLookupResult {
  if (!isValidCoordinate(rawLat, rawLon)) {
    return {
      placeName: 'Unnamed location',
      adminRegion: '',
      country: '',
      nearestPlace: null,
      distanceKm: null,
      type: 'unknown',
      lat: 0,
      lon: 0,
      formattedCoords: 'Invalid coordinates',
      source: 'offline',
      sourceLabel: 'Offline gazetteer'
    };
  }

  const lat = Math.max(-90, Math.min(90, Number(rawLat.toFixed(4))));
  const lon = normalizeLongitude(rawLon);
  const formattedCoords = formatCoords(lat, lon);
  const { bundle } = state;

  const nearest = findNearestCity(state, lat, lon, 6);
  const nearestCityName = nearest ? nearest.city[0] : null;
  const nearestAdmin = nearest ? bundle.admins[nearest.city[1]] || '' : '';
  const nearestCountry = nearest ? bundle.countries[nearest.city[2]] || '' : '';
  const nearestDist = nearest ? Number(nearest.distKm.toFixed(1)) : null;

  // 1. High polar zones (Arctic Ocean North Pole / Antarctic Plateau South Pole)
  if (lat >= 84) {
    return {
      placeName: lat >= 88.5 ? 'North Pole (Arctic Ocean)' : 'High Arctic Ocean',
      adminRegion: 'Arctic Polar Region',
      country: '',
      nearestPlace: nearestCityName,
      distanceKm: nearestDist,
      type: 'polar',
      lat,
      lon,
      formattedCoords,
      source: 'offline',
      sourceLabel: 'Offline gazetteer'
    };
  }

  if (lat <= -83) {
    return {
      placeName: lat <= -88.5 ? 'South Pole (East Antarctica)' : 'Antarctic Plateau',
      adminRegion: 'East Antarctica',
      country: 'Antarctica',
      nearestPlace: nearestCityName,
      distanceKm: nearestDist,
      type: 'polar',
      lat,
      lon,
      formattedCoords,
      source: 'offline',
      sourceLabel: 'Offline gazetteer'
    };
  }

  // 2. Direct urban / town hit (<= 30 km covers urban sprawl and coastline tolerances)
  if (nearest && nearest.distKm <= 30) {
    return {
      placeName: nearest.city[0],
      adminRegion: nearestAdmin,
      country: nearestCountry,
      nearestPlace: nearest.city[0],
      distanceKm: nearestDist,
      type: 'city',
      lat,
      lon,
      formattedCoords,
      source: 'offline',
      sourceLabel: 'Offline gazetteer'
    };
  }

  // 3. Country & physical geography polygons (check both lon and antimeridian edge lon=±180)
  const lonChecks = Math.abs(Math.abs(lon) - 180) < 0.05 ? [lon, -lon] : [lon];

  let countryHit: CountryPoly | null = null;
  for (const lCheck of lonChecks) {
    for (let i = 0; i < bundle.countryPolys.length; i++) {
      if (pointInFeature(lCheck, lat, bundle.countryPolys[i].r)) {
        countryHit = bundle.countryPolys[i];
        break;
      }
    }
    if (countryHit) break;
  }

  let admin1Hit: Admin1Poly | null = null;
  if (countryHit) {
    for (const lCheck of lonChecks) {
      for (let i = 0; i < bundle.admin1Polys.length; i++) {
        if (pointInFeature(lCheck, lat, bundle.admin1Polys[i].r)) {
          admin1Hit = bundle.admin1Polys[i];
          break;
        }
      }
      if (admin1Hit) break;
    }
  }

  let geoRegionHit: GeoRegionPoly | null = null;
  for (const lCheck of lonChecks) {
    for (let i = 0; i < bundle.geoRegions.length; i++) {
      if (pointInFeature(lCheck, lat, bundle.geoRegions[i].r)) {
        geoRegionHit = bundle.geoRegions[i];
        break;
      }
    }
    if (geoRegionHit) break;
  }

  // Check if over open water before assuming land from coastal city distance
  let marineHit: MarinePoly | null = null;
  if (!countryHit) {
    for (const lCheck of lonChecks) {
      for (let i = 0; i < bundle.marines.length; i++) {
        if (pointInFeature(lCheck, lat, bundle.marines[i].r)) {
          marineHit = bundle.marines[i];
          break;
        }
      }
      if (marineHit) break;
    }
  }

  // Over land (matched Natural Earth country or non-marine land region)
  if (countryHit || (!marineHit && geoRegionHit)) {
    const countryName = countryHit?.n || admin1Hit?.co || nearestCountry || '';
    const regionLabel = geoRegionHit?.n || admin1Hit?.n || countryHit?.s || '';
    const isPolarLand = lat >= 66.5 || lat <= -60 || countryName === 'Antarctica';

    if (isPolarLand && (!nearest || nearest.distKm > 150)) {
      return {
        placeName:
          countryName === 'Antarctica'
            ? geoRegionHit?.n || 'Antarctic Ice Sheet'
            : geoRegionHit?.n || admin1Hit?.n || countryName || 'Arctic Polar Region',
        adminRegion: regionLabel,
        country: countryName,
        nearestPlace: nearestCityName,
        distanceKm: nearestDist,
        type: 'polar',
        lat,
        lon,
        formattedCoords,
        source: 'offline',
        sourceLabel: 'Offline gazetteer'
      };
    }

    if (nearest && nearest.distKm <= 750 && nearestCityName) {
      const labelCountry = countryName || nearestCountry;
      return {
        placeName: labelCountry
          ? `Near ${nearestCityName}, ${labelCountry}`
          : `Near ${nearestCityName}`,
        adminRegion: regionLabel || nearestAdmin,
        country: labelCountry,
        nearestPlace: nearestCityName,
        distanceKm: nearestDist,
        type: geoRegionHit ? 'region' : 'country',
        lat,
        lon,
        formattedCoords,
        source: 'offline',
        sourceLabel: 'Offline gazetteer'
      };
    }

    if (regionLabel || countryName) {
      return {
        placeName: regionLabel || countryName,
        adminRegion: admin1Hit?.n || geoRegionHit?.k || countryHit?.s || '',
        country: countryName,
        nearestPlace: nearestCityName,
        distanceKm: nearestDist,
        type: geoRegionHit ? 'region' : 'country',
        lat,
        lon,
        formattedCoords,
        source: 'offline',
        sourceLabel: 'Offline gazetteer'
      };
    }
  }

  // 4. Open Ocean / Sea hit
  if (marineHit) {
    const isHighPolarWater = lat >= 72 || lat <= -66.5;
    return {
      placeName: marineHit.n,
      adminRegion: isHighPolarWater ? 'Polar Waters' : marineHit.k === 'ocean' ? 'Open Ocean' : 'Marginal Sea',
      country: '',
      nearestPlace: nearestCityName,
      distanceKm: nearestDist,
      type: isHighPolarWater ? 'polar' : marineHit.k,
      lat,
      lon,
      formattedCoords,
      source: 'offline',
      sourceLabel: 'Offline gazetteer'
    };
  }

  // 5. Fallback for un-polygonized coastal water gap vs inland gap
  if (nearest && nearest.distKm <= 65 && nearestCityName) {
    return {
      placeName: nearestCountry
        ? `Near ${nearestCityName}, ${nearestCountry}`
        : `Near ${nearestCityName}`,
      adminRegion: nearestAdmin,
      country: nearestCountry,
      nearestPlace: nearestCityName,
      distanceKm: nearestDist,
      type: 'region',
      lat,
      lon,
      formattedCoords,
      source: 'offline',
      sourceLabel: 'Offline gazetteer'
    };
  }

  const basin = lookupMarineFallback(lat, lon);
  if (basin) {
    const isHighPolarWater = lat >= 72 || lat <= -66.5;
    return {
      placeName: basin.name,
      adminRegion: isHighPolarWater ? 'Polar Waters' : 'Open Ocean',
      country: '',
      nearestPlace: nearestCityName,
      distanceKm: nearestDist,
      type: isHighPolarWater ? 'polar' : basin.type,
      lat,
      lon,
      formattedCoords,
      source: 'offline',
      sourceLabel: 'Offline gazetteer'
    };
  }

  return {
    placeName: 'Unnamed location',
    adminRegion: '',
    country: '',
    nearestPlace: nearestCityName,
    distanceKm: nearestDist,
    type: 'unknown',
    lat,
    lon,
    formattedCoords,
    source: 'offline',
    sourceLabel: 'Offline gazetteer'
  };
}

/**
 * Resolves a human-readable place name completely offline using the bundled gazetteer.
 */
export async function lookupPlace(lat: number, lon: number): Promise<PlaceLookupResult> {
  if (!isValidCoordinate(lat, lon)) {
    return {
      placeName: 'Unnamed location',
      adminRegion: '',
      country: '',
      nearestPlace: null,
      distanceKm: null,
      type: 'unknown',
      lat: 0,
      lon: 0,
      formattedCoords: 'Invalid coordinates',
      source: 'offline',
      sourceLabel: 'Offline gazetteer'
    };
  }
  const state = await ensureGazetteerLoaded();
  return resolvePlaceFromState(state, lat, lon);
}

/**
 * Synchronous cached lookup for hot render paths once gazetteer has loaded.
 */
export function lookupPlaceSync(lat: number, lon: number): PlaceLookupResult | null {
  if (!isValidCoordinate(lat, lon)) {
    return {
      placeName: 'Unnamed location',
      adminRegion: '',
      country: '',
      nearestPlace: null,
      distanceKm: null,
      type: 'unknown',
      lat: 0,
      lon: 0,
      formattedCoords: 'Invalid coordinates',
      source: 'offline',
      sourceLabel: 'Offline gazetteer'
    };
  }
  if (!loadedState) return null;
  return resolvePlaceFromState(loadedState, lat, lon);
}

/**
 * Fast offline search across bundled cities, regions, countries, oceans, and polar points.
 */
export async function searchPlacesOffline(
  query: string,
  limit = 10
): Promise<PlaceSearchItem[]> {
  const state = await ensureGazetteerLoaded();
  const q = query.trim().toLowerCase();
  if (!q) {
    return state.searchIndex.slice(0, limit);
  }

  const prefixMatches: PlaceSearchItem[] = [];
  const substringMatches: PlaceSearchItem[] = [];

  for (let i = 0; i < state.searchIndex.length; i++) {
    const item = state.searchIndex[i];
    const nameLower = item.placeName.toLowerCase();
    const subLower = item.subtitle.toLowerCase();
    if (nameLower.startsWith(q)) {
      prefixMatches.push(item);
      if (prefixMatches.length >= limit * 3) break;
    } else if (nameLower.includes(q) || subLower.includes(q)) {
      if (substringMatches.length < limit * 2) {
        substringMatches.push(item);
      }
    }
  }

  prefixMatches.sort((a, b) => b.popK - a.popK);
  const merged = prefixMatches.concat(substringMatches);
  return merged.slice(0, limit);
}
