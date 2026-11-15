# EARTHSONIC — *Listen to the Changing Planet.*

**NASA Space Apps Challenge 2026 | Challenge: [The Earth Information Jukebox](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)**

> *"One Planet. Countless Stories. Hear Them All."*

**EarthSonic** is a full-stack scientific data sonification platform and installable Progressive Web App (PWA) that pairs NASA Earth observations (NASA GISS GISTEMP v4, NASA Langley POWER MERRA-2, and NASA GIBS satellite visual frames) with real-time Web Audio API synthesis and accessible screen-reader / Guided Listening support.

> **Disclaimer:** EarthSonic is an independent educational project created for the 2026 NASA Space Apps Challenge and is **not** an official NASA product or endorsed by NASA.

---

## 1. Monorepo Architecture

```text
earthsonic/
├── shared/                  # @earthsonic/shared — Zod schemas, TypeScript types, math normalization & comparison logic
│   └── src/index.ts
├── server/                  # @earthsonic/server — Fastify + TypeScript ESM backend API (/api/v1)
│   ├── data/snapshots/      # Committed real NASA fallback snapshots (gistemp.json, power-ocean.json, power-atmosphere.json)
│   ├── src/
│   │   ├── app.ts           # Fastify server, security plugins (helmet, cors, rate-limit), and /api/v1 routes
│   │   ├── cache/           # In-memory LRU cache with TTL (6h default)
│   │   ├── services/        # Upstream NASA fetchers (GISTEMP CSV, POWER API JSON, GIBS visual frames)
│   │   └── scripts/         # CLI utilities: snapshot.ts, smoke.ts, generateIcons.ts
│   └── test/server.test.ts  # Vitest backend unit & integration suite (8 tests)
├── web/                     # @earthsonic/web — React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + PWA frontend
│   ├── public/              # Custom SVG/PNG PWA icons (192, 512, maskable, Apple touch) + offline.html
│   └── src/
│       ├── audio/           # Real-time Web Audio API multi-voice synthesizer (sonificationEngine.ts)
│       ├── components/      # Explorer, Visual Frame Stage, Telemetry Chart, Compare Studio, DataStatusBadge, PWA Banner
│       ├── data/            # Bundled offline demonstration fallback (fallbackData.ts)
│       ├── hooks/           # 3-tier resilient data hook (useEarthData.ts: API -> localStorage -> demo fallback)
│       ├── services/        # Validated API client with 8s timeout, 1 retry on 5xx, and Zod verification (apiClient.ts)
│       └── __tests__/       # Vitest frontend unit, accessibility & Guided Listening suites (41 tests)
├── Dockerfile               # Production container image for @earthsonic/server + @earthsonic/shared
├── .env.example             # Documented environment variables (no secrets committed)
├── API.md                   # Complete /api/v1 endpoint reference
└── DATA_SOURCES.md          # Upstream NASA data sources, provenance states, and mathematical rules
```

---

## 2. Quick Start & Local Development

### Prerequisites
- **Node.js** `>= 20` and **npm** `>= 10`

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` if you wish to customize ports or cache TTL. No API keys are required for NASA GISTEMP, NASA POWER, or NASA GIBS.

```bash
cp .env.example .env
```

### 3. Run Backend (`/server`) and Frontend (`/web`)
Open two terminals at the repository root:

```bash
# Terminal 1 — Backend API (http://127.0.0.1:3001/api/v1)
npm run dev:server

# Terminal 2 — Frontend App (http://127.0.0.1:5173)
npm run dev:web
```

---

## 3. Verification, Snapshots & Testing Scripts

| Script | Description |
| :--- | :--- |
| `npm run typecheck` | Runs `tsc --noEmit` across `shared`, `server`, and `web`. |
| `npm run snapshot` | Fetches live NASA GISTEMP and NASA POWER datasets, validates them with Zod, and updates `/server/data/snapshots/*.json`. |
| `npm run smoke` | Boots the Fastify app in-process and verifies `200 OK` + Zod validation across `/health`, `/experiences`, `/series`, `/frame`, `/mapping`, `/compare`, and `/sources`. |
| `npm run test` | Runs all Vitest unit and integration tests across `@earthsonic/server` (8 tests) and `@earthsonic/web` (41 tests). |
| `npm run build` | Builds `shared`, `server`, and the production PWA bundle in `web/dist/` (including `sw.js` and `manifest.webmanifest`). |

---

## 4. Honest Data Provenance & 3-Tier Fallback Architecture

Honesty about data provenance is the top rule across EarthSonic. Every dataset is labeled with one of four explicit status badges (`DataStatusBadge.tsx`, `role="status"`, `aria-live="polite"`):

1. **`LIVE SOURCE DATA` (`LIVE_SOURCE`):** Retrieved directly from NASA GISS or NASA Langley POWER during the current server cache TTL window.
2. **`CACHED SOURCE SNAPSHOT` (`CACHED_SOURCE_SNAPSHOT`):** Upstream NASA endpoint was unreachable or timed out; served from the committed, verified NASA snapshot in `/server/data/snapshots/` with its original retrieval timestamp.
3. **`SAVED ON THIS DEVICE` (`SAVED_ON_DEVICE`):** The EarthSonic backend was unreachable; loaded from a previously validated server response saved in browser `localStorage` (`< 30 days` old), displaying both the saved date and its original status.
4. **`LOCAL DEMONSTRATION DATA` (`LOCAL_DEMONSTRATION`):** Neither the backend nor device storage was available; uses bundled local demonstration curves (`fallbackData.ts`), explicitly labeled as simulated and never presented as live NASA observations.

Clicking any `DataStatusBadge` opens an accessible popover (`Escape` to close) showing the provider, clickable upstream NASA URL, retrieval timestamp, reference baseline period, processing steps, and a plain-language summary.

---

## 5. Progressive Web App (PWA) & Offline Support

- **Installable App (`manifest.webmanifest`):** Configured via `vite-plugin-pwa` with custom `192x192`, `512x512`, `maskable 512x512`, and `apple-touch-icon-180x180.png` icons, standalone display mode, and app shortcuts (*Earth Explorer* and *Hear the Change*).
- **Service Worker (`sw.js`):**
  - Precaches the complete app shell (`index.html`, JS/CSS bundles, icons, `offline.html`).
  - Uses `StaleWhileRevalidate` (max 40 entries, 14 days, status `200` only) for NASA satellite imagery.
  - Excludes `/api/v1/*` JSON calls from Workbox so `useEarthData.ts` always controls JSON provenance and never mislabels cached JSON as `LIVE_SOURCE`.
- **Installing EarthSonic:**
  - **Desktop Chrome / Edge:** Click the **Install App** button in the top navigation bar (wired to `beforeinstallprompt`) or the install icon in the address bar.
  - **Android Chrome:** Tap **Install App** in the header or choose **Add to Home screen** from the browser menu.
  - **iOS Safari:** Click the **Install on iOS** button in the header for instructions (*Tap Share -> Add to Home Screen*).

---

## 6. Deployment (Render Backend + Vercel Frontend)

EarthSonic is structured as a single npm-workspaces monorepo (`shared`, `server`, `web`) designed so the backend and frontend deploy independently to different hosting platforms:

- **Architecture:**
  - **Backend (`/server` + `/shared`)** → **Render** (Node Web Service via [`render.yaml`](./render.yaml) or [`Dockerfile`](./Dockerfile))
  - **Frontend (`/web` + `/shared`)** → **Vercel** (Static SPA + PWA via [`vercel.json`](./vercel.json))

### Deployment Order
1. **Deploy the Backend on Render first:**
   - Connect this repository on Render (or import [`render.yaml`](./render.yaml)).
   - Copy the deployed backend URL (e.g., `https://earthsonic-api.onrender.com`).
2. **Deploy the Frontend on Vercel:**
   - Connect this repository on Vercel (Root Directory = repo root; [`vercel.json`](./vercel.json) sets the build command, `web/dist` output, SPA rewrites, and `sw.js`/`index.html` no-cache headers).
   - Set `VITE_API_BASE_URL` = `https://<your-render-service>.onrender.com/api/v1` and deploy.
3. **Update Render `ALLOWED_ORIGINS` and Redeploy:**
   - Copy your Vercel frontend URL (e.g., `https://earthsonic.vercel.app`).
   - In Render → Environment, set `ALLOWED_ORIGINS` to that exact Vercel origin (comma-separated if multiple) and trigger a redeploy.

### Environment Variables

| Variable | Where to Set | Purpose |
| :--- | :--- | :--- |
| `PORT` | Render (auto-injected; default `3001` locally) | HTTP port for `@earthsonic/server`. |
| `NODE_ENV` | Render (`production`) | Enables `0.0.0.0` binding and strict `ALLOWED_ORIGINS` CORS enforcement (no wildcard). |
| `ALLOWED_ORIGINS` | Render | Comma-separated allowed frontend origins (e.g. `https://earthsonic.vercel.app`). |
| `CACHE_TTL_MS` | Render (optional, default `900000`) | In-memory NASA upstream cache TTL in milliseconds. |
| `UPSTREAM_TIMEOUT_MS` | Render (optional, default `8000`) | Upstream NASA request timeout in milliseconds. |
| `VITE_API_BASE_URL` | Vercel (build-time) | Full backend API base URL ending in `/api/v1`. |
| `VITE_BASE_PATH` | Vercel (optional, default `/`) | Base URL path for the Vite app and PWA manifest. |

### Free-Tier Cold Start & Offline Fallback
- **Render free-tier cold start:** Free Render web services spin down after inactivity; the first API request after idle can take **30–60 seconds** to wake up (exceeding the client's 8-second request timeout).
- **If the backend is unreachable (or `VITE_API_BASE_URL` is empty):** The frontend never crashes or blocks playback. It automatically falls back to **`SAVED ON THIS DEVICE`** (previously validated data in `localStorage` `< 30 days` old) or **`LOCAL DEMONSTRATION DATA`**, and displays the corresponding provenance badge and Retry button.

---

## 7. Data Sources & Known Limitations

- **Data Sources:** See [`DATA_SOURCES.md`](./DATA_SOURCES.md) for upstream NASA GISS GISTEMP v4, NASA Langley POWER MERRA-2, and NASA GIBS endpoint details, baselines, and provenance states.
- **Known Limitations:**
  - **Web Audio gesture requirement:** Browsers require a user click or key press before `AudioContext` can produce sound.
  - **Speech & Screen Reader timing:** When Web Speech API (`speechSynthesis`) is disabled or unavailable, Guided Listening estimates screen-reader speaking duration from word count (~160 WPM + 1.5 s margin, adjustable via Short/Normal/Long), because browsers do not expose when an external screen reader finishes speaking. Automated tests verify ARIA live regions, Chromium AXTree, and state-machine timing in Vitest/jsdom, not live NVDA/Narrator audio output.
  - **In-memory server cache:** `/server` caches upstream NASA responses in memory (default 15 minutes via `CACHE_TTL_MS`), which resets on server restart and falls back to committed snapshots in `/server/data/snapshots/` if upstream NASA APIs are unreachable.
  - **PWA Service Worker cache:** Returning visitors may receive precached assets from `sw.js` until the Service Worker is updated or unregistered in browser DevTools.
