/**
 * Kit Auto-Save Hook
 * Saves kit state automatically with debounce (5 seconds).
 * Only triggers after the user has made meaningful changes.
 *
 * BUG-11 FIX: usar refs para dependencias instaveis (kitState, kitQuantity,
 * onKitIdCreated) para que saveToDb nao seja recriado a cada render do pai.
 * Timer de 5s isolado de re-renders intermediarios.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  KitState,
  KitBox,
  KitItem,
  KitPersonalization,
  KitIdentity,
  KitType,
} from '@/lib/kit-builder';
import { logger } from '@/lib/logger';
import {
  buildKitPersistencePayload,
  persistCustomKitAtomically,
  type KitDraftContext,
} from '@/lib/kit-builder/persistence';

const AUTO_SAVE_DELAY_MS = 5000;
const LS_BACKUP_KEY_PREFIX = 'kit-builder-unload-backup';

/**
 * Full restorable state saved on beforeunload. Unlike the detection snapshot
 * (which only holds IDs/quantities), this carries all display data needed to
 * re-hydrate the editor without a round-trip to the database.
 */
export interface BackupFullState {
  name: string;
  kitType: KitType;
  box: KitBox | null;
  items: KitItem[];
  personalization: KitPersonalization;
  identity?: KitIdentity;
  notes?: string;
  qty: number;
}

interface AutoSaveResult {
  lastSavedAt: Date | null;
  isSaving: boolean;
  autoSavedKitId: string | null;
  /** A visible, sanitized state — failed automatic saves must not be log-only. */
  autoSaveError: string | null;
  /** True when the last save failed with a PostgreSQL 40001 serialization conflict. */
  isConflictError: boolean;
  /** Replays the most recent snapshot with the same optimistic revision rules. */
  retryLastSave: () => Promise<void>;
  /** Cancels