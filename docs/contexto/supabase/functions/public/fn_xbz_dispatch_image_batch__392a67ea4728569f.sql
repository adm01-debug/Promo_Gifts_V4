CREATE OR REPLACE FUNCTION public.fn_xbz_dispatch_image_batch(p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
    v_count integer:=0; v_first_req_id bigint; v_last_req_id bigint;
    v_req_id bigint; v_mcp_id integer:=0; v_img RECORD;
BEGIN
    FOR v_img IN
        SELECT xgs.id, xgs.sku, xgs.display_order, xgs.source_url,
               xgs.product_id, xgs.cf_custom_id,
               xgs.image_type
        FROM public.xbz_gallery_staging xgs
        JOIN public.products p ON p.id=xgs.product_id AND p.is_active=true
        WHERE xgs.status='pending'
          AND xgs.cf_custom_id IS NOT NULL
          AND xgs.source_url IS NOT NULL
        ORDER BY xgs.sku, xgs.display_order
        LIMIT p_limit
    LOOP
        v_mcp_id := v_mcp_id+1;
        SELECT net.http_post(
            url   := 'https://cloudflare-deploy-mcp.adm01.workers.dev/mcp',
            body  := jsonb_build_object(
                'jsonrpc','2.0','id',v_mcp_id,'method','tools/call',
                'params', jsonb_build_object(
                    'name','cf_images_upload_url',
                    'arguments', jsonb_build_object(
                        'source_url', v_img.source_url,
                        'custom_id',  v_img.cf_custom_id,
                        'metadata',   jsonb_build_object(
                            'supplier','xbz','image_type',v_img.image_type,
                            'sku',v_img.sku,'display_order',v_img.display_order
                        )
                    )
                )
            ),
            headers := jsonb_build_object(
                'Content-Type','application/json','Accept','application/json, text/event-stream'
            ),
            timeout_milliseconds := 30000
        ) INTO v_req_id;

        INSERT INTO public.xbz_upload_mapping (request_id, staging_id, cf_custom_id, source_url)
        VALUES (v_req_id, v_img.id, v_img.cf_custom_id, v_img.source_url);

        UPDATE public.xbz_gallery_staging
           SET status='uploading', updated_at=now()
        WHERE id=v_img.id;

        v_count := v_count+1;
        IF v_first_req_id IS NULL THEN v_first_req_id:=v_req_id; END IF;
        v_last_req_id := v_req_id;
    END LOOP;
    RETURN jsonb_build_object('dispatched',v_count,'first_req_id',v_first_req_id,'last_req_id',v_last_req_id);
END $function$
