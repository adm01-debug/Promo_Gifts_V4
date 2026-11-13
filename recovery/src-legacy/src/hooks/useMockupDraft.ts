import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type PersonalizationArea } from '@/components/mockup/MultiAreaManager';
import type { TablesInsert } from '@/integrations/supabase/types';
import { serializeJsonValue } from '@/lib/json-value';

const LOCAL_STORAGE_KEY = 'mockup_draft_v1';
const AUTO_SAVE_DELAY = 2000; // 2 segundos de debounce

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeAreas(value: unknown): PersonalizationArea[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((area) => ({
    ...area,
    id: typeof area.id === 'string' && area.id ? area.id : crypto.randomUUID(),
    name: typeof area.name === 'string' && area.name ? area.name : 'Frente',
    positionX: finiteNumber(area.positionX, 50),
    positionY: finiteNumber(area.positionY, 50),
    logoWidth: finiteNumber(area.logoWidth, 5),
    logoHeight: finiteNumber(area.logoHeight, 3),
    logoRotation: finiteNumber(area.logoRotation, 0),
    logoScale: finiteNumber(area.logoScale, 100),
    logoPreview: optionalText(area.logoPreview),
    logoFile: null,
    maxWidthCm: optionalFiniteNumber(area.maxWidthCm),
    maxHeightCm: optionalFiniteNumber(area.maxHeightCm),
    maxColors: optionalFiniteNumber(area.maxColors),
    isCurved: typeof area.isCurved === 'boolean' ? area.isCurved : undefined,
    techniquesAvailable: optionalFiniteNumber(area.techniquesAvailable) ?? undefined,
  }));
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

  // Salvar no localStorage (imediato)
  const saveToLocal = useCallback(
    (data: MockupDraftData) => {
      try {
        const key = `${LOCAL_STORAGE_KEY}_${user?.id || 'anonymous'}_${draftKey}`;
        localStorage.setItem(key, JSON.stringify(data));
      } catch (err) {
        console.error('Erro ao salvar no localStorage:', err);
      }
    },
    [user?.id, draftKey],
  );

  // Carregar do localStorage
  const loadFromLocal = useCallback((): MockupDraftData | null => {
    try {
      const key = `${LOCAL_STORAGE_KEY}_${user?.id || 'anonymous'}_${draftKey}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (!isRecord(parsed)) return null;
        return {
          productId: optionalText(parsed.productId),
          productName: optionalText(parsed.productName),
          techniqueId: optionalText(parsed.techniqueId),
          techniqueName: optionalText(parsed.techniqueName),
          clientId: optionalText(parsed.clientId),
          clientName: optionalText(parsed.clientName),
          personalizationAreas: normalizeAreas(parsed.personalizationAreas),
          updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
        };
      }
    } catch (err) {
      console.error('Erro ao carregar do localStorage:', err);
    }
    return null;
  }, [user?.id, draftKey]);

  // Salvar no backend (debounced)
  const saveToBackend = useCallback(
    async (data: MockupDraftData): Promise<boolean> => {
      if (!user) return false;

      setIsSaving(true);
      setError(null);

      try {
        // Strip base64 logos from areas to prevent JSONB size overflow
        // Logos are preserved in localStorage only
        const areasWithoutLogos = data.personalizationAreas.map((a) => ({
          ...a,
          logoPreview: null, // Don't persist huge base64 in DB
        }));

        // Only persist URL references in logo_data (never base64)
        const firstLogo = data.personalizationAreas.find((a) => a.logoPreview)?.logoPreview || null;
        const safeLogoData = firstLogo?.startsWith('http') ? firstLogo : null;

        // These are external TEXT references without foreign keys in mockup_drafts.
        const payload: TablesInsert<'mockup_drafts'> = {
          user_id: user.id,
          draft_key: draftKey,
          product_id: optionalText(data.productId),
          product_name: data.productName,
          technique_id: optionalText(data.techniqueId),
          technique_name: data.techniqueName,
          client_id: optionalText(data.clientId),
          client_name: data.clientName,
          personalization_areas: serializeJsonValue(areasWithoutLogos) ?? [],
          logo_data: safeLogoData,
          updated_at: new Date().toISOString(),
        };

        // Try upsert first
        const { error: upsertError } = await supabase
          .from('mockup_drafts')
          .upsert(payload, { onConflict: 'user_id,draft_key' });

        if (upsertError) {
          // If FK violation or conflict, try update-only as fallback
          if (upsertError.code === '23503' || upsertError.code === '409') {
            const {
              product_id: _pid,
              technique_id: _tid,
              client_id: _cid,
              ...safePayload
            } = payload;
            const { error: updateError } = await supabase
              .from('mockup_drafts')
              .update({
                ...safePayload,
                product_id: null,
                technique_id: null,
                client_id: null,
              })
              .eq('user_id', user.id)
              .eq('draft_key', draftKey);

            if (updateError) throw updateError;
          } else {
            throw upsertError;
          }
        }

        setLastSaved(new Date());
        setError(null);
        return true;
      } catch (err: unknown) {
        console.error('Erro ao salvar rascunho no backend:', err);
        setError(err instanceof Error ? err.message : 'Erro ao salvar rascunho');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user, draftKey],
  );

  // Carregar do backend
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
        const areas = normalizeAreas(data.personalization_areas);

        // Restaurar logo do campo logo_data se não estiver nas áreas
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
      console.error('Erro ao carregar rascunho do backend:', err);
    }
    return null;
  }, [user, draftKey]);

  // Auto-save híbrido (local imediato + backend debounced)
  const saveDraft = useCallback(
    (data: MockupDraftData) => {
      // Salva imediatamente no localStorage
      saveToLocal(data);

      // Cancela timeout anterior
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Agenda salvamento no backend (debounced)
      saveTimeoutRef.current = setTimeout(() => {
        saveToBackend(data);
      }, AUTO_SAVE_DELAY);
    },
    [saveToLocal, saveToBackend],
  );

  // Carregar rascunho (prioriza backend se mais recente)
  const loadDraft = useCallback(async (): Promise<MockupDraftData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const [localData, backendData] = await Promise.all([
        Promise.resolve(loadFromLocal()),
        loadFromBackend(),
      ]);

      // Prioriza o mais recente
      if (localData && backendData) {
        const localDate = new Date(localData.updatedAt || 0);
        const backendDate = new Date(backendData.updatedAt || 0);
        return backendDate > localDate ? backendData : localData;
      }

      return backendData || localData;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar rascunho');
      // Fallback para localStorage em caso de erro
      return loadFromLocal();
    } finally {
      setIsLoading(false);
    }
  }, [loadFromLocal, loadFromBackend]);

  // Limpar rascunho
  const clearDraft = useCallback(async () => {
    // Limpa localStorage
    try {
      const key = `${LOCAL_STORAGE_KEY}_${user?.id || 'anonymous'}_${draftKey}`;
      localStorage.removeItem(key);
    } catch (err) {
      console.error('Erro ao limpar localStorage:', err);
    }

    // Limpa backend
    if (user) {
      try {
        await supabase
          .from('mockup_drafts')
          .delete()
          .eq('user_id', user.id)
          .eq('draft_key', draftKey);
      } catch (err) {
        console.error('Erro ao limpar rascunho do backend:', err);
      }
    }

    setLastSaved(null);
  }, [user, draftKey]);

  // Limpar timeout ao desmontar
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
