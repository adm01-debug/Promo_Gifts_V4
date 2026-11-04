CREATE OR REPLACE FUNCTION public.fn_bulk_request_deactivation(p_product_ids uuid[], p_reason text DEFAULT 'Produto sem estoque — fornecedor retirou do catálogo'::text, p_reason_code text DEFAULT 'discontinued'::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid      uuid := auth.uid();
  v_name     text;
  v_created  int := 0;
  v_skipped  int := 0;
  v_pid      uuid;
  v_p        products%ROWTYPE;
  v_req_ids  uuid[] := '{}';
  v_req_id   uuid;
BEGIN
  -- Nome do usuário solicitante
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_name FROM auth.users WHERE id = v_uid;

  FOREACH v_pid IN ARRAY p_product_ids
  LOOP
    -- Verificar produto
    SELECT * INTO v_p FROM products WHERE id = v_pid;
    IF NOT FOUND OR NOT v_p.is_active THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Pular se já tem solicitação pendente
    IF EXISTS (
      SELECT 1 FROM product_deactivation_requests
      WHERE product_id = v_pid AND status = 'pending'
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO product_deactivation_requests (
      product_id, supplier_id, supplier_reference, product_name,
      reason, reason_code, notes,
      requested_by, requested_by_name, status
    )
    VALUES (
      v_pid, v_p.supplier_id, v_p.supplier_reference, v_p.name,
      p_reason, p_reason_code, p_notes,
      v_uid, COALESCE(v_name,'sistema'), 'pending'
    )
    RETURNING id INTO v_req_id;

    v_req_ids := array_append(v_req_ids, v_req_id);
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',       true,
    'criados',  v_created,
    'pulados',  v_skipped,
    'total',    array_length(p_product_ids, 1),
    'request_ids', to_jsonb(v_req_ids)
  );
END;
$function$
