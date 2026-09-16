-- Migration adicionada em 2026-09-16 (não é backdated de propósito com efeito
-- alguma no banco vivo — ver observação abaixo).
--
-- Achado ao rodar `supabase db diff --linked` pela primeira vez com verificação
-- live (E02 de docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md):
-- 5 dos 6 schemas de aplicação não-gerenciados existentes no projeto canônico
-- NÃO possuem nenhuma migration que os crie:
--
--   analytics             — 38 migrations referenciam objetos deste schema
--   supplier_stricker     — landing dedicado SPOT/Stricker (17 tabelas)
--   cf_recon              — reconciliação Cloudflare Images
--   prod_audit            — auditoria de produção
--   classification_audit  — auditoria de classificação
--
-- (o sexto, `internal`, já tem migration própria:
--  20260717000070_move_mv_product_leaf_category_to_internal.sql)
--
-- Confirmado ao vivo (pg_catalog) que os 5 schemas acima existem hoje no
-- projeto canônico — foram criados fora do fluxo de migrations (dashboard/MCP),
-- e todo objeto criado neles desde então dependeu silenciosamente dessa
-- criação out-of-band. Resultado prático: `supabase db diff --linked` (que
-- reconstrói o schema do zero em shadow database) travava com
-- "schema does not exist" na primeira migration que referenciasse qualquer
-- um deles — ou seja, a verificação live de drift nunca poderia ter
-- completado neste projeto, independente de qualquer outra correção.
--
-- Esta migration só declara `CREATE SCHEMA IF NOT EXISTS`: no banco vivo
-- (onde os schemas já existem) é um no-op garantido pelo IF NOT EXISTS; em
-- qualquer ambiente novo (shadow database do `db diff`, ambiente local do
-- zero) ela passa a criar o que faltava para o replay funcionar. Nenhuma
-- tabela, view, função ou grant é criado aqui — apenas o contêiner do schema,
-- para não adivinhar privilégios que as migrations seguintes já concedem
-- explicitamente por objeto.
--
-- Posicionada em 2026-05-12 por ser o dia da referência mais antiga
-- encontrada (supplier_stricker, em t28b_fk_indexes_remaining.sql), para que
-- toda migration subsequente que já dependia destes schemas continue
-- funcionando em ordem no replay.

CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS supplier_stricker;
CREATE SCHEMA IF NOT EXISTS cf_recon;
CREATE SCHEMA IF NOT EXISTS prod_audit;
CREATE SCHEMA IF NOT EXISTS classification_audit;
