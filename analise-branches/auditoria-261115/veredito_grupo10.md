# Veredito — grupo 10 (13 branches apagadas, commits ainda no clone)

Método: `merge-base` → diff da branch → diff residual da branch **contra `origin/main`** (prova byte a byte do que
falta) → grep do símbolo na main. Nenhuma escrita feita: só leitura.

## Resumo

| branch | sha | veredito |
|---|---|---|
| importado/vps-fabrica/v2/refazer-78b4c5e8 | 2db6607a4f | INCORPORADA |
| importado/vps-fabrica/v2/refazer-8429813d | 437fd317aa | INCORPORADA (gêmea da anterior) |
| importado/vps-fabrica/v2/refazer-adb7f295 | 7b3b80f98e | INCORPORADA |
| claude/fix-dep-overrides-e95-261102 | 3495252a4b | **APROVEITAR** |
| claude/fix-ft139-confetti-reduced-motion-261101-2234 | 1d021efe1b | INCORPORADA |
| claude/fix-p09-ledger-sem-ausentes-supersede-3411-261114-0145 | c872d14723 | INCORPORADA |
| claude/fix-stock-notes-recibo-261101-1325 | 3cbea11728 | INCORPORADA |
| claude/recibos-consolidados-261113 | 1ded43ffca | INCORPORADA |
| e15-receipt-20260917061500-43668677152 | 8d833dbf6d | INCORPORADA |
| e15-receipt-20261107134429-43654437109 | 90a45fbe52 | INCORPORADA |
| e15-receipt-20261113225000-43634465261 | a81cdc0ad9 | INCORPORADA |
| e15-receipt-20261114014100-43634622250 | f7737d0a91 | INCORPORADA |
| e15-receipt-20261114014500-43634292304 | 37613aa011 | INCORPORADA |

Só 1 de 13 tem trabalho ausente da main — e é 1 linha de `package.json`.

---

## 1-2. importado/vps-fabrica/v2/refazer-78b4c5e8 (2db6607a4f) e refazer-8429813d (437fd317aa) — INCORPORADA

Trabalho: teto de uso por usuário na edge `word-magic` (IA de descrição de produto) — rate limit 20 req/min,
quota atômica antes de chamar a DeepSeek e registro de consumo em `ai_usage_logs`.

As duas branches têm merge-base diferente mas conteúdo de `word-magic` **byte a byte idêntico** entre si
(`git diff 2db6607a4f 437fd317aa -- supabase/functions/word-magic/` vazio).

Prova na main — `supabase/functions/word-magic/index.ts`:
- :10 `import { applyRateLimit, rateLimiters } from '../_shared/rate-limiter.ts';`
- :11 `import { acquireAiQuota, logAiUsage } from '../_shared/ai-usage.ts';`
- :16 `export const AI_FUNCTION_NAME = 'word-magic';`
- :97 `const rateLimited = await applyRateLimit(req, rateLimiters.ai, () => auth.userId);`
- :114-116 `logAiUsage({ ... functionName: AI_FUNCTION_NAME ... })`
- :188 `const quota = await acquireAiQuota(auth.userId, AI_FUNCTION_NAME, DEEPSEEK_MODEL);`

Os 3 arquivos existem na main (`git ls-tree origin/main`): `supabase/functions/word-magic/index.ts`,
`supabase/functions/word-magic/index.limits.test.ts`, `tests/edge-functions/word-magic.limits.test.ts`.

Diff residual branch→main = 3 linhas, e em todas **a main é a versão mais nova**:
- import `https://esm.sh/@supabase/supabase-js@2.49.4` (branch) → `npm:@supabase/supabase-js@2.49.4` (main);
- `PRODUCT_ID` do teste: a branch usa UUID nulo `00000000-...-0001`, a main usa UUID v4 válido
  `11111111-1111-4111-8111-111111111111` com comentário "o `z.string().uuid()` da main recusa o UUID nulo".

Restaurar a branch reverteria a main. Nada a resgatar.

## 3. importado/vps-fabrica/v2/refazer-adb7f295 (7b3b80f98e) — INCORPORADA

Trabalho: separar o botão "Gerar Mockup" (só compõe a imagem) do "Gerar documento" (papel timbrado), mantendo
"Gerar Layout" estático — painel de mockup.

Prova na main — `src/components/mockup/approval/MockupLayoutButtons.tsx`: :3-4 (doc do componente), :161
`handleGenerateDocument`, :168 `handleGenerateMockup`, :305 `data-testid="mockup-action-buttons"`, :312/:321
botão "Gerar Mockup", :338/:343 botão "Gerar documento", :369 "Gerar Layout". O teste também está na main:
`src/components/mockup/__tests__/MockupLayoutButtons.test.tsx`.

Diff residual branch→main nesses 2 arquivos mostra a main mais nova: a main extraiu a conversão cm→px para o
SSOT `cmParaPx` de `@/lib/mockup-geometry` (a branch tem a matemática duplicada inline) e tipou
`onGenerateMockup?: () => Promise<unknown>` para suportar recusa por dimensão ausente. Restaurar reverteria.

> Observação: o resto da branch (54 outros arquivos de `src/components/mockup/`) é só a defasagem da base —
> a main evoluiu ~4 mil linhas ali depois. Não é trabalho da branch.

## 4. claude/fix-dep-overrides-e95-261102 (3495252a4b) — APROVEITAR

Trabalho: **1 linha** em `package.json`, dentro de `overrides`:

```
"braces": ">=3.0.3",
```

É uma trava de segurança: força qualquer dependência que puxe `braces` a usar ≥3.0.3, versão que corrige a
CVE-2024-4068 (travamento por expressão regular — ReDoS — no parser de `braces`).

Prova de que falta na main: `git show origin/main:package.json` tem `overrides` com `esbuild`, `image-size`,
`js-yaml`, `minimatch`, `nanoid`, `tmp`, `undici`, `uuid` — **sem `braces`**. E
`git log -S'"braces"' origin/main -- package.json` volta vazio: nunca esteve na main (não foi rejeitado nem
revertido; simplesmente não entrou).

Completo? Sim — é a mudança inteira (1 linha, nada pela metade).

Valor real, sem exagero: hoje o risco **já está neutralizado de fato**, porque o `package-lock.json` da main
já resolve `braces` em 3.0.3 (`origin/main:package-lock.json:6826-6829`). A trava serve para o futuro: impede
que uma atualização de dependência traga de volta uma versão vulnerável sem ninguém notar. Ganho de
manutenção/segurança preventiva, não correção de falha ativa.

## 5. claude/fix-ft139-confetti-reduced-motion-261101-2234 (1d021efe1b) — INCORPORADA

Trabalho: não disparar o confete do montador de kits para quem pediu "menos animação" no sistema
operacional (acessibilidade).

Prova na main — `src/hooks/kit-builder/useKitBuilderPageState.ts`:287-292: a mesma guarda, escrita como
terceira condição do `if` em vez de `if` aninhado:
```
    if (
      kitState.isValid &&
      kitState.items.length > 0 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      confetti({ ... });
```
Implementação equivalente, comportamento idêntico. Nada a resgatar.

## 6. claude/fix-p09-ledger-sem-ausentes-supersede-3411-261114-0145 (c872d14723) — INCORPORADA

Trabalho: migration P09 revisada, que registra no ledger `schema_migrations` só as 360 versões com objeto
verificado em produção (supersede a PR #3411), mais o snapshot do baseline estendido e testes.

Diff residual branch→main nos 6 arquivos tocados: **4 de 6 são byte a byte idênticos à main** —
`supabase/migrations/20261114014500_p09_reconcile_ledger_schema_migrations.sql`,
`supabase/rollbacks/20261114014500_rollback.sql`,
`supabase/baseline/20261015140000_ledger_versions.json` (as 362 linhas do snapshot) e
`tests/scripts/build-migration-ledger-manifest.test.mjs`.

Prova na main: `supabase/MIGRATIONS_SYNC_LOG.md`:1597 (seção "2026-11-14 — P09 revisada (supersede #3411):
ledger só com versões verificadas") e :1613, que registra a migration **já aplicada em produção** em
2026-11-14 19:51:43 UTC pela run 43634292304, confirmada em `supabase_migrations.schema_migrations`.
Arquivo da migration na main: blob `be990b0ac4`.

Nos 2 arquivos que diferem, a main é a mais nova: `tests/scripts/drift-baseline.test.mjs` tem na main um teste
a mais que a branch não tem (BOM inicial da cópia de replay), e o log de sync da main tem ~100 linhas a mais.
Restaurar a branch apagaria esse teste. Nada a resgatar.

## 7. claude/fix-stock-notes-recibo-261101-1325 (3cbea11728) — INCORPORADA

Trabalho: `deleted_at` + índice parcial de ativos na criação da tabela `stock_notes` (exclusão suave das
notas de estoque, Gate 1.12), mais o recibo no ledger.

Prova na main — `supabase/migrations/20261031000000_create_stock_notes.sql`:20 (`deleted_at timestamptz
DEFAULT NULL`) e :29 (`WHERE deleted_at IS NULL` do `stock_notes_active_idx`). Recibo na main:
`supabase/MIGRATIONS_SYNC_LOG.md`:972, mesma sha256 `209ba7abacce…`, texto "corrigida: deleted_at +
stock_notes_active_idx adicionados (Gate 1.12)".

Diff residual: a main tem uma linha de comentário a mais (`-- soft-delete-exempt: notas de usuário …`) que a
branch não tem. Main mais nova. Nada a resgatar.

## 8. claude/recibos-consolidados-261113 (1ded43ffca) — INCORPORADA

Trabalho: consolidar 23 recibos de deploy de edge function (E66) e 4 recibos de migration (E15) que ficaram
presos em PRs de bot, e atualizar 3 linhas de status "pendente"→"aplicada".

Prova na main:
- `supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md`:944 (`force-global-logout`, run 43208862484), :962
  (`mcp-keys-update`, run 43367365205), :966 (`verify-2fa-token`, run 43368850157) — as 23 linhas estão lá.
- `supabase/MIGRATIONS_SYNC_LOG.md`:1133 (`20261104100000`), :1134 (`20261112011000`), :1135
  (`20261108001500`), :1136 (`20261112130000`) — os 4 recibos E15, mesmas sha256.
- As correções de status: main :1455 (`20261112011000` "**aplicada em 12/11/2026**") e :1482
  (`20261112130000` "**aplicada em 13/11/2026**").

Pendência residual (não é trabalho perdido, é inconsistência da própria main): `origin/main:1187` ainda diz
"aguardando aplicação" para `20261108001500`, embora a mesma main registre em :1135 que ela foi aplicada em
2026-11-13 02:30:43 UTC. A branch corrigia essa 1 linha de texto. Mesmo padrão aparece em :1586
(`20261113225000`) e :1624 (`20261114014100`), que dizem "pendente" apesar dos recibos de aplicada em
:1165/:1166. É texto de ledger, não código; qualquer agente refaz em 1 linha com a evidência acima.

## 9-13. e15-receipt-* (5 branches) — INCORPORADA

Branches de recibo geradas pelo `db-apply-migration.yml`: cada uma acrescenta **1 linha** à tabela de recibos
E15 de `supabase/MIGRATIONS_SYNC_LOG.md`. Nenhuma toca código, migration, workflow ou configuração.

Todas as 5 já estão na main, conferidas pela sha256 do arquivo aplicado:

| branch | sha256 do recibo | prova na main |
|---|---|---|
| e15-receipt-20260917061500-43668677152 (8d833dbf6d) | `74f5094bab…` | `supabase/MIGRATIONS_SYNC_LOG.md`:1175 |
| e15-receipt-20261107134429-43654437109 (90a45fbe52) | `fd1fbfceb0…` | :1168 (e :1126) |
| e15-receipt-20261113225000-43634465261 (a81cdc0ad9) | `4bc14de41e…` | :1165 |
| e15-receipt-20261114014100-43634622250 (f7737d0a91) | `651823afa2…` | :1166 |
| e15-receipt-20261114014500-43634292304 (37613aa011) | `a06fe201d7…` | :1171 (e :1613) |

A linha da main é igual ou mais rica (traz o número da run e a observação de que o job Recibo não gravou
sozinho). Nada a resgatar.
