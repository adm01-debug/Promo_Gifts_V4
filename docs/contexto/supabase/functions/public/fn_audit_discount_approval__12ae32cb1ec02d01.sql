CREATE OR REPLACE FUNCTION public.fn_audit_discount_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_event text; v_actor_role text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'requested'; v_actor_role := 'seller';
    INSERT INTO public.discount_approval_audit(request_id, quote_id, actor_id, actor_role, event, requested_discount_percent, max_allowed_percent, seller_notes)
    VALUES (NEW.id, NEW.quote_id, NEW.seller_id, v_actor_role, v_event, NEW.requested_discount_percent, NEW.max_allowed_percent, NEW.seller_notes);
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('approved','rejected','expired') THEN  -- somente status terminais aceitos pelo CHECK de discount_approval_requests
      v_event := NEW.status;
      v_actor_role := CASE
        WHEN NEW.admin_id IS NOT NULL AND public.has_role(NEW.admin_id, 'supervisor'::app_role) THEN 'supervisor'
        WHEN NEW.admin_id IS NOT NULL THEN 'admin' ELSE 'system' END;
      INSERT INTO public.discount_approval_audit(request_id, quote_id, actor_id, actor_role, event, requested_discount_percent, max_allowed_percent, admin_notes, seller_notes)
      VALUES (NEW.id, NEW.quote_id, NEW.admin_id, v_actor_role, v_event, NEW.requested_discount_percent, NEW.max_allowed_percent, NEW.admin_notes, NEW.seller_notes);
    END IF;
  END IF;
  RETURN NEW;
END; $function$
