-- 20261125180000 - corrige o COMMENT da view de preco de gravacao publica
--
-- Rollback: supabase/rollbacks/20261125180000_rollback.sql
--
-- Causa: o texto gravado em 20260717173348_secure_tabela_gravacao_anon_definer_v1.sql (linhas 43-48)
-- afirmava que `custo_setup_por_cor` e `custo_manuseio_por_peca` estavam EXCLUIDOS da projecao.
-- pg_attribute prova o contrario: a view projeta as duas colunas (posicoes 27 e 28 de 37).
-- A 20261117073000 ja registrava a divergencia (linhas 232-234) e a deixou para o dono.
--
-- Estado do banco antes desta migration (medido em 2026-11-25 no dump do projeto canonico
-- doufsxqlfjyuvxuezpln, supabase/migrations-snapshot/SCHEMA_LIVE.sql:90047): o texto antigo NAO
-- esta mais vivo - a 20261122180000 o substituiu ao reverter o security_invoker. O texto vivo,
-- porem, so fala da trava de security_invoker e NAO desmente a afirmacao antiga nem explica as
-- duas colunas `custo_*`, entao a leitura de quem consulta o catalogo continua levando a supor
-- custo fora da view. Esta migration parte do texto VIVO (byte a byte) e acrescenta o fato medido.
--
-- O que esta migration faz: reescreve o texto do comentario. Nenhum privilegio, grant, policy ou
-- definicao de view muda - e DDL de catalogo (obj_description) apenas.
--
-- O que o comentario corrigido passa a dizer, e que o post-check prova contra pg_catalog:
--   * custo monetario continua FORA da view (custo_setup, markup_percent, custo_aplicacao,
--     custo_termo_transferencia, custo_queima_forno, faturamento_minimo) - ausentes de pg_attribute;
--   * `custo_setup_por_cor` e `custo_manuseio_por_peca` estao PRESENTES, mas sao BOOLEAN (flags
--     "cobra taxa por cor?" / "cobra taxa de manuseio por peca?"), nao valores em R$;
--   * a trava operacional segue a mesma: NAO reverter para security_invoker=true nem re-expor a
--     tabela base ao anon (a definicao da view depende de SECURITY DEFINER).
--
-- Forward-only e idempotente: rodar de novo grava o mesmo texto.
-- Rollback em supabase/rollbacks/20261125150000_rollback.sql (volta ao texto vivo de hoje).

COMMENT ON VIEW public.v_tabela_preco_gravacao_oficial_public IS
  'Tabela de preco de gravacao oficial (SECURITY DEFINER). NAO religar security_invoker=true nem re-expor a tabela base ao anon: exigiria GRANT em 37 colunas. Regressao de 2026-11-22 revertida pela 20261122180000. Projecao conferida em pg_attribute (20261125150000): custo_setup, markup_percent, custo_aplicacao, custo_termo_transferencia, custo_queima_forno e faturamento_minimo NAO estao na view; custo_setup_por_cor e custo_manuseio_por_peca ESTAO, porem sao BOOLEAN (flags "cobra taxa por cor?" e "cobra taxa de manuseio por peca?"), nao valores em R$. O texto de 20260717173348 afirmava que as duas estavam excluidas - era falso.'

-- ---------------------------------------------------------------------------
-- Post-check: o comentario tem de descrever a projecao real (pg_catalog), o custo
-- monetario tem de continuar ausente e o anon tem de continuar lendo a view.
-- ---------------------------------------------------------------------------
DO $verify$
DECLARE
  v_comment   text;
  v_ncols     int;
  v_missing   text[] := '{}';
  v_leaked    text[] := '{}';
  v_forbidden text[] := ARRAY['custo_setup','markup_percent','custo_aplicacao',
                              'custo_termo_transferencia','custo_queima_forno','faturamento_minimo'];
  v_typename  text;
  v_name      text;
BEGIN
  v_comment := obj_description('public.v_tabela_preco_gravacao_oficial_public'::regclass, 'pg_class');

  IF v_comment IS NULL OR position('20261125150000' in v_comment) = 0 THEN
    RAISE EXCEPTION 'comment da view nao foi gravado (obj_description nao contem a marca da 20261125150000)';
  END IF;

  -- custo monetario nao pode aparecer na projecao
  FOREACH v_name IN ARRAY v_forbidden LOOP
    IF EXISTS (
      SELECT 1 FROM pg_attribute
      WHERE attrelid = 'public.v_tabela_preco_gravacao_oficial_public'::regclass
        AND attname = v_name AND attnum > 0 AND NOT attisdropped
    ) THEN
      v_leaked := v_leaked || v_name;
    END IF;
  END LOOP;
  IF array_length(v_leaked, 1) > 0 THEN
    RAISE EXCEPTION 'custo monetario nao esta ausente da projecao: %', array_to_string(v_leaked, ', ');
  END IF;

  -- as duas flags tem de existir E ser boolean (o comentario novo afirma isso)
  FOREACH v_name IN ARRAY ARRAY['custo_setup_por_cor','custo_manuseio_por_peca'] LOOP
    SELECT t.typname INTO v_typename
    FROM pg_attribute a
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE a.attrelid = 'public.v_tabela_preco_gravacao_oficial_public'::regclass
      AND a.attname = v_name AND a.attnum > 0 AND NOT a.attisdropped;
    IF v_typename IS NULL THEN
      v_missing := v_missing || v_name;
    ELSIF v_typename <> 'bool' THEN
      RAISE EXCEPTION 'a coluna % nao e boolean (tipo %): o comentario novo estaria errado', v_name, v_typename;
    END IF;
  END LOOP;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'coluna(s) que o comentario descreve como presentes nao existem na view: %',
      array_to_string(v_missing, ', ');
  END IF;

  -- funcionalidade preservada: anon continua lendo a view
  IF NOT has_table_privilege('anon', 'public.v_tabela_preco_gravacao_oficial_public', 'SELECT') THEN
    RAISE EXCEPTION 'anon perdeu SELECT na view - esta migration nao podia tocar privilegio';
  END IF;

  -- o comentario cita "37 colunas": avisa (sem abortar) se a projecao ja nao tiver esse tamanho
  SELECT count(*) INTO v_ncols
  FROM pg_attribute
  WHERE attrelid = 'public.v_tabela_preco_gravacao_oficial_public'::regclass
    AND attnum > 0 AND NOT attisdropped;
  IF v_ncols <> 37 THEN
    RAISE WARNING 'a view tem % colunas e nao 37: o texto do comentario precisa de nova revisao', v_ncols;
  END IF;

  RAISE NOTICE 'ok: comment corrigido, custo monetario ausente, 2 flags boolean presentes, anon segue com SELECT';
END
$verify$
