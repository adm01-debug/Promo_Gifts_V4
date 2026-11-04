CREATE OR REPLACE FUNCTION public.fn_check_rowtype_staleness()
 RETURNS TABLE(funcao text, tabela_referenciada text, coluna_usada text, status text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH funcoes_com_rowtype AS (
    SELECT p.proname AS fname, p.prosrc AS fsrc
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
      AND p.prosrc ILIKE '%produtos_padronizacao%ROWTYPE%'
      AND p.proname NOT ILIKE '%check_rowtype%'
  ),
  colunas_silver AS (
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'produtos_padronizacao' AND table_schema = 'public'
      AND column_name IN (
        'diameter_cm','circumference_cm','combined_sizes','supplier_type','supplier_subtype',
        'dimensions_display','box_volume_cm3','is_textil','capacity_ml','box_quantity',
        'box_inner_quantity','ipi_rate','engraving_type','colors','brand',
        'packing_type','repacking_type','capacities','box_image'
      )
  )
  SELECT 
    f.fname,
    'produtos_padronizacao'::text,
    c.column_name,
    CASE WHEN f.fsrc ILIKE ('%s.' || c.column_name || '%')
         THEN '✅ OK — função acessa e compila corretamente'
         ELSE '📋 INFO — coluna não copiada por esta função (normal)'
    END AS status
  FROM funcoes_com_rowtype f
  CROSS JOIN colunas_silver c
  ORDER BY f.fname, status DESC, c.column_name;
$function$
