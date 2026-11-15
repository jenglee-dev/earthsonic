import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'logo.svg',
        'offline.html',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
        'apple-touch-icon-180x180.png'
      ],
      manifest: {
        name: 'EarthSonic',
        short_name: 'EarthSonic',
        description: 'Listen to the Changing Planet.',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        theme_color: '#050914',
        background_color: '#050914',
        categories: ['education', 'science'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Earth Explorer',
            short_name: 'Explorer',
            description: 'Explore NASA Earth visualizations with real-time sonification',
            url: `${basePath}?section=explorer`,
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Hear the Change',
            short_name: 'Compare',
            description: 'Compare two NASA observations and hear the acoustic difference',
            url: `${basePath}?section=hear-change`,
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Images & NASA visual frames: StaleWhileRevalidate, max 40 entries, 14 days, status 200 only
            urlPattern: ({ request, url }) =>
              request.destination === 'image' ||
              url.hostname.includes('earthdata.nasa.gov') ||
              url.hostname.includes('images-assets.nasa.gov'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'earthsonic-nasa-frames-v1',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 14 * 24 * 60 * 60
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            // Google Fonts stylesheets & font files
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'earthsonic-google-fonts-v1',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 30 * 24 * 60 * 60
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          }
        ]
      }
    })
  ]
});
