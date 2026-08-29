-- Forward-only: combina persistência do orçamento/itens e solicitação de
-- aprovação na mesma transação. Os RPCs existentes permanecem disponíveis
-- para saves sem aprovação.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_quote_with_discount_approval_transactional(
  _quote jsonb,
  _items jsonb,
  _seller_notes text DEFAULT NULL
)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $function$
DECLARE
  _saved public.quotes;
BEGIN
  _saved := public.create_quote_transactional(_quote, _items);
  PERFORM public.request_discount_approval_transactional(_saved.id, _seller_notes);
  SELECT * INTO STRICT _saved FROM public.quotes WHERE id = _saved.id;
  RETURN _saved;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_quote_with_discount_approval_transactional(
  _quote_id uuid,
  _quote_patch jsonb,
  _items jsonb,
  _expected_version integer DEFAULT NULL,
  _seller_notes text DEFAULT NULL
)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $function$
DECLARE
  _saved public.quotes;
BEGIN
  _saved := public.update_quote_transactional(
    _quote_id, _quote_patch, _items, _expected_version
  );
  PERFORM public.request_discount_approval_transactional(_saved.id, _seller_notes);
  SELECT * INTO STRICT _saved FROM public.quotes WHERE id = _saved.id;
  RETURN _saved;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_quote_with_discount_approval_transactional(jsonb, jsonb, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_quote_with_discount_approval_transactional(uuid, jsonb, jsonb, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quote_with_discount_approval_transactional(jsonb, jsonb, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_quote_with_discount_approval_transactional(uuid, jsonb, jsonb, integer, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.create_quote_with_discount_approval_transactional(jsonb, jsonb, text)
IS 'Persiste quote/itens e solicita aprovação de desconto atomicamente.';
COMMENT ON FUNCTION public.update_quote_with_discount_approval_transactional(uuid, jsonb, jsonb, integer, text)
IS 'Atualiza quote/itens e solicita aprovação de desconto atomicamente, com optimistic lock.';

DO $post$
BEGIN
  IF to_regprocedure(
       'public.create_quote_with_discount_approval_transactional(jsonb,jsonb,text)'
     ) IS NULL
     OR to_regprocedure(
       'public.update_quote_with_discount_approval_transactional(uuid,jsonb,jsonb,integer,text)'
     ) IS NULL
     OR has_function_privilege(
       'anon',
       'public.create_quote_with_discount_approval_transactional(jsonb,jsonb,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Postcondition failed: wrappers transacionais/ACL inválidos';
  END IF;
END
$post$;

COMMIT;
