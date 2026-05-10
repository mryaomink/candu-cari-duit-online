import { functions, db } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, limit, GeoPoint } from 'firebase/firestore';
import type { RadarNode, Creator } from '@/types';
import { getMatchColor, TIER_CONFIG } from '@/types';
import { latLngToRadarPosition } from './geo';

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
): Promise<{ nodes: RadarNode[], insights: any }> {
  const searchFn = httpsCallable<{ prompt: string; limit: number, city: string }, any>(functions, 'searchCreators');
  
  const result = await searchFn({ prompt, limit: 20, city });
  let creators: any[] = result.data.data || [];
  const insights = result.data.aiInsights || null;

  if (excludeUid) {
    creators = creators.filter(c => (c.id || c.uid) !== excludeUid);
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
  let creators = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  if (excludeUid) {
    creators = creators.filter(c => c.id !== excludeUid);
  }

  // For default loading, assume generic 50% match since no AI query ran yet
  const mappedCreators = creators.map(c => ({ ...c, computedMatchScore: 0.5 }));
  
  return mapCreatorsToNodes(mappedCreators, clientLat, clientLng);
}

/**
 * Utility for converting Raw Docs -> R3F Node Layouts
 */
function mapCreatorsToNodes(
  rawCreators: any[], 
  clientLat: number, 
  clientLng: number
): RadarNode[] {
  return rawCreators.map(c => {
    const tier = c.tier || 'free';
    const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.free;
    
    const lat = c.location?.latitude || clientLat;
    const lng = c.location?.longitude || clientLng;
    
    const creatorData: Creator = {
      uid: c.id || c.uid,
      displayName: c.displayName || 'Kreator Anonim',
      slug: (c.displayName || 'anon').toLowerCase().replace(/\s+/g, '-'),
      bio: c.bio || '',
      skills: c.skills || [],
      tier: tier,
      location: new GeoPoint(lat, lng),
      city: c.city || '',
      province: c.province || '',
      avgRating: c.avgRating || 5,
      totalProjects: c.totalProjects || 0,
      totalEarnings: c.totalEarnings || 0,
      portfolioImages: c.portfolioImages || [],
      hourlyRate: c.hourlyRate || 0,
      isAvailable: c.isAvailable !== undefined ? c.isAvailable : true,
      isVerified: c.isVerified || false,
      portfolioEmbeddingText: '',
      nodeSize: config.nodeSize,
      nodeGlowIntensity: config.nodeGlowIntensity,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    };

    const matchScore = c.computedMatchScore ?? 0.5;
    
    // Simple distance approximation based on degrees -> Km
    const distKm = Math.sqrt(Math.pow(lat - clientLat, 2) + Math.pow(lng - clientLng, 2)) * 111;

    return {
      creatorId: creatorData.uid,
      creator: creatorData,
      matchScore: matchScore,
      distanceKm: Number(distKm.toFixed(2)),
      position3D: latLngToRadarPosition(clientLat, clientLng, lat, lng),
      glowColor: getMatchColor(matchScore, tier)
    };
  });
}
