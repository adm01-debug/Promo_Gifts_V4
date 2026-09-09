/** Magazine editor: serial writes, metadata-only autosave and explicit failures. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { magazineService } from '@/services/magazineService';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Magazine,
  MagazineClientBranding,
  MagazineContentSettings,
  MagazineItem,
  MagazinePageOrder,
  MagazineTemplateId,
} from '@/types/magazine';
import type { Product } from '@/types/product-catalog';
import { validateBranding } from '@/lib/security/magazine-guard';
import { EditorPersistence, type EditorPatch } from './editorPersistence';

export function useMagazineEditor(id: string | undefined) {
  const { user } = useAuth();
  const [magazine, setMagazine] = useState<Magazine | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [brandingErrors, setBrandingErrors] = useState<string[]>([]);
  const session = useRef<EditorPersistence | null>(null);

  useEffect(() => {
    let active = true;
    session.current = null;
    setMagazine(null);
    setLoaded(false);
    setSaving(false);
    setDirty(false);
    setSaveError(null);
    setLoadError(null);
    setBrandingErrors([]);
    if (!id) {
      setLoaded(true);
      return;
    }
    void magazineService
      .get(id)
      .then((fetched) => {
        if (!active) return;
        if (fetched) {
          const current = new EditorPersistence(
            fetched,
            (key, patch) => magazineService.update(key, patch),
            () => {
              if (!active || session.current !== current) return;
              setMagazine(current.magazine);
              setSaving(current.saving);
              setDirty(current.dirty);
              setSaveError(current.error);
            },
          );
          session.current = current;
        }
        setMagazine(fetched);
      })
      .catch(() => {
        if (active)
          setLoadError(
            'Não foi possível carregar a revista. Verifique a conexão e tente novamente.',
          );
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      const previous = session.current;
      previous?.cancelTimer();
      // Best effort on SPA unmount; browser termination cannot await this.
      // Explicit actions use flushSave and failures remain blocking there.
      if (previous?.dirty) void previous.flush().catch(() => undefined);
    };
  }, [id, user?.id]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!session.current?.dirty && !session.current?.error) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // CRITICAL FIX: EditorPersistence.edit updates its snapshot immediately,
  // before React batches setState. Never replace this with effect-only ref sync.
  const persist = useCallback((patch: EditorPatch) => session.current?.edit(patch), []);
  const flushSave = useCallback(async () => {
    const current = session.current;
    if (!current) throw new Error('A revista ainda não foi carregada.');
    await current.flush();
  }, []);
  const setTitle = useCallback((title: string) => persist({ title }), [persist]);
  const setSubtitle = useCallback((subtitle: string) => persist({ subtitle }), [persist]);
  const setTemplate = useCallback(
    (templateId: MagazineTemplateId) => persist({ templateId }),
    [persist],
  );
  const setBranding = useCallback(
    (patch: Partial<MagazineClientBranding>) => {
      const current = session.current?.magazine;
      if (!current) return;
      const merged = {
        ...current.branding,
        ...patch,
        colors: patch.colors
          ? { ...current.branding.colors, ...patch.colors }
          : current.branding.colors,
      };
      const { isValid, errors, sanitized } = validateBranding(merged);
      if (!isValid) {
        setBrandingErrors(errors);
        return;
      }
      setBrandingErrors([]);
      persist({ branding: { ...merged, ...sanitized } });
    },
    [persist],
  );
  const setContent = useCallback(
    (patch: Partial<MagazineContentSettings>) => {
      const current = session.current?.magazine;
      if (current) persist({ content: { ...current.content, ...patch } });
    },
    [persist],
  );
  const setPageOrder = useCallback(
    (pageOrder: MagazinePageOrder) => persist({ pageOrder }),
    [persist],
  );
  const mutate = useCallback(async (action: (key: string) => Promise<Magazine | null>) => {
    const current = session.current;
    if (!current) throw new Error('A revista ainda não foi carregada.');
    return current.mutate(action);
  }, []);
  const addProducts = useCallback(
    async (products: Product[]) => {
      await mutate((key) => magazineService.addProducts(key, products));
    },
    [mutate],
  );
  const removeItem = useCallback(
    async (itemId: string) => {
      await mutate((key) => magazineService.removeItem(key, itemId));
    },
    [mutate],
  );
  const reorderItems = useCallback(
    (orderedIds: string[]) => mutate((key) => magazineService.reorderItems(key, orderedIds)),
    [mutate],
  );
  const updateItem = useCallback(
    async (itemId: string, patch: Partial<MagazineItem>) => {
      await mutate((key) => magazineService.updateItem(key, itemId, patch));
    },
    [mutate],
  );
  const publish = useCallback(() => mutate((key) => magazineService.publish(key)), [mutate]);
  const unpublish = useCallback(async () => {
    await mutate((key) => magazineService.unpublish(key));
  }, [mutate]);

  return {
    magazine,
    loaded,
    saving,
    dirty,
    saveError,
    loadError,
    flushSave,
    isOwner: Boolean(magazine && magazine.ownerId === user?.id),
    setTitle,
    setSubtitle,
    setTemplate,
    setBranding,
    brandingErrors,
    setContent,
    setPageOrder,
    addProducts,
    removeItem,
    reorderItems,
    updateItem,
    publish,
    unpublish,
  };
}
