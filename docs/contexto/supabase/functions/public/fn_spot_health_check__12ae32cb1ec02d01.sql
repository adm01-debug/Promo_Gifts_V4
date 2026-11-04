CREATE OR REPLACE FUNCTION public.fn_spot_health_check()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v json;
  v_score int;
  v_notes text[] := ARRAY[]::text[];
BEGIN
  SELECT row_to_json(h.*) INTO v FROM vw_spot_cf_health h;
  v_score := (v->>'health_score_pct')::int;

  IF (v->>'stuck')::int > 0 THEN
    v_notes := v_notes || ('⚠️ ' || (v->>'stuck') || ' vídeo(s) preso(s) em downloading >30min');
  END IF;
  IF (v->>'missing_cf_id')::int > 0 THEN
    v_notes := v_notes || ('⚠️ ' || (v->>'missing_cf_id') || ' imagens sem CF ID');
  END IF;
  IF (v->>'main_images')::int < (v->>'active_products')::int THEN
    v_notes := v_notes || ('⚠️ ' || ((v->>'active_products')::int - (v->>'main_images')::int) || ' produtos sem imagem main');
  END IF;
  IF (v->>'cf_error')::int > 0 AND (v->>'cf_error')::int < 10 THEN
    v_notes := v_notes || ('ℹ️ ' || (v->>'cf_error') || ' vídeo(s) YouTube deletado(s) — perda permanente');
  END IF;

  INSERT INTO spot_health_log (
    health_score_pct, active_products, products_with_main, total_images,
    missing_cf_id, cf_ready_videos, pending_videos, error_videos,
    downloading_stuck, notes
  ) VALUES (
    v_score,
    (v->>'active_products')::int,
    (v->>'main_images')::int,
    (v->>'total_images')::int,
    (v->>'missing_cf_id')::int,
    (v->>'cf_ready')::int,
    (v->>'cf_queued')::int,
    (v->>'cf_error')::int,
    (v->>'stuck')::int,
    CASE WHEN array_length(v_notes,1) > 0 THEN array_to_string(v_notes, ' | ') ELSE 'OK — 100/100' END
  );

  RETURN jsonb_build_object(
    'score', v_score,
    'notes', CASE WHEN array_length(v_notes,1) > 0 THEN array_to_string(v_notes,' | ') ELSE 'OK — 100/100' END,
    'cf_ready_videos', (v->>'cf_ready')::int,
    'main_images', (v->>'main_images')::int,
    'checked_at', now()
  );
END;
$function$
