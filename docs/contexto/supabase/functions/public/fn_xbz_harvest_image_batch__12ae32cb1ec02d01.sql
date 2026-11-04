CREATE OR REPLACE FUNCTION public.fn_xbz_harvest_image_batch()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
    v_succeeded integer:=0; v_dup integer:=0; v_failed integer:=0;
    v_rec RECORD; v_inner_json jsonb; v_outcome text; v_cf_url text; v_pi uuid;
    v_existing_pi uuid;   -- FIX: para recuperar product_image_id quando cf_id já existe
    c_tid_main    CONSTANT uuid:='7ea182ff-edcc-4c4c-b7a1-443b07500f6c';
    c_tid_gallery CONSTANT uuid:='1590e144-e3f8-41e6-98f9-f4a25bae496d';
    c_tid_set     CONSTANT uuid:='c305d8b3-9af8-469e-aea5-88208def353f';
    c_tid_ambient CONSTANT uuid:='e8bf8d1f-b6f5-47c1-953b-616d354318a6';
    c_tid_detail  CONSTANT uuid:='055e7e81-61c5-4546-a43c-3256a581966e';
    c_tid_product CONSTANT uuid:='49991e77-2511-482a-bce3-15ab73c2b74f';
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
            v_existing_pi:=NULL;

            -- FIX GAP-4 (relacionado): verificar se cloudflare_image_id já existe em product_images
            -- para evitar violação de unique constraint "product_images_cloudflare_image_id_key"
            SELECT id INTO v_existing_pi
            FROM public.product_images
            WHERE cloudflare_image_id = v_rec.cf_custom_id
            LIMIT 1;

            IF v_existing_pi IS NOT NULL THEN
                -- CF ID já existe: reutilizar o product_image existente sem nova inserção
                v_pi := v_existing_pi;
                v_dup := v_dup + 1;
            ELSE
                INSERT INTO public.product_images (
                    product_id, cloudflare_image_id, url_cdn, url_original,
                    filename, image_type, image_type_id,
                    is_primary, display_order, source_supplier, supplier_code,
                    applies_to_color, is_active, organization_id
                ) VALUES (
                    v_rec.product_id, v_rec.cf_custom_id, v_cf_url, v_rec.source_url,
                    v_rec.cf_custom_id||'.jpg',
                    v_rec.image_type,
                    CASE v_rec.image_type
                        WHEN 'main'    THEN c_tid_main
                        WHEN 'set'     THEN c_tid_set
                        WHEN 'ambient' THEN c_tid_ambient
                        WHEN 'detail'  THEN c_tid_detail
                        WHEN 'product' THEN c_tid_product
                        ELSE c_tid_gallery
                    END,
                    v_rec.display_order=0, v_rec.display_order,
                    'XBZ','XBZ', false, true, c_org
                )
                ON CONFLICT (product_id, filename) WHERE (is_active=true AND filename IS NOT NULL)
                DO UPDATE SET cloudflare_image_id=EXCLUDED.cloudflare_image_id,
                              url_cdn=EXCLUDED.url_cdn,
                              image_type_id=EXCLUDED.image_type_id,
                              updated_at=now()
                RETURNING id INTO v_pi;

                IF v_outcome='duplicate' THEN v_dup:=v_dup+1; ELSE v_succeeded:=v_succeeded+1; END IF;
            END IF;

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
END $function$
