-- 1. Renomear a versão antiga para preservar (caso n8n/frontend tenha cache)
ALTER FUNCTION fn_simular_combo_gravacao(jsonb) RENAME TO fn_simular_combo_gravacao_v9_legacy_2026_04;

-- 2. Recriar fn_simular_combo_gravacao apontando para a lógica da v10 (cobertura 8 grupos)
CREATE OR REPLACE FUNCTION public.fn_simular_combo_gravacao(aplicacoes jsonb)
RETURNS TABLE(
  app_ordem integer, product_id uuid, tecnica_codigo text,
  arte text, cores text, qty integer, location_code text,
  custo_natural numeric, fatmin_aplicado numeric, custo_final numeric,
  regra_ativada text, venda_aplicacao numeric
)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT app_ordem, product_id, tecnica_codigo, arte, cores, qty, location_code,
         custo_natural, fatmin_aplicado, custo_final, regra_ativada, venda_aplicacao
  FROM fn_simular_combo_gravacao_v10(aplicacoes);
$function$;

COMMENT ON FUNCTION public.fn_simular_combo_gravacao IS
'Funcao canonica de cotacao. Wrapper para v10 desde 2026-04-25. Cobre os 8 grupos tecnicos (LASER, LASER_CO2, SERIGRAFIA, TAMPOGRAFIA, TRANSFER_DIGITAL, SUBLIMACAO, UV_DIGITAL, BORDADO). Para diagnostico de erro explicito, use fn_simular_combo_gravacao_v11. Versao antiga preservada como fn_simular_combo_gravacao_v9_legacy_2026_04.';
