-- ============================================================================
-- BLINDAGEM contra overflow int4 na numeração de orçamentos
-- ----------------------------------------------------------------------------
-- generate_quote_number() calcula MAX(prefixo) dos quote_number do ano. O guard
-- antigo usava a regex '^\d+$', que casa prefixos de QUALQUER tamanho. Se um
-- quote_number malformado com 10+ dígitos entrasse na tabela (import/migração/
-- edição manual), o cast ::integer estouraria (SQLSTATE 22003 numeric_value_out_
-- _of_range) e QUEBRARIA a geração de número para o ano inteiro.
--
-- Correção: '^\d{1,9}$' aceita no máximo 9 dígitos (<= 999.999.999, dentro de
-- int4 com folga). Prefixos de 10+ dígitos são ignorados (tratados como 0), em
-- vez de estourar. Operação normal é idêntica: números reais têm ~5 dígitos
-- (10001, 10002, ...), folga de 5 ordens de magnitude.
--
-- Preservado integralmente: SECURITY DEFINER, search_path=public, advisory lock
-- transaction-scoped (pg_advisory_xact_lock) que serializa a geração por ano e
-- previne race condition, e toda a lógica de formatação.
--
-- Validado: dry-run provou (a) regex antiga estoura 22003 com lixo de 11 dígitos,
-- (b) regex nova retorna o MAX real (10007) ignorando o lixo, (c) equivalência
-- exata em operação normal, (d) boundary 9 dígitos aceito / 10 dígitos ignorado.
-- fix_version: 20260626_quote_number_int4_guard
-- ANTI-REGRESSAO: NAO trocar '^\d{1,9}$' de volta por '^\d+$' (reabre o overflow).
-- ============================================================================
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

  -- ANTI-REGRESSAO (20260626_quote_number_int4_guard): '^\d{1,9}$' (NAO '^\d+$')
  -- evita overflow de int4 caso um prefixo malformado com 10+ digitos exista.
  SELECT COALESCE(MAX(
    CASE WHEN split_part(quote_number, '/', 1) ~ '^\d{1,9}$'
         THEN split_part(quote_number, '/', 1)::integer ELSE 0 END
  ), 10000) INTO max_num
  FROM public.quotes WHERE quote_number LIKE '%/' || year_short;

  new_number := (max_num + 1)::text || '/' || year_short;
  NEW.quote_number := new_number;
  RETURN NEW;
END;
$function$;;
