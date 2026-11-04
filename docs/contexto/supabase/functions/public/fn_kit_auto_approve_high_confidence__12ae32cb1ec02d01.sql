CREATE OR REPLACE FUNCTION public.fn_kit_auto_approve_high_confidence()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Aprovar registros com confidence alta (>= 0.70) que estão pending há mais de 1h
  UPDATE kit_component_padronizacao
  SET 
    padronizacao_status = 'approved',
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE padronizacao_status = 'pending'
    AND enrichment_confidence >= 0.70
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$function$
