
-- FIX: binding_color só detectado quando cor aparece com contexto de espiral/wire-o
-- "espiral preto", "wire-o prata", "encadernação espiral branca"
-- NÃO: "capa preta", "caderneta branca"

CREATE OR REPLACE FUNCTION public.fn_parse_binding_color_code(
  p_description text
) RETURNS text LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_desc text := lower(coalesce(p_description,''));
BEGIN
  -- Só detectar cor de espiral quando há CONTEXTO explícito de encadernação
  -- Padrões: "espiral preto", "wire-o prata", "encadernação espiral branca", 
  --           "espiral em prata", "wire-o em preto"
  IF v_desc ~ '(?i)(espiral|wire.?o|encadernação).{0,30}(pret[ao]|negr[ao])'
     OR v_desc ~ '(?i)(pret[ao]|negr[ao]).{0,30}(espiral|wire.?o)' THEN RETURN 'BLACK'; END IF;

  IF v_desc ~ '(?i)(espiral|wire.?o|encadernação).{0,30}(prat[ao]|prateado|inox|cinza metálico|alumín)'
     OR v_desc ~ '(?i)(prat[ao]|prateado|inox).{0,30}(espiral|wire.?o)' THEN RETURN 'SILVER'; END IF;

  IF v_desc ~ '(?i)(espiral|wire.?o|encadernação).{0,30}(dourad[ao]|gold|golden)'
     OR v_desc ~ '(?i)(dourad[ao]|gold).{0,30}(espiral|wire.?o)' THEN RETURN 'GOLD'; END IF;

  IF v_desc ~ '(?i)(espiral|wire.?o|encadernação).{0,30}(branc[ao]|white)'
     OR v_desc ~ '(?i)(branc[ao]|white).{0,30}(espiral|wire.?o)' THEN RETURN 'WHITE'; END IF;

  RETURN NULL;
END;
$$;
;
