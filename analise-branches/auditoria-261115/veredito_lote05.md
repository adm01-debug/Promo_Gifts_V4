# Veredito — lote 05 (47 branches menores)
Repo: adm01-debug/Promo_Gifts_V4 · base de comparação: `origin/main` · auditoria somente leitura (nenhum push/merge/PR/branch apagada).
Método: `git log`/`git diff` contra o merge-base de cada branch + busca do símbolo equivalente em `origin/main` (arquivo:linha citado).

Resumo: **4 DECISAO_HUMANA**, **42 INCORPORADA**, **1 DESCARTAR**, **0 APROVEITAR**.
Nenhuma branch deste lote tem código de produção inédito além dos 4 itens de decisão.

---

## DECISAO_HUMANA (4)

### claude/fix-schema-snapshot-export-cancelled-skip-261101-2344
Conserta o workflow de exportação do snapshot do banco, que era pulado quando o gate de drift é cancelado por `force_rotate`.
- **Ausente da main.** Branch: `.github/workflows/schema-snapshot-export.yml` — `if: (inputs.force_rotate == true || !cancelled()) && ... needs.drift-gate.result == 'cancelled' || ...` (7 linhas + comentário).
- Prova de ausência: `origin/main:.github/workflows/schema-snapshot-export.yml:78-82` ainda é `!cancelled() && ... (needs.drift-gate.result == 'success' || 'skipped' || (workflow_dispatch && inputs.force_rotate))` — sem a cláusula `cancelled`.
- Decisão: mexe em workflow de CI (Git 7). Completo e pequeno; precisa de aval do dono para entrar por PR.

### claude/fix-stock-notes-rollback-header-261101-2151
Adiciona o script de rollback da tabela `stock_notes` e o cabeçalho `-- Rollback:` na migration correspondente.
- **Ausente da main.** Branch: `supabase/rollbacks/20261031000000_rollback.sql` (3 linhas: DROP TRIGGER + DROP TABLE) e 1 linha de cabeçalho em `supabase/migrations/20261031000000_create_stock_notes.sql`.
- Prova de ausência: `git ls-tree origin/main -- supabase/rollbacks` traz 89 arquivos, nenhum `20261031000000_rollback.sql`; `origin/main:supabase/migrations/20261031000000_create_stock_notes.sql:1-2` não tem a linha `-- Rollback:`.
- Decisão: a migration **já está aplicada em produção** (`supabase/MIGRATIONS_SYNC_LOG.md:972` e `:1001`, aplicada fora do fluxo E15 via PR #2871) e o log guarda o sha256 do arquivo — editar o arquivo muda o hash e exige reconciliar o ledger. O histórico da própria branch mostra o agente indo e voltando nesse hash.

### claude/fix-ft-ux-batch5-261101-2222
Três ajustes de UX; dois já estão na main, o terceiro endurece a senha mínima do **login** de 6 para 8.
- Incorporado: `origin/main:src/components/admin/products/new-supplier/useNewSupplierForm.ts:424-428` (mesmo `cnpjErrorHaystack` + `mapCnpjError` + `setCnpjError`); `src/pages/mockups/MockupGenerator.tsx` — 6 linhas adicionadas, 0 faltando.
- **Conflito de regra de negócio:** a branch troca `origin/main:src/lib/validations/authSchema.ts:30` (`password: z.string().min(6, ...)`) por `min(8, ...)`. A main mantém 6 **de propósito**: o comentário do SSOT em `authSchema.ts:3-7` e `isWeakPassword` (`:20-22`) existem para deixar conta legada entrar e ser mandada para `/reset-password`. Subir para 8 trava o login dessas contas.
- Decisão: só o dono decide se contas legadas podem deixar de conseguir logar. Nada mais a resgatar.

### claude/fix-ledger-allowlist-p2027-261113-0705 · claude/fix-release-manifest-versao-real-261114-0305
Dois itens de governança, cada um de 1–2 linhas, ausentes da main:
- `claude/fix-ledger-allowlist-p2027-261113-0705`: inclui a versão `20261104100000` na allowlist do gate de paridade do ledger. Ausente: `origin/main:scripts/migration-ledger-remote-only-allowlist.json` não contém `20261104100000`. A versão está aplicada em produção (`supabase/MIGRATIONS_SYNC_LOG.md:1133`) e já existe como arquivo (`supabase/migrations/20261104100000_partitions_supplier_products_raw_history_2027.sql`), então talvez nem precise de allowlist. **Decisão:** é arquivo de gate do banco de produção e `docs/estado/backlog/banco.md:38` (DB-008) registra essa allowlist como "AGUARDANDO APROVAÇÃO" — mexer nela sem decidir o DB-008 piora o problema.
- `claude/fix-release-manifest-versao-real-261114-0305`: muda a versão de `1.1.0` para `1.8.1` em `package.json` e `.release-please-manifest.json` e **remove** `release-type: node` de `.github/workflows/release-please.yml`. Ausente: `origin/main:package.json:4` e `origin/main:.release-please-manifest.json` ainda em `1.1.0`; `origin/main:.github/workflows/release-please.yml` (última linha) ainda tem `release-type: node`. **Decisão:** numeração de release pública + workflow (Git 7).

---

## DESCARTAR (1)

### importado/vps-fabrica/v2/s48b-2610081950
Só documentação: corrige o registro do BUG-016 (era falso positivo) e os caminhos de bucket de storage.
- `docs/estado/04_FERRAMENTAS_IA.md` (15 linhas) e `docs/estado/12_PLANEJADO_E_SUGERIDO.md` (3 linhas): **0 linhas faltando** — já na main.
- Sobram 10 linhas de nota em `docs/bugs/BUG_AUDIT_INTEGRATION_ROUND3_20260526.md` e 1 linha em `docs/MATRIZ_FLUXOS_CRITICOS_2026-08-26.md`, arquivo que a main arquivou em `docs/arquivo/2026-08/MATRIZ_FLUXOS_CRITICOS_2026-08-26.md`.
- Ruído declarado: relatório/dossiê de auditoria em markdown. Zero código de produção.

---

## INCORPORADA (42)

### Hooks e páginas do mockup
- **importado/vps-fabrica/v2/s15-2610081946** — "recarregar locais do produto não apaga mais a logo/posição". Fix inteiro na main: `src/hooks/mockup/useMockupGenerator.ts:117-121, 197-199, 220, 294-296, 670-671, 738-740` (`areasProductIdRef`, comentários "B F-02" idênticos) e o teste `src/hooks/mockup/__tests__/mockupAreas.preserve.test.ts` existe na main (18 linhas "faltando" = reformatação + `MemoryRouter`).
- **importado/vps-fabrica/v2/s52-2610081948** — aviso de marca cortada por giro/escala. Main: `src/components/mockup/logo-editor/LogoPreviewCanvas.tsx:52` (`export function isMarkClipped`) e `:276`; teste em `.../__tests__/LogoPreviewCanvas.clip.test.tsx:115,142,147`.
- **importado/vps-fabrica/v2/refazer-d7100518** — exclusão segura + busca sanitizada no histórico de mockups. Main: `src/pages/mockups/MockupHistoryPage.tsx:112-125` (`pendingDeleteId`, guarda de `userId` com ramo de erro explícito — mais completo que a branch).
- **importado/vps-fabrica/v2/refazer-d3b19f40** — mesmas regras de upload no seletor e no arraste, sem envio concorrente. `AreaCard.tsx` (22 add) e `ArtFileUpload.tsx` (76 add) com **0 linhas faltando** na main; teste `ArtFileUpload.test.tsx` com 2 linhas de formatação.
- **importado/vps-fabrica/v2/s46-1-2610081949** — aposenta os blocos grep/cópia-local do `mockup-audit.test.ts`. Main já absorveu: `src/hooks/mockup/__tests__/mockupGenerationService.test.ts:134-138` ("Carried over from the retired mockup-audit.test.ts T7 local copy") e `:174-177`; o bloco `TECHNIQUE_PROMPTS` local não existe mais em `mockup-audit.test.ts`.

### Acessibilidade e testes de aceite do mockup
- **importado/vps-fabrica/v2/s78-2610081949** e **importado/vps-fabrica/v2/refazer-d198425f** (mesmo trabalho, duas branches) — nomes acessíveis e alvo de toque no combobox/variantes/sliders. Main: `src/components/ui/slider.tsx:20-25` (repasse de `aria-label`/`aria-labelledby` ao Thumb), `MockupColorSelector.tsx`, `ProductSearchCombobox.tsx`, `LogoSizeControls.tsx` e o snapshot — todos com 0 linhas faltando. O teste `src/components/mockup/__tests__/a11y.mockup.test.tsx` está na main com as mesmas asserções axe (`:81-100`), só com `expect(results.violations).toEqual([])` em vez de `toHaveNoViolations()`.
- **importado/vps-fabrica/v2/s77-1 / s77-4-int / s77-5 / s77-6 / s77-7** — matriz de aceite A01–A02 e grupos 4–7. Todos os `tests/components/mockup/acceptance/grupo{1,4,5,6,7}.acceptance.test.tsx` + `.fixtures.ts` existem na main; o grupo 1 na main é superset (`grupo1.acceptance.test.tsx:157-158` A01 e `:184-185,214` A02, com técnica e geometria a mais). Faltando: 1–13 linhas de texto de teste reescrito.
- **importado/vps-fabrica/v2/s80-2610081950** — specs e2e de resiliência do mockup. Main: `e2e/flows/mockup-resilience.spec.ts:86-105` (504 + "IA service timeout", comentário mais preciso sobre as duas camadas de retry) e `:184-187`; `e2e/routes/app/mockup-generator.spec.ts` com 0 linhas faltando.
- **importado/vps-fabrica/v2/refazer-b6819758** e **importado/vps-fabrica/v2/refazer-cc1ea0bf** — posicionamento do logo por teclado. **Duplicatas exatas entre si** (mesmo blob `a86edff3`); `e2e/flows/mockup-keyboard.spec.ts` está na main (1 linha de `waitForTimeout` a menos).

### BI / PPTX
- **claude/fix-pptx-mock-badges-261101-2315** e a parte PPTX de **claude/fix-ft004-ft033-pptx-mock-labels-261101-2212** — selo "Dados simulados" nos slides. Main: `src/lib/bi/pptxGenerator.ts:13` importa `addMockBadge` de `pptxTheme` e aplica em `:181, :343, :500, :660` (e `:772-773` no slide 6) — mais slides cobertos que a branch.
- Na mesma branch, o `seededRandom` do gráfico de mercado ficou obsoleto: a main **removeu o gerador de dados falsos** de `src/components/intelligence/MarketIntelligenceChart.tsx` (não existe `generateMockMarketData` em `origin/main` — `git grep` vazio) e passou a mostrar `EmptyState` (`:340`) quando não há dado real. O `getMockSupplierTrust` que a branch apaga de `SocialProof.tsx` também já não existe na main.

### Kit Builder / Kit Maker
- **temp-rebase-3321** — restaurar o kit com re-hidratação sem ida ao banco. Main: `src/hooks/kit-builder/useKitAutoSave.ts:31` (`export interface BackupFullState`), `:354-371` (grava `fullState`), `src/hooks/kit-builder/useKitBuilderPageState.ts:451-464` (restaura o `fullState` inteiro) e `src/pages/kit-builder/KitBuilderPage.tsx:63-129` (fluxo "Restaurar edições"/"Reabrir kit", guarda de `isHydrating`). Faltando: 14 linhas de comentário e rótulo.
- **claude/fix-kit-maker-publicados-261101-2202** — stat e filtro "Publicados". Main é superset: `src/pages/kit-builder/KitLibraryPage.tsx:265` aceita `['published','shared']` (a branch aceitava só `shared`) e o card saiu para `src/components/kit-library/KitLibraryStats.tsx:32-33`.

### Edge functions
- **claude/fix-email-remetente-261114-2300**, **claude/fix-email-resend-status-261115-0040** (duplicata da anterior: mesmo commit, mesmo diff) e **claude/fix-email-remetente-resend-261112-0034** — relatório agendado só é marcado como enviado se o Resend aceitar, e e-mails saem pelo domínio verificado. `supabase/functions/process-scheduled-reports/index.ts` com **0 linhas faltando**; prova na main em `:96-118` (`resolveCredential("RESEND_API_KEY")`, `throw` sem chave, `throw` em `!sendRes.ok`) e `:126-132`. `send-scheduled-reports/index.ts`, `send-transactional-email/index.ts` e `tests/scripts/resolve-credential-usage.test.mjs` também 0 faltando. Restam 2–3 linhas de comentário/formatação nos testes.
- **importado/vps-fabrica/v2/refazer-dce5709d** e **importado/vps-fabrica/v2/refazer-e128a94b** (mesmo commit "word-magic com limite de uso, quota e registro de consumo (F-08)", árvores diferentes só pela base) — `supabase/functions/word-magic/index.ts` com **0 linhas faltando** na main; `tests/edge-functions/word-magic.limits.test.ts` 0 faltando; `index.limits.test.ts` com 2 linhas de constante/mock.

### CI, scripts e configuração
- **claude/chore-ci-static-checks-supersede-3525-261114-0206** — consolida checagens estáticas e aposenta 11 workflows em `recovery/workflows-aposentados/`. Tudo na main: os 11 arquivos movidos + `README.md` com 0 linhas faltando, `static-checks.yml` (152 add, 1 comentário faltando), `ci.yml`, `policies-baseline.yml`, `supabase-linter-gate.yml`, `scripts/automation.config.json` — 0 faltando. O filtro de baselines que parecia faltar está na main em `.github/workflows/deploy-gates.yml:115-121` (`'.*-baseline*'`, mais amplo que o da branch).
- **claude/fix-ts-gate1-261109-1915** — falso positivo do `check-select-columns`. A main resolve o mesmo bug de outra forma: `scripts/check-select-columns.mjs:111-113` encerra a janela no próximo `.from(` (comentário "senão um `.from('a').delete()` seguido de `.from('b').select('x')` atribuiria as colunas de `b` a `a`"), em vez do teste `between` da branch. Os arquivos `src/pages/SellerCartsPage.tsx`, `src/pages/seller-carts/CartSidebar.tsx` e `useSellerCartsPage.ts` **saíram do `src/` na main** (só existem em `recovery/src-legacy/`), então as correções de import não têm mais onde aplicar. Divergência que sobra, sem código: `.eslint-baseline-scope.json` — branch `"mode": "incremental"`, main `"mode": "full"`.
- **claude/fix-e125-mockup-casts-261030** — tipar o mapper de mockup. Main: `src/hooks/mockup/mockupGenerationService.ts:169-172` e `:222-246` (mesmos comentários "BUG-CLIENT-ID FIX", `client_id`/`client_name` como colunas de topo). O resto é ruído gerado/anotação: `.any-type-baseline.json`, `.as-assertions-baseline.json` (main tem contagem mais nova: `productionAsCount: 2146`), `package.json` (`--max-old-space-size` 512 na branch vs 4096 na main) e o `✅` em `docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md:1021` (a main não marcou o P200-E125 como feito, embora o código esteja lá — bookkeeping de doc, não código).
- **claude/fix-bot-pr-approval-261113-1030** — PRs abertas pelo `github-actions[bot]` travando checks. A causa raiz foi tratada na main de outro jeito: `.github/workflows/required-checks-guard.yml:23-28` restringe o gatilho `pull_request` a `paths` (`.github/required-checks.json`, o próprio workflow, `docs/ci/SEGREDOS.md`, `scripts/check-secrets-inventory.mjs`), com o comentário "revisão 13/11" — a mesma data da branch; e o `check-no-prod-leak.yml` foi aposentado para `recovery/workflows-aposentados/check-no-prod-leak.yml`. O filtro por ator em si não está na main (um PR de bot que mexa em `.github/**` ainda dispararia o guard) — resíduo conhecido, não trabalho perdido.
- **recuperado/fix-ts-unused-rupture-20261101-2300** — tipar o resultado da query de rupturas. Main: `src/hooks/stock/useRuptureAlerts.ts:73-79` já devolve `RuptureAlertRow[]` tipado, com o cast na Promise em vez de no resultado do `await`. Mesmo efeito de tipo; a branch só propõe outra forma de escrever.
- **recuperado/fix-dep-overrides-e95-261102** — override `braces >=3.0.3` (CVE-2024-4068). O efeito já está garantido: `origin/main:package-lock.json:6826-6827` resolve `braces` em `3.0.3`. A linha de `overrides` em si não está na main (`package.json:447-456` não lista `braces`) — travaria resoluções futuras, mas não há vulnerabilidade aberta hoje.

### Documentação do mockup
- **importado/vps-fabrica/v2/refazer-68f33d86** e **importado/vps-fabrica/v2/refazer-dff79a9a** (mesmo documento, bases diferentes) — roteiro de retenção/lixeira do Mockup. `docs/MOCKUP_RETENCAO.md` está na main; as 5 linhas que faltam são a frase de "conferido na base <sha>" e o intervalo `cron-config.sql:67-78` vs `:67-77`. Ruído de versionamento de doc.

### Recibos do ledger (9 branches, 1 linha cada)
`e15-receipt-20261022100001-40165954774`, `-20261024180001-40164828396`, `-20261024180002-40166677491`, `-20261024180003-40167137573`, `-20261024190001-40166925674`, `-20261025002500-40165426404`, `-20261027140000-40512572184`, `-20261106232045-42325571775`, `-20261112140000-43471685129`.
Cada uma adiciona uma linha de recibo em `supabase/MIGRATIONS_SYNC_LOG.md`. Todas as versões já estão registradas na main:
`20261022100001`→`:956`, `20261024180001`→`:967`, `20261024180002`→`:968`, `20261024180003`→`:969`, `20261024190001`→`:970`, `20261025002500`→`:971`, `20261106232045`→`:1120`, `20261112140000`→`:1140` e `:1488`, `20261027140000`→`:1288` (tabela de reconciliação retroativa).
Sem código. O que não sobrevive é o número da run do GitHub Actions em algumas linhas (ex.: run `40512572184` não aparece na main) e pequenas diferenças de sha256 entre o recibo e a linha reconciliada — informação de auditoria, não funcionalidade.

---

## Tabela

| branch | veredito | o que resgatar |
|---|---|---|
| claude/fix-schema-snapshot-export-cancelled-skip-261101-2344 | DECISAO_HUMANA | fix do `if` do job export em `.github/workflows/schema-snapshot-export.yml` (7 linhas) — workflow, precisa de aval |
| claude/fix-stock-notes-rollback-header-261101-2151 | DECISAO_HUMANA | `supabase/rollbacks/20261031000000_rollback.sql` (3 linhas) + cabeçalho na migration já aplicada em produção (muda sha256 do ledger) |
| claude/fix-ft-ux-batch5-261101-2222 | DECISAO_HUMANA | só a senha mínima do login 6→8 (`authSchema.ts:30`) — trava contas legadas; o resto já está na main |
| claude/fix-ledger-allowlist-p2027-261113-0705 | DECISAO_HUMANA | 1 versão na allowlist do gate do ledger — arquivo "AGUARDANDO APROVAÇÃO" (DB-008) |
| claude/fix-release-manifest-versao-real-261114-0305 | DECISAO_HUMANA | versão 1.1.0→1.8.1 + remoção de `release-type: node` no workflow de release |
| importado/vps-fabrica/v2/s48b-2610081950 | DESCARTAR | nada — só doc/relatório (10 linhas de nota do BUG-016) |
| importado/vps-fabrica/v2/s15-2610081946 | INCORPORADA | nada |
| importado/vps-fabrica/v2/s52-2610081948 | INCORPORADA | nada |
| importado/vps-fabrica/v2/s78-2610081949 | INCORPORADA | nada |
| importado/vps-fabrica/v2/refazer-d198425f | INCORPORADA | nada (mesmo trabalho de s78) |
| importado/vps-fabrica/v2/refazer-d7100518 | INCORPORADA | nada |
| importado/vps-fabrica/v2/refazer-d3b19f40 | INCORPORADA | nada |
| importado/vps-fabrica/v2/s46-1-2610081949 | INCORPORADA | nada |
| importado/vps-fabrica/v2/s77-1-2610081950 | INCORPORADA | nada |
| importado/vps-fabrica/v2/s77-4-2610081951-int | INCORPORADA | nada |
| importado/vps-fabrica/v2/s77-5-2610081951 | INCORPORADA | nada |
| importado/vps-fabrica/v2/s77-6-2610081951 | INCORPORADA | nada |
| importado/vps-fabrica/v2/s77-7-2610081951 | INCORPORADA | nada |
| importado/vps-fabrica/v2/s80-2610081950 | INCORPORADA | nada |
| importado/vps-fabrica/v2/refazer-b6819758 | INCORPORADA | nada (duplicata exata de refazer-cc1ea0bf) |
| importado/vps-fabrica/v2/refazer-cc1ea0bf | INCORPORADA | nada (duplicata exata de refazer-b6819758) |
| importado/vps-fabrica/v2/refazer-dce5709d | INCORPORADA | nada (mesmo commit de refazer-e128a94b) |
| importado/vps-fabrica/v2/refazer-e128a94b | INCORPORADA | nada (mesmo commit de refazer-dce5709d) |
| importado/vps-fabrica/v2/refazer-68f33d86 | INCORPORADA | nada (doc; mesmo texto de refazer-dff79a9a) |
| importado/vps-fabrica/v2/refazer-dff79a9a | INCORPORADA | nada (doc; mesmo texto de refazer-68f33d86) |
| temp-rebase-3321 | INCORPORADA | nada |
| claude/fix-kit-maker-publicados-261101-2202 | INCORPORADA | nada (main é superset) |
| claude/fix-ft004-ft033-pptx-mock-labels-261101-2212 | INCORPORADA | nada (seededRandom ficou obsoleto: main removeu o gerador de dados falsos) |
| claude/fix-pptx-mock-badges-261101-2315 | INCORPORADA | nada (main é superset) |
| claude/fix-email-remetente-261114-2300 | INCORPORADA | nada |
| claude/fix-email-resend-status-261115-0040 | INCORPORADA | nada (duplicata de fix-email-remetente-261114-2300) |
| claude/fix-email-remetente-resend-261112-0034 | INCORPORADA | nada |
| claude/chore-ci-static-checks-supersede-3525-261114-0206 | INCORPORADA | nada |
| claude/fix-ts-gate1-261109-1915 | INCORPORADA | nada (main resolve de outra forma; arquivos seller-carts saíram do src) |
| claude/fix-e125-mockup-casts-261030 | INCORPORADA | nada (baselines = ruído gerado) |
| claude/fix-bot-pr-approval-261113-1030 | INCORPORADA | nada (causa raiz tratada por filtro de paths na main) |
| recuperado/fix-ts-unused-rupture-20261101-2300 | INCORPORADA | nada |
| recuperado/fix-dep-overrides-e95-261102 | INCORPORADA | nada (lock já em braces 3.0.3) |
| e15-receipt-20261022100001-40165954774 | INCORPORADA | nada (recibo; log na main:956) |
| e15-receipt-20261024180001-40164828396 | INCORPORADA | nada (log na main:967) |
| e15-receipt-20261024180002-40166677491 | INCORPORADA | nada (log na main:968) |
| e15-receipt-20261024180003-40167137573 | INCORPORADA | nada (log na main:969) |
| e15-receipt-20261024190001-40166925674 | INCORPORADA | nada (log na main:970) |
| e15-receipt-20261025002500-40165426404 | INCORPORADA | nada (log na main:971) |
| e15-receipt-20261027140000-40512572184 | INCORPORADA | nada (log na main:1288, reconciliação retroativa) |
| e15-receipt-20261106232045-42325571775 | INCORPORADA | nada (log na main:1120) |
| e15-receipt-20261112140000-43471685129 | INCORPORADA | nada (log na main:1140 e :1488) |
