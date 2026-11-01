# Dossiê — `claude/fix-rollback-261019-1637`

**Veredito:** FECHAR (superseded)
**Base:** main `5ae127ea` (2026-11-01) · produção doufsxqlfjyuvxuezpln (somente leitura)

**Contexto:** PRs #2420 e #2304 fechadas sem merge.

## Evidências
- main tem supabase/rollbacks/20261019000000_rollback.sql com 20 linhas que RESTAURAM a constraint e depois dropam a view; a branch tem 6 linhas que só fazem DROP CONSTRAINT/VIEW (pior: remove o cap de tamanho SEC-002).
- Único resíduo: 1 comentário de cabeçalho na migration 20261019000000 — editar migration já aplicada muda checksum; não vale.
- Produção: migration 20261019000000 no ledger; constraint frontend_telemetry_size_caps_check e view v_system_health_dashboard existem.

**Conclusão:** Nada a preservar.

> Método: diff via REST compare (main...branch) + presença de cada linha no main atual + consultas SELECT em produção. Merge de teste/worktree não executado: nenhum candidato a merge.
