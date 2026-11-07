-- Rollback de 20261107143509_fn_global_search_clamp_limit_hardened.sql.
-- Restaura a semântica anterior de p_limit sem duplicar toda a função. O
-- rollback é deliberadamente guardado: só altera a definição produzida pela
-- migration correspondente e preserva ACLs e o search_path endurecido.

DO $rollback$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_catalog.pg_get_functiondef(
    'public.fn_global_search(text,integer,text[])'::pg_catalog.regprocedure
  )
  INTO v_definition;

  IF pg_catalog.strpos(v_definition, 'LEAST(p_limit, 100)') = 0 THEN
    RAISE EXCEPTION
      'rollback 20261107143509 recusado: clamp esperado não está na definição atual';
  END IF;

  v_definition := pg_catalog.replace(
    v_definition,
    'LEAST(p_limit, 100)',
    'p_limit'
  );

  EXECUTE v_definition;
END;
$rollback$;
