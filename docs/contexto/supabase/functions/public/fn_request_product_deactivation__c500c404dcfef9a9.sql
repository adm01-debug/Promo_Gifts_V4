CREATE OR REPLACE FUNCTION public.fn_request_product_deactivation(p_product_id uuid, p_reason text, p_reason_code text DEFAULT 'manual'::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_p    products%ROWTYPE;
  v_uid  uuid := auth.uid();
  v_req  uuid;
  v_name text;
BEGIN
  -- Validar produto
  SELECT * INTO v_p FROM products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'produto_nao_encontrado');
  END IF;

  IF NOT v_p.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'produto_ja_inativo');
  END IF;

  -- Verificar se já existe solicitação pending para este produto
  IF EXISTS (
    SELECT 1 FROM product_deactivation_requests
    WHERE product_id = p_product_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ja_existe_solicitacao_pendente',
      'hint', 'Use fn_list_deactivation_requests() para ver pendentes');
  END IF;

  -- Nome do usuário solicitante
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_name FROM auth.users WHERE id = v_uid;

  INSERT INTO product_deactivation_requests (
    product_id, supplier_id, supplier_reference, product_name,
    reason, reason_code, notes,
    requested_by, requested_by_name, status
  )
  VALUES (
    p_product_id, v_p.supplier_id, v_p.supplier_reference, v_p.name,
    p_reason, p_reason_code, p_notes,
    v_uid, COALESCE(v_name,'sistema'), 'pending'
  )
  RETURNING id INTO v_req;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_req,
    'product_id', p_product_id,
    'product_name', v_p.name,
    'supplier_reference', v_p.supplier_reference,
    'status', 'pending',
    'message', 'Solicitação criada. Aguarda aprovação de administrador.'
  );
END;
$function$
