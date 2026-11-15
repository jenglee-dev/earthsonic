import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import {
  CompareRequestSchema,
  ExperienceIdSchema,
  computeObservationComparison
} from '@earthsonic/shared';
import {
  GISTEMP_DOCUMENTED_RANGE,
  getGistempSeries
} from './services/gistemp.js';
import {
  ATMOSPHERE_DOCUMENTED_RANGE,
  OCEAN_DOCUMENTED_RANGE,
  getPowerSeries
} from './services/power.js';
import {
  getAllSourcesDocumentation,
  getExperienceFrames,
  getExperienceMapping,
  getExperienceMetaById,
  getExperiencesMeta
} from './services/gibs.js';

export interface BuildServerOptions {
  forceSnapshotForExperiences?: string[];
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    bodyLimit: 64 * 1024, // 64 KB max body size
    connectionTimeout: 10000,
    requestTimeout: 10000
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false
  });

  // CORS allow-list from env or localhost defaults
  const allowedOriginsEnv =
    process.env.CORS_ALLOWED_ORIGINS ||
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173';
  const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS']
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment and try again.'
      }
    })
  });

  // Consistent error handler
  app.setErrorHandler((err, _req, reply) => {
    const statusCode = (err as { statusCode?: number }).statusCode || 500;
    const code = statusCode === 429 ? 'RATE_LIMITED' : statusCode === 400 ? 'INVALID_REQUEST' : 'SERVER_ERROR';
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    reply.status(statusCode).send({
      error: {
        code,
        message
      }
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Requested API endpoint does not exist.'
      }
    });
  });

  const healthHandler = async () => ({
    status: 'ok' as const,
    uptime: Number(process.uptime().toFixed(2)),
    version: '1.0.0'
  });

  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // GET /api/v1/experiences
  app.get('/api/v1/experiences', async () => ({
    experiences: getExperiencesMeta()
  }));

  // GET /api/v1/experiences/:id
  app.get('/api/v1/experiences/:id', async (req, reply) => {
    const parsedId = ExperienceIdSchema.safeParse((req.params as { id?: string }).id);
    if (!parsedId.success) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Unknown EarthSonic experience ID. Valid IDs: temperature, ocean, atmosphere.'
        }
      });
    }
    return getExperienceMetaById(parsedId.data);
  });

  // GET /api/v1/experiences/:id/series?start=&end=&lat=&lon=
  const SeriesQuerySchema = z.object({
    start: z.coerce.number().int().min(1880).max(2030).optional(),
    end: z.coerce.number().int().min(1880).max(2030).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    snapshot: z.enum(['true', 'false']).optional()
  });

  app.get('/api/v1/experiences/:id/series', async (req, reply) => {
    const parsedId = ExperienceIdSchema.safeParse((req.params as { id?: string }).id);
    if (!parsedId.success) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Unknown EarthSonic experience ID.'
        }
      });
    }

    const parsedQuery = SeriesQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_QUERY',
          message: parsedQuery.error.issues.map((i) => i.message).join('; ')
        }
      });
    }

    const expId = parsedId.data;
    const q = parsedQuery.data;
    const forceSnapshot =
      q.snapshot === 'true' || Boolean(options.forceSnapshotForExperiences?.includes(expId));

    try {
      if (expId === 'temperature') {
        const series = await getGistempSeries({
          startYear: q.start,
          endYear: q.end,
          forceSnapshot
        });
        return series;
      } else {
        const series = await getPowerSeries({
          experienceId: expId,
          lat: q.lat,
          lon: q.lon,
          startYear: q.start,
          endYear: q.end,
          forceSnapshot
        });
        return series;
      }
    } catch (err) {
      return reply.status(502).send({
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message: err instanceof Error ? err.message : 'Unable to load series from upstream or snapshot.'
        }
      });
    }
  });

  // GET /api/v1/experiences/:id/frame
  app.get('/api/v1/experiences/:id/frame', async (req, reply) => {
    const parsedId = ExperienceIdSchema.safeParse((req.params as { id?: string }).id);
    if (!parsedId.success) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Unknown EarthSonic experience ID.'
        }
      });
    }
    return getExperienceFrames(parsedId.data);
  });

  // GET /api/v1/experiences/:id/mapping
  app.get('/api/v1/experiences/:id/mapping', async (req, reply) => {
    const parsedId = ExperienceIdSchema.safeParse((req.params as { id?: string }).id);
    if (!parsedId.success) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Unknown EarthSonic experience ID.'
        }
      });
    }
    return getExperienceMapping(parsedId.data);
  });

  // POST /api/v1/compare
  app.post('/api/v1/compare', async (req, reply) => {
    const parsedBody = CompareRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_COMPARE_PAYLOAD',
          message: parsedBody.error.issues.map((i) => i.message).join('; ')
        }
      });
    }

    const { experienceId, observationA, observationB } = parsedBody.data;
    const meta = getExperienceMetaById(experienceId);
    const documentedRange =
      experienceId === 'temperature'
        ? GISTEMP_DOCUMENTED_RANGE
        : experienceId === 'ocean'
        ? OCEAN_DOCUMENTED_RANGE
        : ATMOSPHERE_DOCUMENTED_RANGE;

    return computeObservationComparison({
      experienceId,
      variable: meta.variable,
      unit: meta.unit,
      isRatioScale: meta.isRatioScale,
      documentedRange,
      observationA,
      observationB
    });
  });

  // GET /api/v1/sources
  app.get('/api/v1/sources', async () => getAllSourcesDocumentation());

  return app;
}
