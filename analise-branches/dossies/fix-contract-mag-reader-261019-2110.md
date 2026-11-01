# Dossiê — `claude/fix-contract-mag-reader-261019-2110`

**Veredito:** FECHAR (superseded)
**Verificado nesta sessão (2026-11-01):** SHA main `d2033d9237`, sessão `claude/chore-analise-branches-revalida-261101-2200`

---

## Evidências desta sessão

**git cherry (run nesta sessão):**
```
cherry+ count: 5  (5 commits únicos nesta branch vs main)
```

**git diff --name-only origin/main...origin/claude/fix-contract-mag-reader-261019-2110 (3-dot, nesta sessão):**
```
.github/workflows/capacity-growth-report.yml
.github/workflows/pgss-slo-report.yml
.github/workflows/wraparound-monitor-report.yml
src/hooks/bi/useClientOrdersHistory.ts
src/hooks/crm/useClientTopProducts.ts
src/hooks/intelligence/useCommercialIntelligence.helpers.ts
```

**Diff completo lido (nesta sessão):**
- `capacity-growth-report.yml`: branch tem `cron: '47 7 * * 1' # E89` vs main tem `'16 9 * * 1' # E177` — branch é MAIS ANTIGA (E89 anterior a E177).
- `pgss-slo-report.yml`: branch tem `cron: '51 10 * * 1' # E89` vs main tem `'31 10 * * 1' # E177` — idem.
- `wraparound-monitor-report.yml`: branch tem `cron: '20 7 * * *' # E89` vs main tem `'15 6 * * *' # E177` — idem.
- `useClientOrdersHistory.ts` / `useClientTopProducts.ts` / `useCommercialIntelligence.helpers.ts`: branch adiciona comentário `// rls-allow:` inline nos `.from('orders')` — comentários já em main (conteúdo absorvido).

---

## Análise (método analise-branches.md)

1. **Intenção:** ajustar cron schedules (E89) para evitar colisões + adicionar comentários rls-allow nos hooks.
2. **JÁ IMPLEMENTADA:** main tem versões mais novas (E177 > E89) dos schedules; comentários rls-allow já em main.
3. **Cruzamento Supabase:** nenhuma migration.
4. **Regressão:** aplicar esta branch reverteria schedules de E177 para E89 — regressão de cron.
5. **Regra de negócio:** sem impacto novo; trabalho absorvido e evoluído em main.
6. **Completude:** 100% superado por main.

**VEREDITO: FECHAR** — branch mais antiga que main em todos os arquivos; aplicar causaria regressão de cron.
