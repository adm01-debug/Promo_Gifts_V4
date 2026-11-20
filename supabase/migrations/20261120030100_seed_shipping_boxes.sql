-- Rollback: supabase/rollbacks/20261120030100_rollback.sql
--
-- Migration SÓ DE DADOS: cadastra em public.shipping_boxes as caixas de
-- transporte padrão da empresa (P, M, G, GG).
--
-- GERADA por scripts/freight/seed-shipping-boxes.mjs a partir de
-- scripts/freight/caixas.csv. Não edite à mão: corrija o CSV e gere de novo.
--
-- Idempotente. O ON CONFLICT repete o predicado do índice único PARCIAL
-- shipping_boxes_code_unique_active (code) WHERE deleted_at IS NULL; sem o
-- predicado o Postgres não casa o índice e o INSERT falha. Efeito:
--   - código que já tem caixa viva: nada é inserido nem sobrescrito (o que
--     o admin editou fica como está);
--   - código sem caixa viva (nunca cadastrado, ou excluído): a caixa é criada.
--
-- As colunas inner_*_cm ficam de fora: são geradas (externa − 2 × parede).
-- Depende da migration 20261119213000, que cria a tabela.

INSERT INTO public.shipping_boxes
  (code, name, outer_height_cm, outer_width_cm, outer_length_cm,
   wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,
   is_active, sort_order)
VALUES
  ('P', 'Caixa P', 27.00, 33.00, 33.00, 3, 0, 10000, 0.90, true, 1),
  ('M', 'Caixa M', 33.00, 33.00, 47.00, 3, 0, 20000, 0.90, true, 2),
  ('G', 'Caixa G', 36.00, 36.00, 54.00, 3, 0, 25000, 0.90, true, 3),
  ('GG', 'Caixa GG', 40.00, 50.00, 60.00, 3, 0, 30000, 0.90, true, 4)
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;
