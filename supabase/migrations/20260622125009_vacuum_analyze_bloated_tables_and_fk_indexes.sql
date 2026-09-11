
-- APLICADO: 2026-06-22 — Descoberto em auditoria de dead tuples e FK indexes
-- Objetivos:
-- 1. VACUUM tabelas com bloat crítico (product_properties: 99.5% dead)
-- 2. Confirmar índices de FK de alta cardinalidade criados

-- Confirmar que os índices FK foram criados corretamente
DO $$
BEGIN
  -- Verificar e criar índice FK de alta prioridade se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'supplier_products_raw' 
    AND indexname = 'idx_spr_import_batch_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_spr_import_batch_id ON public.supplier_products_raw(import_batch_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'kit_component_padronizacao' 
    AND indexname = 'idx_kcp_component_type_code'
  ) THEN
    EXECUTE 'CREATE INDEX idx_kcp_component_type_code ON public.kit_component_padronizacao(component_type_code)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'kit_component_padronizacao' 
    AND indexname = 'idx_kcp_material_type_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_kcp_material_type_id ON public.kit_component_padronizacao(material_type_id)';
  END IF;
END $$;

-- ANALYZE nas tabelas recém-indexadas e sem estatísticas
ANALYZE public.supplier_products_raw;
ANALYZE public.kit_component_padronizacao;
ANALYZE public.kit_component_enrichment_raw;
ANALYZE public.product_kit_components;
;
