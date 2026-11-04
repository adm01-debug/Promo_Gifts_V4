CREATE OR REPLACE FUNCTION public.magic_up_save_generation(_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.magic_up_generations (
    user_id, product_name, scene_title, scene_category, client_name, generated_image_url,
    campaign_id, product_id, product_sku, prompt_text, model, channel, aspect_ratio,
    quality_score, status, tags, metadata, copy_pack, export_presets
  )
  VALUES (
    auth.uid(),
    _data->>'product_name',
    _data->>'scene_title',
    _data->>'scene_category',
    _data->>'client_name',
    _data->>'generated_image_url',
    (_data->>'campaign_id')::uuid,
    _data->>'product_id',
    _data->>'product_sku',
    _data->>'prompt_text',
    _data->>'model',
    _data->>'channel',
    _data->>'aspect_ratio',
    COALESCE((_data->>'quality_score')::numeric, 0),
    COALESCE(_data->>'status','generated'),
    COALESCE(_data->'tags','[]'::jsonb),
    COALESCE(_data->'metadata','{}'::jsonb),
    COALESCE(_data->'copy_pack','{}'::jsonb),
    COALESCE(_data->'export_presets','[]'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$
