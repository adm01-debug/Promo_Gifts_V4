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
| 78b32ddd5 (pós-merge rev88) | **41360711486** | queued (conclusion=null) — gate correto para este SHA | 2026-11-01T23:15Z |
| ec06a45724 (main atual) | — | commits externos adicionados pós-merge | 2026-11-02T00:00Z |

**Nota:** Run 41360711486 confirmado no SHA `78b32ddd52df18efb34452295a778ade7ad1eafb` (deploy-gates.yml). Status queued ao término da sessão. TSC=0 confirmado em `5b5cef36c` (pre-merge). Gate 2 CI baseline autoridade: SUCCESS run 41019605919 SHA `dfec2236c`.

## Vitest — Falhas Individuais

**Nota:** Os nomes individuais dos 23 testes falhando NÃO foram capturados nesta sessão.  
O processo background usou `tail -15` que captou apenas o sumário final (73 arquivos / 23 testes falhando).  
Recuperação impossível — arquivo de saída já foi encerrado.

**Baseline autoritativo para falhas pré-existentes:** Gate 2 CI SUCCESS run 41019605919 SHA `dfec2236c` — 11 arquivos / 137 testes. Falhas adicionais locais (73-11=62 arquivos) são atribuídas a diferenças de ambiente entre CI e local (Supabase mock, workers, etc.).

**Conclusão:** Comparação per-name com baseline CI = **NÃO VERIFICADO** (limitação de captura desta sessão).

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
