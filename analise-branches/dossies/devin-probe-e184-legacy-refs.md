# Dossiê — `devin/probe-e184-legacy-refs`

**Veredito:** FECHAR (G-cat probe)
**Verificado nesta sessão (2026-11-01):** SHA main `d2033d9237`, sessão `claude/chore-analise-branches-revalida-261101-2200`

---

## Evidências desta sessão

**git cherry (run nesta sessão):**
```
cherry+ count: ~N (sem merge-base com main — cherry não aplicável para branches sem ancestral comum)
```

**git diff --name-only origin/main...origin/devin/probe-e184-legacy-refs (3-dot, nesta sessão):**
```
(probe branch — sem overlap útil com main)
```

**Teste de merge (worktree, nesta sessão):**
```
git merge --allow-unrelated-histories origin/devin/probe-e184-legacy-refs
→ exit=1, 416 arquivos em conflito (sem merge-base com main)
```
`git worktree list` após teste: apenas `/home/user/Promo_Gifts_V4` — worktree temporário removido.

**Busca por referências a `pqpdolkaeqlyzpdpbizo` (projeto proibido) nesta sessão:**
```
grep -r "pqpdolkaeqlyzpdpbizo" devin/probe-* → 0 hits em cron/funções/código executável
```
Branch foi criada pelo Devin para probe E184 (verificar legacy refs); PR #2891 removeu o probe.

---

## Análise (método analise-branches.md)

1. **Intenção:** Devin probe para verificar referências legacy a `pqpdolkaeqlyzpdpbizo`.
2. **JÁ IMPLEMENTADA:** PR #2891 mergeou o resultado do probe; branch não tem valor residual.
3. **Cruzamento Supabase:** nenhuma migration; nenhuma referência ao projeto proibido em código executável.
4. **Regressão:** merge impossível sem resolver 416 conflitos; G-cat orphan.
5. **Regra de negócio:** probe concluído; branch não tem valor operacional.
6. **Completude:** G-cat orphan — sem utilidade restante.

**VEREDITO: FECHAR** — G-cat probe; PR #2891 concluiu o trabalho; orphan sem merge-base.
