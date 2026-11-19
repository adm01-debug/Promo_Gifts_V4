-- Rollback: 20261119213000_create_shipping_boxes
--
-- Remove a tabela das caixas de transporte. Reverter faz o motor de frete
-- (src/lib/freight) ficar sem caixa cadastrada: todo plano passa a sair como
-- "nao_cabe: nenhuma caixa ativa cadastrada", sem quebrar orçamento nenhum.
--
-- DROP TABLE apaga as caixas cadastradas e não há como recuperar depois. Se já
-- houver caixas em uso, exporte antes:
--   COPY public.shipping_boxes TO STDOUT WITH CSV HEADER
--
-- O DROP TABLE leva junto o trigger, os índices e as quatro policies. A função
-- public.update_updated_at_column() é compartilhada e NÃO é removida.

DROP TABLE IF EXISTS public.shipping_boxes;
