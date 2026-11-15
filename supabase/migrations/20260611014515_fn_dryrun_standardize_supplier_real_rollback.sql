-- Arquivo retroativo: função já existe em produção (aplicada em 2026-06-11).
-- Registrada no ledger como version=20260611014515, name=fn_dryrun_standardize_supplier_real_rollback.
-- Arquivo faltava no repo. Criado em 2026-11-08 para fechar gap "ledger-sem-arquivo".
-- Nenhuma ação de apply necessária — função já presente no banco (confirmado 2026-11-08).

CREATE OR REPLACE FUNCTION public.fn_dryrun_standardize_supplier(p_supplier_id uuid, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_preview jsonb;
  v_detail  text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_above((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: requer perfil admin ou superior';
  END IF;

  BEGIN
    PERFORM set_config('app.write_source', 'pipeline', true);

    v_preview := jsonb_build_object(
      'standardize', public.fn_standardize_supplier(p_supplier_id, p_limit));

    v_preview := v_preview || jsonb_build_object(
      'silver_depois', jsonb_build_object(
        'pais_standardized', (SELECT COUNT(*) FROM public.produtos_padronizacao
           WHERE supplier_id=p_supplier_id AND status='standardized'),
        'pais_rejected', (SELECT COUNT(*) FROM public.produtos_padronizacao
           WHERE supplier_id=p_supplier_id AND status='rejected'),
        'variantes_standardized', (SELECT COUNT(*) FROM public.produtos_padronizacao_variantes
           WHERE supplier_id=p_supplier_id AND status='standardized'),
        'amostra_rejeitados', (SELECT jsonb_agg(jsonb_build_object(
             'ref', p.supplier_reference, 'erros', p.validation_errors))
           FROM (SELECT supplier_reference, validation_errors
                 FROM public.produtos_padronizacao
                 WHERE supplier_id=p_supplier_id AND status='rejected'
                 ORDER BY updated_at DESC LIMIT 5) p)));

    RAISE EXCEPTION 'DRYRUN_ROLLBACK' USING DETAIL = v_preview::text;

  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'DRYRUN_ROLLBACK' THEN
      GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
      RETURN jsonb_build_object(
        'success', true, 'dry_run', true, 'reverted', true,
        'supplier_id', p_supplier_id, 'preview', v_detail::jsonb);
    END IF;
    RETURN jsonb_build_object(
      'success', false, 'dry_run', true, 'reverted', true,
      'supplier_id', p_supplier_id, 'error', SQLERRM);
  END;
END;
$function$;
