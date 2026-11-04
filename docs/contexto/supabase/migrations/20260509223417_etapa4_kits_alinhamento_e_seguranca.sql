-- ============================================================
-- Etapa 4: Schema Kits — alinhamento com código + segurança RLS
-- 
-- Estado pré: 4 tabelas existentes (custom_kits, kit_component_types,
--             kit_component_print_areas, product_kit_components)
-- Achados:
--   - custom_kits sem RLS de INSERT/UPDATE/DELETE (vendedor não cria)
--   - Schema custom_kits divergente do useCustomKitPersistence.ts
--   - kit_templates não existe (usado por useKitTemplates.ts)
--   - product_kit_components com policy permissiva sobreposta a org-based
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- A) custom_kits: adicionar colunas que o hook moderno usa
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.custom_kits 
  ADD COLUMN IF NOT EXISTS user_id              uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kit_type             text,
  ADD COLUMN IF NOT EXISTS box_data             jsonb,
  ADD COLUMN IF NOT EXISTS items_data           jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS personalization_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS box_price            numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_price          numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_usage_percent numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS color                text DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS icon                 text DEFAULT 'Package',
  ADD COLUMN IF NOT EXISTS tag                  text,
  ADD COLUMN IF NOT EXISTS description          text,
  ADD COLUMN IF NOT EXISTS is_favorite          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_used_at         timestamptz;

-- Backfill user_id ← created_by quando NULL (tabela vazia mas garantia futura)
UPDATE public.custom_kits SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Trigger BEFORE INSERT/UPDATE: garantir que user_id sempre acompanha created_by
CREATE OR REPLACE FUNCTION public.fn_custom_kits_sync_user_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.user_id := NEW.created_by;
  ELSIF NEW.created_by IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.created_by := NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_custom_kits_sync_user_id ON public.custom_kits;
CREATE TRIGGER trg_custom_kits_sync_user_id
  BEFORE INSERT OR UPDATE ON public.custom_kits
  FOR EACH ROW EXECUTE FUNCTION public.fn_custom_kits_sync_user_id();

CREATE INDEX IF NOT EXISTS idx_custom_kits_user_id    ON public.custom_kits(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_kits_status     ON public.custom_kits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_custom_kits_pinned     ON public.custom_kits(user_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_custom_kits_favorite   ON public.custom_kits(user_id, is_favorite);

COMMENT ON COLUMN public.custom_kits.user_id IS 
  'Espelho de created_by mantido por trigger. Hook moderno (useCustomKitPersistence) usa user_id; código legado pode usar created_by. Ambos sincronizam.';
COMMENT ON COLUMN public.custom_kits.box_data IS 
  '[NOVA - hook moderno] Substitui packaging_* legados. JSON com dados estruturados da caixa/embalagem.';
COMMENT ON COLUMN public.custom_kits.items_data IS 
  '[NOVA - hook moderno] Substitui items legado. Array de objetos.';

-- ════════════════════════════════════════════════════════════
-- D) custom_kits: substituir policy permissiva por escopo correto
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "auth_read_custom_kits" ON public.custom_kits;

CREATE POLICY "ck_select_own_or_supervisor"
  ON public.custom_kits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "ck_insert_self"
  ON public.custom_kits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "ck_update_own_or_supervisor"
  ON public.custom_kits FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_supervisor_or_above(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "ck_delete_own_or_supervisor"
  ON public.custom_kits FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_supervisor_or_above(auth.uid()));

-- ════════════════════════════════════════════════════════════
-- B) kit_templates — tabela nova (faltava no banco)
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.kit_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  description           text,
  category              text NOT NULL DEFAULT 'general',
  color                 text NOT NULL DEFAULT '#3B82F6',
  icon                  text NOT NULL DEFAULT 'Package',
  tag                   text,
  cover_image_url       text,
  box_data              jsonb,
  items_data            jsonb NOT NULL DEFAULT '[]'::jsonb,
  personalization_data  jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_price           numeric(12,2) NOT NULL DEFAULT 0,
  volume_usage_percent  numeric(5,2)  NOT NULL DEFAULT 0,
  usage_count           integer NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kit_templates_active     ON public.kit_templates(is_active, usage_count DESC);
CREATE INDEX idx_kit_templates_category   ON public.kit_templates(category) WHERE is_active = true;

ALTER TABLE public.kit_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer authenticated lê (catálogo curado de templates)
CREATE POLICY "kt_select_authenticated"
  ON public.kit_templates FOR SELECT TO authenticated
  USING (is_active = true OR public.is_supervisor_or_above(auth.uid()));

-- INSERT/UPDATE/DELETE: supervisor+ apenas (templates são curados)
CREATE POLICY "kt_insert_supervisor"
  ON public.kit_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "kt_update_supervisor"
  ON public.kit_templates FOR UPDATE TO authenticated
  USING (public.is_supervisor_or_above(auth.uid()))
  WITH CHECK (public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "kt_delete_dev"
  ON public.kit_templates FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));

CREATE TRIGGER trg_kit_templates_updated_at
  BEFORE UPDATE ON public.kit_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.kit_templates IS
  'Templates curados de kits. Vendedor clona via increment_kit_template_usage RPC. Schema extraído de useKitTemplates.ts.';

-- ════════════════════════════════════════════════════════════
-- C) RPC increment_kit_template_usage — incremento atômico
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.increment_kit_template_usage(_template_id uuid)
RETURNS integer
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.kit_templates 
  SET usage_count = usage_count + 1
  WHERE id = _template_id AND is_active = true
  RETURNING usage_count;
$$;
GRANT EXECUTE ON FUNCTION public.increment_kit_template_usage(uuid) TO authenticated;

COMMENT ON FUNCTION public.increment_kit_template_usage IS
  'Incrementa contador de uso de template ao clonar. SECURITY DEFINER pra contornar RLS write (vendedor pode incrementar mas não editar template diretamente).';

-- ════════════════════════════════════════════════════════════
-- E) FIX BUG em product_kit_components: remover SELECT permissivo
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "product_kit_components_public_read" ON public.product_kit_components;

-- Mantém: product_kit_components_select (org-based) + insert/update/delete

COMMENT ON TABLE public.product_kit_components IS
  'Componentes de kits-produtos (catálogo). RLS via organization membership. Bug corrigido na Etapa 4: removida policy public_read que sobrepunha restrição.';

-- ════════════════════════════════════════════════════════════
-- F) Catálogos kit_component_types e kit_component_print_areas:
--    add CRUD pra admin (atualmente só tem SELECT)
-- ════════════════════════════════════════════════════════════
CREATE POLICY "kct_admin_insert"
  ON public.kit_component_types FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "kct_admin_update"
  ON public.kit_component_types FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "kct_admin_delete"
  ON public.kit_component_types FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));

CREATE POLICY "kcpa_admin_insert"
  ON public.kit_component_print_areas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "kcpa_admin_update"
  ON public.kit_component_print_areas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "kcpa_admin_delete"
  ON public.kit_component_print_areas FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));
