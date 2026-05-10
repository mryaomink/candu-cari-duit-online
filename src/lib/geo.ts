import type { GeoPoint } from 'firebase/firestore';

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function geoPointToLatLng(gp: GeoPoint): { lat: number; lng: number } {
  return { lat: gp.latitude, lng: gp.longitude };
}

/**
 * Convert a lat/lng + distance (km) to a [x, y, z] position in 3D radar space.
 * The radar canvas is centered on the client's location.
 * Scale: 1 radar unit = 1 km (capped at radarRadius for visual clarity).
 */
export function latLngToRadarPosition(
  clientLat: number,
  clientLng: number,
  creatorLat: number,
  creatorLng: number,
  radarRadius: number = 10 // max visual radius in 3D units
): [number, number, number] {
  const dLat = creatorLat - clientLat;
  const dLng = creatorLng - clientLng;

  // Approximate conversion (valid for small distances)
  const x = dLng * 111 * Math.cos((clientLat * Math.PI) / 180);
  const z = dLat * 111;

  const dist = Math.sqrt(x * x + z * z);
  const scale = dist > radarRadius ? radarRadius / dist : 1;

  // Slight y-offset for visual depth based on match quality
  const y = 0.1;

  return [x * scale, y, z * scale];
}

/**
 * Get user's current GPS location via browser Geolocation API.
 * Returns null if denied or unavailable.
 */
export function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

/**
 * Reverse geocode using a free/browser-native approach (Nominatim).
 * For production, swap with Google Geocoding API.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; province: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`,
      { headers: { 'User-Agent': 'CANDU-App/1.0' } }
    );
    if (!res.ok) throw new Error('Nominatim failed');
    const data = await res.json();
    const addr = data.address ?? {};
    return {
      city: addr.city ?? addr.town ?? addr.county ?? addr.regency ?? 'Unknown',
      province: addr.state ?? 'Indonesia',
    };
  } catch {
    return { city: 'Indonesia', province: '' };
  }
}
