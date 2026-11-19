-- Cria public.fn_supplier_risk_breakdown(boolean): breakdown de risco de ruptura por fornecedor.
-- Rollback: supabase/rollbacks/20261118223000_rollback.sql
--           (DROP FUNCTION IF EXISTS public.fn_supplier_risk_breakdown(boolean))
--
-- Painel de ruptura (/estoque, RupturePanelEma): o hook src/hooks/stock/useSupplierRiskBreakdown.ts
-- chama supabase.rpc('fn_supplier_risk_breakdown', { p_preferred_only }) desde a PR que montou o
-- painel, mas a funcao NUNCA existiu em producao (conferido em pg_proc). Resultado: PGRST202 em toda
-- chamada e o selo de "% em risco" por fornecedor (RupturePanelEma.tsx:317-319) simplesmente nunca
-- renderiza — o componente desestrutura so `data` e descarta `error`, entao a falha e silenciosa.
-- Causa raiz: back-end faltando, nao bug de front. Esta migration cria a funcao que faltava.
--
-- PRIVILEGIO — SECURITY DEFINER **com guarda no corpo**, copiando fn_get_rupture_alerts e NAO
-- fn_rupture_by_level. Quatro motivos medidos:
--   1. DEFINER e obrigatorio: public.mv_stock_rupture_alert nao concede SELECT a authenticated nem a
--      anon (REVOKE em 20261013171045_fase0_fase8_contencao_seguranca.sql:214) e materialized view nao
--      aceita policy de RLS. SECURITY INVOKER devolveria 42501 para 100% dos usuarios do browser.
--   2. A guarda tem de estar no SQL porque a rota nao guarda: /estoque e <ProtectedRoute /> SEM
--      requiredRole (src/routes/tools-routes.tsx:75), e 80 dos 86 usuarios com papel sao 'vendedor'.
--   3. Coerencia com o painel: a tabela principal da mesma tela (fn_get_rupture_alerts) ja filtra por
--      is_supervisor_or_above. Sem guarda aqui, o vendedor veria "% de risco por fornecedor" — nome do
--      fornecedor, concentracao de risco, gap em unidades e valor de estoque agregado — pendurado numa
--      tabela que para ele esta vazia; e a RPC e chamavel direto na API REST, fora da tela. Era
--      exatamente esse dado que o REVOKE de 2026-10-13 fechou de proposito.
--      fn_rupture_by_level (DEFINER sem guarda) nao e precedente: e codigo morto no front, so aparece
--      na assinatura gerada em src/integrations/supabase/types.ts.
--   4. A guarda fica no WHERE, nao em RAISE EXCEPTION: devolve ZERO LINHAS em vez de erro. O unico
--      consumidor usa `supplierData?.find(...) && ...`, entao para quem nao tem papel o selo apenas
--      nao aparece — degradacao silenciosa, sem toast vermelho e sem quebrar o painel.
-- GRANT EXECUTE explicito para authenticated: sem ele nem admin ve o selo (e o defeito que
-- fn_ema_kpi_by_level ja tem hoje — proacl sem authenticated). REVOKE de PUBLIC/anon porque o default
-- do Postgres concede EXECUTE a PUBLIC em funcao nova.
--
-- SEMANTICA — decisoes que esta migration crava, todas medidas na MV (20.627 linhas, 4 fornecedores):
--   * sem_sinal: NAO existe nivel 'SEM SINAL' na fonte (nivel_alerta so assume RUPTURA, CRITICO,
--     ALERTA, ATENCAO, OK), mas o tipo TS SupplierRiskRow declara o campo como number nao-nulavel e o
--     hook faz `data as SupplierRiskRow[]` sem validar — omitir a coluna deixaria o campo undefined
--     mentindo o tipo. Em vez de devolver 0 fixo, o campo recebe o unico proxy que os dados sustentam:
--     linha classificada 'OK' apenas porque a demanda esta no piso (stock_total > 0 AND
--     ema_diaria <= 0.01, logo cobertura = stock/0,01 estoura). Sao 4.852 linhas hoje, e o caso
--     extremo prova o ponto: Spot | Stricker tem 3.217 "OK" que na verdade sao ausencia de sinal.
--     Essas linhas saem do bucket ok, de modo que ruptura+critico+alerta+atencao+sem_sinal+ok = total
--     (conferido por fornecedor). NAO foi usado confidence_level='INSUFICIENTE': sao 40 linhas e nao e
--     exclusivo com nivel_alerta (quebraria a soma).
--   * pct_risco: escala 0-100 JA arredondada (1 casa) no banco, porque RupturePanelEma.tsx:319
--     interpola o valor cru seguido de '%', sem passar pelo helper fmt() que todos os outros numeros
--     do arquivo usam. Numerador = linhas nao-OK (ruptura+critico+alerta+atencao); denominador =
--     base COMPLETA do fornecedor na MV, inclusive OK. Divergencia registrada de proposito: o Badge
--     ao lado mostra grp.rows.length, que e a lista ja filtrada pelos chips de nivel e cortada em 500
--     linhas — nao da para reproduzir esse recorte na SQL, entao os dois numeros nao batem por
--     desenho, nao por bug. NULLIF protege a divisao por zero.
--     ROTULO: o selo imprimia "{pct_risco}% critico", o que seria falso — pct_risco e taxa de
--     NAO-OK, nao de CRITICO. Medido: Asia Import pct_risco = 43,6 contra 1,9% de criticos reais
--     (33/1.735), um fator de 23x; XBZ Brindes 31,7 contra 5,7% (782/13.832). Esta migration vai
--     junto com a troca do texto para "% em risco" em RupturePanelEma.tsx:319, porque e esta
--     migration que liga o selo. Nao se trocou o numerador para count FILTER (nivel = 'CRITICO'):
--     isso faria o selo ignorar ruptura, que e 4.459 das 5.835 linhas nao-OK — pior que o rotulo.
--   * valor_risco_reais: NAO e "valor em risco" no sentido de perda potencial. E CAPITAL PARADO EM
--     ITENS SOB RISCO QUE AINDA TEM ESTOQUE, e o balde RUPTURA entra com ZERO por construcao.
--     Motivo estrutural, medido na MV: nivel_alerta = 'RUPTURA' so ocorre quando stock_live = 0, e
--     valor_estoque_reais = round(stock_live * unit_cost, 2) — logo toda linha em ruptura contribui
--     exatamente 0,00, e ruptura e 4.459 das 5.835 linhas nao-OK (76%). Caso extremo real:
--     Spot | Stricker tem 446 linhas nao-OK, TODAS em ruptura, e devolve valor_risco_reais = 0,00.
--     A soma (R$ 22,8 mi, contra R$ 812,9 mi da base inteira) cobre so as 1.376 linhas nao-OK com
--     estoque > 0; somar a base toda daria um numero 35x maior e sem sentido no selo.
--     A metrica alternativa — exposicao de ruptura, sum(gap_unidades * custo) — exigiria unit_cost,
--     que a MV nao expoe; fica fora desta migration. gap_total_un ja entrega o lado fisico do gap.
--   * Os niveis sao comparados com os literais ACENTUADOS exatos da MV ('CRITICO'/'ATENCAO' sem acento
--     devolveriam 0 em silencio). Arquivo gravado em UTF-8.
--   * supplier_name sai cru da MV, sem trim/initcap: o selo casa por string de nome
--     (RupturePanelEma.tsx:317). Agrupa por (supplier_id, supplier_name) — nao so por nome.
--   * COALESCE em toda agregacao: a MV nao declara NOT NULL em coluna nenhuma (attnotnull = false em
--     todas), entao hoje nao ha nulos mas uma mudanca na fonte reintroduziria sem aviso, e um unico
--     NULL em SUM silencia o numero.
--   * p_preferred_only mantem o nome exato que o hook envia (nome diferente = PGRST202) e e aplicado
--     no WHERE para nao ser decorativo, ainda que hoje seja no-op (is_preferred = true em 20.627/20.627).

CREATE OR REPLACE FUNCTION public.fn_supplier_risk_breakdown(
  p_preferred_only boolean DEFAULT true
)
RETURNS TABLE (
  supplier_id       uuid,
  supplier_name     text,
  total             bigint,
  ruptura           bigint,
  critico           bigint,
  alerta            bigint,
  atencao           bigint,
  sem_sinal         bigint,
  ok                bigint,
  pct_risco         numeric,
  score_medio       numeric,
  gap_total_un      bigint,
  spikes            bigint,
  valor_risco_reais numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $$
  SELECT
    m.supplier_id,
    m.supplier_name,
    count(*)::bigint AS total,
    count(*) FILTER (WHERE m.nivel_alerta = 'RUPTURA')::bigint AS ruptura,
    count(*) FILTER (WHERE m.nivel_alerta = 'CRÍTICO')::bigint AS critico,
    count(*) FILTER (WHERE m.nivel_alerta = 'ALERTA')::bigint  AS alerta,
    count(*) FILTER (WHERE m.nivel_alerta = 'ATENÇÃO')::bigint AS atencao,
    -- 'OK' so no papel: ha estoque, mas a demanda esta no piso da EMA (sem sinal de consumo).
    count(*) FILTER (
      WHERE m.nivel_alerta = 'OK'
        AND COALESCE(m.stock_total, 0) > 0
        AND COALESCE(m.ema_diaria, 0) <= 0.01
    )::bigint AS sem_sinal,
    count(*) FILTER (
      WHERE m.nivel_alerta = 'OK'
        AND NOT (COALESCE(m.stock_total, 0) > 0 AND COALESCE(m.ema_diaria, 0) <= 0.01)
    )::bigint AS ok,
    COALESCE(
      round(
        100.0 * count(*) FILTER (WHERE m.nivel_alerta <> 'OK')::numeric
             / NULLIF(count(*), 0)::numeric,
        1
      ),
      0
    ) AS pct_risco,
    COALESCE(round(avg(COALESCE(m.score_composto, 0))::numeric, 2), 0) AS score_medio,
    COALESCE(sum(COALESCE(m.gap_unidades, 0)), 0)::bigint AS gap_total_un,
    count(*) FILTER (WHERE COALESCE(m.anomalia_spike, false))::bigint AS spikes,
    -- Capital parado em itens sob risco que AINDA tem estoque: ruptura exige stock_live = 0 na MV,
    -- entao contribui 0,00 aqui por construcao. Nao e perda potencial — ver cabecalho e COMMENT.
    COALESCE(
      round(
        sum(COALESCE(m.valor_estoque_reais, 0)) FILTER (WHERE m.nivel_alerta <> 'OK')::numeric,
        2
      ),
      0
    ) AS valor_risco_reais
  FROM public.mv_stock_rupture_alert m
  WHERE public.is_supervisor_or_above((SELECT auth.uid()))
    AND (NOT p_preferred_only OR m.is_preferred = true)
  GROUP BY m.supplier_id, m.supplier_name
  ORDER BY pct_risco DESC, total DESC
$$;

COMMENT ON FUNCTION public.fn_supplier_risk_breakdown(boolean) IS
  'Breakdown de risco de ruptura por fornecedor a partir de public.mv_stock_rupture_alert (refresh horario). Devolve as 14 colunas do tipo TS SupplierRiskRow. pct_risco = linhas nao-OK (ruptura+critico+alerta+atencao) / base completa do fornecedor (inclui OK), escala 0-100 ja arredondada, porque o front imprime o valor cru + "%"; NAO e taxa de CRITICO — o selo em RupturePanelEma le este campo rotulado "% em risco". sem_sinal = linhas OK com estoque e EMA no piso (<= 0,01): nao existe nivel "SEM SINAL" na fonte; buckets sao mutuamente exclusivos e somam total. valor_risco_reais NAO e perda potencial: e capital parado em itens sob risco que AINDA TEM ESTOQUE — o balde RUPTURA entra com 0,00 por construcao, porque na MV ruptura exige stock_live = 0 e valor_estoque_reais = stock_live * unit_cost. Para exposicao fisica de ruptura use gap_total_un. SECURITY DEFINER (a MV nao concede SELECT a authenticated) com guarda is_supervisor_or_above no WHERE: sem papel, zero linhas e o selo nao renderiza. Consumida por useSupplierRiskBreakdown / RupturePanelEma.';

REVOKE ALL ON FUNCTION public.fn_supplier_risk_breakdown(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_supplier_risk_breakdown(boolean) TO authenticated, service_role, postgres;
