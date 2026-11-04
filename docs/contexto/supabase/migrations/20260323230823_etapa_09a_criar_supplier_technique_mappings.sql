-- ETAPA 9A: Criar tabela supplier_technique_mappings em public (sem FK restritiva)
CREATE TABLE public.supplier_technique_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_technique_name TEXT NOT NULL,
  supplier_technique_code VARCHAR,
  supplier_name VARCHAR,
  target_technique_id UUID,
  confidence NUMERIC DEFAULT 1.00,
  is_verified BOOLEAN DEFAULT false,
  mapped_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger de updated_at
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.supplier_technique_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indice para busca por supplier
CREATE INDEX idx_supplier_technique_mappings_supplier ON public.supplier_technique_mappings(supplier_name);

-- Migrar os 11 registros
INSERT INTO public.supplier_technique_mappings 
  (id, supplier_technique_name, supplier_technique_code, supplier_name, target_technique_id, confidence, is_verified, mapped_by, created_at, updated_at)
SELECT id, supplier_technique_name, supplier_technique_code, supplier_name, target_technique_id, confidence, is_verified, mapped_by, created_at, updated_at
FROM supplier_mappings.technique_mappings;
