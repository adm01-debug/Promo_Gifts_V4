
-- ================================================================
-- MELHORIA 5 (BUG CRÍTICO): fn_site_promote_to_gold
-- ================================================================
-- BUG: O INSERT em xbz_gallery_staging usava ON CONFLICT (sku, source_url)
-- DO NOTHING, mas não cobria a constraint uq_xbz_staging_cf_id (cf_custom_id).
-- Quando o mesmo produto é re-scrapeado com URL diferente (novo ciclo),
-- a (sku, source_url) não colide mas o cf_custom_id é idêntico → violação.
-- Resultado: xbz-site-scrape falhando toda hora por 9h+ (55 falhas).
--
-- FIX: ON CONFLICT DO NOTHING (sem target) captura QUALQUER constraint,
-- incluindo uq_xbz_staging_sku_source_url E uq_xbz_staging_cf_id.
-- Semântica: se o registro já existe na staging (por sku+url ou por cf_id),
-- silenciar é correto — o upload já ocorreu ou já está enfileirado.
-- ================================================================

CREATE OR REPLACE FUNCTION public.fn_site_promote_to_gold(
    p_supplier uuid DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid,
    p_limit    integer DEFAULT NULL::integer,
    p_only_new boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

    -- FIX 2026-06-18 (BUG CRÍTICO): ON CONFLICT DO NOTHING sem target captura
    -- QUALQUER violação de unique constraint: uq_xbz_staging_sku_source_url
    -- E uq_xbz_staging_cf_id. O ON CONFLICT (sku, source_url) anterior deixava
    -- passar duplicatas de cf_custom_id quando a source_url mudava entre scrapes.
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
    ON CONFLICT DO NOTHING;  -- FIX: cobre uq_xbz_staging_sku_source_url E uq_xbz_staging_cf_id
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
END $function$;
;
