# Veredito — Lote 04 (34 branches)

Método: `git log/diff` contra o merge-base de cada branch + busca do símbolo equivalente em
`origin/main` + consulta read-only ao banco de produção `doufsxqlfjyuvxuezpln` (MCP `execute_sql`)
para as branches de migration. Nenhuma escrita, nenhum push, nenhum merge, nenhuma branch apagada.

---

## 1. importado/vps-fabrica/v2/fix-remover-atalhos-destrutivos-do-gerad-2610081909
**Veredito: INCORPORADA**
Remoção dos atalhos de teclado destrutivos (Esc/Ctrl+R/Ctrl+D/1-6) no gerador de mockup — já está na main, idêntico.
Provas:
- `origin/main:src/components/mockup/KeyboardShortcuts.tsx:14-17` tem o mesmo comentário e a mesma assinatura `useKeyboardShortcuts({ onGenerate, canGenerate, isLoading })` da branch.
- `origin/main:src/components/mockup/KeyboardShortcuts.tsx:26-35` — só sobrou Ctrl/Cmd+Enter; o `KeyboardShortcutsHint` foi removido de vez na main.
- Teste: a main tem `src/components/mockup/__tests__/KeyboardShortcuts.dead.test.tsx`, que prova o módulo não exportar mais o Hint e o Ctrl+Enter continuar chamando `onGenerate`.
- Resíduo (teste, não produção): os 3 casos de regressão da branch (`Escape não reseta`, `Ctrl+R não reseta`, `Ctrl+D não baixa`) não têm equivalente na main.

## 2. importado/vps-fabrica/v2/n03-2610082244
**Veredito: INCORPORADA**
Seletor de cliente do mockup acessível (navegação por setas, listbox ARIA, confirmar antes de remover) — a main tem a versão já refinada.
Provas: `origin/main:src/components/mockup/MockupClientSelector.tsx:69` (`activeIndex`), `:75` (`listboxId`), `:145-146` (`handleInputKeyDown`), `:216` (`ConfirmDialog`), `:268-281` (`role="combobox"`, `aria-activedescendant`), `:403-415` (`role="listbox"`/`role="option"`). Teste em `origin/main:src/components/mockup/__tests__/MockupClientSelector.a11y.test.tsx`.

## 3. release-please--branches--main--components--gifts-store
**Veredito: DESCARTAR (ruído gerado)**
Branch automática do release-please com o release 1.2.0 (CHANGELOG + bump de versão) — 100% gerada pelo bot.
Provas: único commit `e83f24511 chore(main): release 1.2.0`; muda só `.release-please-manifest.json`, `CHANGELOG.md`, `package.json`, `package-lock.json`. Main está em `1.1.0` (`origin/main:package.json`, `origin/main:.release-please-manifest.json`).
Nota de negócio: apagar a branch só adia o release 1.2.0 — o bot recria a PR no próximo push em `main`. Nenhum código se perde.

## 4. importado/vps-fabrica/v2/s18a-2610081946
**Veredito: INCORPORADA**
Produto sem medidas (cm) não gera mockup (trava no hook em vez de inventar escala) — está na main.
Provas: `origin/main:src/hooks/mockup/useMockupGenerator.ts:48-51` (importa `MISSING_DIMENSIONS_MESSAGE`, `MISSING_DIMENSIONS_REFUSAL`, `resolveProductDimensions`, `hasRealProductDimensions`), `:156-160` (`productDimensions` + `missingDimensions`), `:546-549` (recusa tipada antes de chamar a edge), `:580-581` (payload WYSIWYG usa a fonte única). Tipo relaxado em `origin/main:src/components/mockup/approval/MockupLayoutButtons.tsx:80` (`Promise<unknown>`). Teste: `origin/main:src/hooks/mockup/__tests__/mockupDimensions.guard.test.ts`.

## 5. recuperado/fix-ft088-check-item-fits-261108-2215
**Veredito: INCORPORADA**
Versionar a função que calcula se um produto cabe na embalagem (FT-088) — a main já tem a mesma migration com outro timestamp.
Provas: `origin/main:supabase/migrations/20261108030200_ft088_fn_check_item_fits.sql` é funcionalmente idêntica (mesmo corpo plpgsql, mesma assinatura, mesmo `SET search_path`). Rollback em `origin/main:supabase/rollbacks/20261108030200_rollback.sql`.
Resíduo: a branch tinha uma linha extra `GRANT EXECUTE ... TO authenticated` que a versão da main não repete (o objeto já existia em produção com o grant).

## 6. importado/vps-fabrica/v2/s49-2610081950
**Veredito: INCORPORADA**
ADR separando a fronteira Mockup × Magic Up — a main tem uma versão posterior e mais avançada do mesmo ADR.
Provas: `origin/main:docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md` existe e está em **Status: ACEITO pelo dono**, contra **PROPOSTO** na branch. Os outros dois arquivos da branch (`docs/MATRIZ_FLUXOS_CRITICOS_2026-08-29.md`, `docs/READINESS_LIFECYCLE_FEATURES_2026-08-29.md`) não existem mais na main — foram removidos depois. Docs-only, zero código.

## 7. claude/perf-cron005-refresh-all-mvs-diario-261114-1002
**Veredito: DECISAO_HUMANA**
Faz o refresh diário das views materializadas rodar 1×/dia com timeout real de 600 s — hoje ele morre em 120 s em 100% das execuções. **Não aplicado em produção.**
Provas:
- Migration `supabase/migrations/20261114120100_cron005_refresh_all_mvs_diario_timeout_real.sql` (+20) e rollback `supabase/rollbacks/20261114120100_rollback.sql` (+11) não existem na main (`git ls-tree origin/main -- supabase/migrations | grep 20261114` não lista).
- Produção (consulta read-only em `cron.job`, 2026-11-15): `refresh-all-materialized-views` continua com `schedule='38 */2 * * *'` e `timeout 55000` — ou seja, a correção não foi aplicada.
O que decidir: é DDL/cron em produção; só entra pelo workflow `db-apply-migration.yml` com aprovação do dono.

## 8. importado/vps-fabrica/v2/s55-2610081946
**Veredito: INCORPORADA**
Reabrir rascunho/histórico do mockup restaura a variante e a foto exatas — está na main.
Provas: `origin/main:src/hooks/mockup/mockupSelectionSnapshot.ts:17` (`MockupSelectionSnapshot`), `:34` (`HISTORY_KEY = 'mockup_selection_v1'`), `:131`/`:168`/`:195` (snapshot/restore); consumo em `origin/main:src/hooks/mockup/useMockupDraft.ts:5,70`. Testes: `origin/main:src/hooks/mockup/__tests__/mockupRestore.selection.test.ts` e `mockupSelectionSnapshot.test.ts`.

## 9. claude/perf-idx-sds-restock-counts-261114-1006
**Veredito: DECISAO_HUMANA**
Índice parcial para o sino de estoque do Header (~25,7 mil chamadas/dia, média 522 ms) — **não aplicado em produção.**
Provas:
- `supabase/migrations/20261114160000_perf_idx_sds_restock_counts.sql` (+28), rollback (+1) e o registro em `scripts/drift-baseline.mjs` (`REPLAY_PIPELINE_REWRITES`, +1 linha) não existem na main.
- Produção (read-only, 2026-11-15): `pg_indexes` não tem `idx_sds_restock_zero_to_pos_date`.
O que decidir: `CREATE INDEX CONCURRENTLY` em tabela grande de produção (lê ~610 MB de heap) — exige janela fora do pico e a linha `-- approved-by:` do dono no workflow.

## 10. recuperado/fix-ft005-cron-scheduled-261108-2215
**Veredito: INCORPORADA**
Versionar os cron jobs de relatórios agendados (FT-005) — a main já tem a mesma migration com outro timestamp.
Provas: `origin/main:supabase/migrations/20261108030000_ft005_cron_scheduled_reports.sql` agenda os mesmos dois jobs (`process-scheduled-reports` '5 * * * *', `send-scheduled-reports` '10 * * * *'), mesma URL, mesmo header `x-cron-secret`, mesmo `timeout_milliseconds:=55000`.

## 11. claude/fix-ft-ux-batch4-261101-2215
**Veredito: INCORPORADA**
Três ajustes de UX (confirmação antes da IA substituir o kit, mensagens de erro distintas, limite de cores por técnica) — todos os três estão na main, o primeiro em forma diferente.
Provas:
- FT-173 (maxColors): `origin/main:src/components/mockup/MockupConfigPanel.tsx:394` — exatamente a linha da branch.
- FT-136 (erros distintos): `origin/main:src/components/kit-builder/KitAIPromptDialog.tsx:114-118` separa 429 de 503/504 com textos próprios (redação diferente da branch, mesmo efeito).
- FT-134 (substituir conteúdo do kit): a main avisa **antes** com `hasExistingItems` — `origin/main:src/components/kit-builder/KitAIPromptDialog.tsx:70,159,514` ("⚠ Isso substituirá a composição atual do kit.") e `:520` (botão "Substituir e usar esta composição"), ligado em `origin/main:src/components/kit-builder/KitBuilderHeader.tsx:402`. A branch usava um `AlertDialog` modal; a main usa aviso + rótulo explícito no botão. Mesma garantia de negócio, um clique a menos.

## 12. importado/vps-fabrica/v2/refazer-3bc83637
**Veredito: DESCARTAR (obsoleto)**
Só testes: troca 12 blocos estáticos de `mockup-audit.test.ts` por um arquivo novo de a11y da "fatia 2".
Provas:
- O arquivo novo `src/components/mockup/__tests__/mockupA11y.slice2.test.tsx` importa `../SaveTemplateDialog`, que **não existe mais na main** (`git ls-tree origin/main -- src/components/mockup` não lista `SaveTemplateDialog.tsx`) — o arquivo não compila contra a main.
- O enxugamento do `mockup-audit.test.ts` já aconteceu na main por outro caminho: 2295 linhas no merge-base → 1945 na main.
Resíduo (se o dono quiser): 2 dos 4 casos ainda fariam sentido (aria-expanded do dropdown Pantone em `LogoColorAnalyzer`, botão "Remover anotação" em `MockupAnnotations`) — não encontrei equivalente na main (`grep` em `tests/components/mockup/acceptance/grupo3|grupo6` → 0 resultados). São ~10 linhas de teste a reescrever, não trabalho a resgatar da branch.

## 13. importado/vps-fabrica/v2/s30-2610081946
**Veredito: INCORPORADA**
Gerador aceita `product_id`, `productId` e o state do router para pré-selecionar o produto — está na main, extraído para um hook próprio.
Provas: `origin/main:src/hooks/mockup/useMockupEntryParams.ts:3-4` (documenta as três fontes), `:38-44` (`resolveEntryProductId` com `routerState: location.state`), `:60-64` (limpeza dos params). Teste: `origin/main:src/hooks/mockup/__tests__/mockupEntry.params.test.ts`.

## 14. importado/vps-fabrica/v2/s54-2610081948
**Veredito: INCORPORADA**
Ação "Usar logo do cliente" aplica a marca do CRM na área ativa — está na main.
Provas: `origin/main:src/components/mockup/MockupClientSelector.tsx:28,65,230,237,240` e a ligação em `origin/main:src/components/mockup/MockupConfigPanel.tsx:186` (`onUseClientLogo={handleUseClientLogo}`). Teste: `origin/main:src/components/mockup/__tests__/MockupClientSelector.logo.test.tsx:143,148`.

## 15. fix/gate-e40-cron-seed-261028
**Veredito: INCORPORADA (e o patch, como está, QUEBRARIA a main)**
Semear os cron jobs que faltam no replay do drift-check (Gate E40) — a main resolveu o mesmo problema de forma melhor.
Provas:
- Main semeia por **jobid fixo** com placeholders (`origin/main:scripts/drift-baseline.mjs:100-160`, inclusive `generate-blurhashes` já criado com `active := false` em `:128-135`), em vez da semeadura por nome da branch.
- ⚠️ Além disso, a branch corrompe 4 expressões regulares do parser de dollar-quote e de cast: `scripts/drift-baseline.mjs` troca `/\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/` por `.../?\.\$/` (3 ocorrências) e `::"text"[]` por `:"text"[]`. A main tem as formas corretas em `origin/main:scripts/drift-baseline.mjs:761` (`DOLLAR_TAG`) e `:501` (`VARCHAR_ARRAY_CAST`). Mergear esta branch quebraria o drift-check.

## 16. importado/vps-fabrica/v2/s53-2610081948
**Veredito: INCORPORADA**
A geração usa a foto original escolhida, nunca a miniatura — está na main, com o helper extraído para módulo próprio.
Provas: `origin/main:src/components/mockup/mockupVariantPhotos.ts:6` (`CDN_SIZE_SUFFIX`) com `getMockupVariantPhotos`; `origin/main:src/components/mockup/MockupProductSelector.tsx:27-30,90,169-175,253-258` (estado `pendingVariant`, `confirmPhoto`, render do `MockupPhotoPicker`); componente em `origin/main:src/components/mockup/MockupPhotoPicker.tsx:2-24`. Teste: `origin/main:tests/components/mockup/MockupProductSelector.photo.test.tsx`.

## 17. importado/vps-fabrica/v2/docs-criar-docs-fabrica-vps-faq-md-com-p-2610081318
**Veredito: DESCARTAR (docs redundante)**
Um único arquivo markdown (`docs/FABRICA_VPS_FAQ.md`, 41 linhas) com 5 perguntas sobre a fábrica de correções. Zero código.
Provas: as perguntas 1-4 (convenção de branch `v2/*`, portão automático `gate.py`, arquivos proibidos, padrão de commit) já estão em `origin/main:docs/FABRICA_VPS.md` §1-§4; a pergunta 5 (revisão/merge por PR) está em `AGENTS.md` → Git 5 e 6.

## 18. importado/vps-fabrica/v2/s46-2-2610081949
**Veredito: DESCARTAR (duplicata e obsoleto)**
Mesma troca de testes da fatia 2 do `mockup-audit`, em versão menor.
Provas: é subconjunto de `importado/vps-fabrica/v2/refazer-3bc83637` (item 12) — 3 dos 4 casos, sem a tipagem `DetectedColor` nem os casos de `displayName`. Mesmo bloqueio: importa `../SaveTemplateDialog`, que não existe na main.

## 19. importado/vps-fabrica/v2/s13-2610081946
**Veredito: INCORPORADA**
Restaurar a técnica de gravação pelo id canônico da RPC (com fallback por código e por nome) — está na main.
Provas: `origin/main:src/hooks/mockup/useMockupTechniques.ts:237` (`export function resolveTechnique`), com o mesmo comentário F-03 e a mesma ordem id → code → name. Testes: `origin/main:src/hooks/mockup/__tests__/useMockupGenerator.techniques.test.ts` e `resolveTechnique.order.test.ts`.

## 20. recuperado/fix-legacy-filters-261113-1430
**Veredito: INCORPORADA**
Módulo de filtros legados da ponte de banco externo (busca por texto escapando `%`/`_` e aspas no `.or()` do PostgREST) — a main tem uma versão bem maior e mais completa.
Provas: `origin/main:supabase/functions/tests/external-db-bridge/legacy-filters.ts:20` (`escapeLikePattern`), `:28` (`quotePostgrestValue`, com a mesma justificativa de injeção no `.or()`), `:32-48` (`applyFilters` com `_search` nas 5 mesmas colunas e `_name_prefix`), além de promoção de operadores, `in.()`, `is.null` e `InvalidFilterError` que a branch não tem. Testes em `origin/main:supabase/functions/external-db-bridge/applyFiltersAndSwap.integration.test.ts`.
Resíduo: a branch também mexe em `.migration-refs-baseline.json` (baseline de CI) — bookkeeping, ruído.

## 21. recuperado/fix-ft079-min-quantity-261108-2215
**Veredito: INCORPORADA**
View da quantidade mínima efetiva por produto (FT-079) — a main já tem a mesma migration com outro timestamp.
Provas: `origin/main:supabase/migrations/20261108030100_ft079_view_products_min_quantity.sql` cria `public.vw_products_min_quantity` com as mesmas colunas, o mesmo `COALESCE(p.min_order_quantity, c.min_order_quantity, 1)` e o mesmo `min_quantity_source`. Já consumida pelo front em `origin/main:src/hooks/kit-builder/useKitMinQuantityValidation.ts:30`.

## 22. importado/vps-fabrica/v2/s47-templateselector-2610081950
**Veredito: INCORPORADA**
Remove o `TemplateSelector` que ninguém importava + ajusta o teste de higiene.
Provas: `src/components/mockup/TemplateSelector.tsx` **não existe** na main (`git ls-tree origin/main -- src/components/mockup/TemplateSelector.tsx` → vazio) e `origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts` não menciona mais `TemplateSelector` (0 ocorrências).

## 23. recuperado/fix-p06-p15-security-20261101-1000
**Veredito: DECISAO_HUMANA**
Endurecimento de segurança aprovado pelo PO em 2026-11-01 e **nunca aplicado**: liga `security_invoker` em 8 views públicas (P06) e revoga a leitura anônima irrestrita do mapa de sinônimos de cor (P15).
Provas:
- `supabase/migrations/20261101000001_security_invoker_views_p06.sql` (+13) e `20261101000002_revoke_anon_color_synonym_map_p15.sql` (+8) não existem na main (`git grep "rls_anon_read_color_synonym_map" origin/main -- supabase/migrations` → nada; a política só aparece no baseline `origin/main:supabase/baseline/20261015140000_baseline_schema.sql:107605`).
- Produção (read-only, 2026-11-15): as 8 views continuam `security_invoker=false` (`v_system_health_dashboard` nem tem a opção) e a política `rls_anon_read_color_synonym_map` ainda existe em `pg_policies`.
O que decidir: mudar `security_invoker` em views públicas pode quebrar leitura anônima do catálogo/preços (a própria migration exclui `v_variant_sale_prices_public` por isso) — é DDL de produção com risco de negócio.

## 24. claude/fix-attest-provenance-sigstore-261107-1500
**Veredito: DECISAO_HUMANA**
Uma linha de CI: impede que um erro 500 transitório do Sigstore reprove o portão de deploy.
Provas: a branch adiciona `continue-on-error: true` ao step "Attest build provenance (E99)". Na main esse step **não tem** a linha — `origin/main:.github/workflows/deploy-gates.yml:789-793`. O resto do diff é `PENDENCIAS.md` (+21 linhas de registro).
O que decidir: toca `.github/workflows/**` → por `AGENTS.md` Git 7 e 10 a PR fica aberta e chama o dono. Trade-off: a atestação de proveniência passa a poder falhar em silêncio.

## 25. claude/infra-workflows-supersede-3525-261114-1740
**Veredito: INCORPORADA**
Enxugamento dos workflows de CI (tirar lint/typecheck/drift duplicados do PR, E2E fora dos PRs para não sobrecarregar o Supabase de produção, contexto de 10 min para 1×/hora) — tudo isso já está na main.
Provas de que a main tem o trabalho: `origin/main:.github/workflows/contexto.yml:48-52` (`cron: '7 * * * *'`); `origin/main:.github/workflows/e2e-cart.yml:8-17` (só `push`/`workflow_dispatch`, sem `pull_request`); `origin/main:.github/workflows/supabase-linter-gate.yml:4,17` ("saiu de pull_request", agendado).
O que ainda difere da main é a main estar **à frente**, não a branch ter algo a mais:
- `db-apply-migration.yml`: a main **removeu** o gate `environment: production` por decisão explícita do dono em 2026-11-14 (comentário em `origin/main:.github/workflows/db-apply-migration.yml:5-11`); a branch ainda carrega o gate antigo. Mergear a branch reverteria a decisão do dono.
- `deploy-gates.yml`: a main **adicionou** os filtros `ledger:`/`segredos:` (E188/E40/E98); a branch não os tem.
- `update-snapshots.yml`: a main **adicionou** a opção `all-authed`; a branch não.

## 26. claude/wf-limpeza-261113
**Veredito: DESCARTAR (duplicata)**
Mesmo enxugamento de workflows do item 25, em versão anterior.
Provas: `git merge-base --is-ancestor origin/claude/wf-limpeza-261113 origin/claude/infra-workflows-supersede-3525-261114-1740` → **SIM** (é ancestral direta; todos os seus commits estão na #3525). Os 24 workflows de E2E que aparecem como diferentes contra a main são apenas a branch estando atrás da main.

## 27. importado/vps-fabrica/v2/s14-2610081946
**Veredito: INCORPORADA**
Timeout único de 30 s e geração de mockup cancelável (Q16) — está na main.
Provas: `origin/main:src/hooks/mockup/mockupGenerationService.ts:304` (`signal?: AbortSignal`), `:316` (`const GENERATE_TIMEOUT_MS = 30000`), `:394` (`timeoutMs: GENERATE_TIMEOUT_MS`); `origin/main:src/hooks/mockup/mockupHistoryClients.ts` existe. Teste: `origin/main:src/hooks/mockup/__tests__/mockupGeneration.abort.test.ts`.

## 28. recuperado/fix-gitleaks-allowlist-261101-2209
**Veredito: INCORPORADA**
10 falsos-positivos do scanner de segredos (tokens de mock em testes, JWT de exemplo, chave AWS fake).
Provas: a main cobre os mesmos casos por **caminho** em vez de por regex — `origin/main:.gitleaks.toml` `paths = [ 'docs/.*', 'audit/.*', 'analise-prs/.*', 'tests/.*', 'src/.*__tests__.*', 'dist/.*', 'e2e/.*' ]`, que é exatamente onde vivem todos os valores que a branch queria liberar (inclusive o comentário da main cita `abc123def456` nominalmente, em `dist/.*`).

## 29. recuperado/fix-gitleaks-gate-261024-1930
**Veredito: DESCARTAR (duplicata exata)**
Mesmo patch do item 28 (`recuperado/fix-gitleaks-allowlist-261101-2209`): as mesmas 22 linhas adicionadas ao `.gitleaks.toml`, byte a byte. Só o merge-base é mais antigo (não tem as entradas de `dist/`, `e2e/` e a lista de SHAs históricos que a main já ganhou depois).

## 30. recuperado/fix-sb0002-sb0006-migrations-261101-1825
**Veredito: INCORPORADA**
Índices nas FKs `user_id` de `kit_quote_requests` e `kit_save_requests` (SB-0006) — o efeito já está em produção.
Provas: produção (read-only, 2026-11-15) tem `idx_kit_quote_requests_user_id` e `idx_kit_save_requests_user_id` em `pg_indexes`. A migration original segue na main (`origin/main:supabase/migrations/20261101140003_sb0006_index_kit_fk_user_id.sql`).
Resíduo de higiene (não é trabalho perdido, é pendência da main): a branch (a) reescrevia a migration com o cabeçalho `-- transaction: none`, sem o qual `CREATE INDEX CONCURRENTLY` é barrado pelo preflight, e (b) removia duas migrations nunca aplicadas (`20261101140002` REPLICA IDENTITY FULL e a `140003` sem opt-out). Os arquivos (a) e (b) continuam como estavam na main.

## 31. claude/fix-sentinel-e2e-pdf-261029-2310
**Veredito: INCORPORADA**
Allowlist de SHAs históricos no sentinel de proteção de branch + E2E de PDF que pula quando não há orçamento no ambiente.
Provas: `origin/main:scripts/sentinel-check.sh:29` (`COMMIT_SHA="${4:-}"`), `:156-170` (regra 7.5 lendo o arquivo de allowlist); `origin/main:.github/SENTINEL_SHA_ALLOWLIST.txt` e `.github/SENTINEL_CHANGELOG.md` existem; `origin/main:e2e/flows/pdf-dialog.spec.ts:39` tem exatamente a linha `test.skip(true, "[E108] ... — pulando.")` da branch.
Resíduo: 5 dos 6 SHAs da branch estão na allowlist da main; falta `9d9dd2a7b502ab7e5ff42691d40b95a822c21d6b` (que é ancestral de `main` e, sendo `fix(ci): ...`, casa com a regra de padrão de commit — a isenção pontual deixou de ser necessária).

## 32. importado/vps-fabrica/v2/refazer-cab127be
**Veredito: INCORPORADA**
A limpeza de ambiente de teste (e2e-cleanup) passa a apagar os mockups gerados e os arquivos de mockup do usuário de teste.
Provas: `origin/main:supabase/functions/e2e-cleanup/index.ts:13-15` (documenta o passo 7), `:95-96` (`MOCKUP_BUCKET='mockup-assets'`, `MOCKUP_USER_SUBDIRS=['logos','mockups']`), `:444-445` (`mockup_drafts` e `generated_mockups`), `:468-493` (remoção no Storage restrita ao prefixo `${userId}/`). Testes: `origin/main:supabase/functions/e2e-cleanup/index.mockups.test.ts` e `origin/main:tests/edge-functions/e2e-cleanup.mockups.test.ts`.

## 33. importado/vps-fabrica/v2/refazer-dc12be92
**Veredito: DESCARTAR (duplicata exata)**
Duplicata de `importado/vps-fabrica/v2/refazer-cab127be` (item 32).
Prova: o blob de `supabase/functions/e2e-cleanup/index.ts` é **o mesmo hash** nas duas branches (`74f15bfd1f53e2823f7ae051b174277f7824f1b1`); mesmos dois commits, mesmas mensagens, mesmo `--stat` (3 arquivos, +300/-1).

## 34. importado/vps-fabrica/v2/refazer-fdac7577
**Veredito: DESCARTAR (duplicata exata)**
Duplicata de `importado/vps-fabrica/v2/refazer-cab127be` (item 32).
Prova: mesmo blob de `index.ts` (`74f15bfd1f53e2823f7ae051b174277f7824f1b1`), mesmos dois commits, mesmo `--stat`.

---

## Tabela final

| branch | veredito | o que resgatar |
|---|---|---|
| claude/perf-cron005-refresh-all-mvs-diario-261114-1002 | DECISAO_HUMANA | Migration + rollback que faz o refresh diário das views materializadas parar de morrer em 120 s (hoje falha em 100% das execuções). ~31 linhas, completo. Produção ainda em `38 */2 * * *` / 55000 ms. Precisa do workflow `db-apply-migration.yml` com aprovação do dono. |
| claude/perf-idx-sds-restock-counts-261114-1006 | DECISAO_HUMANA | Índice parcial que acelera o sino de estoque do Header (~25,7 mil chamadas/dia, 522 ms de média). ~30 linhas + rollback + registro no drift-baseline, completo. Índice não existe em produção. `CREATE INDEX CONCURRENTLY` exige janela fora do pico. |
| recuperado/fix-p06-p15-security-20261101-1000 | DECISAO_HUMANA | Duas migrations de segurança aprovadas pelo PO em 2026-11-01 e nunca aplicadas: `security_invoker` em 8 views públicas (P06) e revogar leitura anônima do mapa de sinônimos de cor (P15). ~21 linhas, completo. Risco: pode afetar leitura anônima do catálogo. |
| claude/fix-attest-provenance-sigstore-261107-1500 | DECISAO_HUMANA | 1 linha em `.github/workflows/deploy-gates.yml`: `continue-on-error: true` no step de atestação, para um 500 do Sigstore não reprovar o deploy. Ausente da main. Toca workflow → decisão do dono. |
| importado/vps-fabrica/v2/fix-remover-atalhos-destrutivos-do-gerad-2610081909 | INCORPORADA | Nada (resíduo: 3 testes de regressão de atalho). |
| importado/vps-fabrica/v2/n03-2610082244 | INCORPORADA | Nada. |
| importado/vps-fabrica/v2/s18a-2610081946 | INCORPORADA | Nada. |
| importado/vps-fabrica/v2/s55-2610081946 | INCORPORADA | Nada. |
| importado/vps-fabrica/v2/s30-2610081946 | INCORPORADA | Nada. |
| importado/vps-fabrica/v2/s54-2610081948 | INCORPORADA | Nada. |
| importado/vps-fabrica/v2/s53-2610081948 | INCORPORADA | Nada. |
| importado/vps-fabrica/v2/s13-2610081946 | INCORPORADA | Nada. |
| importado/vps-fabrica/v2/s14-2610081946 | INCORPORADA | Nada. |
| importado/vps-fabrica/v2/s47-templateselector-2610081950 | INCORPORADA | Nada. |
| importado/vps-fabrica/v2/s49-2610081950 | INCORPORADA | Nada (main tem o ADR em versão ACEITO). |
| importado/vps-fabrica/v2/refazer-cab127be | INCORPORADA | Nada. |
| recuperado/fix-ft088-check-item-fits-261108-2215 | INCORPORADA | Nada (resíduo: 1 linha de GRANT). |
| recuperado/fix-ft005-cron-scheduled-261108-2215 | INCORPORADA | Nada. |
| recuperado/fix-ft079-min-quantity-261108-2215 | INCORPORADA | Nada. |
| recuperado/fix-sb0002-sb0006-migrations-261101-1825 | INCORPORADA | Nada (índices já em produção). Resíduo de higiene: a main segue sem o `-- transaction: none` em `20261101140003` e com 2 migrations nunca aplicadas. |
| recuperado/fix-legacy-filters-261113-1430 | INCORPORADA | Nada (main tem versão maior em `supabase/functions/tests/external-db-bridge/legacy-filters.ts`). |
| recuperado/fix-gitleaks-allowlist-261101-2209 | INCORPORADA | Nada (coberto por `paths` no `.gitleaks.toml` da main). |
| claude/fix-ft-ux-batch4-261101-2215 | INCORPORADA | Nada (FT-134 resolvido na main com aviso inline em vez de modal). |
| claude/fix-sentinel-e2e-pdf-261029-2310 | INCORPORADA | Nada (resíduo: 1 SHA a menos na allowlist, já desnecessário). |
| claude/infra-workflows-supersede-3525-261114-1740 | INCORPORADA | Nada — e NÃO mergear: reverteria a remoção do gate `environment: production` decidida pelo dono em 2026-11-14. |
| fix/gate-e40-cron-seed-261028 | INCORPORADA | Nada — e NÃO mergear: o patch corrompe 4 regex do parser de dollar-quote/cast em `scripts/drift-baseline.mjs`. |
| claude/wf-limpeza-261113 | DESCARTAR | Nada — ancestral direta de `claude/infra-workflows-supersede-3525-261114-1740`. |
| recuperado/fix-gitleaks-gate-261024-1930 | DESCARTAR | Nada — patch idêntico a `recuperado/fix-gitleaks-allowlist-261101-2209`. |
| importado/vps-fabrica/v2/refazer-dc12be92 | DESCARTAR | Nada — duplicata exata de `refazer-cab127be` (mesmo blob). |
| importado/vps-fabrica/v2/refazer-fdac7577 | DESCARTAR | Nada — duplicata exata de `refazer-cab127be` (mesmo blob). |
| importado/vps-fabrica/v2/refazer-3bc83637 | DESCARTAR | Nada aplicável — importa `SaveTemplateDialog`, removido da main. Resíduo opcional: ~10 linhas de teste a reescrever (aria-expanded do Pantone; botão "Remover anotação"). |
| importado/vps-fabrica/v2/s46-2-2610081949 | DESCARTAR | Nada — subconjunto de `refazer-3bc83637`, mesmo bloqueio. |
| importado/vps-fabrica/v2/docs-criar-docs-fabrica-vps-faq-md-com-p-2610081318 | DESCARTAR | Nada — FAQ markdown cujo conteúdo já está em `docs/FABRICA_VPS.md` §1-§4 e `AGENTS.md` Git 5/6. |
| release-please--branches--main--components--gifts-store | DESCARTAR | Nada — branch gerada pelo release-please (release 1.2.0). O bot a recria no próximo push em `main`; apagar só adia o release. |
