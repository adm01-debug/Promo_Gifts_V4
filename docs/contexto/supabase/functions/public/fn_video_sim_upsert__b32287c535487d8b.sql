CREATE OR REPLACE FUNCTION public.fn_video_sim_upsert(p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_n int;
BEGIN
  INSERT INTO video_sim_results (sup, yid, queue_status, cur_w, cur_h, max_w, max_h, err, checked_at)
  SELECT i->>'sup', i->>'yid', i->>'st',
         NULLIF(i->>'cw','')::int, NULLIF(i->>'ch','')::int,
         NULLIF(i->>'mw','')::int, NULLIF(i->>'mh','')::int,
         NULLIF(i->>'err',''), now()
  FROM jsonb_array_elements(p_items) i
  WHERE i->>'yid' IS NOT NULL
  ON CONFLICT (sup, yid) DO UPDATE SET
    queue_status = EXCLUDED.queue_status,
    cur_w = EXCLUDED.cur_w,  cur_h = EXCLUDED.cur_h,
    max_w = EXCLUDED.max_w,  max_h = EXCLUDED.max_h,
    err = EXCLUDED.err,      checked_at = now();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $function$
