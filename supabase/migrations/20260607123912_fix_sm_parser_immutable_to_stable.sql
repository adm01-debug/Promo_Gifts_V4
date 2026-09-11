
-- ============================================================
--  BUG FIX 2: fn_parse_sm_site_markdown
--  Problema: declarada como IMMUTABLE mas usa now() internamente.
--  IMMUTABLE significa que o Postgres pode cachear o resultado
--  por argumentos idênticos → scraped_at poderia ficar congelado
--  no primeiro valor e jamais atualizar.
--  Fix: mudar para STABLE (correto para funções que usam clock)
-- ============================================================
ALTER FUNCTION public.fn_parse_sm_site_markdown(text, text)
    VOLATILE;
-- Volatile é mais seguro aqui pois o parser grava scraped_at=now()
-- e pode ser chamado em contextos de trigger ou cron onde
-- STABLE também seria problemático (cada chamada deve ter o now() atual)

COMMENT ON FUNCTION public.fn_parse_sm_site_markdown IS
    'Parser SM site markdown → jsonb estruturado. '
    'FIX v2: mudado de IMMUTABLE para VOLATILE (usava now() internamente, '
    'o que violava o contrato de IMMUTABLE e causava scraped_at congelado).';
;
