CREATE OR REPLACE FUNCTION public.fn_asia_dispatch_queue_batch(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  v_count        integer := 0;
  v_first_req_id bigint;
  v_last_req_id  bigint;
  v_req_id       bigint;
  v_mcp_id       integer := 0;
  v_item         RECORD;
BEGIN
  FOR v_item IN
    SELECT id, url_original, cf_image_id_canonical, image_type, product_id
    FROM asia_image_import_queue
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT p_limit
  LOOP
    v_mcp_id := v_mcp_id + 1;

    SELECT net.http_post(
      url     := 'https://cloudflare-deploy-mcp.adm01.workers.dev/mcp',
      body    := jsonb_build_object(
        'jsonrpc', '2.0', 'id', v_mcp_id, 'method', 'tools/call',
        'params', jsonb_build_object(
          'name', 'cf_images_upload_url',
          'arguments', jsonb_build_object(
            'source_url', v_item.url_original,
            'custom_id',  v_item.cf_image_id_canonical,
            'metadata',   jsonb_build_object(
              'supplier',   'asia',
              'image_type', v_item.image_type,
              'product_id', v_item.product_id::text
            )
          )
        )
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept',       'application/json, text/event-stream'
      ),
      timeout_milliseconds := 30000
    ) INTO v_req_id;

    INSERT INTO asia_upload_mapping (request_id, queue_id, cf_custom_id, source_url)
    VALUES (v_req_id, v_item.id, v_item.cf_image_id_canonical, v_item.url_original);

    UPDATE asia_image_import_queue
    SET status = 'uploading', attempts = attempts + 1, updated_at = NOW()
    WHERE id = v_item.id;

    v_count := v_count + 1;
    IF v_first_req_id IS NULL THEN v_first_req_id := v_req_id; END IF;
    v_last_req_id := v_req_id;
  END LOOP;

  RETURN jsonb_build_object('dispatched', v_count, 'first_req_id', v_first_req_id, 'last_req_id', v_last_req_id);
END;
$function$
