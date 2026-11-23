-- Migration: 20261123130000_view_tabela_preco_faixa_public.sql
-- Rollback: supabase/rollbacks/20261123130000_rollback.sql
--
-- QA Plano Etapa 007 (ACH-003) ? Fechar tabela_preco_gravacao_oficial_faixa ao anon
--
-- DECISAO:
--   Criar view publica v_tabela_preco_gravacao_oficial_faixa_public (SECURITY DEFINER)
--   que expoe todos os campos de venda (incluindo preco_unitario, que e preco de VENDA,
--   nao custo ? ver nota na 20260717173348: "so preco_unitario = venda").
--   Revogar grant SELECT de anon na tabela bruta.
--   Manter acesso da tabela via RLS para authenticated (politica existente
--   tabela_preco_gravacao_oficial_faixa_public_read cobre anon,authenticated com true).
--   Apos revogacao do grant anon, a politica RLS continua permitindo authenticated.
--
-- FRONT-END: o alias customization_price_tiers em src/lib/db/postgrest.ts e
--   src/lib/supabase-direct.ts foi atualizado para apontar para a view publica.
--   O codigo que consulta via dbInvoke/untypedFrom com o alias nao precisou mudar.
--   Consultas diretas ao nome da tabela (rest-native.ts, productionLeadTimeService.ts,
--   useMockupTechniques.ts) continuam funcionando para authenticated; para anon,
--   passam a retornar 403 ? conforme esperado (essas telas sao admin-only).
--
-- COLUNAS: espelho exato da tabela, exceto organizacao_id e campos internos de custo.
--   preco_unitario permanece exposto ? e preco de venda, nao custo de producao.

create or replace view public.v_tabela_preco_gravacao_oficial_faixa_public
with (security_invoker = false) as
select
  id,
  tabela_preco_gravacao_id,
  quantidade_minima,
  quantidade_maxima,
  preco_unitario,
  prazo_dias,
  largura_min,
  largura_max,
  altura_min,
  altura_max,
  area_min_cm2,
  area_max_cm2,
  pontos_min,
  pontos_max,
  ordem,
  created_at,
  updated_at
from public.tabela_preco_gravacao_oficial_faixa;

comment on view public.v_tabela_preco_gravacao_oficial_faixa_public is
  'Faixas de preco de gravacao (tabela_preco_gravacao_oficial_faixa) para acesso publico via anon. '
  'SECURITY DEFINER (security_invoker=false): anon ve todas as faixas de PRECO DE VENDA, '
  'sem expor campos internos (organizacao_id, campos de auditoria internos). '
  'Criado em 20261123130000 (QA etapa 007 / ACH-003). '
  'preco_unitario e preco de VENDA (nao custo) ? mantido exposto por decisao da 20260717173348.';

grant select on public.v_tabela_preco_gravacao_oficial_faixa_public to anon, authenticated;

-- Fechar tabela bruta ao anon
revoke select on public.tabela_preco_gravacao_oficial_faixa from anon;
