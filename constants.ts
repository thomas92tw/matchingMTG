
import { Buyer, Seller, SessionSettings } from './types';

export const MAX_BUYERS_PER_BLOCK = 20; // Max 20 buyers for morning, max 20 for afternoon

export const NUM_PRIMARY_PREFERRED_SELLERS = 6;
export const NUM_BACKUP_PREFERRED_SELLERS = 4;
export const TOTAL_PREFERRED_SELLERS = NUM_PRIMARY_PREFERRED_SELLERS + NUM_BACKUP_PREFERRED_SELLERS;


export const INITIAL_SESSION_SETTINGS: SessionSettings = {
  count: 6, // Default 6 sessions per block (e.g., 6 morning, 6 afternoon)
  durationMinutes: 30,
  breakMinutes: 5,
  morningStartTime: "09:30",
  afternoonStartTime: "13:30",
};

// Helper to generate unique IDs
export const generateId = (): string => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Initial buyer data - now starts empty
export const initialBuyers: Buyer[] = [];

// Placeholder for master sellers - admin should populate this - now starts empty
export const initialMasterSellers: Seller[] = [];

export const APP_TITLE = "Intelligent Meeting Scheduler";

export enum ViewMode {
  Admin = "admin",
  Seller = "seller",
}