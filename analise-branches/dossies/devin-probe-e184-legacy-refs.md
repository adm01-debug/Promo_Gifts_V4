# Dossiê — `devin/probe-e184-legacy-refs`

**Veredito:** FECHAR (G-cat probe)
**Verificado nesta sessão (2026-11-01):** SHA main `d2033d9237`, sessão `claude/chore-analise-branches-revalida-261101-2200`

---

## Evidências desta sessão

**git cherry (run nesta sessão):**
```
cherry+ count: 14  (14 commits únicos — mesmos cherry+ que gifted-dijkstra exceto commit E064)
Primeiros 5:
+ cf9e25387 fix(ci): E11 — fixtures sentinel-check para check-protection-config (#2245)
+ e5ef522a7 fix(ci): E22 — adiciona scripts e schema ausentes nos paths de workflows (#2249)
+ f5ecec52e fix(ci): boundary gate — lexer string-aware + tabela de cross-domain (#2232)
+ 36017b1a6 ci(e18): remove cache manual redundante — setup-node já gerencia (#2248)
+ 37e57b802 fix(e2e): E2E mock auth para Gate 3 em CI sem credenciais (#2283)
[... + 9 commits adicionais — todos já em main via #2284..#2300]
```

**git diff --name-only origin/main...origin/devin/probe-e184-legacy-refs (3-dot, nesta sessão):**
```
fatal: origin/main...origin/devin/probe-e184-legacy-refs: no merge base
```
→ Confirma orphan: sem ancestral comum com main.

**Busca por referências ao projeto legado `pqpdolkaeqlyzpdpbizo` [LEGACY_INFORMATIVO] nesta sessão:**
```
git diff origin/main origin/devin/probe-e184-legacy-refs -- . | grep "^+++" | grep pqpdolkae → 0 (sem arquivo adicionado com esse nome)
awk: arquivos onde pqpdolkae aparece em linhas adicionadas (+):
  - AGENTS.md: comentário documental LEGACY_INFORMATIVO (R19 da CLAUDE.md)
  - supabase/functions/_shared/cors.ts: comentário "BUG-08 FIX: pqpdolkaeqlyzpdpbizo.supabase.co removed (FORBIDDEN project)"
     → LINHA REMOVIDA de main para branch (minus -), não adicionada
     → É guarda de segurança explicando a remoção do projeto proibido, não código executável com SINGU
```
**Conclusão grep:** `pqpdolkaeqlyzpdpbizo` aparece apenas em:
- Comentários documentais (AGENTS.md, CLAUDE.md herdados de main) — não código executável
- `cors.ts`: linha explicando remoção — é proteção, não uso do projeto proibido

Sem referência executável a `pqpdolkaeqlyzpdpbizo` em cron, function call, supabase client, ou qualquer código que acesse SINGU.

Branch foi criada pelo Devin para probe E184 (verificar legacy refs ao projeto proibido); PR #2891 encerrou o probe.

---

## Análise (método analise-branches.md)

1. **Intenção:** Devin probe para verificar referências legacy a `pqpdolkaeqlyzpdpbizo`.
2. **JÁ IMPLEMENTADA:** PR #2891 mergeou o resultado do probe; branch não tem valor residual.
3. **Cruzamento Supabase:** nenhuma migration nova; referências a pqpdolkae são comentários/guardas — não código executável.
4. **Regressão:** merge impossível — `fatal: no merge base`; 14 cherry+ todos já em main.
5. **Regra de negócio:** probe concluído; branch não tem valor operacional.
6. **Completude:** G-cat orphan — sem utilidade restante.

**VEREDITO: FECHAR** — G-cat probe; PR #2891 concluiu o trabalho; orphan sem merge-base; 14 cherry+.
