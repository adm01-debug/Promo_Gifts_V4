-- Aumentar limite de source_value para suportar textos longos de técnicas
-- (limite atual de VARCHAR(100) é insuficiente para frases completas de técnica SM)
ALTER TABLE public.supplier_value_mappings
  ALTER COLUMN source_value TYPE varchar(512),
  ALTER COLUMN target_value TYPE varchar(256);;
