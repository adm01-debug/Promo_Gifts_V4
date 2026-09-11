
-- ================================================================
-- MELHORIA-02: tabela_preco_gravacao_oficial — campos do schema drift
-- Adicionamos os campos que o frontend declara mas o banco não tem.
-- Campos já existem como lógica na função mas não como coluna:
--   - cobra_por_area, area_maxima_cm2, area_maxima_texto
--   - cobra_por_pontos, max_pontos
--   - faturamento_minimo (alias funcional de preco_minimo_unitario * qty_corte)
--   - custo_manuseio_por_peca
--   - cobra_aplicacao, cobra_queima_forno, cobra_termo_transferencia
--   - desconto_quarta_cor_mais
--   - quantidade_corte (alias de quantidade mínima efetiva)
--   - validade_inicio, validade_fim (sazonalidade)
--   - tipo_setup
-- ================================================================

-- Grupo 1: Área e dimensão
ALTER TABLE public.tabela_preco_gravacao_oficial
  ADD COLUMN IF NOT EXISTS cobra_por_area           boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS area_maxima_cm2          numeric(10,2)       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS area_maxima_texto        text                DEFAULT NULL;

-- Grupo 2: Pontos (bordado)
ALTER TABLE public.tabela_preco_gravacao_oficial
  ADD COLUMN IF NOT EXISTS cobra_por_pontos         boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_pontos               integer             DEFAULT NULL;

-- Grupo 3: Faturamento e manuseio
ALTER TABLE public.tabela_preco_gravacao_oficial
  ADD COLUMN IF NOT EXISTS faturamento_minimo       numeric(10,2)       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custo_manuseio_por_peca  boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quantidade_corte         integer             DEFAULT NULL;

-- Grupo 4: Cobranças adicionais (flags)
ALTER TABLE public.tabela_preco_gravacao_oficial
  ADD COLUMN IF NOT EXISTS cobra_aplicacao          boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cobra_queima_forno       boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cobra_termo_transferencia boolean  NOT NULL DEFAULT false;

-- Grupo 5: Descontos de cor adicionais
ALTER TABLE public.tabela_preco_gravacao_oficial
  ADD COLUMN IF NOT EXISTS desconto_quarta_cor_mais numeric(5,2)        DEFAULT NULL;

-- Grupo 6: Validade e setup
ALTER TABLE public.tabela_preco_gravacao_oficial
  ADD COLUMN IF NOT EXISTS validade_inicio          date                DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validade_fim             date                DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo_setup               varchar(50)         DEFAULT NULL;

-- Verificar novo count de colunas
SELECT COUNT(*) AS total_colunas
FROM information_schema.columns
WHERE table_schema='public' AND table_name='tabela_preco_gravacao_oficial';
;
