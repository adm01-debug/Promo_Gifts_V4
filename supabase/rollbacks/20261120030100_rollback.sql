-- Rollback: 20261120030100_seed_shipping_boxes
--
-- Desfaz o seed das caixas de transporte (P, M, G, GG). GERADO por
-- scripts/freight/seed-shipping-boxes.mjs junto com a migration: os valores
-- abaixo são os mesmos do INSERT dela.
--
-- Apaga SÓ a caixa viva que continua IDÊNTICA ao seed em todas as colunas
-- gravadas. Ficam de propósito:
--   - a caixa que o admin editou (qualquer coluna diferente do seed);
--   - a caixa que o admin excluiu (deleted_at preenchido);
--   - toda caixa cujo código não veio do seed.
-- Motivo: a migration usa ON CONFLICT DO NOTHING. Se o código já tinha caixa
-- viva antes dela, nada foi inserido, e apagar só pelo código destruiria um
-- cadastro que não é do seed.
--
-- Efeito no negócio: sem caixa ativa, todo plano de frete (src/lib/freight)
-- sai como "nao_cabe: nenhuma caixa ativa cadastrada" até alguém recadastrar.
--
-- Antes de apagar, copia shipping_boxes para _backup_shipping_boxes_YYYYMMDD
-- (CONTRIBUTING.md), com RLS ligada e sem acesso de anon/authenticated.
-- Reexecutar no mesmo dia não sobrescreve o backup.
--
-- Rodar ANTES do rollback 20261119213000, que derruba a tabela.
--
-- ÚNICA DIFERENÇA para o texto que o gerador escreve, feita À MÃO neste
-- arquivo: o DELETE está dentro de um bloco que confere se a tabela existe.
-- Sem isso, rodar este rollback depois do 20261119213000 (fora de ordem, ou
-- repetido depois de desfazer tudo) parava em 'relation "public.shipping_boxes"
-- does not exist'; agora avisa e termina sem erro. O gerador ainda não tem
-- essa conferência: se este arquivo for gerado de novo antes de ela entrar em
-- scripts/freight/seed-shipping-boxes.mjs, reaplique as linhas marcadas abaixo.

DO $$
DECLARE
  b text := '_backup_shipping_boxes_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
BEGIN
  IF to_regclass('public.shipping_boxes') IS NOT NULL AND to_regclass('public.' || b) IS NULL THEN
    EXECUTE format('CREATE TABLE public.%I AS TABLE public.shipping_boxes', b);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', b);
  END IF;
END $$;

-- Conferência da tabela: feita à mão (ver cabeçalho).
DO $$
BEGIN
IF to_regclass('public.shipping_boxes') IS NULL THEN
  RAISE NOTICE 'public.shipping_boxes não existe: nada a desfazer.';
  RETURN;
END IF;

DELETE FROM public.shipping_boxes AS b
 USING (VALUES
    ('P', 'Caixa P', 27.00, 33.00, 33.00, 3, 0, 10000, 0.90, true, 1),
    ('M', 'Caixa M', 33.00, 33.00, 47.00, 3, 0, 20000, 0.90, true, 2),
    ('G', 'Caixa G', 36.00, 36.00, 54.00, 3, 0, 25000, 0.90, true, 3),
    ('GG', 'Caixa GG', 40.00, 50.00, 60.00, 3, 0, 30000, 0.90, true, 4)
 ) AS s (code, name, outer_height_cm, outer_width_cm, outer_length_cm,
         wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,
         is_active, sort_order)
 WHERE b.deleted_at IS NULL
   AND b.code = s.code
   AND b.name = s.name
   AND b.outer_height_cm = s.outer_height_cm
   AND b.outer_width_cm = s.outer_width_cm
   AND b.outer_length_cm = s.outer_length_cm
   AND b.wall_thickness_mm = s.wall_thickness_mm
   AND b.empty_weight_g = s.empty_weight_g
   AND b.max_weight_g = s.max_weight_g
   AND b.fill_factor = s.fill_factor
   AND b.is_active = s.is_active
   AND b.sort_order = s.sort_order;

-- Fim da conferência feita à mão.
END $$;
