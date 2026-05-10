# CANDU — Hyperlocal Creator Radar: Finalized Implementation Plan

> **Status: APPROVED — Execution Starting**
> All open questions resolved. Building production-grade, not MVP.

---

## Confirmed Decisions

| Topic | Decision |
|---|---|
| **Auth** | Google Sign-In only |
| **Location** | GPS auto-detect + browser Geolocation API, manual city fallback |
| **AI Backend** | Vertex AI RAG (using $1,000 GenAI App Builder trial credit) |
| **Payment** | Dummy/placeholder data — full escrow flow working logically |
| **Currency** | IDR only |
| **Scope** | Indonesia-wide, `current location` feature for all users |
| **WebGL** | Flexible (optimized R3F + graceful 2D degradation) |
| **Target Quality** | High-end production — not MVP |

---

## Creator Tier Recommendation (Realistic)

Based on Indonesian market pricing (Sribulancer, Fastwork, Fiverr ID benchmarks):

| Tier | Price | Limits | Features |
|---|---|---|---|
| **Free** | IDR 0/bln | 3 portfolio images, 2 active projects | Standard node, basic profile, searchable |
| **Pro** ⭐ | IDR 99.000/bln | 15 portfolio images, 10 active projects | Brighter radar node, verified badge, priority search ranking, earnings analytics |
| **Business** 🔥 | IDR 249.000/bln | Unlimited portfolio, unlimited projects | Largest glowing node, featured in top results, custom profile slug, team collaboration (2 seats), priority support |

**Why this works:**
- Free tier creates supply (many creators join)
- Pro is the "serious freelancer" sweet spot at ~USD 6/month
- Business targets agencies/studios — rare but high-value

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                            │
│  Next.js 14 App Router + TypeScript                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ R3F Radar Canvas│  │ NLP Search Input │  │Portfolio Modal │  │
│  │ Three.js Bloom  │  │ Zustand Prompt   │  │Cloudinary CDN  │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘  │
│           └───────────────────►│◄──────────────────┘            │
│                           Zustand Store                          │
│                    (radar | search | auth | ui slices)           │
└───────────────────────────────┬──────────────────────────────────┘
                                │  Firebase SDK / HTTPS
┌───────────────────────────────▼──────────────────────────────────┐
│                      Firebase Platform                           │
│  ┌─────────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Firestore DB: "candu"│  │ Cloud Functions│  │ Firebase Auth │ │
│  │ + Vector Search      │  │ (v2 / Node 20) │  │ Google OAuth  │ │
│  └──────────┬──────────┘  └───────┬────────┘  └───────────────┘ │
│             │                     │                              │
│  ┌──────────▼──────────┐  ┌───────▼────────┐  ┌───────────────┐ │
│  │ Remote Config       │  │ Cloud Storage  │  │  Hosting      │ │
│  │ (Feature Flags/A/B) │  │  (avatars)     │  │  (Next.js)    │ │
│  └─────────────────────┘  └────────────────┘  └───────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
   ┌──────────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
   │ Google Vertex AI  │ │ Gemini API  │ │ Cloudinary API  │
   │ RAG Service       │ │ NLP Parsing │ │ Portfolio CDN   │
   │ (Embeddings Store)│ │ Intent Extr.│ │ Image Optimize  │
   └───────────────────┘ └─────────────┘ └─────────────────┘
```

---

## Firestore Schema (`candu` database)

### `/users/{userId}`
```
uid: string
email: string
displayName: string
photoURL: string
role: 'client' | 'creator'
tier: 'free' | 'pro' | 'business'          // creators only
tierExpiresAt: Timestamp | null
location: GeoPoint | null                   // current GPS
city: string                                // e.g. "Barabai", "Jakarta"
province: string
balance: number                             // IDR wallet balance (placeholder)
createdAt: Timestamp
updatedAt: Timestamp
```

### `/creators/{creatorId}`
```
uid: string
displayName: string
slug: string                                // custom URL (business tier)
bio: string
skills: string[]                           // ["Fotografi", "Videografi", "Desain Grafis"]
tier: 'free' | 'pro' | 'business'
location: GeoPoint
city: string
province: string
avgRating: number                          // 0-5
totalProjects: number
totalEarnings: number                      // IDR
portfolioImages: CloudinaryImage[]         // max 3|15|∞ by tier
hourlyRate: number                         // IDR
isAvailable: boolean
isVerified: boolean                        // pro+ only
embedding: vector(768)                     // Vertex AI embedding — CF only
portfolioEmbeddingText: string             // raw text used for embedding
nodeSize: 'small' | 'medium' | 'large'    // derived from tier
nodeGlowIntensity: number                  // 0.3|0.7|1.0 by tier
createdAt: Timestamp
updatedAt: Timestamp
```

### `/projects/{projectId}`
```
clientId: string
creatorId: string
title: string
description: string
budget: number                             // IDR
status: 'pending' | 'active' | 'in_progress' | 'completed' | 'disputed' | 'cancelled'
escrowAmount: number                       // IDR held
commissionRate: 0.10
clientConfirmed: boolean
creatorConfirmed: boolean
completedAt: Timestamp | null
createdAt: Timestamp
updatedAt: Timestamp
```

### `/transactions/{txId}`
```
projectId: string
fromUid: string
toUid: string
amount: number                             // IDR
type: 'escrow_hold' | 'creator_payout' | 'commission' | 'refund'
status: 'pending' | 'completed' | 'failed'
createdAt: Timestamp
```

### `/search_queries/{queryId}` (telemetry)
```
prompt: string
parsedIntent: object                       // Gemini output
userId: string
resultCount: number
latencyMs: number
aiProvider: 'vertex_rag' | 'fallback_keyword'
createdAt: Timestamp
```

### `/_logs/{logId}` (error telemetry)
```
code: string                               // ERROR_CODE enum
context: object
message: string
userId: string | null
severity: 'info' | 'warn' | 'error' | 'critical'
createdAt: Timestamp
```

---

## Firestore Security Rules (`candu` database)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/candu/documents {

    // ── Helpers ──────────────────────────────────────────────
    function isAuth() {
      return request.auth != null;
    }
    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }
    function isAdmin() {
      return isAuth() && request.auth.token.admin == true;
    }
    function isParticipant(res) {
      return isAuth() && (
        request.auth.uid == res.data.clientId ||
        request.auth.uid == res.data.creatorId
      );
    }
    function notWritingEmbedding() {
      return !("embedding" in request.resource.data.diff(resource.data).affectedKeys());
    }
    function validProjectStatus(status) {
      return status in ['pending', 'active', 'in_progress', 'completed', 'disputed', 'cancelled'];
    }

    // ── Users ─────────────────────────────────────────────────
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId)
                    && !("balance" in request.resource.data.diff(resource.data).affectedKeys());
                    // balance only modified by Cloud Functions
      allow delete: if false;
    }

    // ── Creators ──────────────────────────────────────────────
    match /creators/{creatorId} {
      allow read: if isAuth();                             // any logged-in user can search
      allow create: if isOwner(creatorId)
                    && notWritingEmbedding();
      allow update: if isOwner(creatorId)
                    && notWritingEmbedding();
      allow delete: if isOwner(creatorId) || isAdmin();
    }

    // ── Projects ──────────────────────────────────────────────
    match /projects/{projectId} {
      allow read: if isParticipant(resource) || isAdmin();
      allow create: if isAuth()
                    && request.resource.data.clientId == request.auth.uid
                    && request.resource.data.status == 'pending'
                    && validProjectStatus(request.resource.data.status);
      allow update: if isParticipant(resource)
                    && validProjectStatus(request.resource.data.status);
      allow delete: if false;                             // soft-delete via status only
    }

    // ── Transactions ──────────────────────────────────────────
    match /transactions/{txId} {
      allow read: if isAuth() && (
        request.auth.uid == resource.data.fromUid ||
        request.auth.uid == resource.data.toUid
      );
      allow write: if false;                              // Cloud Functions only (service account)
    }

    // ── Search Telemetry ──────────────────────────────────────
    match /search_queries/{queryId} {
      allow read: if isAdmin();
      allow write: if false;                              // Cloud Functions only
    }

    // ── Error Logs ────────────────────────────────────────────
    match /_logs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuth();                         // client-side logger allowed
      allow update, delete: if false;
    }
  }
}
```

---

## Firestore Indexes (`firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "creators",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isAvailable", "order": "ASCENDING" },
        { "fieldPath": "tier", "order": "ASCENDING" },
        { "fieldPath": "avgRating", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "creators",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "city", "order": "ASCENDING" },
        { "fieldPath": "isAvailable", "order": "ASCENDING" },
        { "fieldPath": "avgRating", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "creators",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "skills", "arrayConfig": "CONTAINS" },
        { "fieldPath": "isAvailable", "order": "ASCENDING" },
        { "fieldPath": "tier", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "creatorId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "severity", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "creators",
      "fieldPath": "embedding",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" },
        {
          "vectorConfig": { "dimension": 768, "flat": {} },
          "queryScope": "COLLECTION"
        }
      ]
    }
  ]
}
```

---

## Cloud Functions Architecture

### `onCreatorProfileWrite` — Firestore Trigger
- Trigger: `onCreate` / `onUpdate` of `/creators/{creatorId}`
- Guard: skip if `portfolioEmbeddingText` unchanged
- Flow: extract text → Gemini → embed via `text-embedding-004` → write `embedding` back
- Error: 3 retries with exponential backoff → log to `/_logs`

### `searchCreators` — HTTP Callable (v2)
```
Input:  { prompt, location: {lat, lng}, radius: number (km) }

1. Remote Config → check feature flags
2. Gemini: parse prompt → { skills[], budget?, context, urgency }
3. Hallucination guard: JSON schema validation → retry once → fallback keyword
4. Vertex AI RAG: vector similarity search (top 20 results)
5. Haversine filter: remove results outside radius
6. Rank: (matchScore × 0.6) + (tierWeight × 0.25) + (ratingWeight × 0.15)
7. Log telemetry to /search_queries
8. Return: RadarNode[] with { position3D, matchScore, creator }

Errors:
  INVALID_PROMPT → 400
  AI_UNAVAILABLE → fallback to keyword search
  NO_RESULTS → 200 with empty array + suggestions
```

### `processEscrow` — HTTP Callable (v2)
- Atomic batch: deduct client balance → create transaction → update project status
- On failure: rollback + log `ESCROW_FAILED` → flag for manual review

### `releaseEscrow` — HTTP Callable (v2)
- Validates both `clientConfirmed` and `creatorConfirmed`
- Atomic batch: 90% → creator balance, 10% → platform commission record
- On failure: set project `status: 'disputed'` + log `ESCROW_RELEASE_FAILED`

### `onUserTierChange` — Firestore Trigger
- Enforce portfolio image limit based on tier (3/15/∞)
- Update `nodeSize` and `nodeGlowIntensity` on creator document

---

## Error Handling Strategy

| Layer | Strategy |
|---|---|
| **Gemini NLP** | Schema validation → retry 1x → keyword fallback → `AI_PARSE_ERROR` log |
| **Vertex AI RAG** | Timeout 5s → fallback to Firestore text search → log |
| **Firestore reads** | try/catch → retry 2x exponential backoff → toast with error code |
| **Firestore writes** | Atomic batches → on failure: rollback + critical log |
| **WebGL / R3F** | `<ErrorBoundary>` → 2D list fallback + `WEBGL_CRASH` log |
| **Cloud Functions** | Structured error codes, dead-letter queue via `/_logs` |
| **Auth** | Firebase error codes → Indonesian user-friendly messages |
| **Network** | SWR stale-while-revalidate + offline toast notification |

---

## Empty State Inventory

| Screen | Empty State Message | CTA |
|---|---|---|
| Radar (no results) | "Belum ada kreator di sekitarmu" | "Perluas Radius" |
| Radar (no search yet) | "Ketik apa yang kamu butuhkan..." | Example prompt chips |
| Dashboard (no projects) | "Belum ada proyek aktif" | "Cari Kreator" |
| Creator portfolio (no images) | "Portofolio kosong" | "Tambah Karya" |
| Transaction history (empty) | "Belum ada transaksi" | "Mulai Proyek" |

---

## Feature Flags (Remote Config)

| Flag | Default | Purpose |
|---|---|---|
| `use_vertex_rag` | `true` | Toggle AI search vs keyword fallback |
| `radar_bloom_variant` | `'A'` | A/B test: bloom intensity |
| `show_escrow` | `true` | Toggle escrow UI visibility |
| `max_search_radius_km` | `50` | Cap search radius |
| `maintenance_mode` | `false` | Show maintenance page |
| `creator_tier_enabled` | `true` | Enable tier system |

---

## File Structure

```
candu/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout, fonts, metadata
│   │   ├── page.tsx                 # Landing / Radar page
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Client + Creator dashboard
│   │   ├── profile/
│   │   │   └── [slug]/page.tsx      # Public creator profile
│   │   └── onboarding/
│   │       └── page.tsx             # Post-auth setup
│   ├── components/
│   │   ├── radar/
│   │   │   ├── RadarCanvas.tsx      # R3F Canvas wrapper
│   │   │   ├── CreatorNodes.tsx     # Instanced 3D nodes
│   │   │   ├── GridPlane.tsx        # Cyberpunk floor grid
│   │   │   └── ParticleField.tsx    # Ambient particles
│   │   ├── search/
│   │   │   └── NLPSearchBar.tsx     # AI search input
│   │   ├── portfolio/
│   │   │   └── PortfolioModal.tsx   # Glassmorphism modal
│   │   ├── auth/
│   │   │   ├── AuthModal.tsx        # Google Sign-In
│   │   │   └── OnboardingFlow.tsx   # Role + location setup
│   │   ├── dashboard/
│   │   │   ├── ProjectCard.tsx
│   │   │   └── EscrowFlow.tsx
│   │   └── ui/
│   │       ├── EmptyState.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSkeleton.tsx
│   │       └── Toast.tsx
│   ├── store/
│   │   └── useAppStore.ts           # Zustand (all slices)
│   ├── lib/
│   │   ├── firebase.ts              # Firebase init (DB: candu)
│   │   ├── featureFlags.ts          # Remote Config wrapper
│   │   ├── logger.ts                # Structured error logger
│   │   ├── cloudinary.ts            # Cloudinary helpers
│   │   └── geo.ts                   # Haversine + GeoPoint utils
│   └── types/
│       └── index.ts                 # All shared TypeScript types
├── functions/
│   └── src/
│       ├── index.ts                 # Function exports
│       ├── searchCreators.ts
│       ├── escrow.ts
│       └── embeddings.ts
├── firestore.rules
├── firestore.indexes.json
└── firebase.json
```

---

## Implementation Phases

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | Next.js scaffold, design system, routing | 🔄 Starting |
| **Phase 2** | Firebase config (candu DB), Firestore rules, indexes | ⏳ Queued |
| **Phase 3** | Auth (Google), Zustand, R3F Radar + 2D fallback | ⏳ Queued |
| **Phase 4** | Cloud Functions, Gemini NLP, Vertex AI RAG | ⏳ Queued |
| **Phase 5** | Escrow flow (dummy), dashboards, transaction UI | ⏳ Queued |
| **Phase 6** | Feature flags, telemetry, A/B harness, creator tiers | ⏳ Queued |
