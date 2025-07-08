
export interface Buyer {
  id: string;
  name: string;
  country: string;
  sessionBlock: 'morning' | 'afternoon';
}

export interface Seller {
  id: string;
  name: string;
}

export interface Session {
  id: string; // e.g., "m_s1", "a_s1"
  name: string; // e.g., "Session 1"
  startTime: string; // e.g., "09:00"
  endTime: string; // e.g., "09:40"
  block: 'morning' | 'afternoon';
}

// Stores preferred sellers for a buyer: buyerId -> sellerId[]
// The array typically holds 10 seller IDs: first 6 are main (primary) preferences, next 4 are backup preferences.
export type BuyerPreferredSellers = Record<string, string[]>; 

// The main schedule: buyerId -> sessionId -> sellerId | null
export type Schedule = Record<string, Record<string, string | null>>;

export interface SessionSettings {
  count: number; // Sessions per block (morning/afternoon)
  durationMinutes: number;
  breakMinutes: number;
  morningStartTime: string; // e.g., "09:30"
  afternoonStartTime: string; // e.g., "13:30"
}

export interface MeetingSlot {
  buyer: Buyer;
  seller: Seller | null;
  session: Session;
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // Other types of chunks can be added here if needed
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  // Other grounding metadata fields
}