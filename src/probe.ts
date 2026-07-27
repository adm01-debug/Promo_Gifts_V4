import type { SupabaseClient } from '@supabase/supabase-js';
import type { MagazineDatabase } from '@/integrations/supabase/magazine-schema';
type C = SupabaseClient<MagazineDatabase>;
declare const c: C;
const q = c.from('magazines').insert({ owner_id: 'x', title: 't' });
export type Q = typeof q;
