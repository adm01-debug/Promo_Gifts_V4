
-- ================================================================
-- MELHORIA-03: Aliases gerados para compatibilidade total com front
-- codigo       → GENERATED ALWAYS AS (codigo_tabela) STORED
-- nome_grupo   → GENERATED ALWAYS AS (grupo_tecnica) STORED
-- tecnica_variante_id → NULL column (legado, não mais usado)
-- ================================================================

-- codigo: alias de codigo_tabela (o front usa 'codigo' nos tipos legados)
ALTER TABLE public.tabela_preco_gravacao_oficial
  ADD COLUMN IF NOT EXISTS codigo varchar(50)
    GENERATED ALWAYS AS (codigo_tabela) STORED;

-- nome_grupo: alias de grupo_tecnica
ALTER TABLE public.tabela_preco_gravacao_oficial
  ADD COLUMN IF NOT EXISTS nome_grupo varchar(100)
    GENERATED ALWAYS AS (grupo_tecnica) STORED;

-- tecnica_variante_id: campo legado — adicionamos como nullable sem dados
-- (front lê, banco retorna NULL, sem erro)
ALTER TABLE public.tabela_preco_gravacao_oficial
  ADD COLUMN IF NOT EXISTS tecnica_variante_id uuid DEFAULT NULL;

-- Validar
SELECT
  id, codigo_tabela, codigo, grupo_tecnica, nome_grupo
FROM public.tabela_preco_gravacao_oficial
WHERE ativo=true
ORDER BY codigo_tabela
LIMIT 3;
;
