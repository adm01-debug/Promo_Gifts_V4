-- ============================================================================
-- ETAPA 1: Adicionar coluna is_personalizable_by_default em kit_component_types
-- ============================================================================
-- Caminho Y aprovado: regra-mãe central que define se um TIPO de componente
-- é naturalmente personalizável. Vai ser preenchido na Etapa 3 e usado pelo
-- trigger de herança (Etapa 7).
--
-- DEFAULT false: conservador. Os 116 tipos nascem como "não personalizável" 
-- e cada um recebe true explícito quando decidido (evita propagação acidental).
-- ============================================================================

ALTER TABLE public.kit_component_types
  ADD COLUMN IF NOT EXISTS is_personalizable_by_default boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.kit_component_types.is_personalizable_by_default IS 
  'Regra-mae: se TRUE, instancias deste tipo em product_kit_components nascem com allows_personalization=true (via trigger). Adicionado em 2026-04 - fase KIT_CHURRASCO_ESTOJO_PERSONALIZACAO.';
