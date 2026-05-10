import { functions, db } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, limit, GeoPoint, Timestamp } from 'firebase/firestore';
import type { RadarNode, Creator, CloudinaryImage, CreatorTier } from '@/types';
import { getMatchColor, TIER_CONFIG } from '@/types';
import { latLngToRadarPosition, haversineDistanceKm } from './geo';

// ─── API Response Types ─────────────────────────────────────────────────────
/** Geo location stored in Firestore (Firestore returns latitude/longitude pair). */
interface FirestoreGeoLike {
  latitude: number;
  longitude: number;
}

/** Raw creator document shape returned by `searchCreators` callable / Firestore. */
export interface RawCreator {
  id?: string;
  uid?: string;
  displayName?: string;
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  avgRating?: number;
  totalProjects?: number;
  totalEarnings?: number;
  tier?: CreatorTier;
  isAvailable?: boolean;
  isVerified?: boolean;
  city?: string;
  province?: string;
  location?: FirestoreGeoLike;
  portfolioImages?: CloudinaryImage[];
  computedMatchScore?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SearchAiInsights {
  trends: string[];
  matchReasoning: string;
  detectedIndustry: string;
}

export interface ExtractedSearchIntent {
  cleanPrompt: string;
  budgetLimit: number | null;
  isUrgent: boolean;
  skills?: string[];
  industry?: string;
}

export interface SearchCreatorsResponse {
  status: string;
  count: number;
  data: RawCreator[];
  aiInsights: SearchAiInsights | null;
  extractedIntent?: ExtractedSearchIntent;
  telemetry?: { ms: number };
}

/**
 * nlpSearch
 * Calls deployed Vertex Cloud Function to perform semantic vector search.
 */
export async function nlpSearch(
  prompt: string,
  clientLat: number,
  clientLng: number,
  city: string = "Indonesia",
  excludeUid?: string
): Promise<{ nodes: RadarNode[]; insights: SearchAiInsights | null }> {
  const searchFn = httpsCallable<
    { prompt: string; limit: number; city: string },
    SearchCreatorsResponse
  >(functions, 'searchCreators');

  const result = await searchFn({ prompt, limit: 20, city });
  let creators: RawCreator[] = result.data.data || [];
  const insights: SearchAiInsights | null = result.data.aiInsights || null;

  if (excludeUid) {
    creators = creators.filter((c) => (c.id || c.uid) !== excludeUid);
  }

  const nodes = mapCreatorsToNodes(creators, clientLat, clientLng);
  return { nodes, insights };
}

/**
 * fetchAllCreators
 * Fallback / Initial load generator fetching real records from Firestore.
 */
export async function fetchAllCreators(
  clientLat: number,
  clientLng: number,
  excludeUid?: string
): Promise<RadarNode[]> {
  const creatorsRef = collection(db, 'creators');
  const q = query(creatorsRef, where('isAvailable', '==', true), limit(50));
  
  const snapshot = await getDocs(q);
  let creators: RawCreator[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as RawCreator),
  }));

  if (excludeUid) {
    creators = creators.filter((c) => c.id !== excludeUid);
  }

  // For default loading, assume generic 50% match since no AI query ran yet
  const mappedCreators: RawCreator[] = creators.map((c) => ({ ...c, computedMatchScore: 0.5 }));

  return mapCreatorsToNodes(mappedCreators, clientLat, clientLng);
}

/**
 * Utility for converting Raw Docs -> R3F Node Layouts
 */
function mapCreatorsToNodes(
  rawCreators: RawCreator[],
  clientLat: number,
  clientLng: number,
): RadarNode[] {
  return rawCreators.map((c) => {
    const tier: CreatorTier = c.tier ?? 'free';
    const config = TIER_CONFIG[tier] ?? TIER_CONFIG.free;

    const lat = c.location?.latitude ?? clientLat;
    const lng = c.location?.longitude ?? clientLng;

    const uid = c.id ?? c.uid ?? '';
    const displayName = c.displayName ?? 'Kreator Anonim';

    const creatorData: Creator = {
      uid,
      displayName,
      slug: displayName.toLowerCase().replace(/\s+/g, '-'),
      bio: c.bio ?? '',
      skills: c.skills ?? [],
      tier,
      location: new GeoPoint(lat, lng),
      city: c.city ?? '',
      province: c.province ?? '',
      avgRating: c.avgRating ?? 5,
      totalProjects: c.totalProjects ?? 0,
      totalEarnings: c.totalEarnings ?? 0,
      portfolioImages: c.portfolioImages ?? [],
      hourlyRate: c.hourlyRate ?? 0,
      isAvailable: c.isAvailable ?? true,
      isVerified: c.isVerified ?? false,
      portfolioEmbeddingText: '',
      nodeSize: config.nodeSize,
      nodeGlowIntensity: config.nodeGlowIntensity,
      createdAt: c.createdAt as Creator['createdAt'],
      updatedAt: c.updatedAt as Creator['updatedAt'],
    };

    const matchScore = c.computedMatchScore ?? 0.5;

    // Use Haversine for accurate great-circle distance (km).
    const distKm = haversineDistanceKm(clientLat, clientLng, lat, lng);

    return {
      creatorId: creatorData.uid,
      creator: creatorData,
      matchScore,
      distanceKm: Number(distKm.toFixed(2)),
      position3D: latLngToRadarPosition(clientLat, clientLng, lat, lng),
      glowColor: getMatchColor(matchScore, tier),
    };
  });
}
