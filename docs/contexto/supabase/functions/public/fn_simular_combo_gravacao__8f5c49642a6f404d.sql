CREATE OR REPLACE FUNCTION public.fn_simular_combo_gravacao(aplicacoes jsonb)
 RETURNS TABLE(app_ordem integer, product_id uuid, tecnica_codigo text, arte text, cores text, qty integer, location_code text, custo_natural numeric, piso_comercial_aplicado numeric, custo_final numeric, regra_ativada text, venda_aplicacao numeric, motivo_erro text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    app_ordem, product_id, tecnica_codigo, arte, cores, qty, location_code,
    custo_natural, piso_comercial_aplicado, custo_final, regra_ativada, 
    venda_aplicacao, motivo_erro
  FROM fn_simular_combo_gravacao_v12(aplicacoes);
$function$
