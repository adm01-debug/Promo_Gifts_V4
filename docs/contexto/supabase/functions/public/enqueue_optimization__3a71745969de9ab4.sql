CREATE OR REPLACE FUNCTION public.enqueue_optimization(_title text, _description text DEFAULT NULL::text, _category text DEFAULT 'performance'::text, _priority integer DEFAULT 100)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_dev((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.optimization_queue (title, description, category, priority, created_by)
  VALUES (_title, _description, COALESCE(_category, 'performance'), COALESCE(_priority, 100), (SELECT auth.uid()))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$
