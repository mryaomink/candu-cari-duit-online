'use client';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { devtools } from 'zustand/middleware';
import type { AppUser, Creator, RadarNode, ParsedSearchIntent, FeatureFlags } from '@/types';

// ─── Auth Slice ───────────────────────────────────────────────────────────────
interface AuthSlice {
  user: AppUser | null;
  firebaseUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null } | null;
  isAuthLoading: boolean;
  setUser: (user: AppUser | null) => void;
  setFirebaseUser: (u: AuthSlice['firebaseUser']) => void;
  setAuthLoading: (v: boolean) => void;
}

// ─── Radar Slice ──────────────────────────────────────────────────────────────
interface RadarSlice {
  nodes: RadarNode[];
  selectedNode: RadarNode | null;
  hoveredNodeId: string | null;
  cameraTarget: [number, number, number];
  setNodes: (nodes: RadarNode[]) => void;
  setSelectedNode: (node: RadarNode | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  setCameraTarget: (pos: [number, number, number]) => void;
}

// ─── Search Slice ─────────────────────────────────────────────────────────────
interface SearchSlice {
  prompt: string;
  parsedIntent: ParsedSearchIntent | null;
  isSearching: boolean;
  searchError: string | null;
  radiusKm: number;
  lastSearchAt: number | null;
  aiInsights: { trends: string[], matchReasoning: string, detectedIndustry: string } | null;
  setPrompt: (prompt: string) => void;
  setAiInsights: (v: SearchSlice['aiInsights']) => void;
  setParsedIntent: (intent: ParsedSearchIntent | null) => void;
  setIsSearching: (v: boolean) => void;
  setSearchError: (err: string | null) => void;
  setRadiusKm: (km: number) => void;
  setLastSearchAt: (ts: number) => void;
}

// ─── Location Slice ───────────────────────────────────────────────────────────
interface LocationSlice {
  lat: number | null;
  lng: number | null;
  city: string;
  province: string;
  locationLoading: boolean;
  locationDenied: boolean;
  setLocation: (lat: number, lng: number, city: string, province: string) => void;
  setLocationLoading: (v: boolean) => void;
  setLocationDenied: (v: boolean) => void;
}

// ─── UI Slice ─────────────────────────────────────────────────────────────────
interface UISlice {
  view: 'radar' | 'list';
  webglSupported: boolean;
  isPortfolioOpen: boolean;
  isAuthModalOpen: boolean;
  isOnboarding: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  featureFlags: FeatureFlags;
  setView: (view: 'radar' | 'list') => void;
  setWebglSupported: (v: boolean) => void;
  setPortfolioOpen: (v: boolean) => void;
  setAuthModalOpen: (v: boolean) => void;
  setOnboarding: (v: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  setFeatureFlags: (flags: FeatureFlags) => void;
}

// ─── Full Store ───────────────────────────────────────────────────────────────
type AppStore = AuthSlice & RadarSlice & SearchSlice & LocationSlice & UISlice;

export const useAppStore = create<AppStore>()(
  devtools(
    (set) => ({
      // AUTH
      user: null,
      firebaseUser: null,
      isAuthLoading: true,
      setUser: (user) => set({ user }, false, 'setUser'),
      setFirebaseUser: (firebaseUser) => set({ firebaseUser }, false, 'setFirebaseUser'),
      setAuthLoading: (isAuthLoading) => set({ isAuthLoading }, false, 'setAuthLoading'),

      // RADAR
      nodes: [],
      selectedNode: null,
      hoveredNodeId: null,
      cameraTarget: [0, 0, 0],
      setNodes: (nodes) => set({ nodes }, false, 'setNodes'),
      setSelectedNode: (selectedNode) => set({ selectedNode }, false, 'setSelectedNode'),
      setHoveredNodeId: (hoveredNodeId) => set({ hoveredNodeId }, false, 'setHoveredNodeId'),
      setCameraTarget: (cameraTarget) => set({ cameraTarget }, false, 'setCameraTarget'),

      // SEARCH
      prompt: '',
      parsedIntent: null,
      isSearching: false,
      searchError: null,
      radiusKm: 50,
      lastSearchAt: null,
      aiInsights: null,
      setPrompt: (prompt) => set({ prompt }, false, 'setPrompt'),
      setAiInsights: (aiInsights) => set({ aiInsights }, false, 'setAiInsights'),
      setParsedIntent: (parsedIntent) => set({ parsedIntent }, false, 'setParsedIntent'),
      setIsSearching: (isSearching) => set({ isSearching }, false, 'setIsSearching'),
      setSearchError: (searchError) => set({ searchError }, false, 'setSearchError'),
      setRadiusKm: (radiusKm) => set({ radiusKm }, false, 'setRadiusKm'),
      setLastSearchAt: (lastSearchAt) => set({ lastSearchAt }, false, 'setLastSearchAt'),

      // LOCATION
      lat: null,
      lng: null,
      city: '',
      province: '',
      locationLoading: false,
      locationDenied: false,
      setLocation: (lat, lng, city, province) => set({ lat, lng, city, province }, false, 'setLocation'),
      setLocationLoading: (locationLoading) => set({ locationLoading }, false, 'setLocationLoading'),
      setLocationDenied: (locationDenied) => set({ locationDenied }, false, 'setLocationDenied'),

      // UI
      view: 'radar',
      webglSupported: true,
      isPortfolioOpen: false,
      isAuthModalOpen: false,
      isOnboarding: false,
      toast: null,
      featureFlags: {
        use_vertex_rag: true,
        radar_bloom_variant: 'A',
        show_escrow: true,
        max_search_radius_km: 50,
        maintenance_mode: false,
        creator_tier_enabled: true,
      },
      setView: (view) => set({ view }, false, 'setView'),
      setWebglSupported: (webglSupported) => set({ webglSupported }, false, 'setWebglSupported'),
      setPortfolioOpen: (isPortfolioOpen) => set({ isPortfolioOpen }, false, 'setPortfolioOpen'),
      setAuthModalOpen: (isAuthModalOpen) => set({ isAuthModalOpen }, false, 'setAuthModalOpen'),
      setOnboarding: (isOnboarding) => set({ isOnboarding }, false, 'setOnboarding'),
      showToast: (message, type = 'info') => {
        set({ toast: { message, type } }, false, 'showToast');
        setTimeout(() => set({ toast: null }, false, 'clearToast'), 4000);
      },
      clearToast: () => set({ toast: null }, false, 'clearToast'),
      setFeatureFlags: (featureFlags) => set({ featureFlags }, false, 'setFeatureFlags'),
    }),
    { name: 'CANDU-Store' }
  )
);

// Selector hooks for performance (avoid unnecessary re-renders)
export const useUser = () => useAppStore((s) => s.user);
export const useFirebaseUser = () => useAppStore((s) => s.firebaseUser);
export const useRadarNodes = () => useAppStore((s) => s.nodes);
export const useSelectedNode = () => useAppStore((s) => s.selectedNode);
export const useSearchState = () => useAppStore(useShallow((s) => ({
  prompt: s.prompt,
  isSearching: s.isSearching,
  searchError: s.searchError,
  aiInsights: s.aiInsights,
})));
export const useLocation = () => useAppStore(useShallow((s) => ({
  lat: s.lat, lng: s.lng, city: s.city, province: s.province,
  locationLoading: s.locationLoading, locationDenied: s.locationDenied,
})));
export const useUIState = () => useAppStore(useShallow((s) => ({
  view: s.view,
  webglSupported: s.webglSupported,
  isPortfolioOpen: s.isPortfolioOpen,
  isAuthModalOpen: s.isAuthModalOpen,
  toast: s.toast,
})));
export const useFeatureFlags = () => useAppStore((s) => s.featureFlags);
