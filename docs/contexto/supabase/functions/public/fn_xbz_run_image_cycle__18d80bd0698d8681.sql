CREATE OR REPLACE FUNCTION public.fn_xbz_run_image_cycle(p_limit integer DEFAULT 50, p_wait_seconds integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
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
END $function$
