/**
 * useTemplateSnapshot — Captura o estado atual do Kit Builder e persiste como kit_template (admin).
 * Útil para "Salvar como template do sistema" diretamente do builder.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/security/sanitize-error';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import type { KitState } from '@/lib/kit-builder';

export interface SnapshotInput {
  kitState: KitState;
  templateId?: string;
  category?: string;
  overrideName?: string;
}

/**
 * Removes the private draft envelope before a snapshot becomes a shared
 * system template. CRM identifiers and contact details belong to the seller's
 * draft and must never cross that publication boundary.
 */
export function buildTemplatePersonalizationSnapshot(
  personalization: KitState['personalization'],
): KitState['personalization'] {
  const snapshot = structuredClone(personalization) as KitState['personalization'] & {
    __draft?: unknown;
  };
  delete snapshot.__draft;
  return snapshot;
}

export function useTemplateSnapshot() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ kitState, templateId, category, overrideName }: SnapshotInput) => {
      const identity = kitState.identity;
      const payload = {
        name: overrideName || kitState.name || 'Template sem nome',
        description: identity?.description ?? null,
        category: category || 'Geral',
        color: identity?.color ?? '#3B82F6',
        icon: identity?.icon ?? 'Package',
        tag: identity?.tag ?? null,
        box_data: kitState.box ? structuredClone(kitState.box) : null,
        items_data: structuredClone(kitState.items),
        personalization_data: buildTemplatePersonalizationSnapshot(kitState.personalization),
        total_price: kitState.totalPrice,
        volume_usage_percent: kitState.volumeUsagePercent,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (templateId) {
        const { data, error } = await supabase
          .from('kit_templates')
          .update(payload as unknown as TablesUpdate<'kit_templates'>)
          .eq('id', templateId)
          .select()
          .single();
        if (error || !data) throw error ?? new Error('Template not found');
        return data;
      }
      const { data, error } = await supabase
        .from('kit_templates')
        .insert(payload as unknown as TablesInsert<'kit_templates'>)
        .select()
        .single();
      if (error || !data) throw error ?? new Error('Failed to create template');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kit-templates'] });
      queryClient.invalidateQueries({ queryKey: ['kit-templates'] });
      toast.success('Template do sistema salvo!');
    },
    onError: (err: Error) =>
      toast.error('Erro ao salvar template', { description: sanitizeError(err) }),
  });

  return {
    saveAsTemplate: mutation.mutateAsync,
    isSavingTemplate: mutation.isPending,
  };
}
