import { remoteConfig } from './firebase';
import { fetchAndActivate, getValue } from 'firebase/remote-config';
import type { FeatureFlags } from '@/types';
import { logWarn } from './logger';

let cachedFlags: FeatureFlags | null = null;
let lastFetch: number = 0;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const defaults: FeatureFlags = {
  use_vertex_rag: true,
  radar_bloom_variant: 'A',
  show_escrow: true,
  max_search_radius_km: 50,
  maintenance_mode: false,
  creator_tier_enabled: true,
};

export async function getFeatureFlags(): Promise<FeatureFlags> {
  // Return defaults on SSR
  if (typeof window === 'undefined') return defaults;
  if (!remoteConfig) return defaults;

  // Return cached if fresh
  if (cachedFlags && Date.now() - lastFetch < TTL_MS) return cachedFlags;

  try {
    await fetchAndActivate(remoteConfig);

    cachedFlags = {
      use_vertex_rag: getValue(remoteConfig, 'use_vertex_rag').asBoolean(),
      radar_bloom_variant: getValue(remoteConfig, 'radar_bloom_variant').asString() as 'A' | 'B',
      show_escrow: getValue(remoteConfig, 'show_escrow').asBoolean(),
      max_search_radius_km: getValue(remoteConfig, 'max_search_radius_km').asNumber(),
      maintenance_mode: getValue(remoteConfig, 'maintenance_mode').asBoolean(),
      creator_tier_enabled: getValue(remoteConfig, 'creator_tier_enabled').asBoolean(),
    };

    lastFetch = Date.now();
    return cachedFlags;
  } catch (err) {
    logWarn('UNKNOWN_ERROR', 'Remote Config fetch failed, using defaults', { err });
    return defaults;
  }
}

export function getFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  return cachedFlags ? cachedFlags[key] : defaults[key];
}

// Refresh on window focus
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    lastFetch = 0; // invalidate cache so next call re-fetches
  });
}
