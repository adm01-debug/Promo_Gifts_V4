-- ============================================================
-- Etapa 6: Catálogo + Sistema de Favoritos
-- 
-- Bloco A: 3 tabelas novas (favorite_lists, favorite_items, favorite_items_trash)
-- Bloco B: RPC ensure_default_favorite_list
-- Bloco C: Trigger soft-delete (items → trash)
-- Bloco D: CRUD admin em catálogos
-- Bloco E: user_favorites marcada deprecated
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- BLOCO A: favorite_lists
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.favorite_lists (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  color               text NOT NULL DEFAULT '#3B82F6',
  icon                text NOT NULL DEFAULT 'Heart',
  is_default          boolean NOT NULL DEFAULT false,
  is_archived         boolean NOT NULL DEFAULT false,
  client_id           uuid,  -- FK pra bitrix_clients quando existir
  client_name         text,
  shared_token        text UNIQUE,
  shared_expires_at   timestamptz,
  position            integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_favorite_lists_user            ON public.favorite_lists(user_id, is_archived, position);
CREATE INDEX idx_favorite_lists_default         ON public.favorite_lists(user_id, is_default) WHERE is_default = true;
CREATE INDEX idx_favorite_lists_shared_token    ON public.favorite_lists(shared_token) WHERE shared_token IS NOT NULL;

-- Garantir 1 lista default por user (constraint parcial)
CREATE UNIQUE INDEX uniq_favorite_lists_one_default_per_user 
  ON public.favorite_lists(user_id) 
  WHERE is_default = true;

ALTER TABLE public.favorite_lists ENABLE ROW LEVEL SECURITY;

-- SELECT: dono lê próprias + supervisor+ vê todas + anon lê via shared_token (não-expirado)
CREATE POLICY "fl_select_own_or_supervisor"
  ON public.favorite_lists FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "fl_anon_select_via_token"
  ON public.favorite_lists FOR SELECT TO anon
  USING (
    shared_token IS NOT NULL 
    AND (shared_expires_at IS NULL OR shared_expires_at > now())
    AND is_archived = false
  );

CREATE POLICY "fl_insert_self"
  ON public.favorite_lists FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fl_update_own"
  ON public.favorite_lists FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fl_delete_own_or_admin"
  ON public.favorite_lists FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_fl_updated_at BEFORE UPDATE ON public.favorite_lists
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.favorite_lists IS
  'Listas de favoritos por usuário. Cada user tem 1 lista default automática (criada via ensure_default_favorite_list). Suporta compartilhamento via shared_token com TTL.';

-- ════════════════════════════════════════════════════════════
-- BLOCO A: favorite_items (itens das listas)
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.favorite_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         uuid NOT NULL REFERENCES public.favorite_lists(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id      uuid,
  variant_info    jsonb,  -- {color_name, color_hex, size_code, thumbnail}
  note            text,
  price_at_save   numeric(12,2),
  position        integer NOT NULL DEFAULT 0,
  added_at        timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Constraint UNIQUE referenciado pelo .upsert(onConflict: "list_id,product_id,variant_id")
-- variant_id NULL precisa ser tratado: usar índice parcial
CREATE UNIQUE INDEX uniq_fi_list_product_variant 
  ON public.favorite_items(list_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX idx_fi_list      ON public.favorite_items(list_id, position, added_at);
CREATE INDEX idx_fi_user      ON public.favorite_items(user_id);
CREATE INDEX idx_fi_product   ON public.favorite_items(product_id);

ALTER TABLE public.favorite_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fi_select_own_list_or_admin"
  ON public.favorite_items FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_supervisor_or_above(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.favorite_lists l 
      WHERE l.id = favorite_items.list_id AND l.user_id = auth.uid()
    )
  );

-- Anon lê items de listas com shared_token válido
CREATE POLICY "fi_anon_via_shared_list"
  ON public.favorite_items FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.favorite_lists l
      WHERE l.id = favorite_items.list_id
        AND l.shared_token IS NOT NULL
        AND (l.shared_expires_at IS NULL OR l.shared_expires_at > now())
        AND l.is_archived = false
    )
  );

CREATE POLICY "fi_insert_own"
  ON public.favorite_items FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.favorite_lists l 
      WHERE l.id = list_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "fi_update_own"
  ON public.favorite_items FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fi_delete_own"
  ON public.favorite_items FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_fi_updated_at BEFORE UPDATE ON public.favorite_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ════════════════════════════════════════════════════════════
-- BLOCO A: favorite_items_trash (lixeira soft-delete)
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.favorite_items_trash (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id     uuid,  -- id original em favorite_items
  list_id         uuid NOT NULL,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL,
  variant_id      uuid,
  variant_info    jsonb,
  note            text,
  price_at_save   numeric(12,2),
  position        integer,
  added_at        timestamptz,
  deleted_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fit_user_deleted ON public.favorite_items_trash(user_id, deleted_at DESC);

ALTER TABLE public.favorite_items_trash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fit_select_own"
  ON public.favorite_items_trash FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "fit_insert_own"
  ON public.favorite_items_trash FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fit_delete_own"
  ON public.favorite_items_trash FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ════════════════════════════════════════════════════════════
-- BLOCO C: Trigger soft-delete (items → trash automático)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_favorite_items_soft_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.favorite_items_trash (
    original_id, list_id, user_id, product_id, variant_id,
    variant_info, note, price_at_save, position, added_at, deleted_at
  ) VALUES (
    OLD.id, OLD.list_id, OLD.user_id, OLD.product_id, OLD.variant_id,
    OLD.variant_info, OLD.note, OLD.price_at_save, OLD.position, OLD.added_at, now()
  );
  RETURN OLD;
END $$;

CREATE TRIGGER trg_fi_soft_delete
  BEFORE DELETE ON public.favorite_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_favorite_items_soft_delete();

COMMENT ON TRIGGER trg_fi_soft_delete ON public.favorite_items IS
  'Ao deletar item de favoritos, copia automaticamente pra trash. Cleanup mensal via reset_favorite_trash().';

-- Função pra purgar trash > 30 dias (chamar via cron ou edge)
CREATE OR REPLACE FUNCTION public.purge_favorite_trash_old()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.favorite_items_trash 
  WHERE deleted_at < now() - interval '30 days'
  RETURNING 1 INTO v_count;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
GRANT EXECUTE ON FUNCTION public.purge_favorite_trash_old() TO service_role;

-- ════════════════════════════════════════════════════════════
-- BLOCO B: RPC ensure_default_favorite_list
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ensure_default_favorite_list(_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_list_id uuid;
BEGIN
  -- Se já existe default, retorna
  SELECT id INTO v_list_id 
  FROM public.favorite_lists 
  WHERE user_id = _user_id AND is_default = true 
  LIMIT 1;
  
  IF v_list_id IS NOT NULL THEN
    RETURN v_list_id;
  END IF;
  
  -- Cria lista default
  INSERT INTO public.favorite_lists (
    user_id, name, description, color, icon, is_default, position
  ) VALUES (
    _user_id, 'Meus Favoritos', 'Lista padrão de favoritos', '#3B82F6', 'Heart', true, 0
  ) RETURNING id INTO v_list_id;
  
  RETURN v_list_id;
END $$;
GRANT EXECUTE ON FUNCTION public.ensure_default_favorite_list(uuid) TO authenticated;

COMMENT ON FUNCTION public.ensure_default_favorite_list IS
  'Garante que o user tem lista default. Chamada pelo useFavoriteLists antes do query principal. Idempotente.';

-- ════════════════════════════════════════════════════════════
-- BLOCO E: user_favorites — marcar deprecated
-- ════════════════════════════════════════════════════════════
COMMENT ON TABLE public.user_favorites IS
  '[DEPRECATED] Tabela legada (0 rows, não usada pelo código moderno). Sistema atual usa favorite_lists + favorite_items + favorite_items_trash. Drop em onda futura quando confirmado que nenhum código usa.';

-- ════════════════════════════════════════════════════════════
-- BLOCO D: CRUD admin nas 11 tabelas catálogo SELECT-only
-- ════════════════════════════════════════════════════════════

-- D.1) tecnicas_gravacao (16 rows, base de técnicas BR)
CREATE POLICY "tg_admin_insert" ON public.tecnicas_gravacao 
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tg_admin_update" ON public.tecnicas_gravacao 
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tg_dev_delete" ON public.tecnicas_gravacao 
  FOR DELETE TO authenticated USING (public.is_admin_strict(auth.uid()));

-- D.2) tabela_preco_gravacao_oficial (88 rows)
CREATE POLICY "tpgo_admin_insert" ON public.tabela_preco_gravacao_oficial 
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tpgo_admin_update" ON public.tabela_preco_gravacao_oficial 
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tpgo_dev_delete" ON public.tabela_preco_gravacao_oficial 
  FOR DELETE TO authenticated USING (public.is_admin_strict(auth.uid()));

-- D.3) tabela_preco_gravacao_oficial_faixa (884 rows) — anon read continua (preços públicos)
CREATE POLICY "tpgof_admin_insert" ON public.tabela_preco_gravacao_oficial_faixa 
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tpgof_admin_update" ON public.tabela_preco_gravacao_oficial_faixa 
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tpgof_dev_delete" ON public.tabela_preco_gravacao_oficial_faixa 
  FOR DELETE TO authenticated USING (public.is_admin_strict(auth.uid()));

-- D.4) auto_tag_rules (67 rows)
CREATE POLICY "atr_admin_insert" ON public.auto_tag_rules 
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "atr_admin_update" ON public.auto_tag_rules 
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "atr_dev_delete" ON public.auto_tag_rules 
  FOR DELETE TO authenticated USING (public.is_admin_strict(auth.uid()));

-- D.5) eco_material_config (7 rows)
CREATE POLICY "emc_admin_insert" ON public.eco_material_config 
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "emc_admin_update" ON public.eco_material_config 
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "emc_dev_delete" ON public.eco_material_config 
  FOR DELETE TO authenticated USING (public.is_admin_strict(auth.uid()));

-- D.6 a D.11) category_* (6 tabelas: accessory_categories, colors, commemorative_dates, copywriting_config, target_audiences, variation_types)
DO $$
DECLARE 
  tbl text;
  tbls text[] := ARRAY[
    'category_accessory_categories', 'category_colors', 'category_commemorative_dates',
    'category_copywriting_config', 'category_target_audiences', 'category_variation_types'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('CREATE POLICY "cat_admin_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()))', tbl);
    EXECUTE format('CREATE POLICY "cat_admin_update" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))', tbl);
    EXECUTE format('CREATE POLICY "cat_dev_delete" ON public.%I FOR DELETE TO authenticated USING (public.is_admin_strict(auth.uid()))', tbl);
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════
-- BACKFILL: criar lista default pros 4 users existentes
-- ════════════════════════════════════════════════════════════
SELECT public.ensure_default_favorite_list(id)
FROM auth.users
WHERE email IN (
  'adm01@promobrindes.com.br',
  'ti@promobrindes.com.br',
  'comercial03@promobrindes.com.br',
  'comercial05@promobrindes.com.br'
);
