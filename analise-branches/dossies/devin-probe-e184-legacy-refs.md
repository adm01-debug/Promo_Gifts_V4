# Dossiê — `devin/probe-e184-legacy-refs`

**Veredito:** FECHAR (probe cumpriu o objetivo)
**Base:** main `5ae127ea` (2026-11-01) · produção doufsxqlfjyuvxuezpln (somente leitura)

**Contexto:** 8 commits (5 em 27/10 iterando um probe SQL). Sem PR.

## Evidências
- Pergunta do probe: restou o project-ref legado `pqpdolkae` no catálogo vivo? Consulta SELECT em produção: 0 jobs em cron.job e 0 funções public com prosrc ILIKE %pqpdolkae%.
- scripts/validate-supabase-config.mjs: 70/72 linhas adicionadas já em main (lexer SQL, FORBIDDEN_FRAGMENT).
- lovable-protected-audit.yml: 7/7 já em main.
- migration-dry-run.yml: branch adiciona `continue-on-error: true` — proibido pelas regras do projeto.
- Observação (não corrigida aqui): main mantém qa/migrations-draft/probe_e184_legacy_refs.sql (versão com ORDER BY 1, 42P19) que o dry-run executa em todo disparo; vale remover o draft em PR própria.

**Conclusão:** Probe respondido; nada a resgatar.

> Método: diff via REST compare (main...branch) + presença de cada linha no main atual + consultas SELECT em produção. Merge de teste/worktree não executado: nenhum candidato a merge.
