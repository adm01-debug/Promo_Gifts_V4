-- Migration: cria public.shipping_boxes — as caixas de transporte da empresa
--
-- Bloco C, etapas 21 e 22 do plano de frete de 19/11/2026. É a tabela que o
-- motor em src/lib/freight lê para decidir em quantas caixas a carga vai.
--
-- Duas decisões de modelagem que merecem leitura antes de alterar:
--
-- 1. O admin cadastra a medida EXTERNA (é o que está impresso na caixa e o que
--    a transportadora cuba). A medida INTERNA é coluna gerada: externa menos
--    duas paredes de papelão. Gerada, e não gravada pela aplicação, porque é
--    dela que sai todo o cálculo de encaixe — um formulário que gravasse uma
--    interna incoerente com a externa produziria frete errado sem erro.
-- 2. `max_weight_g` é o peso máximo TOTAL do volume (caixa + carga), não a
--    carga útil. Quem precisa da carga útil subtrai `empty_weight_g` — é o que
--    `fitCount` e `packMixed` fazem.

CREATE TABLE IF NOT EXISTS public.shipping_boxes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL,
  name              text NOT NULL,

  -- Medidas externas, em cm, como o admin digita
  outer_height_cm   numeric(8,2) NOT NULL CHECK (outer_height_cm > 0),
  outer_width_cm    numeric(8,2) NOT NULL CHECK (outer_width_cm > 0),
  outer_length_cm   numeric(8,2) NOT NULL CHECK (outer_length_cm > 0),

  -- Espessura de UMA parede. A interna desconta duas (uma de cada lado do eixo).
  wall_thickness_mm integer NOT NULL DEFAULT 3
                    CHECK (wall_thickness_mm BETWEEN 1 AND 20),

  -- Internas geradas: externa − 2 × espessura. O CHECK recusa a caixa cujo
  -- papelão não deixa espaço útil (ex.: 0,5 cm de lado com parede de 3 mm).
  inner_height_cm   numeric(8,2) GENERATED ALWAYS AS
                      (outer_height_cm - (wall_thickness_mm * 2) / 10.0) STORED
                    CONSTRAINT shipping_boxes_inner_height_positive CHECK (inner_height_cm > 0),
  inner_width_cm    numeric(8,2) GENERATED ALWAYS AS
                      (outer_width_cm - (wall_thickness_mm * 2) / 10.0) STORED
                    CONSTRAINT shipping_boxes_inner_width_positive CHECK (inner_width_cm > 0),
  inner_length_cm   numeric(8,2) GENERATED ALWAYS AS
                      (outer_length_cm - (wall_thickness_mm * 2) / 10.0) STORED
                    CONSTRAINT shipping_boxes_inner_length_positive CHECK (inner_length_cm > 0),

  empty_weight_g    integer NOT NULL DEFAULT 0 CHECK (empty_weight_g >= 0),
  max_weight_g      integer NOT NULL CHECK (max_weight_g > empty_weight_g),

  fill_factor       numeric(3,2) NOT NULL DEFAULT 0.90
                    CHECK (fill_factor BETWEEN 0.50 AND 1.00),

  is_active         boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz DEFAULT NULL
);

-- `code` é único entre as caixas VIVAS. Um UNIQUE simples impediria recadastrar
-- o código "P" depois de desativar a caixa P antiga, e exclusão aqui é lógica.
CREATE UNIQUE INDEX IF NOT EXISTS shipping_boxes_code_unique_active
  ON public.shipping_boxes (code)
  WHERE deleted_at IS NULL;

-- Ordem de exibição no admin e no seletor; o motor ordena por volume interno.
CREATE INDEX IF NOT EXISTS shipping_boxes_active_sort_idx
  ON public.shipping_boxes (sort_order, code)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE OR REPLACE TRIGGER set_shipping_boxes_updated_at
  BEFORE UPDATE ON public.shipping_boxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE  public.shipping_boxes IS
  'Caixas de transporte padrão da empresa. O motor de frete (src/lib/freight) empacota as peças nestas caixas; a caixa master do fornecedor é ignorada para frete.';
COMMENT ON COLUMN public.shipping_boxes.id IS 'Identificador da caixa.';
COMMENT ON COLUMN public.shipping_boxes.code IS 'Código curto como a expedição chama a caixa (P, M, G, GG). Único entre as caixas não excluídas.';
COMMENT ON COLUMN public.shipping_boxes.name IS 'Nome da caixa para exibição no admin.';
COMMENT ON COLUMN public.shipping_boxes.outer_height_cm IS 'Altura EXTERNA em cm. É a medida que o admin digita e a que a transportadora cuba.';
COMMENT ON COLUMN public.shipping_boxes.outer_width_cm IS 'Largura EXTERNA em cm.';
COMMENT ON COLUMN public.shipping_boxes.outer_length_cm IS 'Comprimento EXTERNO em cm.';
COMMENT ON COLUMN public.shipping_boxes.wall_thickness_mm IS 'Espessura de UMA parede de papelão, em mm. Padrão 3. A medida interna desconta duas por eixo.';
COMMENT ON COLUMN public.shipping_boxes.inner_height_cm IS 'Altura INTERNA em cm, gerada: externa − 2 × espessura. Somente leitura — é a medida que recebe carga.';
COMMENT ON COLUMN public.shipping_boxes.inner_width_cm IS 'Largura INTERNA em cm, gerada: externa − 2 × espessura. Somente leitura.';
COMMENT ON COLUMN public.shipping_boxes.inner_length_cm IS 'Comprimento INTERNO em cm, gerado: externo − 2 × espessura. Somente leitura.';
COMMENT ON COLUMN public.shipping_boxes.empty_weight_g IS 'Peso da caixa vazia em gramas. Conta contra max_weight_g. Zero por decisão do dono nas quatro caixas atuais.';
COMMENT ON COLUMN public.shipping_boxes.max_weight_g IS 'Peso máximo TOTAL do volume em gramas (caixa + carga). A carga útil é max_weight_g − empty_weight_g.';
COMMENT ON COLUMN public.shipping_boxes.fill_factor IS 'Fração do volume interno considerada aproveitável (0,50 a 1,00). Padrão 0,90: nenhum empacotamento real preenche 100%.';
COMMENT ON COLUMN public.shipping_boxes.is_active IS 'Caixa disponível para o cálculo. Falso tira a caixa do plano sem apagar o histórico.';
COMMENT ON COLUMN public.shipping_boxes.sort_order IS 'Ordem de exibição no admin. Não afeta o cálculo, que ordena por volume interno.';
COMMENT ON COLUMN public.shipping_boxes.created_at IS 'Criação do registro.';
COMMENT ON COLUMN public.shipping_boxes.updated_at IS 'Última alteração, mantida pelo trigger set_shipping_boxes_updated_at.';
COMMENT ON COLUMN public.shipping_boxes.deleted_at IS 'Exclusão lógica. Nulo = caixa viva.';

-- ── RLS (etapa 22) ─────────────────────────────────────────────────────────
-- Leitura para qualquer autenticado: o vendedor precisa do plano de frete no
-- orçamento. Escrita só para admin, pelo public.is_admin() usado em todo o repo.
--
-- A leitura é `deleted_at IS NULL OR is_admin()`, e não só `deleted_at IS NULL`
-- como o plano original pedia. Testado em Postgres local antes desta migration:
-- com a policy só de `deleted_at IS NULL`, o UPDATE que faz a exclusão lógica
-- falha com "new row violates row-level security policy" (o Postgres exige que
-- a linha NOVA continue visível pela policy de SELECT), e o admin não enxerga a
-- caixa excluída para restaurá-la. As duas operações são requisito do cadastro.
ALTER TABLE public.shipping_boxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_boxes_select_authenticated ON public.shipping_boxes;
CREATE POLICY shipping_boxes_select_authenticated
  ON public.shipping_boxes FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL OR public.is_admin());

DROP POLICY IF EXISTS shipping_boxes_insert_admin ON public.shipping_boxes;
CREATE POLICY shipping_boxes_insert_admin
  ON public.shipping_boxes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS shipping_boxes_update_admin ON public.shipping_boxes;
CREATE POLICY shipping_boxes_update_admin
  ON public.shipping_boxes FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS shipping_boxes_delete_admin ON public.shipping_boxes;
CREATE POLICY shipping_boxes_delete_admin
  ON public.shipping_boxes FOR DELETE
  TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.shipping_boxes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_boxes TO authenticated;
