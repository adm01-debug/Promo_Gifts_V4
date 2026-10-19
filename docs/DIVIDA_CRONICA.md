# Dívida Crônica — Promo Gifts V4

> Gerado em 2026-10-19 (E200). Atualizar a cada postmortem ou trimestre.

---

## Dívidas Ativas

| ID | Problema | Recorrência | Última ocorrência | Custo estimado |
|----|----------|-------------|-------------------|----------------|
| DC-01 | Lovable reverte `CURRENT_PROJECT_ID` em `client.ts` para `pqpdolkaeqlyzpdpbizo` [LEGACY_INFORMATIVO] | Vários por mês | 2026-06-11 (6x em 10 min) | ~2h por incidente (401, debug, rollback) |
| DC-02 | `types.ts` destruído por commit do Lovable (tabelas `magazine_*` removidas) | 2× confirmadas | 2026-07-16 (7716ae9) | ~4h por incidente (80+ erros TS) |
| DC-03 | DDL aplicada via MCP fora do fluxo de migration | Episódico | 2026-10-13 (8 cron.alter_job) | ~3h para criar migration espelho + repair |
| DC-04 | Edge functions deployadas fora do `deploy-edge-functions.yml` | 2× confirmadas | 2026-09-24 (magazine-reader-state-read) | ~2h para reconciliar git vs produção |
| DC-05 | Merge cross-agente sem PR (Codex↔Claude direto) | 2× observadas | 2026-08-31 (9ffb69651, bd59a447d) | ~1h por incidente (conflito sem revisão) |
| DC-06 | Commits de governança deixados só locais (não pushed) | 29+ commits | 2026-09-17 (29 commits) | Proteções fictícias por dias/semanas |
| DC-07 | `personalization_techniques` dropada por regeneração de types.ts | 1× confirmada | commit 158c142 | ~1h (`as any` cast em produção) |
| DC-08 | Campos críticos de `Product` removidos em merge | 1× confirmada | commit f22e1e2 (2026-06-11) | 3 commits extras (aca0f6f, 14f6d6a, 0a31ef9) |
| DC-09 | Snapshots de testes visuais quebrados em cascata pelo Lovable | Recorrente | vários commits de correção | Cadeia de 3+ commits sem valor |
| DC-10 | `supabase db push` executado fora do workflow autorizado | Histórico | Múltiplos (proibido em REGRA #8) | Ledger dessincronizado silenciosamente |

---

## Mitigações em vigor

| Gate / Regra | Mitiga | Status |
|---|---|---|
| Gate 0 (`validate-supabase-config.mjs`) | DC-01 | ✅ Ativo |
| Gate 1.2 (drift estrutural de types.ts) | DC-02, DC-07 | ✅ Ativo |
| REGRA #8 + corolário E056 (proibição DDL via execute_sql) | DC-03 | ✅ Documentado |
| REGRA #8 corolário deploy (único caminho via workflow) | DC-04 | ✅ Documentado |
| REGRA #10 + sentinel-check.sh (merge cross-agente) | DC-05 | ✅ Gate 1.18 ativo |
| REGRA #9 (git push obrigatório ao final de sessão de governança) | DC-06 | ✅ Documentado |
| `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json` | DC-07 | ✅ Ativo |
| Gate 1.1 (campos críticos de Product) | DC-08 | ✅ Ativo |
| REGRA #5 (parar cadeia de snapshots após 3+ commits) | DC-09 | ✅ Documentado |
| R18 (`supabase db push` proibido nos workflows) | DC-10 | ✅ Gate 1.11 (C19) |
| `.lovableignore` | DC-01, DC-02, DC-08 | ✅ Ativo (1ª linha de defesa) |

---

## Dívidas Resolvidas

| ID | Problema | Resolvido em | Como |
|----|----------|-------------|------|
| DR-01 | `quality-gate.yml` com gates duplicados (removido em E15) | 2026-10 E15 | Deletado, gates migrados para `deploy-gates.yml` |
| DR-02 | Actions externas sem pin por SHA | 2026-09 E32 | Todos os SHAs de 40 chars nas ações externas |
| DR-03 | `ubuntu-latest` nos runners (migra em 19/10/2026) | 2026-10 E99 | Todos migrados para `ubuntu-24.04` |
| DR-04 | `magazine-reader-state-read` com fail-open deployado via MCP | 2026-09-24 PR #1899 | Reconciliado + edge function redeployada via workflow |
| DR-05 | Projeto proibido `pqpdolkaeqlyzpdpbizo` [LEGACY_INFORMATIVO] em 36 arquivos de teste | 2026-10 E102 | Substituído por `doufsxqlfjyuvxuezpln` |
| DR-06 | 29 commits locais de governança nunca pushados | 2026-09-17 | REGRA #9 formalizada; commits pushados no mesmo dia |
| DR-07 | Ratchet `as any` sem baseline medido | 2026-10 E123-E127 | Baseline zerão + gate 1.9 ativo |
| DR-08 | `continue-on-error: true` em gates bloqueantes | 2026-10 E159 | Removido de e2e-focused; movido para nightly |

---

## Custo estimado por retrabalho

| Dívida | Frequência estimada | Custo/ocorrência | Custo anual estimado |
|--------|---------------------|-----------------|----------------------|
| DC-01 (SSOT revertido) | 3×/mês | ~2h | ~72h (~9 dias) |
| DC-02 (types.ts destruído) | 1×/bimestre | ~4h | ~24h (~3 dias) |
| DC-03 (DDL fora de migration) | 1×/mês | ~3h | ~36h (~4.5 dias) |
| DC-04 (edge fn fora de workflow) | 2×/trimestre | ~2h | ~16h (~2 dias) |
| DC-05 (merge cross-agente) | 1×/mês | ~1h | ~12h (~1.5 dias) |
| DC-06 (commits locais) | Era crônico | ~dias de proteção invisível | Mitigado |
| DC-09 (cascata snapshots) | 2×/mês | ~0.5h | ~12h |
| **Total estimado** | | | **~172h/ano** sem mitigações |

> Com gates ativos (Gate 0, 1.1, 1.2, 1.11, 1.18), estimativa cai para ~30-40h/ano
> — principalmente DDL e edge fn fora de fluxo, que dependem de disciplina processual.

---

## Próximas ações

- [ ] Medir frequência real de DC-01 extraindo eventos do GitHub Actions (3 meses)
- [ ] Avaliar se Gate 1.3 (contratos de migration) está reduzindo DC-03 na prática
- [ ] Revisar este documento trimestralmente após cada postmortem
