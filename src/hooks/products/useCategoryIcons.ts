import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryIcon {
  id: string;
  category_name: string;
  icon: string;
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
      return (data || []) as CategoryIcon[];
    },
    staleTime: 30 * 60 * 1000,
  });
}
