-- Salvar definição da view, alterar coluna, recriar view
DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_viewdef('vw_supplier_field_mappings_summary'::regclass, true)
  INTO v_def;
  EXECUTE 'DROP VIEW IF EXISTS vw_supplier_field_mappings_summary CASCADE';
  EXECUTE 'ALTER TABLE public.supplier_field_mappings ALTER COLUMN transform_type TYPE varchar(50)';
  EXECUTE 'CREATE OR REPLACE VIEW vw_supplier_field_mappings_summary AS ' || v_def;
END $$;;
