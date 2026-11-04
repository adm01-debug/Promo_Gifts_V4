CREATE OR REPLACE FUNCTION public.fn_spot_enqueue_vimeo_eu(p_items jsonb)
 RETURNS TABLE(enfileirados integer, ja_existentes integer, ref_nao_encontrado integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enq   int := 0;
  v_dup   int := 0;
  v_miss  int := 0;
  v_item  jsonb;
  v_vid   text;
  v_ref   text;
  v_url   text;
  v_refs  text[];
  v_enqueued_refs text[] := '{}';  -- rastrear refs já enfileiradas neste batch
BEGIN
  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    v_vid := v_item->>'vimeo_id';
    v_ref := v_item->>'ref';
    v_url := 'https://vimeo.com/' || v_vid;

    -- Produto existe ativo?
    SELECT ARRAY_AGG(DISTINCT p.supplier_reference) INTO v_refs
    FROM products p
    WHERE p.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
      AND p.supplier_reference = v_ref
      AND p.is_active = true;

    IF v_refs IS NULL OR array_length(v_refs, 1) = 0 THEN
      v_miss := v_miss + 1; CONTINUE;
    END IF;

    -- Já na fila (por vimeo_id)?
    IF EXISTS (SELECT 1 FROM video_import_queue
               WHERE youtube_id = v_vid AND source_supplier = 'SPOT') THEN
      v_dup := v_dup + 1; CONTINUE;
    END IF;

    -- Produto já tem vídeo pronto no Gold? → skip_has_video
    IF EXISTS (
      SELECT 1 FROM products p JOIN product_videos pv ON pv.product_id = p.id
      WHERE p.supplier_reference = v_ref
        AND p.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
        AND pv.is_active = true AND pv.cloudflare_status = 'ready'
    ) THEN
      INSERT INTO video_import_queue
        (youtube_id, youtube_url, source_supplier, product_references, status)
      VALUES (v_vid, v_url, 'SPOT', v_refs, 'skip_has_video')
      ON CONFLICT DO NOTHING;
      v_dup := v_dup + 1; CONTINUE;
    END IF;

    -- FIX: Mesmo produto já foi enfileirado NESTE batch? → skip_has_video
    IF v_ref = ANY(v_enqueued_refs) THEN
      INSERT INTO video_import_queue
        (youtube_id, youtube_url, source_supplier, product_references, status)
      VALUES (v_vid, v_url, 'SPOT', v_refs, 'skip_has_video')
      ON CONFLICT DO NOTHING;
      v_dup := v_dup + 1; CONTINUE;
    END IF;

    -- Enfileira como pending
    INSERT INTO video_import_queue
      (youtube_id, youtube_url, source_supplier, product_references, status)
    VALUES (v_vid, v_url, 'SPOT', v_refs, 'pending')
    ON CONFLICT DO NOTHING;

    v_enqueued_refs := v_enqueued_refs || v_ref;
    v_enq := v_enq + 1;
  END LOOP;

  RETURN QUERY SELECT v_enq, v_dup, v_miss;
END;
$function$
