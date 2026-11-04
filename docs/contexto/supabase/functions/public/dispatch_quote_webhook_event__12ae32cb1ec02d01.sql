CREATE OR REPLACE FUNCTION public.dispatch_quote_webhook_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _event text;
  _payload jsonb;
BEGIN
  -- Determinar tipo de evento
  IF TG_OP = 'INSERT' THEN
    _event := 'quote.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _event := 'quote.' || NEW.status;
    ELSE
      RETURN NEW;  -- Sem mudança de status → sem webhook
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Construir payload
  _payload := jsonb_build_object(
    'quote_id',     NEW.id,
    'quote_number', NEW.quote_number,
    'status',       NEW.status,
    'old_status',   OLD.status,
    'seller_id',    NEW.seller_id,
    'client_id',    NEW.client_id,
    'client_name',  NEW.client_name,
    'client_company', NEW.client_company,
    'subtotal',     NEW.subtotal,
    'total',        NEW.total,
    'discount_percent', NEW.discount_percent,
    'valid_until',  NEW.valid_until,
    'event_at',     now()
  );

  -- FIX QBP-05: Inserir na outbox ao invés de http_post síncrono
  -- Worker processa assincronamente sem bloquear a transação de orçamento
  INSERT INTO public.webhook_outbox (event, payload, next_attempt_at)
  VALUES (_event, _payload, now());

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Falha na outbox não deve bloquear a transação principal
  -- Log do erro mas continua
  RAISE WARNING 'dispatch_quote_webhook_event: falha ao enfileirar evento % para quote %: %',
    _event, NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$
