'use client';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { devtools, persist } from 'zustand/middleware';
import type { AppUser, Creator, RadarNode, ParsedSearchIntent, FeatureFlags } from '@/types';

// Helper to ensure node payload doesn't contain non-serializable class instances (like Firestore GeoPoint/Timestamp) 
// before dumping into local storage.
function serializeSafe(nodes: RadarNode[]): RadarNode[] {
  return nodes.map(n => {
    const cleanCreator = { ...n.creator };
    
    // Handle Firestore GeoPoint serialization safety
    if (cleanCreator.location && typeof (cleanCreator.location as any).toJSON === 'function') {
      cleanCreator.location = (cleanCreator.location as any).toJSON();
    } else if (cleanCreator.location && (cleanCreator.location as any).latitude !== undefined) {
      cleanCreator.location = { latitude: (cleanCreator.location as any).latitude, longitude: (cleanCreator.location as any).longitude } as any;
    }

    // Handle Firestore Timestamp serialization safety
    const tsFields = ['createdAt', 'updatedAt'] as const;
    tsFields.forEach(field => {
      if (cleanCreator[field] && typeof (cleanCreator[field] as any).toMillis === 'function') {
        cleanCreator[field] = { seconds: Math.floor((cleanCreator[field] as any).toMillis() / 1000), nanoseconds: 0 } as any;
      }
    });

    return { ...n, creator: cleanCreator };
  });
}

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
  clearNodes: () => void;
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
  aiInsights: { trends: string[], matchReasoning: string, detectedIndustry: string, strategicTip?: string, marketPulse?: string } | null;
  activeSearchResults: string[] | null; // Array of creator IDs from most recent search delivery
  setPrompt: (prompt: string) => void;
  setAiInsights: (v: SearchSlice['aiInsights']) => void;
  setParsedIntent: (intent: ParsedSearchIntent | null) => void;
  setIsSearching: (v: boolean) => void;
  setSearchError: (err: string | null) => void;
  setRadiusKm: (km: number) => void;
  setLastSearchAt: (ts: number) => void;
  setActiveSearchResults: (ids: string[] | null) => void;
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
  toastTimeout: ReturnType<typeof setTimeout> | null;
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
    persist(
      (set, get) => ({
        // AUTH
        user: null,
        firebaseUser: null,
        isAuthLoading: true,
        setUser: (user) => set({ user }, false, 'setUser'),
        setFirebaseUser: (firebaseUser) => set({ firebaseUser }, false, 'setFirebaseUser'),
        setAuthLoading: (isAuthLoading) => set({ isAuthLoading }, false, 'setAuthLoading'),

        // RADAR — Dynamically accumulates discovered nodes persistently
        nodes: [],
        selectedNode: null,
        hoveredNodeId: null,
        cameraTarget: [0, 0, 0],
        setNodes: (newNodes) => {
          const current = get().nodes;
          // Use Map to prevent duplicate entries by creator ID
          const map = new Map<string, RadarNode>(current.map(node => [node.creatorId, node]));
          
          // Convert to safe JSON and merge updates
          const sanitizedIncoming = serializeSafe(newNodes);
          sanitizedIncoming.forEach(node => {
            map.set(node.creatorId, node);
          });

          set({ nodes: Array.from(map.values()) }, false, 'setNodes');
        },
        clearNodes: () => set({ nodes: [] }, false, 'clearNodes'),
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
        activeSearchResults: null,
        setPrompt: (prompt) => set({ prompt }, false, 'setPrompt'),
        setAiInsights: (aiInsights) => set({ aiInsights }, false, 'setAiInsights'),
        setParsedIntent: (parsedIntent) => set({ parsedIntent }, false, 'setParsedIntent'),
        setIsSearching: (isSearching) => set({ isSearching }, false, 'setIsSearching'),
        setSearchError: (searchError) => set({ searchError }, false, 'setSearchError'),
        setRadiusKm: (radiusKm) => set({ radiusKm }, false, 'setRadiusKm'),
        setLastSearchAt: (lastSearchAt) => set({ lastSearchAt }, false, 'setLastSearchAt'),
        setActiveSearchResults: (activeSearchResults) => set({ activeSearchResults }, false, 'setActiveSearchResults'),

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
        toastTimeout: null,
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
          const { toastTimeout } = get();
          if (toastTimeout) clearTimeout(toastTimeout);
          const timeoutId = setTimeout(
            () => set({ toast: null, toastTimeout: null }, false, 'clearToast'),
            4000,
          );
          set({ toast: { message, type }, toastTimeout: timeoutId }, false, 'showToast');
        },
        clearToast: () => {
          const { toastTimeout } = get();
          if (toastTimeout) clearTimeout(toastTimeout);
          set({ toast: null, toastTimeout: null }, false, 'clearToast');
        },
        setFeatureFlags: (featureFlags) => set({ featureFlags }, false, 'setFeatureFlags'),
      }),
      { 
        name: 'candu-discovery-vault',
        // CRITICAL: Only persist 'nodes' so we don't save temporary UI states or auth payloads!
        partialize: (state) => ({ nodes: state.nodes }),
      }
    ),
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
  activeSearchResults: s.activeSearchResults,
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
