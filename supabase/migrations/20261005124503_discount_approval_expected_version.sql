-- Auditoria 20-dim (Onda 4, revisão) — enforcement real do version em
-- respond_discount_approval_transactional (contrato criado em 20261005124500).
-- Dois gaps apontados na revisão:
--   1) decisões concorrentes: nenhuma escrita comparava a versão lida. Agora a
--      RPC aceita _expected_version opcional (retrocompatível — DEFAULT NULL)
--      e falha com 40001 quando a versão mudou desde a leitura. O caminho de
--      fallback do cliente (useDiscountApproval.respondToApproval) também
--      passa a condicionar o UPDATE ao version observado.
--   2) replay idempotente escondia decisões divergentes: status igual ao da
--      decisão retornava sucesso SILENCIOSO mesmo com notas/autor diferentes
--      (segundo gestor "aprovava" com notas que nunca eram gravadas). Replay
--      só é idempotente quando autor E notas são idênticos; divergente = 40001.
-- DROP+CREATE porque CREATE OR REPLACE não troca assinatura (overload ambíguo
-- no PostgREST). GRANT/REVOKE replicados da definição original.
-- Rollback: DROP FUNCTION
-- respond_discount_approval_transactional(uuid, boolean, text,
-- integer) e recriar a assinatura de 3 args da definição anterior
-- (version em 20261004xxx, sem _expected_version).

DROP FUNCTION IF EXISTS public.respond_discount_approval_transactional(uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.respond_discount_approval_transactional(
  _request_id uuid,
  _approved boolean,
  _admin_notes text DEFAULT NULL,
  _expected_version integer DEFAULT NULL
)
RETURNS public.discount_approval_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _quote_id uuid;
  _q public.quotes;
  _request public.discount_approval_requests;
  _decision text := CASE WHEN _approved THEN 'approved' ELSE 'rejected' END;
  _snapshot text;
BEGIN
  IF _uid IS NULL OR NOT public.is_supervisor_or_above(_uid) THEN
    RAISE EXCEPTION 'Apenas coordenador ou superior pode decidir aprovação.'
      USING ERRCODE = '42501';
  END IF;

  SELECT quote_id INTO _quote_id
  FROM public.discount_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  SELECT * INTO _request
  FROM public.discount_approval_requests WHERE id = _request_id FOR UPDATE;

  IF _request.quote_id IS DISTINCT FROM _quote_id THEN
    RAISE EXCEPTION 'Solicitação mudou durante a decisão.' USING ERRCODE = '40001';
  END IF;

  -- Replay idempotente ANTES da checagem de versão: a decisão gravada bumpa
  -- version, então um retry idêntico (resposta perdida) chegaria com a versão
  -- obsoleta e falharia 40001 sem nunca chegar aqui. Replay idêntico (mesmo
  -- status-alvo, mesmo autor, mesmas notas) devolve a decisão já gravada —
  -- MAS só se a versão atual for a que a própria decisão produziu
  -- (esperada+1): alterações posteriores à decisão (ex.: validade editada)
  -- também bumpam version, e aí o retry não pode mais fingir sucesso.
  -- Com _expected_version NULL (clientes antigos) o replay segue tolerado.
  IF _request.status = _decision
     AND _request.admin_id IS NOT DISTINCT FROM _uid
     AND _request.admin_notes IS NOT DISTINCT FROM NULLIF(btrim(_admin_notes), '') THEN
    IF _expected_version IS NOT NULL
       AND _request.version > _expected_version + 1 THEN
      RAISE EXCEPTION 'Solicitação mudou após a decisão (versão esperada %, atual %). Recarregue e decida de novo.',
        _expected_version, _request.version
        USING ERRCODE = '40001';
    END IF;
    RETURN _request;
  END IF;
  -- Mesma decisão com autor/notas divergentes é conflito real: o segundo
  -- gestor precisa saber que a decisão dele NÃO foi gravada.
  IF _request.status = _decision THEN
    RAISE EXCEPTION 'Decisão concorrente divergente: solicitação já está % decidida por outro gestor ou com notas diferentes.',
      _request.status
      USING ERRCODE = '40001';
  END IF;
  IF _request.status <> 'pending' THEN
    RAISE EXCEPTION 'Decisão terminal conflitante: solicitação já está %.', _request.status
      USING ERRCODE = '23514';
  END IF;

  -- Optimistic locking: se o cliente leu a solicitação antes de decidir,
  -- a versão tem que bater com a observada (NULL = não verificar, retrocompat).
  IF _expected_version IS NOT NULL
     AND _request.version IS DISTINCT FROM _expected_version THEN
    RAISE EXCEPTION 'Solicitação mudou desde a leitura (versão esperada %, atual %). Recarregue e decida de novo.',
      _expected_version, _request.version
      USING ERRCODE = '40001';
  END IF;

  _snapshot := public.compute_quote_snapshot_hash(_quote_id);
  IF _request.quote_snapshot_hash IS DISTINCT FROM _snapshot
     OR _request.requested_discount_percent < COALESCE(_q.real_discount_percent, 0) THEN
    RAISE EXCEPTION 'Snapshot ou percentual mudou; solicite nova aprovação.'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.discount_approval_requests
  SET status = _decision,
      admin_id = _uid,
      admin_notes = NULLIF(btrim(_admin_notes), ''),
      responded_at = clock_timestamp(),
      valid_until = CASE WHEN _approved THEN clock_timestamp() + interval '30 days' ELSE NULL END
  WHERE id = _request_id
  RETURNING * INTO _request;

  IF NOT _approved THEN
    PERFORM set_config('app.discount_approval_request_id', _request_id::text, true);
  END IF;

  UPDATE public.quotes
  SET status = CASE WHEN _approved THEN 'pending' ELSE 'draft' END
  WHERE id = _quote_id;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed,
    old_value, new_value, metadata
  ) VALUES (
    _quote_id, _uid,
    CASE WHEN _approved THEN 'discount_approved' ELSE 'discount_rejected' END,
    format('Desconto de %s%% %s pelo gestor',
      _request.requested_discount_percent,
      CASE WHEN _approved THEN 'aprovado' ELSE 'rejeitado' END),
    'discount', _request.max_allowed_percent::text || '%',
    _request.requested_discount_percent::text || '%',
    jsonb_build_object(
      'request_id', _request_id,
      'admin_notes', NULLIF(btrim(_admin_notes), ''),
      'status', _decision
    )
  );

  RETURN _request;
END;
$function$;

REVOKE ALL ON FUNCTION public.respond_discount_approval_transactional(uuid, boolean, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_discount_approval_transactional(uuid, boolean, text, integer)
  TO authenticated, service_role;

-- `_expected_version` foi adicionado agora: clientes antigos chamam com 3
-- args e o DEFAULT NULL mantém o comportamento anterior. Para o cliente TS
-- passar o parâmetro basta regerar types.ts após aplicar esta migration.
