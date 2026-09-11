-- BUG P1: generate_quote_number usava MAX(...)+1 sem serialização. Sob concorrência
-- (2 vendedores criando orçamento no mesmo instante), ambos liam o mesmo MAX e geravam
-- o MESMO quote_number → violação da UNIQUE quotes_quote_number_key (SQLSTATE 23505),
-- sem retry. Correção: pg_advisory_xact_lock por ANO. O lock é liberado no commit/rollback;
-- a segunda transação espera, relê o MAX já atualizado e gera o próximo número.
CREATE OR REPLACE FUNCTION public.generate_quote_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE year_short text; max_num integer; new_number text;
BEGIN
  -- Só calcula/gera se o número ainda não foi informado.
  IF NEW.quote_number IS NOT NULL AND NEW.quote_number <> '' THEN
    RETURN NEW;
  END IF;

  year_short := to_char(now(), 'YY');

  -- Serializa a geração por ano (transaction-scoped: liberado no commit/rollback).
  PERFORM pg_advisory_xact_lock(hashtext('quote_number:' || year_short)::bigint);

  SELECT COALESCE(MAX(
    CASE WHEN split_part(quote_number, '/', 1) ~ '^\d+$'
         THEN split_part(quote_number, '/', 1)::integer ELSE 0 END
  ), 10000) INTO max_num
  FROM public.quotes WHERE quote_number LIKE '%/' || year_short;

  new_number := (max_num + 1)::text || '/' || year_short;
  NEW.quote_number := new_number;
  RETURN NEW;
END;
$function$;;
