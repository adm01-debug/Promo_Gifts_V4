/**
 * magazine-schema — contrato TypeScript local das tabelas `magazine_*`.
 *
 * Por que este arquivo existe:
 * `src/integrations/supabase/types.ts` é auto-gerado e, em 2026-07-16, uma
 * regeneração (commit 7716ae9) removeu TODAS as tabelas `magazine_*` do tipo
 * `Database`, causando 130+ erros TS em `magazineService.ts` (REGRA #4 do
 * CLAUDE.md). Como o arquivo auto-gerado pode ser sobrescrito a qualquer
 * momento pelo builder, ele NÃO é um lugar seguro para restaurar o contrato à
 * mão — a correção decairia no próximo deploy.
 *
 * Solução: declarar aqui o subconjunto de schema que o app realmente usa e
 * expor um client tipado (`magazineDb`) para as queries do módulo de revistas.
 * O runtime é exatamente o mesmo client (`@/integrations/supabase/client`);
 * apenas a visão de tipos muda. Se/quando o `types.ts` voltar a conter as
 * tabelas, este módulo pode ser removido sem mudança de comportamento.
 *
 * Fonte da verdade das colunas: BD Gold `doufsxqlfjyuvxuezpln`
 * (migrações `supabase/migrations/*magazine*`). Qualquer divergência deve ser
 * corrigida AQUI, nunca no `types.ts`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface MagazineRowShape {
  archived_at: string | null;
  branding: Json;
  content_settings: Json;
  created_at: string;
  deleted_at: string | null;
  id: string;
  organization_id: string | null;
  owner_id: string;
  page_order: Json;
  public_token: string | null;
  published_at: string | null;
  status: string;
  subtitle: string | null;
  template_id: string;
  title: string;
  updated_at: string;
  view_count: number | null;
}

export interface MagazineItemRowShape {
  created_at: string;
  id: string;
  magazine_id: string;
  overrides: Json;
  page_number: number | null;
  position: number;
  product_id: string;
  product_snapshot: Json;
  updated_at: string;
  variant_color_name: string | null;
}

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Colunas geradas pelo BD (default/trigger) são opcionais no INSERT. */
type MagazineInsertShape = Optional<
  MagazineRowShape,
  | 'archived_at'
  | 'branding'
  | 'content_settings'
  | 'created_at'
  | 'deleted_at'
  | 'id'
  | 'organization_id'
  | 'page_order'
  | 'public_token'
  | 'published_at'
  | 'status'
  | 'subtitle'
  | 'template_id'
  | 'updated_at'
  | 'view_count'
>;

type MagazineItemInsertShape = Optional<
  MagazineItemRowShape,
  'created_at' | 'id' | 'overrides' | 'page_number' | 'updated_at' | 'variant_color_name'
>;

export interface MagazineDatabase {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    CompositeTypes: { [_ in never]: never };
    Enums: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Tables: {
      magazine_items: {
        Insert: MagazineItemInsertShape;
        Relationships: [];
        Row: MagazineItemRowShape;
        Update: Partial<MagazineItemRowShape>;
      };
      magazines: {
        Insert: MagazineInsertShape;
        Relationships: [];
        Row: MagazineRowShape;
        Update: Partial<MagazineRowShape>;
      };
    };
    Views: { [_ in never]: never };
  };
}

/**
 * Mesmo client em runtime — apenas com a visão de tipos das tabelas de revista.
 * O cast é intencional e centralizado neste arquivo (nenhum `as any` espalhado
 * pelo serviço).
 */
export const magazineDb = supabase as unknown as SupabaseClient<MagazineDatabase>;
