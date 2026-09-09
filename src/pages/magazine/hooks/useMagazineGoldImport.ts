/**
 * useMagazineGoldImport — migra??o one-shot do localStorage (v1) para o BD
 * Gold (magazines/magazine_items) via edge `magazine-import-local`.
 *
 * FIX C12 (auditoria BD, 2026-07-12): sem esta ponte, revistas já criadas
 * pelos vendedores em localStorage seriam perdidas quando o app migrar para
 * persistência server-side. Este hook roda 1x por usuário (flag persistida),
 * silenciosamente, sem bloquear a renderização da lista.
 *
 * Contrato:
 *  - Nunca lança, nunca trava a UI.
 *  - Se a edge falhar (offline, 401, 503), NÃO marca como migrado — tenta de
 *    novo na próxima sessão.
 *  - Se migrar com sucesso, marca `promobrind.magazines.migratedToGold.v1=1`
 *    no localStorage e não roda de novo.
 *  - IDs legados (`mag_<uuid>`) NÃO são reaproveitados — o BD gera novos UUIDs.
 *    O mapeamento old→new é apenas para telemetria/debug; a lista volta a
 *    ler do BD normalmente após a migração (fora do escopo deste hook — a
 *    troca de `magazineService` para Supabase é o próximo passo do roadmap).
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/integrations/supabase/lazy-client';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';
import type { Magazine } from '@/types/magazine';

// Telemetria pré-remoção: ver docs/plans/magazine-gold-import-removal.md.
// Painel /admin/telemetria filtra por scope='magazine.gold-import'.
// Critério de remoção: 14 dias consecutivos com zero eventos '..._success'.
const log = createClientLogger('magazine.gold-import');

const LEGACY_STORAGE_KEY = 'promobrind.magazines.v1';

const MIGRATED_FLAG_KEY = 'promobrind.magazines.migratedToGold.v1';
const IMPORT_ENDPOINT_PATH = '/functions/v1/magazine-import-local';
const IMPORT_TIMEOUT_MS = 10_000;
export const IMPORT_BATCH_SIZE = 200;

interface ImportResultItem {
  localId: string;
  newId: string | null;
  publicToken: string | null;
  error?: string;
}

interface ImportBatchResponse {
  results: ImportResultItem[];
  complete: boolean;
  successCount: number;
  failureCount: number;
}

function isMigrated(): boolean {
  try {
    return localStorage.getItem(MIGRATED_FLAG_KEY) === '1';
  } catch {
    return true; // sem storage → não insiste
  }
}

function markMigrated(): void {
  try {
    localStorage.setItem(MIGRATED_FLAG_KEY, '1');
  } catch {
    /* silencioso */
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('import-timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

function toImportPayload(m: Magazine) {
  return {
    localId: m.id,
    title: m.title,
    subtitle: m.subtitle,
    templateId: m.templateId,
    branding: m.branding,
    content: m.content,
    status: m.status === 'published' ? 'draft' : m.status, // republica manualmente (token novo)
    pageOrder: m.pageOrder,
    // Nunca truncar silenciosamente: o limite atômico de 500 pertence à edge/RPC.
    // Uma revista acima do limite deve falhar explicitamente e permanecer retomável.
    items: m.items.map((it) => ({
      localItemId: it.id,
      productId: it.productId,
      productSnapshot: it.productSnapshot,
      variantColorName: it.variantColorName,
      position: it.position,
      pageNumber: it.pageNumber,
      overrides: it.overrides,
    })),
  };
}

export function useMagazineGoldImport(userId: string | undefined): {
  importing: boolean;
  lastResult: ImportResultItem[] | null;
} {
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResultItem[] | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!userId || ranRef.current || isMigrated()) return;
    ranRef.current = true;

    // Lê localStorage legado direto — o magazineService v2 aponta para o BD Gold.
    let localMagazines: Magazine[] = [];
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Magazine[]) : [];
      localMagazines = Array.isArray(parsed) ? parsed.filter((m) => m?.ownerId === userId) : [];
    } catch {
      localMagazines = [];
    }
    if (localMagazines.length === 0) {
      // Nada para migrar — marca como feito para não checar de novo
      markMigrated();
      return;
    }

    let cancelled = false;
    log.info('magazine_import_local_start', { count: localMagazines.length });

    (async () => {
      setImporting(true);
      try {
        const supabase = await getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          log.info('magazine_import_local_skipped', { reason: 'no_session' });
          setImporting(false);
          return; // sem sessão — tenta de novo quando logar
        }

        const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
        const endpoint = `${supabaseUrl}${IMPORT_ENDPOINT_PATH}`;

        const allResults: ImportResultItem[] = [];
        let allComplete = true;
        for (let offset = 0; offset < localMagazines.length; offset += IMPORT_BATCH_SIZE) {
          const batch = localMagazines.slice(offset, offset + IMPORT_BATCH_SIZE);
          const res = await withTimeout(
            fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ magazines: batch.map(toImportPayload) }),
            }),
            IMPORT_TIMEOUT_MS,
          );

          if (cancelled) return;
          const requestId = res.headers.get('x-request-id') ?? null;
          if (!res.ok) {
            let bodyErrorCode: string | null = null;
            let bodyRequestId: string | null = null;
            try {
              const errBody = (await res.clone().json()) as {
                error?: string;
                request_id?: string;
              };
              bodyErrorCode = errBody?.error ?? null;
              bodyRequestId = errBody?.request_id ?? null;
            } catch {
              /* body não-JSON — segue com header apenas */
            }
            log.warn('magazine_import_local_failed', {
              status: res.status,
              request_id: requestId ?? bodyRequestId,
              error_code: bodyErrorCode,
              batchOffset: offset,
            });
            allComplete = false;
            break;
          }

          const body = (await res.json()) as Partial<ImportBatchResponse>;
          const expectedIds = new Set(batch.map((magazine) => magazine.id));
          const results = Array.isArray(body.results) ? body.results : [];
          const resultIds = new Set(results.map((result) => result.localId));
          const responseMatchesBatch =
            results.length === batch.length &&
            resultIds.size === expectedIds.size &&
            [...expectedIds].every((localId) => resultIds.has(localId));
          allResults.push(...results);
          if (
            body.complete !== true ||
            body.failureCount !== 0 ||
            body.successCount !== batch.length ||
            results.some((result) => !result.newId || result.error) ||
            !responseMatchesBatch
          ) {
            allComplete = false;
          }
        }

        if (cancelled) return;
        const okCount = allResults.filter((result) => result.newId && !result.error).length;
        setLastResult(allResults);
        const complete = allComplete && allResults.length === localMagazines.length;
        if (complete) markMigrated();
        log.info(complete ? 'magazine_import_local_success' : 'magazine_import_local_incomplete', {
          okCount,
          totalCount: localMagazines.length,
          complete,
        });

        if (okCount > 0) {
          toast.success(
            `${okCount} revista${okCount === 1 ? '' : 's'} migrada${okCount === 1 ? '' : 's'} para o servidor.`,
            {
              description:
                'Suas revistas agora ficam salvas na nuvem e acessíveis de qualquer dispositivo.',
              duration: 8000,
            },
          );
        }
      } catch (err) {
        log.warn('magazine_import_local_error', {
          message: err instanceof Error ? err.message : String(err),
        });
        // Timeout/rede — silencioso, tenta de novo na próxima sessão
        if (!cancelled) setImporting(false);
      } finally {
        if (!cancelled) setImporting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { importing, lastResult };
}
