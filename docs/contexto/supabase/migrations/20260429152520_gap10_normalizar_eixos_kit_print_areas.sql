-- GAP #10: trigger pra normalizar eixos automaticamente
-- Regra: max_width SEMPRE >= max_height (lado longo = largura, lado curto = altura)
-- Isso evita que (2.5, 10) caia em zona não coberta quando deveria virar (10, 2.5)

CREATE OR REPLACE FUNCTION fn_kit_print_area_normalizar_eixos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_temp numeric;
BEGIN
  -- Se altura > largura, inverte
  IF NEW.max_height IS NOT NULL AND NEW.max_width IS NOT NULL 
     AND NEW.max_height > NEW.max_width THEN
    v_temp := NEW.max_width;
    NEW.max_width := NEW.max_height;
    NEW.max_height := v_temp;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kit_print_area_normalizar_eixos ON kit_component_print_areas;

CREATE TRIGGER trg_kit_print_area_normalizar_eixos
  BEFORE INSERT OR UPDATE OF max_width, max_height ON kit_component_print_areas
  FOR EACH ROW
  EXECUTE FUNCTION fn_kit_print_area_normalizar_eixos();

COMMENT ON FUNCTION fn_kit_print_area_normalizar_eixos() IS 
  'GAP #10 (auditoria 2026-04-29): garante que max_width >= max_height. 
   Evita erro silencioso quando vendedor cadastra (2,5 × 10) em vez de (10 × 2,5).
   A convenção é: largura = lado longo, altura = lado curto.';
