
-- ═══════════════════════════════════════════════════════════════
-- PARTE 2: REESCREVER 6 FUNÇÕES para usar novos nomes de coluna
-- ═══════════════════════════════════════════════════════════════

-- FN 1: fn_site_promote_to_gold
CREATE OR REPLACE FUNCTION public.fn_site_promote_to_gold(
    p_supplier uuid DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid,
    p_limit    integer DEFAULT NULL::integer,
    p_only_new boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_linked integer:=0; v_phys_a integer:=0; v_phys_e integer:=0;
    v_props_b integer:=0; v_props_f integer:=0; v_rel integer:=0;
    v_xcat integer:=0; v_imgs integer:=0; v_promoted integer:=0;
BEGIN
    WITH lnk AS (
        SELECT s.id, p.product_id
        FROM public.produtos_site_padronizacao s
        JOIN public.produtos_padronizacao p
          ON p.supplier_id=s.supplier_id AND p.supplier_reference=s.supplier_reference
        WHERE s.supplier_id=p_supplier AND p.product_id IS NOT NULL
          AND s.product_id IS NULL AND s.status<>'rejected'
    )
    UPDATE public.produtos_site_padronizacao t
       SET product_id=lnk.product_id, updated_at=now()
      FROM lnk WHERE t.id=lnk.id;
    GET DIAGNOSTICS v_linked=ROW_COUNT;

    CREATE TEMP TABLE _scope ON COMMIT DROP AS
        SELECT s.* FROM public.produtos_site_padronizacao s
        WHERE s.supplier_id=p_supplier AND s.product_id IS NOT NULL
          AND s.status=CASE WHEN p_only_new
                            THEN 'standardized'::public.produtos_padronizacao_status
                            ELSE s.status END
          AND s.status<>'rejected'
        LIMIT COALESCE(p_limit,1000000000);

    IF NOT EXISTS (SELECT 1 FROM _scope) THEN
        RETURN jsonb_build_object('linked',v_linked,'note','nada_novo');
    END IF;

    INSERT INTO public.product_physical (product_id, diameter_cm)
        SELECT product_id, diameter_cm FROM _scope WHERE diameter_cm IS NOT NULL
        ON CONFLICT (product_id) DO UPDATE
            SET diameter_cm=COALESCE(public.product_physical.diameter_cm,EXCLUDED.diameter_cm), updated_at=now();
    GET DIAGNOSTICS v_phys_a=ROW_COUNT;

    INSERT INTO public.product_properties (product_id, property_code, property_value, source, raw_value)
        SELECT s.product_id, kv.code, kv.val, kv.src, kv.val FROM _scope s
        CROSS JOIN LATERAL (VALUES
            ('site_ficha_tecnica_pdf', s.datasheet_pdf_url, 'xbz_site'),
            ('site_modo_de_uso', s.usage_instructions, 'xbz_site'),
            ('site_disclaimer', s.disclaimer, 'xbz_site'),
            ('circumference_cm', s.circumference_cm::text, 'xbz_site'),
            ('site_categoria_path',(SELECT string_agg(c->>'nome',' > ' ORDER BY (c->>'nivel')::int)
                                    FROM jsonb_array_elements(COALESCE(s.categories,'[]'::jsonb)) c),'xbz_site'),
            ('site_url', s.source_url, 'xbz_site'),
            ('material_xbz_primary', NULLIF(public.extract_xbz_material_primary(
                upper(COALESCE(s.name,'')), upper(COALESCE(s.description,''))),''), 'xbz_extractor')
        ) AS kv(code,val,src)
        WHERE kv.val IS NOT NULL AND btrim(kv.val)<>''
        ON CONFLICT (product_id, property_code) DO UPDATE
            SET property_value=EXCLUDED.property_value, raw_value=EXCLUDED.raw_value,
                source=EXCLUDED.source, updated_at=now();
    GET DIAGNOSTICS v_props_b=ROW_COUNT;

    INSERT INTO public.product_relationships (product_id, related_product_id, relationship_type, is_active)
        SELECT DISTINCT s.product_id, rp.product_id, 'related', true FROM _scope s
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.related_references,'[]'::jsonb)) rel
        JOIN public.produtos_padronizacao rp
          ON rp.supplier_id=s.supplier_id AND rp.supplier_reference=rel->>'codigo'
          AND rp.product_id IS NOT NULL
        WHERE (rel->>'codigo') IS NOT NULL AND rp.product_id<>s.product_id
        ON CONFLICT (product_id,related_product_id,relationship_type) DO NOTHING;
    GET DIAGNOSTICS v_rel=ROW_COUNT;

    INSERT INTO public.product_category_assignments (product_id, category_id, is_primary, display_order)
        SELECT DISTINCT s.product_id, xcat.category_id, false, 995 FROM _scope s
        CROSS JOIN LATERAL public.classify_xbz_category(upper(COALESCE(s.name,''))) xcat
        WHERE xcat.confidence IN ('high','medium') AND xcat.category_id IS NOT NULL
          AND xcat.category_name<>'NÃO CLASSIFICADO' AND s.name IS NOT NULL
        ON CONFLICT (product_id, category_id) DO NOTHING;
    GET DIAGNOSTICS v_xcat=ROW_COUNT;

    INSERT INTO public.product_physical (product_id, weight_g, height_cm, width_cm, length_cm)
        SELECT product_id, weight_g::numeric, height_cm, width_cm, depth_cm FROM _scope
        WHERE weight_g IS NOT NULL OR height_cm IS NOT NULL OR width_cm IS NOT NULL OR depth_cm IS NOT NULL
        ON CONFLICT (product_id) DO UPDATE
            SET weight_g=COALESCE(public.product_physical.weight_g,EXCLUDED.weight_g),
                height_cm=COALESCE(public.product_physical.height_cm,EXCLUDED.height_cm),
                width_cm=COALESCE(public.product_physical.width_cm,EXCLUDED.width_cm),
                length_cm=COALESCE(public.product_physical.length_cm,EXCLUDED.length_cm),
                updated_at=now();
    GET DIAGNOSTICS v_phys_e=ROW_COUNT;

    INSERT INTO public.product_properties (product_id, property_code, property_value, source, raw_value)
        SELECT s.product_id, kv.code, kv.val, 'xbz_site', kv.val FROM _scope s
        CROSS JOIN LATERAL (VALUES
            ('site_cores_swatches', CASE WHEN jsonb_array_length(COALESCE(s.colors,'[]'::jsonb))>0 THEN s.colors::text ELSE NULL END),
            ('gravacao_medida', s.engraving_text),
            ('gravacao_comprimento_cm', s.engraving_length_cm::text),
            ('gravacao_largura_cm', s.engraving_width_cm::text),
            ('gravacao_local', NULLIF(s.engraving_location,'')),
            ('site_video_youtube_id', CASE WHEN s.has_video AND s.video_embed_id IS NOT NULL THEN s.video_embed_id ELSE NULL END),
            ('site_video_watch_url', CASE WHEN s.has_video AND s.video_watch_url IS NOT NULL THEN s.video_watch_url ELSE NULL END),
            ('site_imagens_urls', CASE WHEN jsonb_array_length(COALESCE(s.images,'[]'::jsonb))>0 THEN s.images::text ELSE NULL END)
        ) AS kv(code,val)
        WHERE kv.val IS NOT NULL AND btrim(kv.val)<>''
        ON CONFLICT (product_id, property_code) DO UPDATE
            SET property_value=EXCLUDED.property_value, raw_value=EXCLUDED.raw_value, updated_at=now();
    GET DIAGNOSTICS v_props_f=ROW_COUNT;

    -- INSERT usa nomes SM-style
    INSERT INTO public.xbz_gallery_staging (
        sku, source_url, product_id, supplier_id,
        display_order, image_type, is_primary,
        source, status, cf_custom_id, cf_filename, image_slug, populated_at
    )
    SELECT DISTINCT
        s.supplier_reference,
        img->>'url_origem',
        s.product_id,
        p_supplier,
        (img->>'ordem')::integer,
        CASE WHEN (img->>'ordem')::integer=0 THEN 'main' ELSE 'gallery' END,
        (img->>'ordem')::integer=0,
        'site', 'pending',
        'xbz-'||lower(regexp_replace(s.supplier_reference,'[^a-zA-Z0-9]','-','g'))
            ||CASE WHEN (img->>'ordem')::integer=0 THEN '-main'
                   ELSE '-gal-'||lpad((img->>'ordem'),2,'0') END,
        lower(regexp_replace(s.supplier_reference,'[^a-zA-Z0-9]','-','g'))
            ||CASE WHEN (img->>'ordem')::integer=0 THEN '-main'
                   ELSE '-gal-'||lpad((img->>'ordem'),2,'0') END||'.jpg',
        lower(regexp_replace(s.supplier_reference,'[^a-zA-Z0-9]','-','g')),
        now()
    FROM _scope s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.images,'[]'::jsonb)) img
    WHERE (img->>'url_origem') IS NOT NULL AND btrim(img->>'url_origem')<>''
      AND (img->>'ordem')::integer BETWEEN 0 AND 9
    ON CONFLICT (sku, source_url) DO NOTHING;
    GET DIAGNOSTICS v_imgs=ROW_COUNT;

    UPDATE public.produtos_site_padronizacao t
       SET status='promoted'::public.produtos_padronizacao_status,
           promoted_at=now(), updated_at=now()
    WHERE t.id IN (SELECT id FROM _scope);
    GET DIAGNOSTICS v_promoted=ROW_COUNT;

    RETURN jsonb_build_object(
        'linked',v_linked,'physical_diam',v_phys_a,'physical_dims',v_phys_e,
        'properties_b',v_props_b,'properties_f',v_props_f,
        'relationships',v_rel,'category_xbz',v_xcat,
        'imgs_staging',v_imgs,'promoted',v_promoted
    );
END $$;

-- FN 2: fn_xbz_dispatch_image_batch
CREATE OR REPLACE FUNCTION public.fn_xbz_dispatch_image_batch(p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net AS $$
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
END $$;

-- FN 3: fn_xbz_harvest_image_batch
CREATE OR REPLACE FUNCTION public.fn_xbz_harvest_image_batch()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net AS $$
DECLARE
    v_succeeded integer:=0; v_dup integer:=0; v_failed integer:=0;
    v_rec RECORD; v_inner_json jsonb; v_outcome text; v_cf_url text; v_pi uuid;
    c_tid_main    CONSTANT uuid:='7ea182ff-edcc-4c4c-b7a1-443b07500f6c';
    c_tid_gallery CONSTANT uuid:='1590e144-e3f8-41e6-98f9-f4a25bae496d';
    c_org         CONSTANT uuid:='5db5aee1-064b-4ef4-9193-345dcd8274ea';
BEGIN
    FOR v_rec IN
        SELECT m.request_id, m.staging_id, m.cf_custom_id,
               xgs.product_id, xgs.display_order, xgs.source_url, xgs.image_type,
               r.status_code,
               (r.content::jsonb)->'result'->'content'->0->>'text' AS inner_text
        FROM public.xbz_upload_mapping m
        JOIN net._http_response r  ON r.id=m.request_id
        JOIN public.xbz_gallery_staging xgs ON xgs.id=m.staging_id
        WHERE m.status='pending' AND r.status_code IS NOT NULL
    LOOP
        v_inner_json:=NULL;
        BEGIN
            IF v_rec.inner_text LIKE '{%}' THEN v_inner_json:=v_rec.inner_text::jsonb; END IF;
        EXCEPTION WHEN OTHERS THEN v_inner_json:=NULL;
        END;

        v_outcome:=CASE
            WHEN v_inner_json IS NOT NULL AND v_inner_json->>'id' IS NOT NULL THEN 'uploaded'
            WHEN v_rec.inner_text LIKE '%already exists%' OR v_rec.inner_text LIKE '%5414%' THEN 'duplicate'
            WHEN v_rec.status_code!=200 OR v_rec.inner_text ILIKE '%error%'
              OR v_rec.inner_text IS NULL THEN 'error'
            ELSE 'unknown'
        END;

        v_cf_url:='https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/'||v_rec.cf_custom_id||'/public';

        IF v_outcome IN ('uploaded','duplicate') THEN
            v_pi:=NULL;
            INSERT INTO public.product_images (
                product_id, cloudflare_image_id, url_cdn, url_original,
                filename, image_type, image_type_id,
                is_primary, display_order, source_supplier, supplier_code,
                applies_to_color, is_active, organization_id
            ) VALUES (
                v_rec.product_id, v_rec.cf_custom_id, v_cf_url, v_rec.source_url,
                v_rec.cf_custom_id||'.jpg',
                v_rec.image_type,
                CASE v_rec.image_type WHEN 'main' THEN c_tid_main ELSE c_tid_gallery END,
                v_rec.display_order=0, v_rec.display_order,
                'xbz','XBZ', false, true, c_org
            )
            ON CONFLICT (product_id, filename) WHERE (is_active=true AND filename IS NOT NULL)
            DO UPDATE SET cloudflare_image_id=EXCLUDED.cloudflare_image_id,
                          url_cdn=EXCLUDED.url_cdn, updated_at=now()
            RETURNING id INTO v_pi;

            UPDATE public.xbz_gallery_staging SET
                cloudflare_image_id = v_rec.cf_custom_id,
                cf_custom_id        = v_rec.cf_custom_id,
                cloudflare_url      = v_cf_url,
                status              = 'uploaded',
                uploaded_at         = now(),
                product_image_id    = v_pi,
                updated_at          = now()
            WHERE id=v_rec.staging_id;

            IF v_rec.display_order=0 THEN
                UPDATE public.products SET primary_image_url=v_cf_url, updated_at=now()
                WHERE id=v_rec.product_id
                  AND (primary_image_url IS NULL OR primary_image_url NOT LIKE '%imagedelivery%');
            END IF;

            IF v_outcome='duplicate' THEN v_dup:=v_dup+1; ELSE v_succeeded:=v_succeeded+1; END IF;
        ELSE
            UPDATE public.xbz_gallery_staging SET
                status        = 'error',
                error_message = left(coalesce(v_rec.inner_text,'no_response'),200),
                retry_count   = coalesce(retry_count,0)+1,
                updated_at    = now()
            WHERE id=v_rec.staging_id;
            v_failed:=v_failed+1;
        END IF;

        UPDATE public.xbz_upload_mapping SET status=v_outcome, harvested_at=now()
        WHERE request_id=v_rec.request_id;
    END LOOP;

    RETURN jsonb_build_object(
        'succeeded',v_succeeded,'duplicates',v_dup,'failed',v_failed,
        'still_pending',(SELECT COUNT(*) FROM public.xbz_upload_mapping WHERE status='pending')
    );
END $$;

-- FN 4: fn_xbz_recover_stale
CREATE OR REPLACE FUNCTION public.fn_xbz_recover_stale()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_recovered integer; v_retried integer; v_mapping_stale integer;
BEGIN
    UPDATE public.xbz_gallery_staging
       SET status='pending', updated_at=now()
    WHERE status='uploading' AND updated_at < now()-INTERVAL '5 minutes';
    GET DIAGNOSTICS v_recovered=ROW_COUNT;

    UPDATE public.xbz_gallery_staging
       SET status='pending', error_message=NULL, updated_at=now()
    WHERE status='error'
      AND coalesce(retry_count,0)<3
      AND error_message NOT ILIKE '%404%'
      AND error_message NOT ILIKE '%not found%'
      AND error_message NOT ILIKE '%permanent%';
    GET DIAGNOSTICS v_retried=ROW_COUNT;

    UPDATE public.xbz_upload_mapping SET status='stale'
    WHERE status='pending' AND created_at < now()-INTERVAL '5 minutes';
    GET DIAGNOSTICS v_mapping_stale=ROW_COUNT;

    RETURN jsonb_build_object(
        'staging_recovered',v_recovered,'errors_retried',v_retried,'mapping_stale',v_mapping_stale
    );
END $$;

-- FN 5: fn_xbz_run_image_cycle
CREATE OR REPLACE FUNCTION public.fn_xbz_run_image_cycle(
    p_limit integer DEFAULT 50, p_wait_seconds integer DEFAULT 50
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net AS $$
DECLARE
    v_lock_acquired boolean; v_dispatch jsonb; v_harvest jsonb;
    v_stale jsonb; v_pending_count bigint;
BEGIN
    v_lock_acquired:=pg_try_advisory_lock(74108912);
    IF NOT v_lock_acquired THEN
        RETURN jsonb_build_object(
            'status','skipped_already_running',
            'pending_staging',(SELECT COUNT(*) FROM public.xbz_gallery_staging WHERE status='pending')
        );
    END IF;
    BEGIN
        v_stale  := public.fn_xbz_recover_stale();
        PERFORM    public.fn_xbz_harvest_image_batch();
        SELECT COUNT(*) INTO v_pending_count FROM public.xbz_gallery_staging WHERE status='pending';
        IF v_pending_count=0 THEN
            PERFORM pg_advisory_unlock(74108912);
            RETURN jsonb_build_object('status','no_pending','stale_result',v_stale);
        END IF;
        v_dispatch := public.fn_xbz_dispatch_image_batch(p_limit);
        IF (v_dispatch->>'dispatched')::int=0 THEN
            PERFORM pg_advisory_unlock(74108912);
            RETURN jsonb_build_object('status','dispatch_empty','stale_result',v_stale);
        END IF;
        PERFORM pg_sleep(p_wait_seconds);
        v_harvest := public.fn_xbz_harvest_image_batch();
        PERFORM pg_advisory_unlock(74108912);
        RETURN jsonb_build_object(
            'status','ok',
            'dispatched',   v_dispatch->>'dispatched',
            'harvest',      v_harvest,
            'stale_result', v_stale,
            'pending_staging', (SELECT COUNT(*) FROM public.xbz_gallery_staging WHERE status='pending'),
            'uploading',       (SELECT COUNT(*) FROM public.xbz_gallery_staging WHERE status='uploading')
        );
    EXCEPTION WHEN OTHERS THEN
        PERFORM pg_advisory_unlock(74108912);
        RAISE;
    END;
END $$;

-- FN 6: fn_site_pipeline_health
CREATE OR REPLACE FUNCTION public.fn_site_pipeline_health(
    p_supplier uuid DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE r jsonb;
BEGIN
    SELECT jsonb_build_object(
        'ts', now(),
        'bronze', (SELECT jsonb_build_object(
            'total',count(*),'processed',count(*) FILTER (WHERE site_status::text='processed'),
            'failed',count(*) FILTER (WHERE site_status::text='failed'),
            'sem_scrape',count(*) FILTER (WHERE site_status IS NULL),
            'pct_done',round(100.0*count(*) FILTER (WHERE site_status::text='processed')/nullif(count(*),0),1)
        ) FROM public.supplier_products_raw WHERE supplier_id=p_supplier),
        'silver_api', (SELECT jsonb_build_object(
            'total_pais',count(*),'promoted',count(*) FILTER (WHERE status='promoted'),
            'ncm_pct',round(100.0*count(*) FILTER (WHERE ncm_code IS NOT NULL)/nullif(count(*),0),2),
            'sem_ncm_worklist',count(*) FILTER (WHERE validation_errors ? 'ncm_ausente_origem')
        ) FROM public.produtos_padronizacao WHERE supplier_id=p_supplier),
        'silver_site', (SELECT jsonb_build_object(
            'total',count(*),'promoted',count(*) FILTER (WHERE status='promoted'),
            'standardized',count(*) FILTER (WHERE status='standardized'),
            'rejected',count(*) FILTER (WHERE status='rejected'),
            'linkados',count(*) FILTER (WHERE product_id IS NOT NULL),
            'pct_promoted',round(100.0*count(*) FILTER (WHERE status='promoted')/nullif(count(*),0),1)
        ) FROM public.produtos_site_padronizacao WHERE supplier_id=p_supplier),
        'staging_imagens', (SELECT jsonb_build_object(
            'total',count(*),'produtos',count(DISTINCT sku),
            'pending',  count(*) FILTER (WHERE status='pending'),
            'uploading',count(*) FILTER (WHERE status='uploading'),
            'uploaded', count(*) FILTER (WHERE status='uploaded'),
            'error',    count(*) FILTER (WHERE status='error')
        ) FROM public.xbz_gallery_staging),
        'cron',(SELECT row_to_json(t) FROM (
            SELECT jobid,schedule,active FROM cron.job
            WHERE command ILIKE '%fn_xbz_site_tick%' LIMIT 1
        ) t)
    ) INTO r;
    RETURN r;
END $$;

NOTIFY pgrst, 'reload schema';
;
