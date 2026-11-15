import { buildServer } from '../app.js';

async function runSmoke() {
  console.log('[EarthSonic Smoke Test] Booting Fastify server instance...');
  const app = await buildServer();

  const healthRes = await app.inject({ method: 'GET', url: '/api/v1/health' });
  console.log('GET /api/v1/health ->', healthRes.statusCode, healthRes.json());

  for (const id of ['temperature', 'ocean', 'atmosphere'] as const) {
    const res = await app.inject({ method: 'GET', url: `/api/v1/experiences/${id}/series` });
    const body = res.json();
    console.log(
      `GET /api/v1/experiences/${id}/series -> status ${res.statusCode} | provenance: ${body.provenance?.dataStatus} | points: ${body.observations?.length}`
    );
  }

  const compareRes = await app.inject({
    method: 'POST',
    url: '/api/v1/compare',
    payload: {
      experienceId: 'temperature',
      observationA: { date: '1956-07-15', value: -0.19 },
      observationB: { date: '2024-07-15', value: 1.28 }
    }
  });
  console.log('POST /api/v1/compare ->', compareRes.statusCode, compareRes.json());

  await app.close();
  console.log('[EarthSonic Smoke Test] PASSED.');
}

runSmoke().catch((err) => {
  console.error('[EarthSonic Smoke Test] FAILED:', err);
  process.exit(1);
});
