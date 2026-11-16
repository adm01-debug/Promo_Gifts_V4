-- Rollback de 20261101000001_security_invoker_views_p06.sql.
-- Devolve as 8 views ao modo security_definer (comportamento anterior), uma a uma e
-- só se a view existir. Não recria nem redefine view nenhuma: RESET mexe apenas na
-- opção security_invoker, não no corpo, nos GRANTs nem nas policies das tabelas-base.
-- v_variant_sale_prices_public não aparece aqui porque a migration não a altera.

DO $rollback$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'v_kit_component_media_public',
    'v_product_compositions_public',
    'v_product_properties_public',
    'v_product_tags_public',
    'v_products_public',
    'v_suppliers_public',
    'v_system_health_dashboard',
    'v_tabela_preco_gravacao_oficial_public'
  ] LOOP
    IF to_regclass('public.' || quote_ident(v)) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I RESET (security_invoker)', v);
    END IF;
  END LOOP;
END
$rollback$;
