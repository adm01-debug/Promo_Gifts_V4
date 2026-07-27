import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
declare const c: SupabaseClient<Database>;
export const q = c.from('quotes').insert({ id: 'x' } as never);
declare const d: SupabaseClient<Omit<Database,'public'> & { public: Database['public'] }>;
export const q2 = d.from('quotes').insert({ id: 'x' } as never);
