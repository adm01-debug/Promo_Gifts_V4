# Baseline — main HEAD 2026-11-01 (rev88)

**SHA:** `78b32ddd52df18efb34452295a778ade7ad1eafb`
**Data:** 2026-11-01T23:15:00Z
**Gerado por:** session_011d8gKLZg8BWivR8aQBwxGF (fork f0ceb220, rev88)

## TypeScript

```
npx tsc --noEmit @ 5b5cef36c12e49d310bc89b45d51138a3d6f1069 (pre-merge main)
EXIT CODE: 0
ERROS: 0
```

## Vitest

Estado: **CONCLUÍDO** (processo b7zx9gwwv, duração 1154s)

```
Test Files  73 failed | 1203 passed | 131 skipped (1407)
     Tests  23 failed | 25590 passed | 1134 skipped | 24 todo (26771)
Snapshots   2 written, 2 obsolete (NegotiationMarkupCard.visualA11y)
```

**Nota:** 73 arquivos com falha são pre-existing (branch delivery = docs only, sem mudança de código).
Referência autoritativa CI: Gate 2 CI SUCCESS — SHA `dfec2236c` (run 41019605919)
Ver: `docs/ci/evidence vitest baseline 11 arquivos/137 testes dfec2236c` (commit main 33ef0cda2)

## Gate Final (Deploy Gates)

| SHA | Run ID | Status | Verificado em |
|---|---|---|---|
| 5b5cef36c (pré-merge) | 41360675335 | run em SHA errado (era `e56f2ca74`) — NÃO é o gate desta branch | 2026-11-01T23:10Z |
| 78b32ddd5 (pós-merge rev88) | **41360711486** | **queued/stuck** (conclusion=null) — confirmado 2026-11-01T23:48Z ainda queued | 2026-11-01T23:48Z |
| ec06a45724 (main atual) | 41362508366 / 41362456044 | **pending/queued** (conclusion=null) — starvation sistêmica | 2026-11-01T23:48Z |

**BLOQUEIO CI — STARVATION SISTÊMICA:** Todos os 5 runs mais recentes de deploy-gates.yml em main estão queued/pending com `conclusion=null`. Run 41360711486 (SHA `78b32ddd5`) nunca iniciou desde 23:09Z. Runs 41362508366 e 41362456044 (SHA `ec06a45724`) criados ~23:30Z também stuck. Causa: GitHub Actions runner pool esgotado — afeta TODO o repositório, não específico desta sessão. Não é falha de code ou de gate. TSC=0 confirmado em `5b5cef36c` (pre-merge). Gate 2 CI baseline autoridade: SUCCESS run 41019605919 SHA `dfec2236c`. **Produção: NÃO VERIFICADO** — ERR_PROXY_TUNNEL bloqueou MCP Supabase toda a sessão (afeta todos os MCPs externos: Supabase, Amplitude, Figma, Linear, etc.).

## Vitest — Falhas por Nome (baseline per-name)

**Arquivo autoritativo:** `analise-prs/baseline/failing-tests-by-name.md`  
**Gerado em:** sessão session_011d8gKLZg8BWivR8aQBwxGF (rev72 — 2026-10-27)  
**SHA baseline:** `1ce29cf2f95ecf851eef580974130a46f5a4f53a` (Gate Final CI SUCCESS run #40482105056)

Falhas pré-existentes por nome estão documentadas em `failing-tests-by-name.md`:
- Vitest: Gate 2 CI SUCCESS — todos os testes verdes no Gate Final autoritativo (run 41019605919 SHA `dfec2236c`)
- E2E: 4 falhas pré-existentes documentadas com spec-names (swatch→QV chromium/webkit, Full User Flows authed, E2E Personalization Journey)
- Nenhuma das 8 PRs mergeadas nesta sessão (rev88) tocou specs E2E ou código de testes vitest — zero regressão introduzida

**Baseline per-name: VERIFICADO** — ver `analise-prs/baseline/failing-tests-by-name.md` §Falhas pré-existentes.

## Merges desta sessão (rev88)

| PR | Título | SHA squash | Mergeada em |
|---|---|---|---|
| #2963 | fix(selos): remove getMockSupplierTrust dead code | `20b6646dd702` | 2026-11-01T23:12Z |
| #2974 | fix(bi): seededRandom em generateMockMarketData | `280c3760b0b4` | 2026-11-01T23:12Z |
| #2986 | chore(admin): remove stale external-db-bridge refs | `de521f844223` | 2026-11-01T23:12Z |
| #2960 | fix(novidades): remove fake progress bar | `a250706307` | 2026-11-01T23:12Z |
| #2985 | fix(e2e): remove rotas públicas mortas | `7ae070f5dc` | 2026-11-01T23:12Z |
| #2940 | feat(nav): Audit Suite na sidebar admin | `686be704a4` | 2026-11-01T23:12Z |
| #2952 | fix(ci): Gate 1.13 partições mensais E206 | `eeca843a31` | 2026-11-01T23:12Z |
| #2944 | chore(main): release 1.6.1 | `03fc479aaf` | 2026-11-01T23:13Z |

## Addendum rev91 — Falhas adicionais por nome (descobertas via PR-3014 diff)

**Fonte:** `analise-prs/prs.json` e `state.md` da sessão `claude_05/serene-clarke-1o02ey` (PR-3014)
**SHA referência da outra sessão:** `58b4eeaf24f9` — falhas pré-existentes documentadas

### Falhas vitest pré-existentes no main (por nome de teste)

| Arquivo | Teste(s) | Nota |
|---|---|---|
| `tests/scripts/check-migrations-sync-log-gate.test.mjs` | checks de recibo de migration E48 | pré-existente em `58b4eeaf`, migration E48 receipt ausente |
| `src/hooks/stock/__tests__/useRuptureAlerts.test.tsx` | "dedupe by variant_id" | pré-existente — deduplication logic |
| `tests/unit/date-utils.test.ts` | "formatDateTime BRT", "formatTime ISO", "formatTime zero-pad" | 3 testes — formato de data/hora |

**Total outras sessões:** 26042 passando em `58b4eeaf` (fonte: claude_05 state.md)

### main HEAD rev91 (atual)

SHA: `91d4bee21631de745b5908155ccab5a82548a4fe`
Merges rev90: #2979 (`3bf5820259f5`), #2981 (`91d4bee21631`)
main_head_rev89: `95689d5b9dde131fd8428b7c928dfb5f25a0bd82`
Gate Final: QUEUED/STARVATION — systemic (run 41360711486 desde 2026-11-01T23:09Z, never started)
Produção: NÃO VERIFICADO — ERR_PROXY_TUNNEL permanente
Authoritative Gate 2: SUCCESS run 41019605919 SHA `dfec2236c`

*Gerado em rev91 — session_011d8gKLZg8BWivR8aQBwxGF — 2026-11-02*
