CREATE OR REPLACE FUNCTION public.ownership_repair(_report_id uuid, _dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  INSERT INTO public.ownership_repair_logs (report_id, table_name, owner_column, issue_type, action, rows_affected, dry_run, triggered_by)
  VALUES (_report_id, 'multi', 'multi', 'manual_review', 'manual_review', 0, _dry_run, auth.uid());
  RETURN jsonb_build_object('status', 'logged', 'dry_run', _dry_run);
END $function$
