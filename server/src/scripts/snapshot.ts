import fs from 'node:fs/promises';
import path from 'node:path';
import {
  GISTEMP_SNAPSHOT_PATH,
  getGistempSeries
} from '../services/gistemp.js';
import {
  POWER_ATMOSPHERE_SNAPSHOT_PATH,
  POWER_OCEAN_SNAPSHOT_PATH,
  getPowerSeries
} from '../services/power.js';

async function runSnapshot() {
  console.log('[EarthSonic Snapshot] Fetching live NASA GISTEMP v4 CSV...');
  const gistemp = await getGistempSeries({ startYear: 1950, endYear: 2025, forceSnapshot: false });
  const gistempSnapshot = {
    ...gistemp,
    provenance: {
      ...gistemp.provenance,
      dataStatus: 'CACHED_SOURCE_SNAPSHOT' as const
    }
  };
  await fs.mkdir(path.dirname(GISTEMP_SNAPSHOT_PATH), { recursive: true });
  await fs.writeFile(GISTEMP_SNAPSHOT_PATH, JSON.stringify(gistempSnapshot, null, 2), 'utf-8');
  console.log(
    `[EarthSonic Snapshot] Wrote ${gistemp.observations.length} GISTEMP observations to ${GISTEMP_SNAPSHOT_PATH} (retrievedAt: ${gistemp.provenance.retrievedAt})`
  );

  console.log('[EarthSonic Snapshot] Fetching live NASA POWER Ocean Precipitation series...');
  const ocean = await getPowerSeries({
    experienceId: 'ocean',
    lat: 4.0,
    lon: -140.0,
    startYear: 2022,
    endYear: 2023,
    forceSnapshot: false
  });
  const oceanSnapshot = {
    ...ocean,
    provenance: {
      ...ocean.provenance,
      dataStatus: 'CACHED_SOURCE_SNAPSHOT' as const
    }
  };
  await fs.writeFile(POWER_OCEAN_SNAPSHOT_PATH, JSON.stringify(oceanSnapshot, null, 2), 'utf-8');
  console.log(
    `[EarthSonic Snapshot] Wrote ${ocean.observations.length} NASA POWER Ocean observations to ${POWER_OCEAN_SNAPSHOT_PATH}`
  );

  console.log('[EarthSonic Snapshot] Fetching live NASA POWER Atmosphere Wind series...');
  const atmosphere = await getPowerSeries({
    experienceId: 'atmosphere',
    lat: 19.54,
    lon: -155.58,
    startYear: 2022,
    endYear: 2023,
    forceSnapshot: false
  });
  const atmoSnapshot = {
    ...atmosphere,
    provenance: {
      ...atmosphere.provenance,
      dataStatus: 'CACHED_SOURCE_SNAPSHOT' as const
    }
  };
  await fs.writeFile(
    POWER_ATMOSPHERE_SNAPSHOT_PATH,
    JSON.stringify(atmoSnapshot, null, 2),
    'utf-8'
  );
  console.log(
    `[EarthSonic Snapshot] Wrote ${atmosphere.observations.length} NASA POWER Atmosphere observations to ${POWER_ATMOSPHERE_SNAPSHOT_PATH}`
  );
}

runSnapshot().catch((err) => {
  console.error('[EarthSonic Snapshot] Failed:', err);
  process.exit(1);
});
