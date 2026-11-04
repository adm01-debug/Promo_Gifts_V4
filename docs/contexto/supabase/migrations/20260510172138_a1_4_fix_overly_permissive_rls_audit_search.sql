-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ A1-4 (B-3): Corrigir RLS overly-permissive em audit_log e search_queries│
-- │                                                                         │
-- │ Estado anterior (vulnerável):                                           │
-- │   audit_log.authenticated_view_audit_log: USING (true)                  │
-- │     → qualquer authenticated lia TODO o audit_log (decisão 3.3 viola)   │
-- │   search_queries.authenticated_view_searches: USING (true)              │
-- │     → qualquer vendedor lia o que outro vendedor pesquisou (privacy)    │
-- │   search_queries.authenticated_create_searches: WITH CHECK (true)       │
-- │     → vendedor podia forjar user_id no INSERT                           │
-- │                                                                         │
-- │ Decisões aplicadas:                                                     │
-- │   audit_log SELECT       → is_admin_or_above (decisão 3.3)              │
-- │   search_queries SELECT  → self OR is_coord_or_above (decisão padrão)   │
-- │   search_queries INSERT  → forçar user_id = auth.uid()                  │
-- │                                                                         │
-- │ Restore point pré-A1-4 (PITR contínuo):                                 │
-- │   timestamp: 2026-05-10 17:21:08 UTC                                    │
-- │   lsn:       D6/36012EF0                                                │
-- │   wal_file:  00000001000000D600000036                                   │
-- │                                                                         │
-- │ Não toca em policies INSERT de service_role (audit_log_insert_service   │
-- │ permanece WITH CHECK true → service_role escreve audit_log normal).     │
-- └─────────────────────────────────────────────────────────────────────────┘

-- ─── audit_log SELECT ───
DROP POLICY IF EXISTS "authenticated_view_audit_log" ON public.audit_log;
CREATE POLICY "audit_log_admin_only" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

-- ─── search_queries SELECT ───
DROP POLICY IF EXISTS "authenticated_view_searches" ON public.search_queries;
CREATE POLICY "search_queries_self_or_coord" ON public.search_queries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

-- ─── search_queries INSERT (impede forja de user_id) ───
DROP POLICY IF EXISTS "authenticated_create_searches" ON public.search_queries;
CREATE POLICY "search_queries_insert_self" ON public.search_queries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ===== Validação =====
DO $$
DECLARE
  _vulnerable_count int;
  _joaquim_id  constant uuid := '75921d8b-611f-4413-9ce5-afccdb733d26';
  _abner_id    constant uuid := '697f84e2-c308-4e45-992c-c7762565ca65';
  _gabry_id    constant uuid := '4e7b4bcc-9321-45e7-bc3b-df47721e2e95';
BEGIN
  -- Pós-condição 1: zero policies USING(true) em audit_log/search_queries pra authenticated
  SELECT COUNT(*) INTO _vulnerable_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('audit_log', 'search_queries')
    AND 'authenticated' = ANY(roles)
    AND (qual::text = 'true' OR with_check::text = 'true');
  IF _vulnerable_count > 0 THEN
    RAISE EXCEPTION 'A1-4 POS-CONDICAO 1: % policies ainda permissivas em audit_log/search_queries.', _vulnerable_count;
  END IF;
  
  -- Pós-condição 2: Joaquim (admin) passa em is_admin_or_above (vai ler audit_log)
  IF NOT public.is_admin_or_above(_joaquim_id) THEN
    RAISE EXCEPTION 'A1-4 POS-CONDICAO 2: Joaquim deveria passar em is_admin_or_above.';
  END IF;
  
  -- Pós-condição 3: Abner (dev) passa em is_admin_or_above
  IF NOT public.is_admin_or_above(_abner_id) THEN
    RAISE EXCEPTION 'A1-4 POS-CONDICAO 3: Abner deveria passar em is_admin_or_above.';
  END IF;
  
  -- Pós-condição 4: Gabryelly (vendedor) NÃO passa em is_admin_or_above (não vai ler audit_log)
  IF public.is_admin_or_above(_gabry_id) THEN
    RAISE EXCEPTION 'A1-4 POS-CONDICAO 4: Gabryelly NAO deveria passar em is_admin_or_above.';
  END IF;
  
  -- Pós-condição 5: Gabryelly (vendedor) NÃO passa em is_coord_or_above (não vai ler search_queries de outros)
  IF public.is_coord_or_above(_gabry_id) THEN
    RAISE EXCEPTION 'A1-4 POS-CONDICAO 5: Gabryelly NAO deveria passar em is_coord_or_above.';
  END IF;
  
  RAISE NOTICE 'A1-4 OK: 3 policies corrigidas. audit_log e search_queries blindados.';
END $$;
