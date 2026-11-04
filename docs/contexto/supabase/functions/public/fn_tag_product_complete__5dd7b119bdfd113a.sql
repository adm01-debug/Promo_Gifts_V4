CREATE OR REPLACE FUNCTION public.fn_tag_product_complete(p_product_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rules  jsonb;
  v_flags  jsonb;
BEGIN
  v_rules := public.fn_apply_auto_tag_rules(p_product_id);
  v_flags := public.fn_apply_supplier_flag_tags(p_product_id);

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'rules',  v_rules,
    'flags',  v_flags,
    'total_added', COALESCE((v_rules->>'tags_added')::int, 0)
                 + COALESCE((v_flags->>'added')::int, 0)
  );
END;
$function$
