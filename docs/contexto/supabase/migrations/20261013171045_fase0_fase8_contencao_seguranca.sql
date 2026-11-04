-- ============================================================================
-- Incidente 2026-10-13 — diagnóstico de produção, aprovado pelo PO neste chat
-- Agente 1 de 5 (Contenção e Segurança)
-- ============================================================================

-- 1) fn_autolink_canonical_on_content_hash — Fase 0, etapa 6
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
  IF NEW.content_hash IS NULL OR (OLD.content_hash IS NOT NULL AND OLD.content_hash = NEW.content_hash) THEN
    RETURN NEW;
  END IF;

  IF NEW.canonical_image_id IS NOT NULL THEN
    IF OLD.content_hash IS NOT NULL AND OLD.content_hash IS DISTINCT FROM NEW.content_hash THEN
      NEW.canonical_image_id := NULL;
      NEW.is_shared := false;
    ELSE
      SELECT content_hash INTO v_existing_canonical_hash
      FROM public.product_images
      WHERE id = NEW.canonical_image_id;

      IF v_existing_canonical_hash IS NOT DISTINCT FROM NEW.content_hash THEN
        RETURN NEW;
      END IF;
      NEW.canonical_image_id := NULL;
      NEW.is_shared := false;
    END IF;
  END IF;

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
    SELECT pi2.canonical_image_id INTO v_root_id
    FROM public.product_images pi2
    WHERE pi2.content_hash = NEW.content_hash
      AND pi2.deleted_at IS NULL
      AND pi2.canonical_image_id IS NOT NULL
      AND pi2.id <> NEW.id
      AND pi2.canonical_image_id <> NEW.id
    LIMIT 1;

    IF v_root_id = NEW.id THEN
      v_root_id := NULL;
    END IF;

    IF v_root_id IS NOT NULL THEN
      NEW.canonical_image_id := v_root_id;
      NEW.is_shared := true;
    END IF;
  END IF;

  IF OLD.canonical_image_id IS NULL AND OLD.content_hash IS NOT NULL THEN

    SELECT id INTO v_old_group_root
    FROM public.product_images
    WHERE content_hash = OLD.content_hash
      AND deleted_at IS NULL
      AND canonical_image_id IS NULL
      AND id <> NEW.id
    ORDER BY created_at ASC, id ASC
    LIMIT 1;

    IF v_old_group_root IS NOT NULL THEN
      UPDATE public.product_images
      SET canonical_image_id = v_old_group_root,
          is_shared           = true,
          updated_at          = now()
      WHERE canonical_image_id = NEW.id
        AND id <> NEW.id
        AND deleted_at IS NULL;

    ELSE
      SELECT id INTO v_elected_dep_root
      FROM public.product_images
      WHERE canonical_image_id = NEW.id
        AND id <> NEW.id
        AND deleted_at IS NULL
      ORDER BY created_at ASC, id ASC
      LIMIT 1;

      IF v_elected_dep_root IS NOT NULL THEN
        UPDATE public.product_images
        SET canonical_image_id = NULL,
            is_shared           = false,
            updated_at          = now()
        WHERE id = v_elected_dep_root;

        UPDATE public.product_images
        SET canonical_image_id = v_elected_dep_root,
            is_shared           = true,
            updated_at          = now()
        WHERE canonical_image_id = NEW.id
          AND id <> NEW.id
          AND id <> v_elected_dep_root
          AND deleted_at IS NULL;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

-- 3) get_edge_function_secret — Fase 0, etapa 8
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

-- 4) Pausa de cron jobs não críticos — Fase 0, etapa 9
SELECT cron.alter_job(job_id := 262, active := false); -- monitor-connections
SELECT cron.alter_job(job_id := 294, active := false); -- dispatcher-log-sync
SELECT cron.alter_job(job_id := 242, active := false); -- generate-blurhashes

-- 8) Policies mínimas — Fase 8, etapa 87
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

-- 9) Revoga SELECT de authenticated/anon nas matviews — Fase 8, etapa 88
REVOKE SELECT ON public.mv_stock_rupture_alert FROM authenticated, anon;
REVOKE SELECT ON public.mv_ema_kpi_by_level FROM authenticated, anon;
