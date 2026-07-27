import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { MagazineRowShape } from '@/integrations/supabase/magazine-schema';
type T1 = { Row: MagazineRowShape; Insert: Partial<MagazineRowShape>; Update: Partial<MagazineRowShape>; Relationships: [] };
type DB1 = Omit<Database,'public'> & { public: Omit<Database['public'],'Tables'> & { Tables: Database['public']['Tables'] & { magz: T1 } } };
declare const c: SupabaseClient<DB1>;
export const q2 = c.from('magz').insert({ title: 'a' });
