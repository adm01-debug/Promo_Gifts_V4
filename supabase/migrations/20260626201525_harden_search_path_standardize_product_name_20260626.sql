-- ============================================================
-- MELHORIA 2: Hardening de search_path em standardize_product_name
-- Única função do pipeline sem search_path. Corpo idêntico (provado
-- equivalente em dry-run). search_path=pg_catalog,public (só built-ins).
-- ============================================================
CREATE OR REPLACE FUNCTION public.standardize_product_name(name text)
 RETURNS text
 LANGUAGE sql
 SET search_path = pg_catalog, public
AS $function$
  SELECT TRIM(REGEXP_REPLACE(
           REGEXP_REPLACE(
             REGEXP_REPLACE(name, ' - \d+(\ peças|\s)$', ''),
           ' - ([A-Z][a-z]+ ?)+$', ' - \1'
           ),
         '^(Kit|Estojo|Caneta|Agenda|Caderno|Chaveiro|Mochila|Pen Drive|Squeeze|Nécessaire)\ ',
         '\1 '
         )
       )
       || COALESCE(' - ' || (regexp_match(name, ' - ([A-Z][a-z]+ ?)+$'))[1], '')
       || COALESCE(' - ' || (regexp_match(name, ' - (\d+ peça|\d+)s?$'))[1], '')
$function$;;
