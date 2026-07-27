import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
type T1 = { Row: { id: string }; Insert: { id?: string }; Update: { id?: string }; Relationships: [] };
type DB1 = Omit<Database,'public'> & { public: Omit<Database['public'],'Tables'> & { Tables: Database['public']['Tables'] & { magz: T1 } } };
declare const c: SupabaseClient<DB1>;
export const q2 = c.from('magz').insert({ id: 'a' });
