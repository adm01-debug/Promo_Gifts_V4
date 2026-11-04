CREATE OR REPLACE FUNCTION public.magic_up_create_brand_kit(_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.magic_up_brand_kits (
    user_id, client_id, client_name, logo_urls, primary_color, secondary_color,
    tone_of_voice, visual_style, required_words, forbidden_words, notes, metadata
  )
  VALUES (
    auth.uid(),
    _data->>'client_id',
    _data->>'client_name',
    COALESCE(_data->'logo_urls','[]'::jsonb),
    _data->>'primary_color',
    _data->>'secondary_color',
    _data->>'tone_of_voice',
    _data->>'visual_style',
    COALESCE(_data->'required_words','[]'::jsonb),
    COALESCE(_data->'forbidden_words','[]'::jsonb),
    _data->>'notes',
    COALESCE(_data->'metadata','{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$
