CREATE OR REPLACE FUNCTION public.magic_up_calculate_score(_generation_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_score numeric;
BEGIN
  -- A edge function magic-up-score implementa lógica detalhada; aqui só retorna o quality_score salvo
  SELECT quality_score INTO v_score FROM public.magic_up_generations WHERE id = _generation_id;
  RETURN COALESCE(v_score, 0);
END $function$
