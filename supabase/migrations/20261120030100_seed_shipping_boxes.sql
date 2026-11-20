-- Rollback: supabase/rollbacks/20261120030100_rollback.sql
--
-- Migration SÓ DE DADOS: cadastra em public.shipping_boxes as caixas de
-- transporte padrão da empresa (P, M, G, GG).
--
-- GERADA por scripts/freight/seed-shipping-boxes.mjs a partir de
-- scripts/freight/caixas.csv. Não edite à mão: corrija o CSV e gere de novo.
--
-- Cada caixa entra com id FIXO, calculado pelo gerador a partir do código
-- (UUID versão 8 tirado do sha256 de "shipping_boxes:<code>"): é por ele que o
-- rollback reconhece a linha que veio daqui. O trigger guard_shipping_boxes_row
-- (20261120030000) mantém o id enviado: a migration roda sem usuário logado.
--
-- Idempotente. O ON CONFLICT sem alvo vale para a chave primária (id) e para o
-- índice único parcial de code (WHERE deleted_at IS NULL). Efeito:
--   - código que já tem caixa viva: nada é inserido nem sobrescrito (o que
--     o admin cadastrou ou editou fica como está);
--   - caixa deste seed que continua na tabela (mesmo id), mesmo editada ou
--     excluída pelo admin: nada é inserido;
--   - nos outros casos a caixa é criada.
--
-- As colunas inner_*_cm ficam de fora: são geradas (externa − 2 × parede).
-- Depende da migration 20261119213000, que cria a tabela.

INSERT INTO public.shipping_boxes
  (id, code, name, outer_height_cm, outer_width_cm, outer_length_cm,
   wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,
   is_active, sort_order)
VALUES
  ('1a43b67a-2bea-856c-aae0-268d914f9d21', 'P', 'Caixa P', 27.00, 33.00, 33.00, 3, 0, 10000, 0.90, true, 1),
  ('184c412a-392e-8bc9-bccd-3852f0ecd0d1', 'M', 'Caixa M', 33.00, 33.00, 47.00, 3, 0, 20000, 0.90, true, 2),
  ('3f990d5d-b2aa-8c2c-a1d1-e76c6c089525', 'G', 'Caixa G', 36.00, 36.00, 54.00, 3, 0, 25000, 0.90, true, 3),
  ('3d412436-292c-89af-a179-5b9433cc75e8', 'GG', 'Caixa GG', 40.00, 50.00, 60.00, 3, 0, 30000, 0.90, true, 4)
ON CONFLICT DO NOTHING;
