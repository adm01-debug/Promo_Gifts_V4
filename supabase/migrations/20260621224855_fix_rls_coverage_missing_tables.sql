
-- ============================================================
-- FIX #4: Habilita RLS nas 4 tabelas que quebravam rls_coverage
-- + cria políticas adequadas para cada tipo de tabela
-- ============================================================

-- ── 4A) category_ancestors — dados públicos de hierarquia ──
ALTER TABLE public.category_ancestors ENABLE ROW LEVEL SECURITY;

-- SELECT público (sem PII, dados de taxonomia)
CREATE POLICY "category_ancestors_select_public"
  ON public.category_ancestors
  FOR SELECT
  TO public  -- anon + authenticated + service_role
  USING (true);

-- Write: apenas service_role (pipeline)
-- (service_role bypassa RLS de qualquer forma, mas
--  a policy torna a intenção explícita e registrada)
CREATE POLICY "category_ancestors_write_service_only"
  ON public.category_ancestors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 4B) Tabelas de backup operacional ──
-- Habilitamos RLS sem policy de leitura pública
-- (bloqueio total para anon/authenticated; service_role acessa livremente)

ALTER TABLE public._backup_stock_daily_summary_20260618 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._bkp_kit_dims_20260619               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._bkp_orphan_active_variants_20260619 ENABLE ROW LEVEL SECURITY;

-- Política explícita de acesso somente para service_role
CREATE POLICY "backup_stock_service_only"
  ON public._backup_stock_daily_summary_20260618
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "bkp_kit_dims_service_only"
  ON public._bkp_kit_dims_20260619
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "bkp_orphan_variants_service_only"
  ON public._bkp_orphan_active_variants_20260619
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Reload para PostgREST reconhecer as políticas
NOTIFY pgrst, 'reload schema';
;
