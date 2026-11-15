# Veredito — grupo 08 (13 branches)

Repo: /home/user/Promo_Gifts_V4 (adm01-debug/Promo_Gifts_V4). Somente leitura. Nenhuma escrita, push, PR ou checkout feito.
Resumo: 13 branches, **0 APROVEITAR**, **13 INCORPORADA**, 0 DESCARTAR, 0 DECISAO_HUMANA.

---

## 1. claude/fix-migration-rollback-header-261108-1520 — `c0e8f0a242` — INCORPORADA
Diff real: só `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` (+6 linhas de comentário, nenhum SQL executável).
- Cabeçalho `-- Rollback:` já está na main: `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql:2` → `-- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;` (redação mais curta, mesmo efeito).
- As duas linhas que não existem na main (`-- transaction: none`, `-- approved-by: adm01-debug`) são marcas de opt-out exigidas **apenas** para `CREATE INDEX CONCURRENTLY` / tabela grande — `scripts/preflight-migration-apply.mjs:153-172` e `:345`. A migration usa `CREATE INDEX IF NOT EXISTS` comum (`origin/main:...:135`), que só gera aviso (E062), não bloqueio. Logo não falta nada de produção.

## 2. claude/trem5-mockup-261115-0015 — `1c08a0fce4` — INCORPORADA
32 arquivos, +2829/-379 (gerador de mockup: histórico paginado, restauração de rascunho, logo do cliente do CRM, troca de variante, a11y do combobox).
Todos os arquivos novos de produção existem na main: `src/hooks/mockup/mockupSelectionSnapshot.ts`, `src/hooks/mockup/mockupHistoryAdapter.ts`, `src/hooks/mockup/useMockupTechniques.ts`, `src/components/mockup/clientLogoFile.ts` (`git cat-file -e origin/main:<arquivo>` = EXISTS nos 4).
As 5 linhas apontadas como "fora da main" são andaime de teste reescrito na main, não código de produção:
- `src/components/mockup/__tests__/MockupClientSelector.a11y.test.tsx` — `function renderSelector(` existe na main na linha 60 (na main recebe parâmetros) e `<MockupClientSelector selectedClient=...` na linha 69.
- `tests/hooks/useMockupGenerator.test.ts` — mesmos mocks na main: `vi.mock('@/hooks/mockup/useMockupTechniques'...)` linha 57, `vi.mock('@/hooks/mockup/mockupHistoryAdapter'...)` linha 130, `import { fetchRecentMockupHistory }` linha 139 (diferença é só aspas simples vs duplas).
`docs/coordenacao/conflitos-semanticos.md` = dossiê de coordenação (ruído).

## 3. fix/ratchet-weekly-sigpipe-20261029 — `b2018e7c98` — INCORPORADA
Único arquivo de produção: `.github/workflows/ratchet-weekly.yml` (+2/-1) — evitar SIGPIPE (exit 141) ao truncar o diff de baselines com `head` sob `pipefail`.
A main resolve o mesmo bug com outra implementação: `origin/main:.github/workflows/ratchet-weekly.yml:148-150` → grava `git diff ... > /tmp/ratchet-diff.txt` e depois `head -40 /tmp/ratchet-diff.txt` (comentário explícito: "Grava diff em arquivo tmp para evitar SIGPIPE ao truncar com head"). A branch usava `sed -n '1,40p' <<< "$DIFF_OUT"`.
`analise-prs/RELATORIO_PRS.md`, `analise-prs/prs.json`, `analise-prs/dossies/PR-*.md` = dossiê de análise (ruído).

## 4. importado/vps-fabrica/v2/refazer-405e4009 — `1048bb53d8` — INCORPORADA
A11y do gerador de mockup (nome acessível de combobox/variantes, alvo de toque 44px, `motion-reduce`, nome do thumb do slider).
Os 4 arquivos de produção estão **byte a byte** na main:
- `origin/main:src/components/ui/slider.tsx` — bloco `<SliderPrimitive.Thumb aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} ...>` com o mesmo comentário WCAG 4.1.2, idêntico ao da branch.
- `origin/main:src/components/mockup/logo-editor/LogoSizeControls.tsx:88,128,191` — `aria-label="Largura (cm)"`, `"Altura (cm)"`, `"Escala (%)"`.
- `origin/main:src/components/mockup/ProductSearchCombobox.tsx:95` (`aria-label` do gatilho), `:103` (`min-h-[44px]`), `:189` (`motion-reduce:animate-none`).
- `origin/main:src/components/mockup/MockupColorSelector.tsx:163,199,205,206` — `motion-reduce:animate-none`, `aria-label` de cor+estoque, `min-h-[44px]`, anel de foco.
As 5 linhas "fora da main" são só estilo de asserção no teste `src/components/mockup/__tests__/a11y.mockup.test.tsx`: branch usa `expect(results).toHaveNoViolations()`, main usa `expect(results.violations).toEqual([])` (diff de 5 linhas, resto idêntico).

## 5. importado/vps-fabrica/v2/refazer-73c70025 — `dcda124cb0` — INCORPORADA
`git diff 1048bb53d8 dcda124cb0` = **vazio**: árvore idêntica à branch 4 (mesmo merge-base `a9c8bd9c4e`, mesmos 6 arquivos, +319/-5). Duplicata exata; a prova da branch 4 vale integralmente.

## 6. claude/feat-idx-fk-estoque-supersede-3412-261114-0141 — `5070c85406` — INCORPORADA
11 índices faltantes (3 FKs CASCADE de `stock_snapshots`, 2 de `stock_notes`, 6 de desempenho).
- `supabase/migrations/20261114014100_idx_fk_stock_and_missing_perf_indexes.sql` — `diff` contra `origin/main` = **IDENTICO**.
- Já **aplicada em produção**: `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1166` → run `43634622250`, 2026-11-14, "aplicada em produção".
- `scripts/drift-baseline.mjs` — `origin/main:scripts/drift-baseline.mjs:353` tem `['20261114014100_idx_fk_stock_and_missing_perf_indexes.sql', { concurrentlyIndexes: 11 }]`.
- As 4 linhas "fora da main" estão em `supabase/rollbacks/20261114014100_rollback.sql`: a main **comentou de propósito** os 4 `DROP INDEX CONCURRENTLY` (`idx_stock_snapshots_product_id`, `..._variant_supplier_source_id`, `idx_stock_notes_created_by`, `idx_stock_notes_supplier_id`) com a justificativa "já existia em produção antes desta migration (pg_indexes 2026-11-14): o rollback não pode apagá-lo". A versão da branch é a **anterior e mais perigosa**; restaurá-la seria regressão.

## 7. claude/fix-ft174-previa-indicativa-mockup-261101-2350 — `df977e128d` — INCORPORADA
Aviso de que o mockup é prévia indicativa, no card de resultado.
Na main: `src/components/mockup/MockupResultCard.tsx:330` → `Prévia indicativa — o resultado final pode variar conforme o produto físico.` (mesmo local no `CardContent`, texto reescrito). Aviso equivalente também em `src/components/kit-builder/PersonalizationConfig.tsx:1046`.

## 8. claude/fix-ft-multi-261101-2330 — `d9ec2dd83f` — INCORPORADA
Quatro correções de front (FT-040/FT-083/FT-093), todas resolvidas na main:
- Aviso ao salvar orçamento sem cliente: `origin/main:src/pages/kit-builder/useKitBuilderQuote.ts:455-457` tem o mesmo `if (!client.client_name?.trim())` com o toast `'Orçamento salvo sem cliente definido. Edite o orçamento para associar um cliente.'`.
- Promessa de validação de peso na landing: `origin/main:src/components/kit-builder/KitMakerLanding.tsx:60` → `'Compatibilidade e ocupação são verificados durante a montagem.'` — a palavra "peso" foi retirada (a branch reescrevia a frase com a ressalva de carga máxima; a main eliminou a promessa).
- Progresso falso aleatório em `NoveltyProductGrid` / `ReplenishmentProductGrid`: a main **removeu o contador aleatório inteiro** (`Math.random() * 12` não existe mais em nenhum dos dois arquivos) e trocou por skeleton + barra indeterminada — `origin/main:src/components/replenishments/ReplenishmentProductGrid.tsx:216-231` (`role="progressbar" aria-label="Carregando"` com `animate-pulse`, sem percentual) e `origin/main:src/components/novelties/NoveltyProductGrid.tsx:371,402-405` (grid de `ProductCardSkeleton`/`NoveltyCardSkeleton`). O defeito que a branch mitigava deixou de existir.

## 9. codex/chore-db-receipt-261107-0200 — `14e03da9e7` — INCORPORADA
Só `supabase/MIGRATIONS_SYNC_LOG.md` (recibo de aplicação — documentação, sem código).
- `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1120` → `20261106232045 | fix_handle_updated_at_search_path | aplicada — ledger e pg_proc.proconfig = {search_path=public} confirmados no canônico em 2026-11-08`.
- `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1114` → `20261101201000 | fix_health_view_backup_check | aplicada — workflow E15 run 41841468881; post-check confirmou a versão no ledger canônico em 2026-11-07 01:45:37 UTC`.
Mesmos dois recibos, com evidência mais forte que a da branch.

## 10. claude/chore-drift-mirror-cron001-reopen-261108-2340 — `8cbd22b3d1` — INCORPORADA
Dois arquivos-espelho de DDL de cron aplicada fora de banda.
`origin/main` tem os dois: `supabase/migrations/20261101223908_cron001_stagger_additional_jobs.sql` e `supabase/migrations/20261101232022_cron001_stagger_schedules_reapply.sql`. `diff` contra a branch difere **em uma linha de comentário** em cada um — a main acrescenta `(PR #3015, fechada sem merge)` à linha de referência. Todo o SQL (`cron.alter_job` de 292/303/241 e 276/224/114/243) é idêntico.

## 11. claude/fix-ft167-logo-remove-area-id-261101-2234 — `455c4f3156` — INCORPORADA
`onLogoRemove` passar a receber `areaId` e limpar a análise de cor só da área ativa.
`origin/main:src/pages/mockups/MockupGenerator.tsx:321-329` tem a versão **mais completa**: `onLogoRemove={(areaId) => { mg.logoColorAnalysis.clearForArea(areaId); mg.setPersonalizationAreas(prev => prev.map(a => a.id === areaId ? {...a, logoPreview: null, logoFile: null} : a)); mg.setGeneratedMockup(null); }}` — limpa por área via `clearForArea`, em vez do `clearAnalysis()` global da branch.

## 12. claude/fix-gate112-soft-delete-stock-notes-261101-1600 — `4685a62f86` — INCORPORADA
Marca `soft-delete-exempt` em `stock_notes` (Gate 1.12) + recibo no log.
- `origin/main:supabase/migrations/20261031000000_create_stock_notes.sql:10` → `-- soft-delete-exempt: notas de usuário — hard-delete intencional por policy (stock_notes_delete_own)` (linha própria acima do `CREATE TABLE` da linha 11; a branch punha o comentário na mesma linha do `CREATE TABLE`).
- Recibos na main: `supabase/MIGRATIONS_SYNC_LOG.md:972` e `:1001` (`20261031000000` — aplicada via PR #2871, reconciliação repair-only) e `:1006` confirma que o hash é "versão com `-- soft-delete-exempt`".

## 13. claude/fix-health-check-timeout-261106-0045 — `9dac628c03` — INCORPORADA
`PROBE_TIMEOUT_MS` de 1500 → 5000 ms na edge function de health-check (cold start do PostgREST causava 503 falso no monitor de uptime).
`origin/main:supabase/functions/health-check/index.ts:23` → `const PROBE_TIMEOUT_MS = 5000;` com o comentário `// Absorb observed 2–4s PostgREST cold starts without exceeding the 30s uptime probe budget.` Mesmo valor, comentário reescrito.
Os 3 commits de `graphify-out/manifest.json` da branch são artefato gerado (ruído).

---

### Ruído encontrado neste grupo (não conta como trabalho)
`analise-prs/` (RELATORIO_PRS.md, prs.json, dossies/PR-*.md), `docs/coordenacao/conflitos-semanticos.md`, `graphify-out/manifest.json`, `supabase/MIGRATIONS_SYNC_LOG.md` quando só registra recibo.

### Conclusão
Nenhuma das 13 branches tem código de produção ausente da main. Em 4 casos a main tem a **versão superior** (branch 6 rollback corrigido, branch 8 progresso falso removido em vez de amenizado, branch 11 `clearForArea` por área, branch 3 SIGPIPE via arquivo tmp) — restaurar a branch seria regressão. Todas podem permanecer apagadas.
