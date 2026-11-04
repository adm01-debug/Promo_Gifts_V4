CREATE OR REPLACE FUNCTION public.fn_kit_auto_promote_approved()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pad_id UUID;
  v_cnt INTEGER := 0;
BEGIN
  FOR v_pad_id IN
    SELECT id FROM kit_component_padronizacao
    WHERE padronizacao_status = 'approved'
    ORDER BY created_at
    LIMIT 200
  LOOP
    BEGIN
      PERFORM fn_promote_kit_component_padronizacao(v_pad_id);
      v_cnt := v_cnt + 1;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END;
$function$
