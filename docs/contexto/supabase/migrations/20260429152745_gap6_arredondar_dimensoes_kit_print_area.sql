-- GAP #6: incorporar arredondamento à 2 casas no trigger existente do GAP #10
-- Faz duas coisas: normaliza eixos + arredonda

CREATE OR REPLACE FUNCTION fn_kit_print_area_normalizar_eixos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_temp numeric;
BEGIN
  -- Arredondar a 2 casas decimais (1mm) - GAP #6
  IF NEW.max_width IS NOT NULL THEN
    NEW.max_width := ROUND(NEW.max_width::numeric, 2);
  END IF;
  IF NEW.max_height IS NOT NULL THEN
    NEW.max_height := ROUND(NEW.max_height::numeric, 2);
  END IF;
  
  -- Normalizar eixos: largura sempre >= altura - GAP #10
  IF NEW.max_height IS NOT NULL AND NEW.max_width IS NOT NULL 
     AND NEW.max_height > NEW.max_width THEN
    v_temp := NEW.max_width;
    NEW.max_width := NEW.max_height;
    NEW.max_height := v_temp;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_kit_print_area_normalizar_eixos() IS 
  'GAP #6 + #10 (auditoria 2026-04-29): 
   1) Arredonda max_width/max_height a 2 casas decimais (precisão de 1mm).
   2) Garante max_width >= max_height (lado longo = largura).
   Evita: float-over (2.500001 não bater faixa 0.1-2.50) e eixos invertidos.';
