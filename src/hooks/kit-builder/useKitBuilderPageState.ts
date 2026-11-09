import { dbInvoke } from '@/lib/db/postgrest';
import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  transformToKitItem,
  useCustomKitPersistence,
  useCustomKitsRealtime,
  useDuplicateKitDetector,
  useKitAutoSave,
  useKitBuilder,
  useKitUndoRedo,
  useTemplateSnapshot,
} from '@/hooks/kit-builder';
import type { BackupFullState } from '@/hooks/kit-builder/useKitAutoSave';
import { useKitBuilderQuote, type KitQuoteClient } from '@/pages/kit-builder/useKitBuilderQuote';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}