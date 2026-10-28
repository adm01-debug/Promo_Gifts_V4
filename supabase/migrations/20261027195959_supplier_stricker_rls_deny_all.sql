-- Migration: 20261027195959_supplier_stricker_rls_deny_all.sql
-- CONTEXTO: schema supplier_stricker contém tabelas com grants já concedidos,
-- mas sem RLS. A falta atual de USAGE no schema não é uma barreira permanente.
-- FIX: habilitar RLS e instalar policies RESTRICTIVE que negam todas as linhas.
-- RESTRICTIVE garante que policies permissivas adicionadas no futuro não
-- concedam acesso acidentalmente. Exponha uma tabela só após substituir a
-- policy por uma regra aprovada.
-- Evidência: docs/db/SCHEMAS_EXTRA_AUDIT_2026-10-27.md
-- Esta versão substitui 20261027200000, ainda pendente e nunca aplicada.

DO $migration$
DECLARE
  _table text;
  _tables constant text[] := ARRAY[
    'canceled_products',
    'category_mappings',
    'colors',
    'stg_colors',
    'customization_options',
    'customization_tables',
    'stg_customizations',
    'stg_images',
    'optionals',
    'stg_product_types',
    'product_types',
    'products',
    'stg_optionals',
    'stg_products',
    'stg_stock',
    'stocks',
    'sync_log'
  ];
  _missing text[];
  _unprotected text[];
BEGIN
  SELECT array_agg(t.table_name ORDER BY t.table_name)
    INTO _missing
    FROM unnest(_tables) AS t(table_name)
   WHERE to_regclass(format('%I.%I', 'supplier_stricker', t.table_name)) IS NULL;

  IF _missing IS NOT NULL THEN
    RAISE EXCEPTION 'Pré-condição falhou: tabelas ausentes em supplier_stricker: %',
      array_to_string(_missing, ', ');
  END IF;

  FOREACH _table IN ARRAY _tables LOOP
    EXECUTE format(
      'ALTER TABLE supplier_stricker.%I ENABLE ROW LEVEL SECURITY',
      _table
    );
    EXECUTE format(
      'CREATE POLICY deny_all ON supplier_stricker.%I AS RESTRICTIVE USING (false)',
      _table
    );
  END LOOP;

  SELECT array_agg(c.relname ORDER BY c.relname)
    INTO _unprotected
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'supplier_stricker'
     AND c.relname = ANY(_tables)
     AND c.relkind = 'r'
     AND (
       NOT c.relrowsecurity
       OR NOT EXISTS (
         SELECT 1
           FROM pg_policy AS p
          WHERE p.polrelid = c.oid
            AND p.polname = 'deny_all'
            AND NOT p.polpermissive
            AND pg_get_expr(p.polqual, p.polrelid) = 'false'
       )
     );

  IF _unprotected IS NOT NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: RLS/policy RESTRICTIVE deny_all inválida em: %',
      array_to_string(_unprotected, ', ');
  END IF;
END;
$migration$;
