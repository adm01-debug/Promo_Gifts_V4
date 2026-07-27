import type { SupabaseClient } from '@supabase/supabase-js';
import type { MagazineDatabase } from '@/integrations/supabase/magazine-schema';
declare const c: SupabaseClient<MagazineDatabase>;
export const q = c.from('quotes').insert({ id: 'x' } as never);
export const q2 = c.from('magazines').insert({ owner_id: 'a', title: 'b' });
