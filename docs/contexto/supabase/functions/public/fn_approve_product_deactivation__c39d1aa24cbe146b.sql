CREATE OR REPLACE FUNCTION public.fn_approve_product_deactivation(p_request_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req   product_deactivation_requests%ROWTYPE;
  v_uid   uuid := auth.uid();
  v_name  text;
  v_prod  products%ROWTYPE;
  v_auth_id uuid;
BEGIN
  IF v_uid IS NOT NULL AND NOT public.is_admin_or_above(v_uid) THEN
    RETURN jsonb_build_object('ok',false,'error','Acesso negado: requer credencial de administrador ou superior');
  END IF;

  SELECT * INTO v_req FROM product_deactivation_requests
  WHERE id=p_request_id AND status='pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'error','solicitacao_nao_encontrada_ou_nao_pendente');
  END IF;

  SELECT * INTO v_prod FROM products WHERE id=v_req.product_id;
  IF NOT FOUND THEN
    UPDATE product_deactivation_requests SET status='cancelled',notes='produto_deletado' WHERE id=p_request_id;
    RETURN jsonb_build_object('ok',false,'error','produto_nao_existe_mais');
  END IF;

  IF NOT v_prod.is_active THEN
    UPDATE product_deactivation_requests SET status='executed',executed_at=now() WHERE id=p_request_id;
    RETURN jsonb_build_object('ok',true,'note','produto_ja_estava_inativo','product_id',v_req.product_id);
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'full_name',email) INTO v_name FROM auth.users WHERE id=v_uid;

  UPDATE product_deactivation_requests SET
    status='approved', approved_by=v_uid, approved_by_name=COALESCE(v_name,'admin'),
    approved_at=now(), notes=COALESCE(p_notes,notes)
  WHERE id=p_request_id;

  -- MECANISMO SEGURO: inserir token de autorização one-shot na tabela
  INSERT INTO product_deactivation_tokens(product_id,request_id,authorized_by)
  VALUES(v_req.product_id,p_request_id,v_uid)
  RETURNING id INTO v_auth_id;

  -- Executar a desativação (trigger vai verificar o token)
  UPDATE products SET is_active=false, updated_at=now() WHERE id=v_req.product_id;

  -- Limpar token (já foi usado, mas por segurança)
  DELETE FROM product_deactivation_tokens WHERE id=v_auth_id;

  UPDATE product_deactivation_requests SET status='executed',executed_at=now() WHERE id=p_request_id;

  RETURN jsonb_build_object(
    'ok',true,'product_id',v_req.product_id,
    'supplier_reference',v_req.supplier_reference,'product_name',v_req.product_name,
    'deactivated_at',now(),'approved_by',COALESCE(v_name,'admin'),'reason',v_req.reason
  );
END;
$function$
