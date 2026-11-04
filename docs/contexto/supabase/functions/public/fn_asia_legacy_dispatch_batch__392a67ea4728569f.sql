CREATE OR REPLACE FUNCTION public.fn_asia_legacy_dispatch_batch(p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'archive'
AS $function$
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
$function$
