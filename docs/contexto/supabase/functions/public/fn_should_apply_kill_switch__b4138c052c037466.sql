CREATE OR REPLACE FUNCTION public.fn_should_apply_kill_switch(p_switch_name text, p_bucket_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_enabled boolean;
  v_rollout smallint;
  v_bucket int;
BEGIN
  -- Lê estado do switch (RLS aplicável: anon tem SELECT)
  SELECT enabled, rollout_percentage 
    INTO v_enabled, v_rollout
  FROM public.system_kill_switches
  WHERE switch_name = p_switch_name;
  
  -- Switch não cadastrado = não aplicar (fail-open)
  IF NOT FOUND THEN RETURN false; END IF;
  
  -- Switch ATIVO (enabled=true) = nunca aplicar kill, independente de rollout
  IF v_enabled THEN RETURN false; END IF;
  
  -- Switch OFF (enabled=false): aplicar kill conforme rollout %
  IF v_rollout >= 100 THEN RETURN true; END IF;
  IF v_rollout <= 0 THEN RETURN false; END IF;
  
  -- Hash determinístico → bucket 0-99
  -- Mesmo bucket_key sempre cai no mesmo bucket (estabilidade entre reloads)
  v_bucket := abs(hashtext(coalesce(p_bucket_key, 'anonymous')) % 100);
  RETURN v_bucket < v_rollout;
END;
$function$
