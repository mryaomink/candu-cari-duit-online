import { Timestamp, GeoPoint } from 'firebase/firestore';

// ─── Auth & User ──────────────────────────────────────────────────────────────
export type UserRole = 'client' | 'creator';
export type CreatorTier = 'free' | 'pro' | 'business';
export type EscrowStatus = 'pending' | 'active' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  tier: CreatorTier;
  tierExpiresAt: Timestamp | null;
  location: GeoPoint | null;
  city: string;
  province: string;
  balance: number; // IDR
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  portfolioImages?: CloudinaryImage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Creator ──────────────────────────────────────────────────────────────────
export interface CloudinaryImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  thumbnailUrl: string;
}

export interface Creator {
  uid: string;
  displayName: string;
  slug: string;
  bio: string;
  skills: string[];
  tier: CreatorTier;
  location: GeoPoint;
  city: string;
  province: string;
  avgRating: number;
  totalProjects: number;
  totalEarnings: number;
  portfolioImages: CloudinaryImage[];
  hourlyRate: number; // IDR
  isAvailable: boolean;
  isVerified: boolean;
  portfolioEmbeddingText: string;
  nodeSize: 'small' | 'medium' | 'large';
  nodeGlowIntensity: number; // 0.3 | 0.7 | 1.0
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Radar ────────────────────────────────────────────────────────────────────
export interface RadarNode {
  creatorId: string;
  creator: Creator;
  matchScore: number; // 0-1
  distanceKm: number;
  position3D: [number, number, number]; // x, y, z in Three.js space
  glowColor: string; // hex color derived from matchScore + tier
}

// ─── Project & Escrow ─────────────────────────────────────────────────────────
export interface Project {
  id: string;
  clientId: string;
  creatorId: string;
  title: string;
  description: string;
  budget: number; // IDR
  status: EscrowStatus;
  escrowAmount: number;
  commissionRate: number; // 0.10
  clientConfirmed: boolean;
  creatorConfirmed: boolean;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Transaction {
  id: string;
  projectId: string;
  fromUid: string;
  toUid: string;
  amount: number; // IDR
  type: 'escrow_hold' | 'creator_payout' | 'commission' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  createdAt: Timestamp;
}

// ─── Search ───────────────────────────────────────────────────────────────────
export interface ParsedSearchIntent {
  skills: string[];
  budget?: number;
  context: string;
  urgency?: 'asap' | 'flexible';
  raw: string;
}

export interface SearchQuery {
  id: string;
  prompt: string;
  parsedIntent: ParsedSearchIntent;
  userId: string;
  resultCount: number;
  latencyMs: number;
  aiProvider: 'vertex_rag' | 'fallback_keyword';
  createdAt: Timestamp;
}

// ─── Error Logging ────────────────────────────────────────────────────────────
export type ErrorCode =
  | 'AUTH_FAILED'
  | 'API_INFO'
  | 'AI_PARSE_ERROR'
  | 'AI_UNAVAILABLE'
  | 'ESCROW_FAILED'
  | 'ESCROW_RELEASE_FAILED'
  | 'WEBGL_CRASH'
  | 'WEBGL_UNSUPPORTED'
  | 'FIRESTORE_READ_ERROR'
  | 'FIRESTORE_WRITE_ERROR'
  | 'LOCATION_DENIED'
  | 'INVALID_PROMPT'
  | 'NO_RESULTS'
  | 'CLOUDINARY_UPLOAD_FAILED'
  | 'UNKNOWN_ERROR';

export interface AppLog {
  id: string;
  code: ErrorCode;
  context: Record<string, unknown>;
  message: string;
  userId: string | null;
  severity: 'info' | 'warn' | 'error' | 'critical';
  createdAt: Timestamp;
}

// ─── Feature Flags ────────────────────────────────────────────────────────────
export interface FeatureFlags {
  use_vertex_rag: boolean;
  radar_bloom_variant: 'A' | 'B';
  show_escrow: boolean;
  max_search_radius_km: number;
  maintenance_mode: boolean;
  creator_tier_enabled: boolean;
}

// ─── Tier Config ──────────────────────────────────────────────────────────────
export const TIER_CONFIG: Record<CreatorTier, {
  maxPortfolioImages: number;
  maxActiveProjects: number;
  nodeSize: 'small' | 'medium' | 'large';
  nodeGlowIntensity: number;
  priceIDR: number;
  label: string;
  badge: string;
}> = {
  free: {
    maxPortfolioImages: 3,
    maxActiveProjects: 2,
    nodeSize: 'small',
    nodeGlowIntensity: 0.3,
    priceIDR: 0,
    label: 'Free',
    badge: '',
  },
  pro: {
    maxPortfolioImages: 15,
    maxActiveProjects: 10,
    nodeSize: 'medium',
    nodeGlowIntensity: 0.7,
    priceIDR: 99000,
    label: 'Pro',
    badge: '⭐',
  },
  business: {
    maxPortfolioImages: Infinity,
    maxActiveProjects: Infinity,
    nodeSize: 'large',
    nodeGlowIntensity: 1.0,
    priceIDR: 249000,
    label: 'Business',
    badge: '🔥',
  },
};

// ─── Utility ──────────────────────────────────────────────────────────────────
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getMatchColor(matchScore: number, tier: CreatorTier): string {
  const tierBoost = tier === 'business' ? 0.15 : tier === 'pro' ? 0.08 : 0;
  const boosted = Math.min(1, matchScore + tierBoost);
  if (boosted >= 0.75) return '#00D8FF'; // cyan – high match
  if (boosted >= 0.45) return '#FFB800'; // amber – medium match
  return '#6B7280'; // grey – low match
}
