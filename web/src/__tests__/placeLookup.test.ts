import { describe, expect, it } from 'vitest';
import {
  formatCoords,
  lookupPlace,
  normalizeLongitude,
  searchPlacesOffline
} from '../services/placeLookup';

describe('placeLookup (Offline Gazetteer & Edge Cases)', () => {
  it('formats lat/lon cleanly with N/S/E/W and 2 decimals', () => {
    expect(formatCoords(3.14, 101.69)).toBe('3.14° N, 101.69° E');
    expect(formatCoords(-3.4, -62.2)).toBe('3.40° S, 62.20° W');
    expect(formatCoords(90, 0)).toBe('90.00° N, 0.00° E');
  });

  it('resolves major cities accurately with admin region & country', async () => {
    const kl = await lookupPlace(3.14, 101.69);
    expect(kl.type).toBe('city');
    expect(kl.placeName).toContain('Kuala Lumpur');
    expect(kl.country).toBe('Malaysia');
    expect(kl.sourceLabel).toBe('Offline gazetteer');
    expect(kl.formattedCoords).toBe('3.14° N, 101.69° E');

    const london = await lookupPlace(51.507, -0.127);
    expect(london.type).toBe('city');
    expect(london.placeName).toBe('London');
    expect(london.country).toBe('United Kingdom');
  });

  it('resolves open oceans and seas', async () => {
    const pacific = await lookupPlace(0, -140);
    expect(['ocean', 'sea']).toContain(pacific.type);
    expect(pacific.placeName.toLowerCase()).toContain('pacific');
    expect(pacific.source).toBe('offline');

    const med = await lookupPlace(35.0, 18.0);
    expect(med.type).toBe('sea');
    expect(med.placeName.toLowerCase()).toContain('mediterranean');
  });

  it('resolves remote land using Near <nearest place>, <country> or physical region', async () => {
    const sahara = await lookupPlace(23.4, 11.5);
    expect(['region', 'country', 'city']).toContain(sahara.type);
    expect(sahara.placeName.startsWith('Near ') || sahara.adminRegion.length > 0).toBe(true);
    expect(sahara.country.length).toBeGreaterThan(0);
  });

  it('resolves both poles gracefully', async () => {
    const north = await lookupPlace(90, 0);
    expect(north.type).toBe('polar');
    expect(north.placeName).toContain('North Pole');
    expect(north.formattedCoords).toBe('90.00° N, 0.00° E');

    const south = await lookupPlace(-90, 0);
    expect(south.type).toBe('polar');
    expect(south.placeName).toContain('South Pole');
  });

  it('handles antimeridian wrapping at 180, -180, and 181 without crashing', async () => {
    expect(normalizeLongitude(181)).toBe(-179);
    expect(normalizeLongitude(-181)).toBe(179);

    const a = await lookupPlace(0, 180);
    const b = await lookupPlace(0, -180);
    const c = await lookupPlace(10, 181);
    expect(a.placeName).not.toBe('Unnamed location');
    expect(b.placeName).not.toBe('Unnamed location');
    expect(c.placeName).not.toBe('Unnamed location');
    expect(a.type).toBe(b.type);
  });

  it('returns Unnamed location for invalid coordinates and never throws', async () => {
    const badNaN = await lookupPlace(Number.NaN, 10);
    expect(badNaN.placeName).toBe('Unnamed location');
    expect(badNaN.type).toBe('unknown');

    const badLat = await lookupPlace(95, 0);
    expect(badLat.placeName).toBe('Unnamed location');
    expect(badLat.type).toBe('unknown');

    const badNegLat = await lookupPlace(-120, 40);
    expect(badNegLat.placeName).toBe('Unnamed location');
    expect(badNegLat.type).toBe('unknown');
  });

  it('supports fast offline place search across cities, oceans, and polar endpoints', async () => {
    const cityRes = await searchPlacesOffline('Tokyo', 5);
    expect(cityRes.some((r) => r.placeName === 'Tokyo')).toBe(true);

    const poleRes = await searchPlacesOffline('North Pole', 5);
    expect(poleRes.some((r) => r.type === 'polar')).toBe(true);
  });
});
