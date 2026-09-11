
CREATE OR REPLACE FUNCTION public.fn_parse_binding_type_code(
  p_name text, p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_all text := lower(coalesce(p_name,'') || ' ' || coalesce(p_description,''));
BEGIN
  IF v_all ILIKE ANY(ARRAY['%wire-o%','%wire o%','%wire_o%','%wiire%']) THEN RETURN 'WIRE_O'; END IF;
  IF v_all ILIKE '%espiral%' OR v_all ILIKE '%spiral%' THEN RETURN 'SPIRAL'; END IF;
  IF v_all ILIKE ANY(ARRAY['%argolas%','%fichário%','%ring bound%','%ring-bound%']) THEN RETURN 'RING'; END IF;
  -- costurado/costurada
  IF v_all ILIKE '%costurad%' OR v_all ILIKE '%sewn%' OR v_all ILIKE '%stitched%' THEN RETURN 'SEWN'; END IF;
  -- grampo/grampeado/grampeada
  IF v_all ILIKE ANY(ARRAY['%gramp%','%canoa%','%saddle%']) THEN RETURN 'SADDLE'; END IF;
  IF v_all ILIKE '%brochura%' OR v_all ILIKE '%lombada quadrada%' OR v_all ILIKE '%perfect bound%' THEN RETURN 'PERFECT'; END IF;
  IF v_all ILIKE '%disco%' OR v_all ILIKE '%disc bound%' THEN RETURN 'DISC'; END IF;
  -- Capa dura sem argolas → CASE
  IF v_all ILIKE '%capa dura%' AND v_all NOT ILIKE '%espiral%' AND v_all NOT ILIKE '%wire%' THEN
    RETURN 'CASE';
  END IF;
  RETURN NULL;
END;
$$;
;
