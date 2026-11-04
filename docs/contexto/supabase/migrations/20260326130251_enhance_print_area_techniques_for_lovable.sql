-- ============================================================
-- AJUSTAR print_area_techniques para ser FONTE UNICA de verdade
-- Adicionar campos que o Lovable precisa e remover redundantes
-- ============================================================

-- Campos novos que o Lovable precisa e não existem
ALTER TABLE public.print_area_techniques
  ADD COLUMN notes TEXT;

ALTER TABLE public.print_area_techniques
  ADD COLUMN unit_cost NUMERIC(10,4);

-- Remover campos 100% redundantes (identicos a max_width/max_height)
ALTER TABLE public.print_area_techniques
  DROP COLUMN gravacao_largura_max;

ALTER TABLE public.print_area_techniques
  DROP COLUMN gravacao_altura_max;

COMMENT ON COLUMN public.print_area_techniques.notes IS 'Observações sobre esta área de gravação';
COMMENT ON COLUMN public.print_area_techniques.unit_cost IS 'Custo unitário de gravação sobrescrito para este produto (se diferir da tabela de preço padrão)';

COMMENT ON TABLE public.print_area_techniques IS 
  'FONTE UNICA de verdade para áreas de gravação por produto. '
  'Dados da técnica (nome, código, max_cores, custo_setup) vêm via JOIN com tabela_preco_gravacao_oficial usando tabela_preco_id. '
  'Campos como technique_name e setup_cost NÃO são armazenados aqui - são resolvidos via FK.';
