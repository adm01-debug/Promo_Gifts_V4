CREATE OR REPLACE FUNCTION public.fn_expire_overdue_quotes()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _expired_ids uuid[];
  _count integer;
  _fallback_uid uuid;
  rec RECORD;
BEGIN
  -- fix_version: expire-quotes-discount-bypass-2026-07-03
  -- Sinaliza para fn_quotes_validate_discount que este é o cron de expiração
  -- (camada defensiva extra; o bypass por NEW.status='expired' já é suficiente)
  PERFORM set_config('app.write_source', 'cron_expire', true);

  -- Uid de fallback para histórico (usar um admin/sistema)
  SELECT id INTO _fallback_uid FROM auth.users ORDER BY created_at LIMIT 1;

  -- Coletar quotes a expirar
  SELECT array_agg(id) INTO _expired_ids
  FROM quotes
  WHERE valid_until < CURRENT_DATE
    AND status NOT IN ('expired', 'cancelled', 'converted', 'rejected', 'draft');

  IF _expired_ids IS NULL OR array_length(_expired_ids, 1) = 0 THEN
    RETURN jsonb_build_object('expired_count', 0, 'quote_ids', '[]'::jsonb);
  END IF;

  _count := array_length(_expired_ids, 1);

  -- Inserir histórico para cada quote expirado
  INSERT INTO quote_history (quote_id, user_id, action, field_changed, old_value, new_value, description, metadata, created_at)
  SELECT 
    q.id,
    COALESCE(q.seller_id, q.created_by, _fallback_uid),
    'status_change',
    'status',
    q.status,
    'expired',
    'Auto-expirado: valid_until ' || q.valid_until::text || ' anterior a ' || CURRENT_DATE::text,
    jsonb_build_object('auto_expired', true, 'valid_until', q.valid_until::text, 'previous_status', q.status),
    now()
  FROM quotes q
  WHERE q.id = ANY(_expired_ids);

  -- Atualizar status em batch
  -- fn_quotes_validate_discount é bypassado para NEW.status='expired' (fix acima)
  UPDATE quotes
  SET status = 'expired', updated_at = now()
  WHERE id = ANY(_expired_ids);

  RETURN jsonb_build_object(
    'expired_count', _count,
    'quote_ids', to_jsonb(_expired_ids),
    'executed_at', now()
  );
END;
$function$
