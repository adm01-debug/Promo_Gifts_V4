CREATE OR REPLACE FUNCTION public.fn_asia_complete_image_upload_batch(p_uploads jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item jsonb;
  v_q    RECORD;
  v_ok   INT := 0;
  v_err  INT := 0;
BEGIN
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_uploads)
  LOOP
    BEGIN
      SELECT * INTO v_q FROM public.asia_image_import_queue
      WHERE id = (v_item->>'queue_id')::uuid;

      IF NOT FOUND THEN v_err := v_err + 1; CONTINUE; END IF;

      INSERT INTO public.product_images (
        product_id, cloudflare_image_id, url_cdn, url_original, filename,
        image_type, is_primary, display_order, source_supplier, is_active, organization_id
      )
      VALUES (
        v_q.product_id, v_item->>'cf_image_id', v_item->>'cf_url_cdn',
        v_q.url_original, v_item->>'cf_filename',
        v_q.image_type, v_q.image_type = 'main', v_q.display_order,
        'ASIA', true, '5db5aee1-064b-4ef4-9193-345dcd8274ea'
      )
      ON CONFLICT (cloudflare_image_id) DO UPDATE SET
        url_cdn    = EXCLUDED.url_cdn,
        filename   = EXCLUDED.filename,
        updated_at = now();

      -- PATCH: atualizar primary_image_url mesmo quando é URL externa
      IF v_q.image_type = 'main' THEN
        UPDATE public.products
        SET primary_image_url = v_item->>'cf_url_cdn', updated_at = now()
        WHERE id = v_q.product_id
          AND (primary_image_url IS NULL
               OR primary_image_url NOT LIKE '%imagedelivery%');
      END IF;

      UPDATE public.asia_image_import_queue
      SET status              = 'done',
          cloudflare_image_id = v_item->>'cf_image_id',
          cf_url_cdn          = v_item->>'cf_url_cdn',
          cf_filename         = v_item->>'cf_filename',
          updated_at          = now()
      WHERE id = (v_item->>'queue_id')::uuid;

      v_ok := v_ok + 1;

    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', v_ok, 'err', v_err, 'ts', now());
END;
$function$
