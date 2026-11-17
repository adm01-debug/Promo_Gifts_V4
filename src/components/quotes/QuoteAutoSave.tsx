/**
 * QuoteAutoSave - Sistema de auto-save para orçamentos
 * Salva rascunhos automaticamente no localStorage com indicador visual
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { logger } from '@/lib/logger';
import {
  quoteDraftRecoverySchema,
  mergeRestoredBase,
  readRecoverableDraft,
} from '@/lib/quotes/quoteDraftRecovery';
import {
  QUOTE_AUTOSAVE_STATUS_TEXT,
  QUOTE_AUTOSAVE_ARIA_LABEL,
  type SaveStatus,
} from './quoteAutoSaveStatus';

interface QuoteDraft {
  id: string;
  data: unknown;
  savedAt: string;
  version: number;
}

interface QuoteAutoSaveProps {
  quoteId?: string;
  data: unknown;
  onChange?: (hasUnsavedChanges: boolean) => void;
  debounceMs?: number;
  className?: string;
  /** Timestamp (Date.now()) set by the parent after a successful server save.
   *  When it changes, the "unsaved changes" baseline is reset so the indicator
   *  clears without needing to navigate away and back. */
  serverSavedAt?: number;
  /**
   * Recuperação de rascunho sob decisão do vendedor. Quando informado, e só
   * então, o componente oferece um botão "Restaurar rascunho" se houver no
   * localStorage um envelope íntegro para este orçamento, diferente do que está
   * na tela. Sem o callback nada muda: nenhum botão, nenhuma leitura oferecida.
   *
   * GUARD: este caminho é somente-leitura. Envelope inválido, JSON corrompido ou
   * recuperação recusada pelo consumidor NÃO apagam nem reescrevem o storage — o
   * rascunho do vendedor é a única cópia do trabalho dele e fica preservado para
   * investigação. Pode devolver Promise; cliques repetidos não duplicam a chamada.
   */
  onRestore?: (data: unknown) => Promise<void> | void;
}

const STORAGE_KEY_PREFIX = 'quote_draft_';
const MAX_VERSIONS = 5;

export function QuoteAutoSave({
  quoteId,
  data,
  onChange,
  debounceMs = 2000,
  className,
  serverSavedAt,
  onRestore,
}: QuoteAutoSaveProps) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [recoverable, setRecoverable] = useState<unknown | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  /** Rascunho restaurado nesta sessão, base do merge do próximo autosave. */
  const restoredBaseRef = useRef<unknown>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const dataRef = useRef(data);
  const initialDataRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Storage key único para este orçamento
  const storageKey = `${STORAGE_KEY_PREFIX}${quoteId || 'new'}`;

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
      const newDraft: QuoteDraft = {
        id: quoteId || 'new',
        // Preserva o que o rascunho restaurado tinha e esta tela não modela
        // (feature parcial de outro agente, campo de versão futura). Sem isto, a
        // primeira gravação após restaurar apagaria essa parte do trabalho.
        data: mergeRestoredBase(restoredBaseRef.current, dataRef.current),
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
  // A página pode esconder o indicador no estado normal (QuoteBuilderPage passa
  // `sr-only`), mas falha de salvamento não pode ficar só para leitor de tela:
  // o vendedor precisa ver que o rascunho NÃO foi salvo. `not-sr-only` vence o
  // `sr-only` externo no twMerge; o texto também sai do `hidden` do mobile.
  const isFailure = status === 'error' || status === 'offline';

  // Detecção da oferta de recuperação. Roda uma vez por orçamento, com a tela
  // já montada: sem callback não há leitura nenhuma a oferecer.
  const detectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!onRestore) {
      setRecoverable(null);
      return;
    }
    if (detectedRef.current === storageKey) return;
    detectedRef.current = storageKey;
    setRecoverable(readRecoverableDraft(storageKey, quoteId || 'new', dataRef.current));
  }, [onRestore, storageKey, quoteId]);

  const handleRestore = useCallback(async () => {
    if (!onRestore || recoverable === null || restoring) return;
    setRestoring(true);
    setRestoreError(null);
    try {
      await onRestore(recoverable);
      if (!mountedRef.current) return;
      restoredBaseRef.current = recoverable;
      setRecoverable(null);
    } catch (err) {
      // GUARD: recuperação recusada mantém a oferta e o storage intactos — o
      // vendedor pode tentar de novo e o rascunho continua lá para investigação.
      if (!mountedRef.current) return;
      setRestoreError(err instanceof Error ? err.message : 'Não foi possível restaurar o rascunho');
    } finally {
      if (mountedRef.current) setRestoring(false);
    }
  }, [onRestore, recoverable, restoring]);
  // aria-live: 'polite' anuncia mudanças de status sem interromper o leitor.
  // 'off' quando não há texto, para evitar anúncios vazios.
  const ariaLive: 'off' | 'polite' = statusText ? 'polite' : 'off';

  return (
    <>
      {/* Oferta de recuperação: só com onRestore e envelope íntegro diferente da tela */}
      {onRestore && recoverable !== null && (
        <button
          type="button"
          onClick={handleRestore}
          disabled={restoring}
          className="text-xs font-medium underline underline-offset-2 disabled:opacity-60"
          data-testid="quote-autosave-restore"
        >
          Restaurar rascunho
        </button>
      )}
      {restoreError && (
        <span role="alert" className="text-xs text-destructive">
          {restoreError}
        </span>
      )}

      {/* Indicador de status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2',
              className,
              isFailure && 'not-sr-only pointer-events-auto',
            )}
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
              className={cn(
                'text-xs',
                isFailure
                  ? 'inline font-medium text-destructive'
                  : 'hidden text-muted-foreground sm:inline',
              )}
              data-testid="quote-autosave-text"
            >
              {statusText}
            </span>
            {hasUnsavedChanges && status !== 'saving' && (
              <Badge variant="outline" className="h-5 text-[10px]">
                {QUOTE_AUTOSAVE_STATUS_TEXT.unsavedBadge}
              </Badge>
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
        // O rascunho vem do localStorage do navegador: pode ter sido gravado por uma versão
        // anterior do app, ter sido truncado por cota, ou ter sido editado à mão. Antes desta
        // validação, draft.data voltava como `unknown` e o consumidor lia os campos direto
        // (useQuoteBuilderState lê saved.shippingType, saved.shippingCost, saved.validUntil,
        // saved.notes), então um rascunho fora de forma entrava no estado da tela sem conferência.
        const parsed = quoteDraftRecoverySchema.safeParse(draft.data);
        if (!parsed.success) {
          logger.warn('Rascunho de orçamento fora de forma — restauração ignorada', {
            storageKey,
            issues: parsed.error.issues.slice(0, 5).map((i) => ({
              path: i.path.join('.'),
              code: i.code,
            })),
          });
          return null;
        }
        return parsed.data;
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
