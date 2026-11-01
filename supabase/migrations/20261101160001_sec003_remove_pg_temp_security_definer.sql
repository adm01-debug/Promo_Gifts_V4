-- SEC-003: Remove pg_temp do search_path em 45 funções SECURITY DEFINER
-- Severidade: MÉDIO | Tipo: SEGURANÇA
-- Evidência: pg_proc WHERE prosecdef=true AND proconfig LIKE '%pg_temp%' → 45 funções
-- Risco: pg_temp no search_path de SECURITY DEFINER permite shadowing de tipos/operadores
--        por qualquer sessão que crie objetos em pg_temp antes de chamar a função.
-- Risco de regressão: baixo — remove apenas pg_temp; mantém o restante do search_path intacto.

-- Grupo 1: search_path=pg_catalog (sem pg_temp)
ALTER FUNCTION public.admin_active_sessions()
  SET search_path = pg_catalog;

ALTER FUNCTION public.admin_revoke_user_sessions(_user_id uuid)
  SET search_path = pg_catalog;

-- Grupo 2: search_path=public (sem pg_temp)
ALTER FUNCTION public.check_edge_rate_limit(p_key text, p_window_ms integer, p_max_requests integer)
  SET search_path = public;

ALTER FUNCTION public.check_login_rate_limit(_email text, _ip text)
  SET search_path = public;

ALTER FUNCTION public.cleanup_expired_edge_rate_limits()
  SET search_path = public;

ALTER FUNCTION public.fn_anon_insert_rate_guard()
  SET search_path = public;

ALTER FUNCTION public.fn_audit_and_fix_grants(p_source text)
  SET search_path = public;

ALTER FUNCTION public.fn_purge_spr_history(p_keep_days integer)
  SET search_path = public;

ALTER FUNCTION public.get_sitemap_public(p_limit integer, p_offset integer)
  SET search_path = public;

ALTER FUNCTION public.magazine_add_items_atomic(p_magazine_id uuid, p_expected_updated_at timestamp with time zone, p_items jsonb)
  SET search_path = public;

ALTER FUNCTION public.magazine_add_items_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_items jsonb)
  SET search_path = public;

ALTER FUNCTION public.magazine_archive_v2(p_magazine_id uuid, p_expected_edit_version bigint)
  SET search_path = public;

ALTER FUNCTION public.magazine_auto_archive_stale_drafts(_ttl_days integer)
  SET search_path = public;

ALTER FUNCTION public.magazine_cleanup_all()
  SET search_path = public;

ALTER FUNCTION public.magazine_cleanup_orphan_state(_ttl_days integer)
  SET search_path = public;

ALTER FUNCTION public.magazine_cleanup_view_events(_ttl_days integer)
  SET search_path = public;

ALTER FUNCTION public.magazine_create_v2(p_organization_id uuid, p_title text, p_template_id text)
  SET search_path = public;

ALTER FUNCTION public.magazine_duplicate_atomic(p_source_magazine_id uuid, p_title text)
  SET search_path = public;

ALTER FUNCTION public.magazine_duplicate_v2(p_source_magazine_id uuid, p_expected_edit_version bigint, p_idempotency_key text, p_title text)
  SET search_path = public;

ALTER FUNCTION public.magazine_items_guard_v2()
  SET search_path = public;

ALTER FUNCTION public.magazine_lock_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_allow_deleted boolean)
  SET search_path = public;

ALTER FUNCTION public.magazine_publish_atomic(p_magazine_id uuid)
  SET search_path = public;

ALTER FUNCTION public.magazine_publish_v2(p_magazine_id uuid, p_expected_edit_version bigint)
  SET search_path = public;

ALTER FUNCTION public.magazine_reactivate_v2(p_magazine_id uuid, p_expected_edit_version bigint)
  SET search_path = public;

ALTER FUNCTION public.magazine_remove_items_atomic(p_magazine_id uuid, p_expected_updated_at timestamp with time zone, p_item_ids uuid[])
  SET search_path = public;

ALTER FUNCTION public.magazine_remove_items_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_item_ids uuid[])
  SET search_path = public;

ALTER FUNCTION public.magazine_reorder_items_atomic(p_magazine_id uuid, p_expected_updated_at timestamp with time zone, p_ordered_item_ids uuid[])
  SET search_path = public;

ALTER FUNCTION public.magazine_reorder_items_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_ordered_item_ids uuid[])
  SET search_path = public;

ALTER FUNCTION public.magazine_restore_v2(p_magazine_id uuid, p_expected_edit_version bigint)
  SET search_path = public;

ALTER FUNCTION public.magazine_rollup_view_counts()
  SET search_path = public;

ALTER FUNCTION public.magazine_soft_delete_v2(p_magazine_id uuid, p_expected_edit_version bigint)
  SET search_path = public;

ALTER FUNCTION public.magazine_unpublish_v2(p_magazine_id uuid, p_expected_edit_version bigint)
  SET search_path = public;

ALTER FUNCTION public.magazine_update_item_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_item_id uuid, p_patch jsonb)
  SET search_path = public;

ALTER FUNCTION public.magazine_update_metadata_atomic(p_magazine_id uuid, p_expected_updated_at timestamp with time zone, p_patch jsonb)
  SET search_path = public;

ALTER FUNCTION public.magazine_update_metadata_v2(p_magazine_id uuid, p_expected_edit_version bigint, p_patch jsonb)
  SET search_path = public;

ALTER FUNCTION public.magazine_validate_page_order_v2(p_magazine_id uuid, p_page_order jsonb)
  SET search_path = public;

ALTER FUNCTION public.purge_expired_security_data()
  SET search_path = public;

ALTER FUNCTION public.tg_reader_state_validate()
  SET search_path = public;

-- Grupo 3: search_path=pg_catalog, public (sem pg_temp)
ALTER FUNCTION public.fn_cron_safe_run(p_key bigint, p_sql text, p_timeout_ms integer, p_job_label text)
  SET search_path = pg_catalog, public;

-- Grupo 4: search_path=vault, public (sem pg_temp)
ALTER FUNCTION public.get_edge_function_secret(_name text)
  SET search_path = vault, public;

-- Grupo 5: search_path=public, vault (sem pg_temp)
ALTER FUNCTION public.get_edge_functions_base_url()
  SET search_path = public, vault;

-- Grupo 6: search_path=public, extensions (sem pg_temp)
ALTER FUNCTION public.magazine_ensure_view_event_partitions(_months_ahead integer)
  SET search_path = public, extensions;

ALTER FUNCTION public.magazine_guard_and_version_v2()
  SET search_path = public, extensions;

ALTER FUNCTION public.magazine_import_local_v2(p_idempotency_key text, p_payload jsonb)
  SET search_path = public, extensions;

ALTER FUNCTION public.tg_magazines_on_publish()
  SET search_path = public, extensions;

-- Verificação pós-apply:
--   SELECT COUNT(*) FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosecdef = true
--     AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE '%pg_temp%');
--   → deve retornar 0

-- ROLLBACK:
--   Para reverter individualmente: ALTER FUNCTION public.<nome>(<args>) RESET search_path;
--   Isso volta ao comportamento padrão sem search_path fixo (estado anterior).
