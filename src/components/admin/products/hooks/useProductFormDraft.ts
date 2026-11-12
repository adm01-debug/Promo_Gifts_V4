/**
 * useProductFormDraft — Auto-save / restore form drafts from localStorage
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { type UseFormSetValue, type Path, type PathValue } from 'react-hook-form';
import { toast } from 'sonner';
import type { ProductFormData } from '../ProductFormSchema';

export function useProductFormDraft(
  productId: string | undefined,
  setValue: UseFormSetValue<ProductFormData>,
  formValues: ProductFormData,
  images: string[],
  stepIndex: number,
  setImages: (imgs: string[]) => void,
  setStepIndex: (i: number) => void,
  isDirty: boolean,
  initialUpdatedAt?: string | null,
) {
  const DRAFT_KEY = `product-draft-${productId || 'new'}`;
  const draftRestoredRef = useRef(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Restore draft on mount (only once)
  useEffect(() => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        formData: Partial<ProductFormData>;
        images: string[];
        stepIndex: number;
        savedAt: number;
      };
      const updatedAtMs = initialUpdatedAt ? Date.parse(initialUpdatedAt) : NaN;
      if (
        Date.now() - draft.savedAt > 24 * 60 * 60 * 1000 ||
        (!Number.isNaN(updatedAtMs) && draft.savedAt < updatedAtMs)
      ) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      const keys = Object.keys(draft.formData) as (keyof ProductFormData)[];
      keys.forEach((key) => {
        const val = draft.formData[key];
        if (val !== undefined) {
          setValue(
            key as Path<ProductFormData>,
            val as PathValue<ProductFormData, Path<ProductFormData>>,
          );
        }
      });
      if (draft.images?.length) setImages(draft.images);
      if (typeof draft.stepIndex === 'number') setStepIndex(draft.stepIndex);
      setHasDraft(true);
    } catch {
      /* ignore corrupt drafts */
    }
  }, [DRAFT_KEY, setValue, setImages, setStepIndex, initialUpdatedAt]);

  // Show draft restored notification
  useEffect(() => {
    if (!hasDraft) return;
    toast.info('Rascunho restaurado', {
      description: 'Seus dados não salvos foram recuperados automaticamente.',
      action: {
        label: 'Descartar',
        onClick: () => {
          localStorage.removeItem(DRAFT_KEY);
          window.location.reload();
        },
      },
      duration: 8000,
    });
  }, [hasDraft, DRAFT_KEY]);

  // Save draft with debounce (2s)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baselineRef = useRef<string | null>(null);
  const latestSnapshotRef = useRef<string | null>(null);
  const wroteDraftRef = useRef(false);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const snapshot = JSON.stringify({ formValues, images });
    latestSnapshotRef.current = snapshot;
    if (baselineRef.current === null) baselineRef.current = snapshot;
    if (!isDirty && snapshot === baselineRef.current) {
      // Edição desfeita: o rascunho gravado nesta sessão não pode reviver o valor desfeito.
      if (wroteDraftRef.current) {
        wroteDraftRef.current = false;
        localStorage.removeItem(DRAFT_KEY);
      }
      return;
    }
    saveTimerRef.current = setTimeout(() => {
      if (!formValues.name && !formValues.sku) return;
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ formData: formValues, images, stepIndex, savedAt: Date.now() }),
        );
        wroteDraftRef.current = true;
      } catch {
        /* quota exceeded */
      }
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [formValues, images, stepIndex, DRAFT_KEY, isDirty]);

  const clearDraft = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    baselineRef.current = latestSnapshotRef.current;
    localStorage.removeItem(DRAFT_KEY);
  }, [DRAFT_KEY]);

  return { clearDraft };
}
