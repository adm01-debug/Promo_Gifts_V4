/**
 * QuoteAutoSave - Sistema de auto-save para orçamentos
 * Salva rascunhos automaticamente no localStorage com indicador visual
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Cloud, CloudOff, Check, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { logger } from '@/lib/logger';
import type { QuoteAutoSaveProps, QuoteDraft } from './QuoteAutoSave.types';
export type { QuoteAutoSaveProps, QuoteDraft } from './QuoteAutoSave.types';
import {
  QUOTE_AUTOSAVE_STATUS_TEXT,
  QUOTE_AUTOSAVE_ARIA_LABEL,
  type SaveStatus,
} from './quoteAutoSaveStatus';

const STORAGE_KEY_PREFIX = 'quote_draft_';
const MAX_VERSIONS = 5;

function isRecoverableDraft(value: unknown, quoteId: string): value is QuoteDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (
    'id' in value &&
    value.id === quoteId &&
    'version' in value &&
    typeof value.version === 'number' &&
    Number.isSafeInteger(value.version) &&
    value.version > 0 &&
    'savedAt' in value &&
    typeof value.savedAt === 'string' &&
    Number.isFinite(Date.parse(value.savedAt)) &&
    'data' in value &&
    value.data !== null &&
    typeof value.data === 'object' &&
    !Array.isArray(value.data)
  );
}

export function QuoteAutoSave({
  quoteId,
  data,
  onChange,
  onRestore,
  debounceMs = 2000,
  className,
  serverSavedAt,
}: QuoteAutoSaveProps) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [recoverableDraft, setRecoverableDraft] = useState<QuoteDraft | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const restoringRef = useRef<string | null>(null);
  const restoredDataRef = useRef<Record<string, unknown> | null>(null);
  const recoveryKeyRef = useRef<string | null>(null);
  const onRestoreRef = useRef(onRestore);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const dataRef = useRef(data);
  const initialDataRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  // Storage key único para este orçamento
  const storageKey = `${STORAGE_KEY_PREFIX}${quoteId || 'new'}`;
  const restoreEnabled = Boolean(onRestore);
  useEffect(() => {
    if (!restoreEnabled || recoveryKeyRef.current === storageKey) return;
    recoveryKeyRef.current = storageKey;
    setRecoverableDraft(null);
    setRestoreError(null);
    setIsRestoring(false);
    restoredDataRef.current = null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const candidate: unknown = JSON.parse(stored);
      if (isRecoverableDraft(candidate, quoteId || 'new')) setRecoverableDraft(candidate);
    } catch {
      // Invalid or inaccessible snapshots remain untouched; autosave still works.
    }
  }, [quoteId, restoreEnabled, storageKey]);

  const restoreDraft = async () => {
    const restore = onRestoreRef.current;
    if (!restore || !recoverableDraft || restoringRef.current === storageKey) return;
    const key = storageKey;
    restoringRef.current = key;
    setIsRestoring(true);
    setRestoreError(null);
    try {
      await restore(recoverableDraft.data);
      if (mountedRef.current && recoveryKeyRef.current === key) {
        const savedData = recoverableDraft.data;
        if (savedData && typeof savedData === 'object' && !Array.isArray(savedData)) {
          restoredDataRef.current = Object.fromEntries(Object.entries(savedData));
        }
        setRecoverableDraft(null);
      }
    } catch (error) {
      if (mountedRef.current && recoveryKeyRef.current === key) {
        setRestoreError(
          error instanceof Error ? error.message : 'Não foi possível restaurar o rascunho.',
        );
      }
    } finally {
      if (restoringRef.current === key) restoringRef.current = null;
      if (mountedRef.current && recoveryKeyRef.current === key) setIsRestoring(false);
    }
  };

  // Cleanup timers on unmount
  // BUG-H FIX: clear edit-mode localStorage entries on unmount to prevent orphan accumulation
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      // Only clean up edit-mode drafts (quoteId is a real UUID, not 'new').
      // New-quote drafts are intentionally kept so useAutoSaveQuote can restore them.
      if (quoteId) {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k === storageKey || k.startsWith(`${storageKey}_v`))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {
          /* ignore storage errors on unmount */
        }
      }
    };
  }, [quoteId, storageKey]);

  // BUG-J FIX: snapshot initial data AFTER the first real render, not on storageKey change.
  // Previously, the snapshot was taken synchronously when storageKey changed — before
  // useAutoSaveQuote could restore state, so the component immediately showed "Alterações
  // não salvas" even though the data was just restored from localStorage.
  // Using a one-shot ref flag ensures the snapshot is taken on the second render,
  // by which time restored state has propagated into props.
  const initialSnapshottedRef = useRef(false);
  useEffect(() => {
    // Reset snapshot gate whenever storageKey changes (e.g. navigating between quotes)
    initialSnapshottedRef.current = false;
    initialDataRef.current = null;
  }, [storageKey]);

  useEffect(() => {
    if (!initialSnapshottedRef.current) {
      initialSnapshottedRef.current = true;
      initialDataRef.current = JSON.stringify(data);
    }
  }, [data, storageKey]);

  // BUG-SERVER-SAVED-AT FIX: when the parent reports a successful server save,
  // reset the "unsaved changes" baseline to the current snapshot so the badge
  // clears immediately — previously serverSavedAt was passed but never consumed,
  // leaving the "Não salvo" badge visible even after a successful save.
  useEffect(() => {
    if (!serverSavedAt) return;
    initialDataRef.current = JSON.stringify(dataRef.current);
    setHasUnsavedChanges(false);
    onChangeRef.current?.(false);
  }, [serverSavedAt]);

  const saveDraft = useCallback(() => {
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    setStatus('saving');

    try {
      // Obter versões anteriores. Uma versão histórica corrompida (storage
      // truncado por quota, adulteração, drift de schema) NÃO deve abortar o
      // autosave inteiro — senão a cotação para de persistir silenciosamente.
      // Snapshot de keys antes de qualquer remoção: removeItem durante iteração
      // por índice desloca os índices e pula items subsequentes.
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) allKeys.push(k);
      }
      const existingDrafts: QuoteDraft[] = [];
      for (const key of allKeys) {
        if (key.startsWith(`${storageKey}_v`)) {
          try {
            existingDrafts.push(JSON.parse(localStorage.getItem(key) || '') as QuoteDraft);
          } catch {
            localStorage.removeItem(key);
          }
        }
      }

      // Criar nova versão
      const currentData = dataRef.current;
      const draftData =
        restoredDataRef.current &&
        currentData &&
        typeof currentData === 'object' &&
        !Array.isArray(currentData)
          ? { ...restoredDataRef.current, ...currentData }
          : currentData;
      const newDraft: QuoteDraft = {
        id: quoteId || 'new',
        data: draftData,
        savedAt: new Date().toISOString(),
        version: Date.now(),
      };

      // Salvar draft atual
      localStorage.setItem(storageKey, JSON.stringify(newDraft));

      // Salvar versão histórica
      const versionKey = `${storageKey}_v${newDraft.version}`;
      localStorage.setItem(versionKey, JSON.stringify(newDraft));

      // Limpar versões antigas (manter apenas MAX_VERSIONS).
      // existingDrafts não inclui o newDraft recém-salvo, então o total após
      // o save é existingDrafts.length + 1. Para manter MAX_VERSIONS no total,
      // devemos manter apenas MAX_VERSIONS - 1 dos existentes.
      const sortedDrafts = [...existingDrafts].sort((a, b) => b.version - a.version);
      sortedDrafts.slice(MAX_VERSIONS - 1).forEach((draft) => {
        localStorage.removeItem(`${storageKey}_v${draft.version}`);
      });

      if (!mountedRef.current) return;
      setLastSaved(new Date());
      setStatus('saved');

      // Reset para idle após 2s
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setStatus('idle');
      }, 2000);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        logger.error('localStorage quota exceeded — draft não pôde ser salvo', error);
      } else {
        logger.error('Erro ao salvar draft:', error);
      }
      setStatus('error');
    }
  }, [storageKey, quoteId]);

  // Detectar mudanças
  useEffect(() => {
    dataRef.current = data;

    const currentData = JSON.stringify(data);
    const hasChanges = currentData !== initialDataRef.current;

    setHasUnsavedChanges(hasChanges);
    onChangeRef.current?.(hasChanges);

    // Debounce auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (hasChanges) {
      setStatus('idle');
      timeoutRef.current = setTimeout(() => {
        saveDraft();
      }, debounceMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, saveDraft]);

  // Verificar conectividade
  useEffect(() => {
    const handleOnline = () => {
      if (status === 'offline') {
        setStatus('idle');
      }
    };

    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'saved':
        return <Check className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'offline':
        return <CloudOff className="h-4 w-4 text-warning" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    const T = QUOTE_AUTOSAVE_STATUS_TEXT;
    switch (status) {
      case 'saving':
        return T.saving;
      case 'saved': {
        if (lastSaved) {
          const secsAgo = Math.round((Date.now() - lastSaved.getTime()) / 1000);
          if (secsAgo < 60) return T.savedNow;
          const minsAgo = Math.round(secsAgo / 60);
          return T.savedMinutesAgo(minsAgo);
        }
        return T.savedGeneric;
      }
      case 'error':
        return T.error;
      case 'offline':
        return T.offline;
      default:
        return hasUnsavedChanges
          ? T.unsaved
          : lastSaved
            ? T.savedAtTime(format(lastSaved, 'HH:mm', { locale: ptBR }))
            : T.idle;
    }
  };

  const statusText = getStatusText();
  const showIcon = status !== 'idle' || statusText !== '';
  // aria-live: 'polite' anuncia mudanças de status sem interromper o leitor.
  // 'off' quando não há texto, para evitar anúncios vazios.
  const ariaLive: 'off' | 'polite' = statusText ? 'polite' : 'off';

  return (
    <>
      {/* Indicador de status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn('flex items-center gap-2', className)}
            role="status"
            aria-label={QUOTE_AUTOSAVE_ARIA_LABEL}
            aria-live={ariaLive}
            aria-atomic="true"
            data-testid="quote-autosave-indicator"
            data-status={status}
          >
            <AnimatePresence mode="wait">
              {showIcon && (
                <motion.div
                  key={status}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  aria-hidden="true"
                >
                  {getStatusIcon()}
                </motion.div>
              )}
            </AnimatePresence>
            <span
              className="hidden text-xs text-muted-foreground sm:inline"
              data-testid="quote-autosave-text"
            >
              {statusText}
            </span>
            {hasUnsavedChanges && status !== 'saving' && (
              <Badge variant="outline" className="h-5 text-[10px]">
                {QUOTE_AUTOSAVE_STATUS_TEXT.unsavedBadge}
              </Badge>
            )}
            {onRestore &&
              recoverableDraft &&
              JSON.stringify(recoverableDraft.data) !== JSON.stringify(data) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs"
                  onClick={() => {
                    void restoreDraft();
                  }}
                  disabled={isRestoring}
                  data-testid="quote-autosave-restore"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurar rascunho
                </Button>
              )}
            {restoreError && (
              <span role="alert" className="text-xs text-destructive">
                {restoreError}
              </span>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p className="font-medium">{getStatusText()}</p>
            {lastSaved && (
              <p className="text-muted-foreground">
                Último salvamento: {format(lastSaved, 'HH:mm:ss', { locale: ptBR })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </>
  );
}

// Hook para usar o auto-save de forma imperativa
export function useQuoteAutoSave(quoteId?: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${quoteId || 'new'}`;

  const saveDraft = useCallback(
    (data: unknown) => {
      const draft: QuoteDraft = {
        id: quoteId || 'new',
        data,
        savedAt: new Date().toISOString(),
        version: Date.now(),
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch (err) {
        logger.error('useQuoteAutoSave: failed to persist draft', err);
      }
    },
    [storageKey, quoteId],
  );

  const loadDraft = useCallback((): unknown | null => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const draft: QuoteDraft = JSON.parse(stored);
        return draft.data;
      } catch {
        return null;
      }
    }
    return null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { saveDraft, loadDraft, clearDraft };
}
