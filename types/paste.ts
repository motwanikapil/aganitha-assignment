// Type definition for a Paste entity
export interface Paste {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date | null;
  maxViews?: number;
  viewCount: number;
}

// Type for creating a new paste (request body for POST /api/pastes)
export interface CreatePasteRequest {
  content: string;
  ttl_seconds?: number;
  max_views?: number;
}

// Type for the response when creating a paste
export interface CreatePasteResponse {
  id: string;
  url: string;
}

// Type for the response when fetching a paste via API
export interface FetchPasteApiResponse {
  content: string;
  remaining_views: number | null;
  expires_at: string | null; // ISO string format (converted from Unix timestamp for frontend)
}

// Type for the health check response
export interface HealthCheckResponse {
  ok: boolean;
}

// Type for paste constraints
export interface PasteConstraints {
  ttl_seconds?: number; // Time-to-live in seconds
  max_views?: number;   // Maximum number of views allowed
}