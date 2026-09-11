-- ═══════════════════════════════════════════════════════════════
-- Funções de dispatch e harvest para imagens ASIA/XBZ legadas
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_asia_legacy_dispatch_batch(p_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
DECLARE
  v_count   INT := 0;
  v_item    RECORD;
  v_req_id  BIGINT;
  v_mcp_id  INT := 0;
BEGIN
  FOR v_item IN
    SELECT id, product_id, source_url, cf_custom_id, supplier_code
    FROM asia_legacy_upload_queue
    WHERE status = 'pending' AND attempt_count < 3
    ORDER BY created_at
    LIMIT p_limit
  LOOP
    v_mcp_id := v_mcp_id + 1;

    SELECT net.http_post(
      url := 'https://cloudflare-deploy-mcp.adm01.workers.dev/mcp',
      body := jsonb_build_object(
        'jsonrpc', '2.0',
        'id', v_mcp_id,
        'method', 'tools/call',
        'params', jsonb_build_object(
          'name', 'cf_images_upload_url',
          'arguments', jsonb_build_object(
            'source_url', v_item.source_url,
            'custom_id',  v_item.cf_custom_id,
            'metadata',   jsonb_build_object(
              'supplier',   v_item.supplier_code,
              'product_id', v_item.product_id::text,
              'pipeline',   'asia_legacy'
            )
          )
        )
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept', 'application/json, text/event-stream'
      ),
      timeout_milliseconds := 30000
    ) INTO v_req_id;

    UPDATE asia_legacy_upload_queue
    SET status = 'uploading',
        request_id = v_req_id,
        attempt_count = attempt_count + 1,
        updated_at = NOW()
    WHERE id = v_item.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('dispatched', v_count);
END;
$$;

-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_asia_legacy_harvest_batch()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
DECLARE
  v_done     INT := 0;
  v_fail     INT := 0;
  v_item     RECORD;
  v_resp     RECORD;
  v_body     TEXT;
  v_cf_id    TEXT;
  v_cf_url   TEXT;
  v_org      CONSTANT UUID := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
  v_cdnbase  CONSTANT TEXT := 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw';
BEGIN
  FOR v_item IN
    SELECT q.id, q.product_id, q.request_id, q.cf_custom_id,
           q.source_url, q.supplier_code
    FROM asia_legacy_upload_queue q
    WHERE q.status = 'uploading' AND q.request_id IS NOT NULL
  LOOP
    SELECT * INTO v_resp FROM net._http_response
    WHERE id = v_item.request_id LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    v_body := COALESCE(v_resp.content, '');

    -- Verificar se houve erro HTTP
    IF v_resp.status_code NOT IN (200, 201) THEN
      UPDATE asia_legacy_upload_queue
      SET status = 'error',
          error_msg = LEFT('HTTP ' || v_resp.status_code::text || ': ' || v_body, 300),
          updated_at = NOW()
      WHERE id = v_item.id;
      v_fail := v_fail + 1;
      CONTINUE;
    END IF;

    -- Extração do cf_image_id da resposta SSE/JSON
    -- O MCP Worker retorna SSE com "data: {...}" contendo o resultado
    BEGIN
      -- Tentar parsear como JSON direto
      v_cf_id := (v_body::jsonb->'result'->'content'->0->'text')::text;
      IF v_cf_id IS NOT NULL THEN
        -- É texto com o JSON da resposta CF dentro
        v_cf_id := ((v_cf_id::text)::jsonb->>'id');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_cf_id := NULL;
    END;

    -- Fallback: regex para extrair "id":"..."
    IF v_cf_id IS NULL OR TRIM(REPLACE(v_cf_id, '"', '')) = '' THEN
      v_cf_id := (REGEXP_MATCH(v_body, '"id"\s*:\s*"([a-z0-9A-Z\-_]+)"'))[1];
    END IF;

    -- Se a resposta menciona "already exists", usar o custom_id
    IF v_cf_id IS NULL AND v_body ILIKE '%already exists%' THEN
      v_cf_id := v_item.cf_custom_id;
    END IF;

    IF v_cf_id IS NULL OR TRIM(v_cf_id) = '' THEN
      -- Fallback final: usar o cf_custom_id
      -- (CF aceita o custom_id como ID se o upload foi aceito)
      IF v_body ILIKE '%"success":true%' OR v_body ILIKE '%asia-%' THEN
        v_cf_id := v_item.cf_custom_id;
      ELSE
        UPDATE asia_legacy_upload_queue
        SET status = 'error',
            error_msg = LEFT('no_cf_id: ' || v_body, 300),
            updated_at = NOW()
        WHERE id = v_item.id;
        v_fail := v_fail + 1;
        CONTINUE;
      END IF;
    END IF;

    v_cf_id := TRIM(REPLACE(v_cf_id, '"', ''));
    v_cf_url := v_cdnbase || '/' || v_cf_id || '/public';

    -- Inserir product_images (trigger fn_sync_product_images_to_products
    -- atualiza products.primary_image_url automaticamente)
    BEGIN
      INSERT INTO product_images (
        product_id, cloudflare_image_id, url_cdn, url_original,
        image_type, is_primary, is_active, display_order,
        source_supplier, organization_id,
        filename, alt_text
      ) VALUES (
        v_item.product_id,
        v_cf_id,
        v_cf_url,
        v_item.source_url,
        'main', true, true, 1,
        v_item.supplier_code,
        v_org,
        SPLIT_PART(v_item.source_url, '/', -1),
        SPLIT_PART(v_item.source_url, '/', -1)
      )
      ON CONFLICT (cloudflare_image_id) DO NOTHING;

      UPDATE asia_legacy_upload_queue
      SET status = 'done',
          cf_image_id = v_cf_id,
          updated_at = NOW()
      WHERE id = v_item.id;

      v_done := v_done + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE asia_legacy_upload_queue
      SET status = 'error',
          error_msg = LEFT(SQLERRM, 300),
          updated_at = NOW()
      WHERE id = v_item.id;
      v_fail := v_fail + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('harvested_ok', v_done, 'harvested_fail', v_fail);
END;
$$;

-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_asia_legacy_run_cycle(p_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
DECLARE
  v_lock     BOOLEAN;
  v_dispatch JSONB;
  v_harvest  JSONB;
  v_pending  INT; v_uploading INT; v_done INT; v_error INT;
BEGIN
  v_lock := pg_try_advisory_xact_lock(hashtext('fn_asia_legacy_run_cycle')::BIGINT);
  IF NOT v_lock THEN RETURN jsonb_build_object('status', 'skipped_lock'); END IF;

  v_harvest  := fn_asia_legacy_harvest_batch();
  v_dispatch := fn_asia_legacy_dispatch_batch(p_limit);

  SELECT COUNT(*) FILTER (WHERE status='pending')   INTO v_pending   FROM asia_legacy_upload_queue;
  SELECT COUNT(*) FILTER (WHERE status='uploading') INTO v_uploading FROM asia_legacy_upload_queue;
  SELECT COUNT(*) FILTER (WHERE status='done')      INTO v_done      FROM asia_legacy_upload_queue;
  SELECT COUNT(*) FILTER (WHERE status='error')     INTO v_error     FROM asia_legacy_upload_queue;

  RETURN jsonb_build_object(
    'status', 'ok',
    'dispatch', v_dispatch, 'harvest', v_harvest,
    'pending', v_pending, 'uploading', v_uploading,
    'done', v_done, 'error', v_error
  );
END;
$$;

COMMENT ON TABLE public.asia_legacy_upload_queue IS 'Upload CF Images para 382 produtos ASIA/XBZ com primary_image_url não-CF. Criado em 2026-06-10.';
COMMENT ON FUNCTION public.fn_asia_legacy_run_cycle IS 'Dispatch+harvest upload CF Images para produtos ASIA/XBZ legados. 20 itens/ciclo.';;
