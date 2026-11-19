import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Linha de `category_icons`. Todas as colunas sao nullable no schema real
 * (src/integrations/supabase/types.ts, bloco `category_icons`): declarar `string`
 * aqui era um buraco de tipo que fazia `getCategoryIcon` devolver `null` com
 * assinatura `string`. Quem le trata ausencia; nada e inventado.
 */
export interface CategoryIcon {
  id: string | null;
  category_name: string | null;
  icon: string | null;
  description?: string | null;
}

export function useCategoryIcons() {
  return useQuery<CategoryIcon[]>({
    queryKey: ['category-icons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_icons')
        .select('id, category_name, icon, description')
        .eq('is_active', true);
      if (error) throw new Error(`Failed to fetch category icons: ${error.message}`);
      return data ?? [];
    },
    staleTime: 30 * 60 * 1000,
  });
}
