import type { GenericSchema } from '@supabase/postgrest-js/dist/cjs/types';
import type { MagazineDatabase } from '@/integrations/supabase/magazine-schema';
type A = MagazineDatabase['public'] extends GenericSchema ? true : false;
export const a: A = true;
