CREATE OR REPLACE FUNCTION public.rotate_mcp_key(_key_id uuid, _new_key_hash text, _new_key_prefix text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_old record; v_new_id uuid;
BEGIN
  SELECT * INTO v_old FROM public.mcp_api_keys 
  WHERE id = _key_id AND (created_by = auth.uid() OR public.is_admin(auth.uid()));
  IF NOT FOUND THEN RAISE EXCEPTION 'Key not found or access denied'; END IF;
  INSERT INTO public.mcp_api_keys (name, key_hash, key_prefix, scopes, description, created_by, expires_at, rotated_from)
  VALUES (v_old.name || ' (rotated)', _new_key_hash, _new_key_prefix, v_old.scopes, v_old.description, auth.uid(), v_old.expires_at, _key_id)
  RETURNING id INTO v_new_id;
  UPDATE public.mcp_api_keys SET revoked_at = now() WHERE id = _key_id;
  RETURN v_new_id;
END $function$
