CREATE OR REPLACE FUNCTION public.notify_discount_approval_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE seller_name TEXT; quote_num TEXT; admin_user RECORD;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT full_name INTO seller_name FROM public.profiles WHERE user_id = NEW.seller_id;
    SELECT quote_number INTO quote_num FROM public.quotes WHERE id = NEW.quote_id;
    FOR admin_user IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' LOOP
      INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url, metadata)
      VALUES (admin_user.user_id, '⚠️ Desconto acima do limite',
        COALESCE(seller_name, 'Vendedor') || ' solicitou ' || NEW.requested_discount_percent || '% de desconto no orçamento ' || COALESCE(quote_num, '') || ' (limite: ' || NEW.max_allowed_percent || '%).',
        'warning', 'quotes',
        '/admin/usuarios?tab=discounts&request=' || NEW.id::text,
        jsonb_build_object('request_id', NEW.id, 'quote_id', NEW.quote_id, 'quote_number', quote_num, 'seller_id', NEW.seller_id, 'requested_pct', NEW.requested_discount_percent, 'max_pct', NEW.max_allowed_percent));
    END LOOP;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    SELECT quote_number INTO quote_num FROM public.quotes WHERE id = NEW.quote_id;
    IF NEW.status = 'approved' THEN
      INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url, metadata)
      VALUES (NEW.seller_id, '✅ Desconto aprovado!',
        'Seu desconto de ' || NEW.requested_discount_percent || '% no orçamento ' || COALESCE(quote_num, '') || ' foi aprovado.',
        'success', 'quotes', '/orcamentos',
        jsonb_build_object('request_id', NEW.id, 'quote_id', NEW.quote_id, 'quote_number', quote_num));
    ELSE
      INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url, metadata)
      VALUES (NEW.seller_id, '❌ Desconto recusado',
        'Seu desconto de ' || NEW.requested_discount_percent || '% no orçamento ' || COALESCE(quote_num, '') || ' foi recusado.' || COALESCE(' Motivo: ' || NEW.admin_notes, ''),
        'warning', 'quotes', '/orcamentos',
        jsonb_build_object('request_id', NEW.id, 'quote_id', NEW.quote_id, 'quote_number', quote_num));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
