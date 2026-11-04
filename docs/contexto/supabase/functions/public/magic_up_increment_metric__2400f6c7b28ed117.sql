CREATE OR REPLACE FUNCTION public.magic_up_increment_metric(_kit_id uuid, _metric text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.magic_up_brand_kits
  SET metadata = jsonb_set(COALESCE(metadata,'{}'::jsonb), ARRAY['metrics', _metric], 
    to_jsonb(COALESCE((metadata->'metrics'->>_metric)::int, 0) + 1))
  WHERE id = _kit_id AND user_id = auth.uid();
END $function$
