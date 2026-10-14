-- ============================================================================
-- Incidente 2026-10-13 — diagnóstico de produção, aprovado pelo PO neste chat
-- Agente 1 de 5 (Contenção e Segurança)
-- Projeto SSOT: doufsxqlfjyuvxuezpln (REGRA #1)
--
-- Escopo desta migration (Fase 0 etapas 6/7/8/9 + Fase 8 etapas 83/84/87/88):
--   1) Fix fn_autolink_canonical_on_content_hash (fallback apontava p/ si mesmo)
--   3) get_edge_function_secret: adiciona ASIA_INGESTION_CRON_SECRET à allowlist
--   8) Policies mínimas p/ anon_catalog_grant_audit_log e magazine_duplicate_requests
--   9) Revoga SELECT de authenticated/anon nas materialized views
--      mv_stock_rupture_alert e mv_ema_kpi_by_level (saem da superfície de API)
--
-- Aplicada em produção via MCP apply_migration (REGRA #8 corolário "DDL fora
-- do fluxo de migration"), condições atendidas:
--   (a) ticket: "Incidente 2026-10-13 — diagnóstico de produção, aprovado
--       pelo PO neste chat"
--   (b) esta migration versionada, no mesmo PR
--   (c) `supabase migration repair --status applied` — PENDENTE (CLI supabase
--       não disponível neste ambiente local; ver pendência no PR)
--
-- Etapas 5 (rotação da anon/publishable key), 7 (revisão das 8 views
-- SECURITY DEFINER) e verificação da etapa 7 (17 imagens-raiz) NÃO geram DDL
-- — ver detalhes/evidência no corpo do PR e no relatório da sessão.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) fn_autolink_canonical_on_content_hash — Fase 0, etapa 6
--    Bug: no fallback (quando não existe root "puro" sem canonical_image_id
--    no grupo de hash), a função buscava o canonical_image_id de QUALQUER
--    dependente do grupo, inclusive de um dependente que já apontasse para o
--    próprio NEW.id — podendo fazer NEW.canonical_image_id := NEW.id
--    (auto-referência). Correção: excluir explicitamente pi2.id = NEW.id e
--    pi2.canonical_image_id = NEW.id da busca, e blindar com um guard final
--    que zera v_root_id caso ainda assim seja igual a NEW.id.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_autolink_canonical_on_content_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_root_id               uuid;
  v_existing_canonical_hash text;
  v_old_group_root        uuid;
  v_elected_dep_root      uuid;
BEGIN
  -- Only act when content_hash is being set or changed
  IF NEW.content_hash IS NULL OR (OLD.content_hash IS NOT NULL AND OLD.content_hash = NEW.content_hash) THEN
    RETURN NEW;
  END IF;

  -- If image already has a canonical assignment:
  IF NEW.canonical_image_id IS NOT NULL THEN
    IF OLD.content_hash IS NOT NULL AND OLD.content_hash IS DISTINCT FROM NEW.content_hash THEN
      -- Hash CHANGED (not first-set): clear old canonical → re-link to correct group
      NEW.canonical_image_id := NULL;
      NEW.is_shared := false;
    ELSE
      -- First-set (OLD.content_hash was NULL): validate canonical belongs to SAME hash group
      -- GAP-C6: existing canonical may point to a different-hash group
      SELECT content_hash INTO v_existing_canonical_hash
      FROM public.product_images
      WHERE id = NEW.canonical_image_id;

      IF v_existing_canonical_hash IS NOT DISTINCT FROM NEW.content_hash THEN
        RETURN NEW;  -- Same hash group: respect existing canonical
      END IF;
      -- Wrong hash group: fall through to re-link to correct root
      NEW.canonical_image_id := NULL;
      NEW.is_shared := false;
    END IF;
  END IF;

  -- Find the oldest root in the new hash group
  SELECT id INTO v_root_id
  FROM public.product_images
  WHERE content_hash = NEW.content_hash
    AND deleted_at IS NULL
    AND canonical_image_id IS NULL
    AND id <> NEW.id
    AND is_shared = false
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF v_root_id IS NOT NULL THEN
    NEW.canonical_image_id := v_root_id;
    NEW.is_shared := true;
  ELSE
    -- Fallback: inherit root from existing dependent in same group
    -- Incidente 2026-10-13: exclui explicitamente dependentes que apontem
    -- para o próprio NEW.id, para nunca produzir auto-referência.
    SELECT pi2.canonical_image_id INTO v_root_id
    FROM public.product_images pi2
    WHERE pi2.content_hash = NEW.content_hash
      AND pi2.deleted_at IS NULL
      AND pi2.canonical_image_id IS NOT NULL
      AND pi2.id <> NEW.id
      AND pi2.canonical_image_id <> NEW.id
    LIMIT 1;

    -- Guard final: nunca permitir NEW.canonical_image_id = NEW.id
    IF v_root_id = NEW.id THEN
      v_root_id := NULL;
    END IF;

    IF v_root_id IS NOT NULL THEN
      NEW.canonical_image_id := v_root_id;
      NEW.is_shared := true;
    END IF;
    -- If only member → remain as standalone root
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- GAP-C5 / GAP-C5b: This row WAS a root (OLD.canonical_image_id IS NULL)
  -- in a previous hash group (OLD.content_hash IS NOT NULL).
  -- Former deps need re-grouping by THEIR OWN content_hash, regardless of
  -- whether this row joined a group (v_root_id IS NOT NULL) or stayed standalone.
  --
  -- Condition changed from migration 008:
  --   OLD: IF OLD.canonical_image_id IS NULL AND v_root_id IS NOT NULL
  --   NEW: IF OLD.canonical_image_id IS NULL AND OLD.content_hash IS NOT NULL
  -- ══════════════════════════════════════════════════════════════
  IF OLD.canonical_image_id IS NULL AND OLD.content_hash IS NOT NULL THEN

    -- Case A: Is there another live root for OLD.content_hash?
    SELECT id INTO v_old_group_root
    FROM public.product_images
    WHERE content_hash = OLD.content_hash
      AND deleted_at IS NULL
      AND canonical_image_id IS NULL
      AND id <> NEW.id
    ORDER BY created_at ASC, id ASC
    LIMIT 1;

    IF v_old_group_root IS NOT NULL THEN
      -- Link all former deps to the surviving root of OLD.content_hash group
      UPDATE public.product_images
      SET canonical_image_id = v_old_group_root,
          is_shared           = true,
          updated_at          = now()
      WHERE canonical_image_id = NEW.id
        AND id <> NEW.id
        AND deleted_at IS NULL;

    ELSE
      -- Case B: No other root for OLD.content_hash — elect oldest former dep as new root

      SELECT id INTO v_elected_dep_root
      FROM public.product_images
      WHERE canonical_image_id = NEW.id
        AND id <> NEW.id
        AND deleted_at IS NULL
      ORDER BY created_at ASC, id ASC
      LIMIT 1;

      IF v_elected_dep_root IS NOT NULL THEN
        -- Promote elected dep to standalone root
        UPDATE public.product_images
        SET canonical_image_id = NULL,
            is_shared           = false,
            updated_at          = now()
        WHERE id = v_elected_dep_root;

        -- Link all remaining former deps to the elected root
        UPDATE public.product_images
        SET canonical_image_id = v_elected_dep_root,
            is_shared           = true,
            updated_at          = now()
        WHERE canonical_image_id = NEW.id
          AND id <> NEW.id
          AND id <> v_elected_dep_root
          AND deleted_at IS NULL;
      END IF;
      -- If no former deps → nothing to do
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 3) get_edge_function_secret — Fase 0, etapa 8
--    Adiciona 'ASIA_INGESTION_CRON_SECRET' à allowlist de nomes permitidos.
--    NOTA / PENDÊNCIA: o secret correspondente NÃO existe em vault.secrets
--    nesta sessão (verificado via `SELECT name FROM vault.secrets WHERE
--    name='ASIA_INGESTION_CRON_SECRET'` → 0 linhas). Qualquer função que
--    tentar usá-lo continuará falhando com "Secret ... nao encontrado no
--    vault" até o PO cadastrar o valor real no Vault (painel Supabase →
--    Project Settings → Vault, ou `select vault.create_secret(...)`). Esta
--    migration apenas destrava o *nome*; não inventa nem cria o valor.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_edge_function_secret(_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'vault', 'public', 'pg_temp'
AS $function$
DECLARE
  _secret text;
BEGIN
  IF _name NOT IN (
    'WEBHOOK_DISPATCHER_SECRET',
    'WEBHOOK_DISPATCHER_URL',
    'WEBHOOK_SECRET',
    'CONNECTIONS_AUTO_TEST_SECRET',
    'CRON_SECRET',
    'HASH_PRODUCT_IMAGES_CRON_SECRET',
    'GENERATE_BLURHASHES_CRON_SECRET',
    'BACKFILL_DIM_CRON_SECRET',
    'ASIA_INGESTION_CRON_SECRET'
  ) THEN
    RAISE EXCEPTION 'Nome de secret nao autorizado: %', _name
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = _name
  LIMIT 1;

  IF _secret IS NULL THEN
    RAISE EXCEPTION 'Secret % nao encontrado no vault', _name
      USING ERRCODE = 'no_data_found';
  END IF;

  RETURN _secret;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 4) Pausa de cron jobs não críticos de 1-2 minutos — Fase 0, etapa 9
--    (monitor-connections=jobid 262 */1min, dispatcher-log-sync=jobid 294
--    */2min, generate-blurhashes=jobid 242 a cada ~2min). Registrado aqui
--    por rastreabilidade; alter_job não é DDL de schema mas é mudança de
--    comportamento em produção autorizada pelo PO no mesmo incidente.
-- ----------------------------------------------------------------------------
SELECT cron.alter_job(job_id := 262, active := false); -- monitor-connections
SELECT cron.alter_job(job_id := 294, active := false); -- dispatcher-log-sync
SELECT cron.alter_job(job_id := 242, active := false); -- generate-blurhashes

-- ----------------------------------------------------------------------------
-- 8) Policies mínimas para tabelas com RLS ativo e zero policies — Fase 8,
--    etapa 87.
--
--    anon_catalog_grant_audit_log: tabela de log, escrita exclusivamente
--    por fn_anon_catalog_grant_audit_run() (SECURITY DEFINER, owner=postgres
--    → bypassa RLS como owner da tabela; as policies abaixo não afetam essa
--    escrita). Owner da tabela é 'postgres'. Grants atuais na tabela:
--    anon=MAINTAIN apenas (sem SELECT/INSERT); authenticated=SELECT.
--    Decisão: bloquear anon totalmente (nenhuma policy para anon = deny by
--    default com RLS ligado); leitura via API restrita a admin.
--
--    magazine_duplicate_requests: colunas (actor_id, idempotency_key,
--    source_magazine_id, request_title, magazine_id, ...) indicam fluxo de
--    usuário autenticado solicitando duplicação de revista. Grants atuais:
--    anon=MAINTAIN apenas; authenticated=SELECT. Decisão: cada usuário
--    autenticado só vê/cria suas próprias solicitações (actor_id =
--    auth.uid()); service_role tem acesso total para o backend/worker que
--    processa as duplicações.
-- ----------------------------------------------------------------------------
CREATE POLICY anon_catalog_grant_audit_log_admin_read
  ON public.anon_catalog_grant_audit_log
  FOR SELECT
  TO authenticated
  USING (is_admin_or_above((SELECT auth.uid())));

CREATE POLICY anon_catalog_grant_audit_log_service_all
  ON public.anon_catalog_grant_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY magazine_duplicate_requests_own_select
  ON public.magazine_duplicate_requests
  FOR SELECT
  TO authenticated
  USING (actor_id = (SELECT auth.uid()));

CREATE POLICY magazine_duplicate_requests_own_insert
  ON public.magazine_duplicate_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = (SELECT auth.uid()));

CREATE POLICY magazine_duplicate_requests_service_all
  ON public.magazine_duplicate_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 9) Remover mv_stock_rupture_alert e mv_ema_kpi_by_level da superfície de
--    API (PostgREST usa os roles anon/authenticated) — Fase 8, etapa 88.
--    anon já não tinha SELECT nessas matviews; authenticated tinha. Revoga
--    de ambos para fechar a exposição, sem mover de schema (evita quebrar
--    os crons `refresh-mv-ema-kpi-by-level`/`refresh-mv-stock-rupture-alert`
--    e as views/funções internas — vw_rupture_gap_purchase,
--    vw_rupture_live_divergence, vw_rupture_confidence_audit,
--    fn_rupture_by_level, fn_rupture_health_check, fn_ema_kpi_by_level,
--    fn_rupture_quick_stats, fn_rupture_anomalia_report — que referenciam
--    essas matviews sem qualificar schema e rodam como postgres/service_role,
--    então não são afetadas pela revogação).
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.mv_stock_rupture_alert FROM authenticated, anon;
REVOKE SELECT ON public.mv_ema_kpi_by_level FROM authenticated, anon;
