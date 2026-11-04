-- ============================================================================
-- ETAPA 7: Trigger de herança automática
-- ============================================================================
-- Quando um novo product_kit_components é inserido com allows_personalization
-- IS NULL, herda o valor de kit_component_types.is_personalizable_by_default.
-- 
-- Garantia: NÃO sobrepõe valores explícitos (true ou false). Só atua em NULL.
-- Garantia: Se component_type_code não existir no catálogo, deixa NULL → 
--           NOT NULL constraint da tabela vai pegar (segurança extra).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_kit_component_inherit_personalization()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atua se o INSERT veio com allows_personalization NULL
  IF NEW.allows_personalization IS NULL AND NEW.component_type_code IS NOT NULL THEN
    SELECT kct.is_personalizable_by_default 
      INTO NEW.allows_personalization
    FROM public.kit_component_types kct 
    WHERE kct.code = NEW.component_type_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fn_kit_component_inherit_personalization() IS 
  'Trigger function: instancias de product_kit_components com allows_personalization NULL herdam regra-mae de kit_component_types.is_personalizable_by_default. Criada em 2026-04 - fase KIT_CHURRASCO_ESTOJO_PERSONALIZACAO.';

DROP TRIGGER IF EXISTS trg_kit_component_inherit_personalization ON public.product_kit_components;

CREATE TRIGGER trg_kit_component_inherit_personalization
  BEFORE INSERT ON public.product_kit_components
  FOR EACH ROW 
  EXECUTE FUNCTION public.fn_kit_component_inherit_personalization();
