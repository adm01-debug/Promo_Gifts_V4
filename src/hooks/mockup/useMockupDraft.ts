import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type PersonalizationArea } from '@/components/mockup/MultiAreaManager';
import type { MockupSelectionSnapshot } from '@/hooks/mockup/mockupSelectionSnapshot';
import type { Json } from '@/integrations/supabase/types';

import { logger } from '@/lib/logger';
import { uploadLogoToStorage } from '@/lib/mockup-storage';
const LOCAL_STORAGE_KEY = 'mockup_draft_v1';
const AUTO_SAVE_DELAY = 2000; // 2 segundos de debounce
// Marca, no logoPreview do localStorage, uma logo data: URL que não cabe ali (quota).
// O sufixo é a impressão digital da imagem, que também vai no nome do arquivo enviado
// ao bucket: só a MESMA imagem, na MESMA área (id), é recuperada do backend.
// null continua significando "sem logo" (inclusive removida pelo usuário) e nunca é preenchido.
const LOGO_PENDING_PREFIX = 'draft-logo-pending:';
const LOGO_UPLOAD_ERROR = 'Não foi possível salvar a logo no rascunho';

/** FNV-1a 32 bits em hex — identifica a imagem sem guardar o base64. */
function logoFingerprint(dataUrl: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < dataUrl.length; i++) {
    h ^= dataUrl.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Troca os marcadores de logo pendente do rascunho local pela URL http do backend
 * quando a área de mesmo id guarda o upload da mesma imagem; senão a área fica sem logo.
 */
function resolvePendingLogos(
  local: MockupDraftData,
  backend: MockupDraftData | null,
): MockupDraftData {
  return {
    ...local,
    personalizationAreas: local.personalizationAreas.map((a) => {
      if (!a.logoPreview?.startsWith(LOGO_PENDING_PREFIX)) return a;
      const fp = a.logoPreview.slice(LOGO_PENDING_PREFIX.length);
      const uploaded = backend?.personalizationAreas.find((ba) => ba.id === a.id)?.logoPreview;
      const match = uploaded?.startsWith('http') && uploaded.includes(`-${fp}.`) ? uploaded : null;
      if (!match) {
        logger.warn('[useMockupDraft] logo do rascunho local não chegou ao backend', {
          areaId: a.id,
        });
      }
      return { ...a, logoPreview: match };
    }),
  };
}

export interface MockupDraftData {
  productId: string | null;
  productName: string | null;
  techniqueId: string | null;
  techniqueName: string | null;
  clientId: string | null;
  clientName: string | null;
  personalizationAreas: PersonalizationArea[];
  updatedAt: string;
  /**
   * Seleção exata do vendedor (variante + foto) para remontar a seleção ao
   * reabrir o rascunho. `mockup_drafts` não tem coluna para isso e o schema
   * está congelado (REGRA #8), então o campo viaja só na cópia local do
   * rascunho — como a logo em data-URL — e é re-hidratado do localStorage
   * quando o registro do backend vence a checagem de recência.
   */
  selection?: MockupSelectionSnapshot | null;
}

interface UseMockupDraftOptions {
  draftKey?: string;
}

export function useMockupDraft(options: UseMockupDraftOptions = {}) {
  const { draftKey = 'default' } = options;
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // data: URL -> upload (Promise) ao bucket. Guardar a Promise, e não o resultado,
  // faz dois autosaves simultâneos compartilharem um único upload da mesma logo.
  const uploadedLogosRef = useRef<Map<string, Promise<string | null>>>(new Map());
  const fingerprintsRef = useRef<Map<string, string>>(new Map());
  // Ordem dos saves: um save superado por outro mais novo não grava, e os upserts
  // são encadeados para que o mais antigo nunca chegue depois do mais novo.
  const saveSeqRef = useRef(0);
  const upsertChainRef = useRef<Promise<void>>(Promise.resolve());

  const fingerprintOf = useCallback((dataUrl: string): string => {
    let fp = fingerprintsRef.current.get(dataUrl);
    if (!fp) {
      fp = logoFingerprint(dataUrl);
      fingerprintsRef.current.set(dataUrl, fp);
    }
    return fp;
  }, []);

  const saveToLocal = useCallback(
    (data: MockupDraftData) => {
      try {
        const key = `${LOCAL_STORAGE_KEY}_${user?.id || 'anonymous'}_${draftKey}`;
        // BUG-DRAFT-LOCAL-STORAGE-QUOTA FIX: strip data URL logos before writing to
        // localStorage — a single 5MB upload encodes to ~7MB base64 which easily
        // blows the 5-10MB per-origin quota and causes a silent DOMException.
        // Only keep http(s) URLs (already-uploaded logos); a data: URL becomes a
        // pending marker that loadDraft resolves against the backend upload.
        const safeData: MockupDraftData = {
          ...data,
          personalizationAreas: data.personalizationAreas.map((a) => {
            const preview = a.logoPreview;
            if (preview?.startsWith('http')) return a;
            if (preview?.startsWith('data:')) {
              return { ...a, logoPreview: `${LOGO_PENDING_PREFIX}${fingerprintOf(preview)}` };
            }
            return { ...a, logoPreview: null };
          }),
        };
        localStorage.setItem(key, JSON.stringify(safeData));
      } catch (err) {
        logger.error('Erro ao salvar no localStorage:', err);
      }
    },
    [user?.id, draftKey, fingerprintOf],
  );

  const loadFromLocal = useCallback((): MockupDraftData | null => {
    try {
      const key = `${LOCAL_STORAGE_KEY}_${user?.id || 'anonymous'}_${draftKey}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      logger.error('Erro ao carregar do localStorage:', err);
    }
    return null;
  }, [user?.id, draftKey]);

  // BUG-A FIX: removed 3 FK pre-validation queries (product, technique, client).
  // These fired on every auto-save (every 2s during active editing), generating
  // ~90 unnecessary SELECT queries per 5 minutes of work.
  // The upsert's 23503 fallback handles FK violations gracefully.
  const saveToBackend = useCallback(
    async (data: MockupDraftData): Promise<boolean> => {
      if (!user) return false;

      const seq = ++saveSeqRef.current;
      let releaseChain: () => void = () => undefined;
      setIsSaving(true);
      setError(null);

      try {
        // Logo recém-enviada é data: URL — sobe ao bucket de logos do fluxo normal e
        // guarda só a URL http no rascunho (nunca base64 na linha do banco).
        let logoUploadFailed = false;
        const areasWithLogos = await Promise.all(
          data.personalizationAreas.map(async (a, areaIndex) => {
            const preview = a.logoPreview;
            if (!preview) return { ...a, logoPreview: null };
            if (preview.startsWith('http')) return a;
            if (!preview.startsWith('data:')) return { ...a, logoPreview: null };
            const cached = uploadedLogosRef.current.get(preview);
            const upload: Promise<string | null> =
              cached ??
              uploadLogoToStorage(user.id, preview, `draft-${draftKey}-${fingerprintOf(preview)}`);
            if (!cached) uploadedLogosRef.current.set(preview, upload);
            let url: string | null = null;
            let uploadError: unknown = null;
            try {
              url = await upload;
            } catch (err: unknown) {
              uploadError = err;
            }
            if (!url) {
              // Falha não fica no cache: o próximo autosave tenta de novo.
              if (uploadedLogosRef.current.get(preview) === upload) {
                uploadedLogosRef.current.delete(preview);
              }
              logoUploadFailed = true;
              logger.warn('[useMockupDraft] upload da logo do rascunho falhou', {
                draftKey,
                areaIndex,
                areaId: a.id,
                error: uploadError,
              });
            }
            return { ...a, logoPreview: url };
          }),
        );

        // logo_data só leva a logo da 1ª área: loadFromBackend a usa para preencher
        // areas[0], então gravar a logo de outra área aqui a poria na área errada.
        const safeLogoData = areasWithLogos[0]?.logoPreview ?? null;

        // BUG-A FIX: IDs used directly — no pre-validation queries.
        // FK violations are caught below and handled via fallback.
        const safeProductId: string | null = data.productId ?? null;
        const safeTechniqueId: string | null = data.techniqueId ?? null;
        const safeClientId: string | null = data.clientId ?? null;

        const payload = {
          user_id: user.id,
          draft_key: draftKey,
          product_id: safeProductId,
          product_name: data.productName,
          technique_id: safeTechniqueId,
          technique_name: data.techniqueName,
          client_id: safeClientId,
          client_name: data.clientName,
          personalization_areas: areasWithLogos as unknown as Json,
          logo_data: safeLogoData,
          updated_at: new Date().toISOString(),
        };

        // Um save mais novo começou enquanto este subia a logo: ele grava o estado
        // atual; gravar este só sobrescreveria o rascunho com dados velhos.
        // A cadeia garante que a gravação (inclusive o fallback FK) de um save
        // termina antes da do save seguinte começar.
        await upsertChainRef.current;
        if (seq !== saveSeqRef.current) return false;
        upsertChainRef.current = new Promise<void>((resolve) => {
          releaseChain = resolve;
        });

        const { error: upsertError } = await supabase
          .from('mockup_drafts')
          .upsert(payload, { onConflict: 'user_id,draft_key' });

        if (upsertError) {
          if (upsertError.code === '23503') {
            logger.warn('[useMockupDraft] FK violation on draft save — falling back to null IDs.', {
              productId: safeProductId,
              techniqueId: safeTechniqueId,
              clientId: safeClientId,
            });
            // BUG-17 FIX: was `.update()` — silently wrote 0 rows on first-ever
            // save (no row exists yet), while still calling setLastSaved and
            // returning true. Using `.upsert()` guarantees the row is created
            // even when the FK-violating draft has never been persisted before.
            const { error: updateError } = await supabase.from('mockup_drafts').upsert(
              {
                user_id: payload.user_id,
                draft_key: payload.draft_key,
                product_name: payload.product_name,
                technique_name: payload.technique_name,
                client_name: payload.client_name,
                personalization_areas: payload.personalization_areas,
                logo_data: payload.logo_data,
                updated_at: payload.updated_at,
                product_id: null,
                technique_id: null,
                client_id: null,
              },
              { onConflict: 'user_id,draft_key' },
            );

            if (updateError) throw updateError;
          } else {
            throw upsertError;
          }
        }

        setLastSaved(new Date());
        // A logo que não subiu não pode sumir do rascunho em silêncio.
        setError(logoUploadFailed ? LOGO_UPLOAD_ERROR : null);
        return true;
      } catch (err: unknown) {
        logger.error('Erro ao salvar rascunho no backend:', err);
        setError(err instanceof Error ? err.message : 'Erro ao salvar rascunho');
        return false;
      } finally {
        releaseChain();
        if (seq === saveSeqRef.current) setIsSaving(false);
      }
    },
    [user, draftKey, fingerprintOf],
  );

  const loadFromBackend = useCallback(async (): Promise<MockupDraftData | null> => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('mockup_drafts')
        .select('*')
        .eq('user_id', user.id)
        .eq('draft_key', draftKey)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const isAreaRecord = (item: unknown): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !Array.isArray(item);
        const numberOrNull = (value: unknown): number | null =>
          typeof value === 'number' && Number.isFinite(value) ? value : null;
        // jsonb aceita qualquer forma: um campo numerico pode voltar como texto
        // de uma linha antiga. Sem isto, 'bad' chega a geometria da logo.
        const numberOr = (value: unknown, fallback: number): number =>
          typeof value === 'number' && Number.isFinite(value) ? value : fallback;
        const areas = Array.isArray(data.personalization_areas)
          ? (data.personalization_areas as unknown[]).filter(isAreaRecord).map((a) => {
              return {
                id: (a.id as string | undefined) || crypto.randomUUID(),
                name: (a.name as string | undefined) || 'Frente',
                positionX: numberOr(a.positionX, 50),
                positionY: numberOr(a.positionY, 50),
                logoWidth: numberOr(a.logoWidth, 5),
                logoHeight: numberOr(a.logoHeight, 3),
                logoRotation: numberOr(a.logoRotation, 0),
                logoScale: numberOr(a.logoScale, 100),
                logoPreview: (a.logoPreview as string | undefined) || null,
                // O save grava a área inteira (spread `...a`); a leitura precisa
                // devolver os limites de gravação, ou o rodapé do AreaCard e a
                // validação de encaixe da logo somem ao reabrir o rascunho.
                maxWidthCm: numberOrNull(a.maxWidthCm),
                maxHeightCm: numberOrNull(a.maxHeightCm),
                maxColors: numberOrNull(a.maxColors),
                isCurved: a.isCurved === true,
                // PersonalizationArea declara techniquesAvailable?: number (sem null)
                techniquesAvailable: numberOrNull(a.techniquesAvailable) ?? undefined,
              };
            })
          : [];

        if (data.logo_data && areas.length > 0 && !areas[0].logoPreview) {
          areas[0].logoPreview = data.logo_data;
        }

        return {
          productId: data.product_id,
          productName: data.product_name,
          techniqueId: data.technique_id,
          techniqueName: data.technique_name,
          clientId: data.client_id,
          clientName: data.client_name,
          personalizationAreas: areas,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      logger.error('Erro ao carregar rascunho do backend:', err);
    }
    return null;
  }, [user, draftKey]);

  const saveDraft = useCallback(
    (data: MockupDraftData) => {
      saveToLocal(data);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveToBackend(data);
      }, AUTO_SAVE_DELAY);
    },
    [saveToLocal, saveToBackend],
  );

  const loadDraft = useCallback(async (): Promise<MockupDraftData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const [localData, backendData] = await Promise.all([
        Promise.resolve(loadFromLocal()),
        loadFromBackend(),
      ]);

      // Pareamento de logo SÓ por id de área e SÓ para marcador de logo pendente
      // (a mesma imagem, pela impressão digital). Logo ausente (null) nunca é
      // preenchida pelo outro lado: é assim que uma logo removida pelo usuário
      // não volta e que uma área nova não herda a logo de outra área.
      // (O antigo re-hydrate local→backend por índice saiu: o local não guarda mais
      // data: URL, só URL http — que o backend já tem — ou o marcador pendente.)
      const local = localData ? resolvePendingLogos(localData, backendData) : null;

      if (local && backendData) {
        const localDate = new Date(local.updatedAt || 0);
        const backendDate = new Date(backendData.updatedAt || 0);
        // Desempate IDÊNTICO ao anterior (`backendDate > localDate ? backend : local`):
        // com data inválida em qualquer ponta a comparação é falsa e a cópia LOCAL
        // vence — quem está na frente do vendedor não é descartado por um updatedAt
        // que não parseia.
        if (!(backendDate > localDate)) return local;
        // Mesma razão das logos acima: `selection` não existe em mockup_drafts
        // (schema congelado), então a seleção (variante + foto) continua vindo
        // da cópia local quando o backend vence a recência — SÓ quando as duas
        // pontas falam do MESMO produto. Backend mais novo com outro produto
        // (vendedor trocou de produto em outro dispositivo) descarta a seleção
        // local: colar variante/foto do produto antigo no produto novo faria o
        // mockup ser GERADO sobre a foto errada (getProductImage → edge).
        const sameProduct = !!local.productId && local.productId === backendData.productId;
        return local.selection && sameProduct
          ? { ...backendData, selection: local.selection }
          : backendData;
      }

      return backendData || local;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar rascunho');
      const fallback = loadFromLocal();
      return fallback ? resolvePendingLogos(fallback, null) : null;
    } finally {
      setIsLoading(false);
    }
  }, [loadFromLocal, loadFromBackend]);

  const clearDraft = useCallback(async () => {
    // BUG-1 FIX: cancel pending debounced save BEFORE clearing storage — otherwise
    // a 2s timer started by the last saveDraft() call would re-create the draft
    // row/localStorage entry immediately after we delete it (race condition).
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // B F-10 FIX: cancelar o temporizador não alcança um save JÁ em voo (timer
    // disparado, logo subindo ou upsert enviado) — ele resolveria depois do delete
    // e recriaria a linha, fazendo o rascunho reaparecer. O delete entra na mesma
    // ordem dos saves: o bump de saveSeqRef supera quem ainda não gravou
    // (saveToBackend desiste em `seq !== saveSeqRef.current`) e aguardar a cadeia
    // espera o upsert que já está no ar. Assim o delete é a ÚLTIMA escrita.
    const clearSeq = ++saveSeqRef.current;
    let releaseChain: () => void = () => undefined;
    await upsertChainRef.current;
    upsertChainRef.current = new Promise<void>((resolve) => {
      releaseChain = resolve;
    });

    try {
      try {
        const key = `${LOCAL_STORAGE_KEY}_${user?.id || 'anonymous'}_${draftKey}`;
        localStorage.removeItem(key);
      } catch (err) {
        logger.error('Erro ao limpar localStorage:', err);
      }

      if (user) {
        try {
          const { error: deleteError } = await supabase
            .from('mockup_drafts')
            .delete()
            .eq('user_id', user.id)
            .eq('draft_key', draftKey);
          if (deleteError) throw deleteError;
        } catch (err) {
          logger.error('Erro ao limpar rascunho do backend:', err);
        }
      }

      setLastSaved(null);
    } finally {
      releaseChain();
      // O save superado não limpa `isSaving` (a guarda de seq é dele), então o
      // clear que o superou desliga o indicador — a menos que já exista um save
      // mais novo, que cuidará do próprio estado.
      if (clearSeq === saveSeqRef.current) setIsSaving(false);
    }
  }, [user, draftKey]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    isSaving,
    isLoading,
    lastSaved,
    error,
  };
}
