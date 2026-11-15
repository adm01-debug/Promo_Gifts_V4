# Veredito — lote 03 (25 branches)

Método: para cada branch, `git log`/`git diff` contra o merge-base, leitura do diff real dos
arquivos de código e busca do equivalente em `origin/main` com `git grep ... origin/main`
(a worktree local **não** está em `main`: HEAD = `claude_05/admiring-newton-5o3ztw`, por isso
toda prova cita `origin/main`).

---

## 1. `importado/vps-fabrica/v2/n52-2610082250` — **APROVEITAR**

Quando o catálogo de produtos ou a tabela de técnicas falha ao carregar, o painel do gerador de
mockup não avisa nada — o usuário vê "Nenhum resultado" e acha que não existe produto. Esta
branch põe um aviso com botão "Tentar novamente" em cada bloco.

- Arquivos: `src/components/mockup/MockupConfigPanelLoadError.tsx` (novo, 53 linhas),
  `src/components/mockup/MockupConfigPanel.tsx` (+34), `tests/components/mockup/MockupConfigPanel.errors.test.tsx` (novo, 191 linhas). ~280 linhas.
- Prova de ausência na main: `git grep -E "techniquesError|productsError|LoadErrorBlock|onRetryTechniques|mockup-techniques-error" origin/main -- src tests` → só 4 ocorrências não relacionadas em `src/pages/system/ExternalDatabaseTest.tsx:37,162,178,180`. `origin/main:src/components/mockup/MockupConfigPanelLoadError.tsx` não existe; `tests/components/mockup/MockupConfigPanel.errors.test.tsx` não existe.
- Estado: **completo** (componente + fiação no painel + teste).

## 2. `importado/vps-fabrica/v2/s76-2610081949` — **APROVEITAR**

Cabeçalho de trabalho do gerador: mostra qual cliente está selecionado, botão "Trocar cliente"
que pergunta o que fazer com a marca já aplicada (nunca troca em silêncio), atalho "Meus
mockups" e botão "Voltar" entre etapas sem perder as escolhas.

- Arquivos: `src/pages/mockups/mockup-generator/MockupToolbar.tsx` (+112/−4),
  `src/components/mockup/MockupWizard.tsx` (+30), `src/pages/mockups/mockup-generator/__tests__/MockupToolbar.header.test.tsx` (novo, 154 linhas). ~292 linhas.
- Prova de ausência na main: `git grep -E "mockup-toolbar-client|Trocar cliente|Meus mockups|ClientBrandDisposition|change-client-dialog" origin/main -- src tests e2e` → **zero resultados**. O arquivo de teste não existe em `origin/main`.
- Estado: **completo** (inclui `ConfirmDialog` de reconciliação da marca e teste).

## 3. `importado/vps-fabrica/v2/s24-2610081947` — **INCORPORADA**

Histórico de mockups paginado no servidor.

- Paginação no servidor na tela completa: `origin/main:src/pages/mockups/MockupHistoryPage.tsx:62` (`pageSize = 20`), `:70` (`.select('*', { count: 'exact' })`), `:73` (`.range((page-1)*pageSize, page*pageSize-1)`).
- Correção BUG-400 (o `client_name` no `.or()` dava HTTP 400 porque não é coluna de `generated_mockups`): `origin/main:src/pages/mockups/MockupHistoryPage.tsx:76-82`.
- Mapeamento `area_config` JSONB → shape plano: `origin/main:src/pages/mockups/MockupHistoryPage.tsx:87-99`.
- Adaptador compartilhado: `origin/main:src/hooks/mockup/mockupHistoryAdapter.ts:25` (`MOCKUP_HISTORY_PANEL_LIMIT`) e `:27` (`fetchRecentMockupHistory`).
- **A main decidiu o contrário de propósito** em dois pontos, documentado no código: teto de 200 (não 10) para a aba do gerador, porque busca/filtros rodam no cliente, e manutenção do filtro explícito de `user_id` — `origin/main:src/hooks/mockup/mockupHistoryAdapter.ts:1-14`. Levar a branch seria regressão.
- Não incorporado: só o *refactor* de extrair o `SELECT`/mapper da página para o adaptador. Refactor, não funcionalidade.

## 4. `importado/vps-fabrica/v2/refazer-2c328ea8` — **APROVEITAR** (código de teste, não de produção)

O teste de integração do `magic-up-score` na main **não testa a edge function**: ele mocka o
`fetch` e depois valida o próprio mock, contra um contrato que a função não tem. Esta branch
invoca o handler real.

- Arquivo: `tests/edge-functions/integration/magic-up-score.test.ts` (268 linhas na branch vs 163 na main).
- Prova do problema na main: `origin/main:tests/edge-functions/integration/magic-up-score.test.ts:17` usa `mockEdgeFunctionFetch` e os `it(...)` das linhas 15-100 afirmam `data.score`, `data.factors.{demand,margin,stock,recency}`, `data.tier`, `data.eligible_for_magic_up`, `product_id`. O contrato REAL da função, em `origin/main:supabase/functions/magic-up-score/index.ts:32-52`, é `{ imageUrl (min 10), ... }` → `{ total, label, summary, criteria[4..10], strengths, risks, recommendations }`. **Nenhum desses campos do teste da main existe na função.** O teste passa sempre e documenta um contrato inexistente.
- A branch captura o handler em `Deno.serve` e stuba só as dependências Deno-only (auth, bot-protection, ai-usage, ai-credentials, cors), cobrindo 400 "Validation failed", 401, repasse de status da IA (402), 429 de quota e 500 com `console.error`.
- Estado: **completo**. Risco: ao entrar, pode revelar defeitos reais hoje escondidos pelo teste falso.

## 5. `importado/vps-fabrica/v2/n11-2610082244` — **APROVEITAR**

Atalhos do editor de logo: hoje os botões se chamam "Centro V"/"Centro H" (ambíguo — V é o alvo
ou o eixo?) e o botão de girar mostra o estado em vez da ação. A branch renomeia para
Horizontal/Ambos/Vertical + "Girar", liga largura e altura por proporção (logo não distorce) e
recolhe os ajustes em cm atrás de "Ajustes avançados".

- Arquivos: `src/components/mockup/logo-editor/LogoSizeControls.tsx` (+93/−?), `src/components/mockup/logo-editor/LogoQuickActions.tsx` (+100/−?), `src/components/mockup/logo-editor/__tests__/LogoControls.test.tsx` (novo, 124 linhas). ~250 linhas.
- Prova de ausência na main: `git grep -E "aspectLinked|advancedOpen|Ajustes avançados|Centralizar logo|LockOpen" origin/main -- src/components/mockup` → **zero**. A main ainda tem `origin/main:src/components/mockup/logo-editor/LogoQuickActions.tsx:52` ("Centro V"), `:82` ("Centro H") e `:101` (rótulo de estado `(logoRotation||0)%180===0 ? 'Vertical' : 'Horizontal'`). O arquivo de teste não existe na main.
- Estado: **completo**.

## 6. `importado/vps-fabrica/v2/s75-2610081948` — **INCORPORADA**

Passo "Produto" com estados reais e troca de variante sem perder cliente/logo. A main
implementou tudo isso, com uma solução **melhor** (passo dedicado de escolha de foto).

- Equivalente de `getUsablePhotos`: `origin/main:src/components/mockup/mockupVariantPhotos.ts:17` (`getMockupVariantPhotos`) — mesma regra (variante manda, só fotos reais, resolve para o original `/public`, dedupe por base do CDN) e mais completa: usa regex de sufixo de tamanho (`:6`) em vez de comparar a URL já convertida.
- Equivalente de "Sem foto utilizável": `origin/main:src/components/mockup/MockupPhotoPicker.tsx:34-37` (`role="alert"`, "Este produto não tem foto utilizável para gerar o mockup.").
- Botão "Trocar variante": `origin/main:src/components/mockup/MockupProductSelector.tsx:234`.
- "Passo pendente vence a ficha": `origin/main:src/components/mockup/MockupProductSelector.tsx:189`.
- Teste: `origin/main:tests/components/mockup/MockupProductSelector.states.test.tsx:145,159,174`.
- A main vai além: `confirmPhoto` (`MockupProductSelector.tsx:168-180`) manda o original escolhido pelo usuário, não a primeira foto da lista.

## 7. `importado/vps-fabrica/v2/refazer-04c25ae0` — **DESCARTAR** (documentação, sem código)

Só `docs/MOCKUP_OPERACAO.md` (201 linhas). **Ruído declarado**: não toca `src/`,
`supabase/`, `scripts/` nem `.github/`.

- Duas das 6 seções já estão na main, mais detalhadas: §2 Estados → `origin/main:docs/MOCKUP_ESTADOS.md` (203 linhas, 6 estados com seções próprias 3.1-3.6); §5 Retenção → `origin/main:docs/MOCKUP_RETENCAO.md` (218 linhas).
- As seções sem equivalente (§1 fluxo, §3 falhas, §4 permissões) são doc puro, e as citações de linha já envelheceram: o documento cita `useMockupGenerator.ts:351-380` como carga de técnicas; em `origin/main` a linha 351 é o `useEffect` de histórico e a carga passou para `loadMockupTechniques()` (`origin/main:src/hooks/mockup/useMockupGenerator.ts:355-357`).
- Se o dono quiser o conteúdo, vale reescrever as 3 seções novas dentro dos dois docs que a main já tem — não resgatar a branch.

## 8. `claude/infra-inventario-semanal-261102-1120` — **DECISAO_HUMANA**

Workflow agendado que, toda segunda, refaz o inventário do estado real (banco, rotas, edge
functions) e abre PR sozinho se algo mudou.

- **99% já está na main**: `origin/main:scripts/inventario/{banco.sql,gerar-banco.mjs,gerar-repo.mjs,gerar-rotas.mjs}` e `origin/main:inventario/estado/{banco.json,edges.json,rotas.json,README.md}` existem — e a main está **à frente** nos scripts (ex.: `gerar-repo.mjs` da main usa `fileURLToPath` para caminho com acento/espaço e sob jsdom; a branch ainda usa `new URL(...).pathname`, que quebra). Não reverter.
- Falta só: `.github/workflows/inventario-estado-semanal.yml` (117 linhas; `cron '41 12 * * 1'`, `permissions: contents:write` + `pull-requests:write`, consome `SUPABASE_ACCESS_TOKEN`), 1 linha de `paths` em `.github/workflows/codeql.yml` (sem ela o check required não roda na PR semanal) e 1 linha em `docs/ci/SEGREDOS.md`.
- **A própria main diz que isso espera o dono**: `origin/main:inventario/estado/README.md:22` — "Ainda não há atualização automática... A rodada semanal (`inventario-estado-semanal.yml`) está proposta numa PR separada, aguardando aprovação do dono."
- **O que decidir:** autorizar um workflow que escreve no repo (cria branch e abre PR) e consome `SUPABASE_ACCESS_TOKEN` semanalmente. Git 7 e 10 exigem o dono.

## 9. `importado/vps-fabrica/v2/s69-2610081946` — **DECISAO_HUMANA**

Proposta de DDL em produção: adiciona snapshot e versionamento de revisões em
`generated_mockups` (`snapshot jsonb`, `snapshot_version`, `revision`, `parent_mockup_id` com FK
auto-referente, `is_stale`, 3 CHECKs, 1 índice e um trigger de guarda que torna o snapshot
imutável e exige que o "pai" seja do mesmo dono).

- Arquivo: `docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md` (191 linhas). O SQL está **dentro do markdown**, não como migration — o próprio documento diz "PROPOSTA DE MIGRATION — aguarda aprovação do Joaquim (REGRA #1/#8)".
- Nada disso existe na main: `git grep -E "parent_mockup_id|snapshot_version|is_stale" origin/main -- supabase migrations src` → **zero**.
- **Conflito adicional:** a branch grava conteúdo totalmente diferente no MESMO caminho que a main já usa. `origin/main:docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md` (125 linhas) é outro documento — "Adendos 1 a 4" (etapas 51-92, decisões fechadas em 08/10). Mergear sobrescreveria o documento da main.
- **O que decidir:** se as colunas de snapshot/revisão entram em `generated_mockups` (DDL em produção) e, se sim, em que arquivo o texto vive sem apagar os Adendos 1-4.

## 10. `importado/vps-fabrica/v2/n28-2610082246` — **APROVEITAR** (código de teste)

Faz o teste de contrato do `generate-mockup` rodar o handler **real**: empacota
`supabase/functions/generate-mockup/index.ts` em memória com esbuild (stubando só
`npm:@supabase/supabase-js`) e chama com `Request` reais.

- Arquivo: `tests/edge-functions/integration/generate-mockup.test.ts` (+172/−227 vs merge-base).
- Prova de ausência na main: `git grep -l "from \"esbuild\"" origin/main -- tests` → **zero**. A main declara o oposto no cabeçalho do mesmo arquivo: `origin/main:tests/edge-functions/integration/generate-mockup.test.ts:4-6` — "The Deno edge function cannot run in-process under vitest (Deno.serve, OffscreenCanvas, npm: imports), so these tests mock the HTTP layer". A branch mostra que dá.
- Diferença de qualidade em relação ao item 4: aqui a main **documenta o contrato certo** (`:8-14`), só não o executa. O ganho é menor que no `magic-up-score`, mas é o mesmo ganho de técnica.
- Estado: **completo**.

## 11. `recuperado/chore-migration-supplier-rls-261108-2230` — **INCORPORADA**

RLS deny-all no schema `supplier_stricker`. A main tem versão **superior** que substitui esta
explicitamente.

- `origin/main:supabase/migrations/20261027195959_supplier_stricker_rls_deny_all.sql:9` — "**Esta versão substitui 20261027200000, ainda pendente e nunca aplicada.**" (20261027200000 é exatamente o arquivo desta branch).
- A versão da main é melhor em 3 pontos: policies `AS RESTRICTIVE` (`:56`) em vez de permissivas — a da branch usa `CREATE POLICY deny_all ... USING (false)` sem RESTRICTIVE, então uma policy permissiva futura concederia acesso; loop dinâmico com `DROP POLICY IF EXISTS` (`:52`), logo idempotente; e lista de tabelas corrigida (inclui `stg_colors`, `stg_images`, `stg_customizations`, `stg_product_types`, que a branch omite).
- Rollback já na main: `origin/main:supabase/rollbacks/20261027195959_rollback.sql`.

## 12. `claude/fix-pr3305-duplicate-ref-261109-0623` — **INCORPORADA**

Backup completo do kit no `beforeunload` + guarda no helper de E2E.

- `BackupFullState`: `origin/main:src/hooks/kit-builder/useKitAutoSave.ts:31`; uso em `:62`, `:354`, `:371`, `:407`, `:419`. A main vai além: ganhou `repersistBackup` (`:64`) e a restauração de verdade em `origin/main:src/hooks/kit-builder/useKitBuilderPageState.ts:451`.
- Guarda do `route.continue()`: `origin/main:e2e/helpers/auth.ts:~91-97` — comentário e `try { await route.continue(); } catch { /* já tratada */ }` **idênticos** aos da branch.
- Ruído: `analise-prs/RELATORIO_PRS.md` (+376/−?), `analise-prs/progresso.json`, `analise-prs/prs.json`, `PENDENCIAS.md` — relatório de sessão de outro agente.
- **Não resgatar:** a branch remove acentos de strings de usuário e de comentários ("Nao foi possivel", "pagina", "preco", "dependencias mutaveis"). A main manteve os acentos — `origin/main:src/hooks/kit-builder/useKitBuilderPageState.ts:225-226` ("Não foi possível abrir este kit salvo."). Mergear seria regressão de texto visível ao usuário. A branch também apaga ~12 comentários explicativos de `useKitBuilderPageState.ts`.

## 13. `codex/fix-e2e-cleanup-rollback-header-261108` — **INCORPORADA**

Normalização de BOM no replay de migrations + cabeçalho de rollback na migration de
reconciliação do `e2e_cleanup_audit`.

- BOM: `origin/main:scripts/drift-baseline.mjs:357-360` (`const normalizedSql = sql.startsWith('﻿') ? sql.slice(1) : sql;` com o comentário idêntico) e o teste `origin/main:tests/scripts/drift-baseline.test.mjs:79-82`.
- Migration: vive na main como `origin/main:supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql`, já com cabeçalho de rollback na linha 2, registrada em `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1187`. O diff da branch é um **rename de timestamp** (001500 → 132000) com 96% de similaridade: mergear criaria migration duplicada da mesma tabela.
- **Observação para o dono (não muda o veredito):** a branch discorda do rollback da main. Main: `-- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;`. Branch: "preservar os registros e executar migration compensatória; **nunca usar DROP TABLE em auditoria de produção**". A migration está `aguardando aplicação` (SYNC_LOG:1187), então a frase do rollback ainda pode ser corrigida sem renomear nada.

## 14-17. `refazer-0b0b9032`, `refazer-b14fb844`, `refazer-d295390f`, `refazer-fc9bc61b` — **DESCARTAR** (4 duplicatas exatas)

As quatro contêm o mesmo e único arquivo, byte a byte: `docs/MAGIC_UP_AUDITORIA_2026-10-08.md`
(159 linhas), sha256 `95736ad222089941aac0591d55d0663fd6456a8ff17b48935b4703d8f5c2310d` nas quatro.

- **Ruído por definição:** é dossiê de análise de outro agente. O próprio documento diz (linhas 2-12): "Insumo da entrevista do módulo", "Os relatórios originais **não existem no repo**: ficaram em arquivos temporários da sessão que os produziu", e descreve "cartões" (`m01…m30`, `n59`, `t_9763c723`) de um processo externo ao repositório.
- Zero código: não toca `src/`, `supabase/`, `scripts/` nem `.github/`.
- Descreve o estado do código em `3ebd35e6d` de 13/10/2026 — ~1 mês antes de hoje, e a main tem 2251 commits de histórico; o conteúdo é um retrato vencido.
- Qualquer uma das quatro é duplicata exata das outras três.

## 18. `importado/vps-fabrica/v2/s77-4-2610081951` — **INCORPORADA**

Matriz de aceite do grupo 4 (rotação e edição pós-geração) do módulo de mockup.

- `origin/main:tests/components/mockup/acceptance/grupo4.acceptance.test.tsx` existe e é **mais completo**: 293 linhas / 4 casos, contra 248 linhas / 3 casos da branch. A main separou A09 em dois testes — `:119` (rotação 0°/15°/90° sem ângulo negativo) e `:150` (tamanho travado no limite da área, inclusive o botão "Máxima") — onde a branch tinha um só (`:71`). A10 também: main `:179` e `:233`, branch `:155` e `:200`.
- `origin/main:tests/components/mockup/acceptance/grupo4.fixtures.ts` existe (93 linhas vs 88 da branch).
- A main tem ainda grupos 1, 3, 5, 6 e 7 da mesma matriz.

## 19. `claude/fix-e2e-fora-do-banco-de-producao-261114-1003` — **DECISAO_HUMANA**

Impede que os testes E2E do CI batam no banco de **produção**. Hoje eles batem: a suíte aponta
para o projeto oficial por padrão.

- **A main ainda está vulnerável**: `origin/main:.github/workflows/e2e-cart.yml:82` — `VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL || 'https://doufsxqlfjyuvxuezpln.supabase.co' }}`.
- **A correção não existe na main**: `git grep -E "SUPABASE_E2E_PROJECT_REF|VITE_SUPABASE_E2E_PROJECT_ID|PUBLISHABLE_KEY_E2E" origin/main -- .github docs src` → **zero resultados**.
- Evidência do incidente, citada na branch: 2026-11-14, ~97% das requisições `/rest/v1` vinham de `localhost` em runners do CI.
- Tamanho: 22 arquivos, +116/−45 — 19 workflows (`_e2e-relevance.yml` ganha input `requires_backend`; cada `e2e-*.yml` ganha `if: ... vars.SUPABASE_E2E_PROJECT_REF != '' && != 'doufsxqlfjyuvxuezpln'`), `docs/ci/SEGREDOS.md` (+2), `src/integrations/supabase/client.ts` (+11) e `src/integrations/supabase/__tests__/ssot-fallback.test.ts` (+16).
- **O que decidir (3 coisas, todas do dono):** (a) criar e pagar um projeto Supabase de **staging** com o schema aplicado e os usuários `E2E_*`; (b) cadastrar `vars.SUPABASE_E2E_PROJECT_REF` e o secret `VITE_SUPABASE_PUBLISHABLE_KEY_E2E`; (c) aceitar que, **até isso existir, todo E2E com backend passa a ser pulado** (`relevant=false`) — ou seja, perde-se cobertura de CI em troca de não tocar produção. Além disso toca `client.ts`, arquivo do Gate 0, e 19 workflows → Git 7 e 10.
- Mitigação do risco no Gate 0: o opt-in de `client.ts` só aceita a URL exata do projeto de staging, exige `/^[a-z0-9]{20}$/` e **recusa** o id igual a `CURRENT_PROJECT_ID`; a constante e a guarda SSOT não são alteradas.

## 20. `importado/vps-fabrica/v2/s63-2610081947` — **INCORPORADA**

Reconciliação de página e de seleção no histórico quando um item é excluído.

- Reconciliação da página no painel: `origin/main:src/components/mockup/MockupHistoryPanel.tsx:164` — `useEffect(() => setCurrentPage((p) => Math.min(p, Math.max(1, totalPages))), [totalPages]);`
- Reconciliação da seleção de comparação: `origin/main:src/components/mockup/MockupHistoryPanel.tsx:165`.
- Reconciliação da página na tela completa: `origin/main:src/pages/mockups/MockupHistoryPage.tsx:127-136` — o bloco `nextTotalPages`/`nextPage` é idêntico, comentário incluído.
- Única diferença restante: a branch reduz o limite de comparação de 4 para 3 (`COMPARE_LIMIT`); a main mantém 4 (`MockupHistoryPanel.tsx:105`). É decisão de produto de 1 linha, não trabalho a resgatar.

## 21. `claude/fix-rollback-e38-e47-e37-261101-2200` — **APROVEITAR**

Três migrations de cron já **aplicadas em produção** estão na main sem arquivo de rollback. Esta
branch escreve os três — o que é preciso para conseguir desfazer caso algo quebre.

- Arquivos (todos novos, 106 linhas no total): `supabase/rollbacks/20260917070000_rollback.sql` (20), `supabase/rollbacks/20260917090000_rollback.sql` (17), `supabase/rollbacks/20260917100000_rollback.sql` (69).
- Prova de ausência na main: `git ls-tree -r --name-only origin/main supabase/rollbacks/ | grep 20260917` → só `20260917061500_rollback.sql`. As migrations correspondentes **existem**: `origin/main:supabase/migrations/20260917070000_e38_unschedule_dead_cron_jobs.sql`, `..._20260917090000_e47_fix_schema_drift_cron_split.sql`, `..._20260917100000_e37_split_genuine_multistatement_cron.sql`.
- Estado: **completo, mas com uma ressalva honesta escrita no próprio arquivo** — o rollback de e38 restaura `pipeline-classify-categories`, que **não funcionaria**, porque `public.fn_pipeline_classify_pending_products(integer)` já não existe. O arquivo avisa isso em duas linhas. O rollback é registro de reversão, não é executado por nenhum workflow (`origin/main:scripts/preflight-migration-apply.mjs:314` só exige o arquivo para migrations **novas**), então o risco de mergear é baixo.

## 22. `claude/perf-cron004-reduz-jobs-ociosos-261114-1001` — **DECISAO_HUMANA**

Reduz a frequência de 7 tarefas automáticas que rodam à toa: 648 → 97 execuções por dia.

- Arquivos: `supabase/migrations/20261114120000_cron004_reduz_frequencia_jobs_ociosos.sql` (54 linhas), `supabase/rollbacks/20261114120000_rollback.sql` (26), `supabase/MIGRATIONS_SYNC_LOG.md` (+18).
- Prova de ausência na main: `git ls-tree -r --name-only origin/main supabase/migrations supabase/rollbacks | grep -i "cron004\|20261114120000"` → **nada**; `git grep "cron004\|CRON-004" origin/main -- supabase/MIGRATIONS_SYNC_LOG.md` → **nada**.
- É série em andamento e esta é a peça que falta: a main já tem `cron001` (4 migrations, 20261101\*), `cron002` (`20261108230100`) e `cron003` (`20261113235800`), mas não `cron004` nem `cron005`.
- Jobs afetados: `generate-blurhashes`, `hash-product-images`, `backfill-image-dimensions`, `connections-auto-test`, `connections-health-check`, `refresh-mv-supplier-reliability`, `pgrst-schema-reload`. A migration é idempotente (resolve `jobid` por `jobname`, emite NOTICE se ausente ou já no alvo), vem com rollback e documenta a evidência (consultas read-only em produção de 2026-11-14: 881 execuções em 6 h, 244 "job startup timeout") e por que `medallion-promote-tick` ficou fora.
- **O que decidir:** DDL em `cron.job` no banco de produção. AGENTS.md é explícito — toda DDL, inclusive `cron.job`, vai a produção só pelo workflow `db-apply-migration.yml`, e Git 7 manda a PR ficar aberta para o dono.

## 23. `claude/fix-migrations-acesso-rpcs-261112-1050` — **DECISAO_HUMANA**

**10 das 11 migrations desta branch já estão na main.** Falta exatamente a 11ª, e ela foi
deixada de fora de propósito.

- Já na main (com rollback cada): `origin/main:supabase/migrations/2026111212{0000,0100,0200,0300,0400,0500,0600,0700,0800,0900}_*.sql` e `origin/main:supabase/rollbacks/2026111212{0000..0900}_rollback.sql`.
- **A main registra o que ficou fora**: `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1459` — "a RPC de inteligência de mercado (`fn_market_intelligence_macro`) **ficou de fora — ver PR**".
- O que falta resgatar: `supabase/migrations/20261112121000_fn_market_intelligence_macro.sql` (65 linhas), `supabase/rollbacks/20261112121000_rollback.sql` (6) e `src/hooks/intelligence/useMarketIntelligenceMacro.ts` (+27/−13).
- **O bug está vivo na main hoje:** o gráfico de `/inteligencia-comercial` lê `stock_daily_summary` cru via bridge, sem filtro de data e em ordem crescente — `origin/main:src/hooks/intelligence/useMarketIntelligenceMacro.ts:60` (`table: 'stock_daily_summary'`, `limit: 5000`, `orderBy: summary_date ascending`). O corte de 1000 linhas do PostgREST devolve as linhas mais **antigas** de ~2,84M, todas descartadas no cliente pelo corte de data → série vazia → **a tela mostra o mock como se fosse dado real**.
- **O que decidir:** a própria migration diz, no cabeçalho, "Performance: **NAO MEDIDA**" — sem `p_supplier_id` não há índice utilizável e a função faz seq scan em ~2,84M linhas sob o `statement_timeout` de `authenticated`. Antes de mergear o front é preciso rodar `EXPLAIN (ANALYZE, BUFFERS)` com `p_days=360`; se ficar perto do timeout, é preciso um índice `(summary_date, supplier_id)` criado concorrentemente em migration separada, **com aprovação do dono**. Decisão: aprovar a medição + eventual índice, ou deixar o gráfico mostrando mock.

## 24. `importado/vps-fabrica/v2/s33-2610081947` — **INCORPORADA**

Centralizar em tokens as cores do documento timbrado de aprovação.

- `origin/main:src/components/mockup/approval/MockupApprovalTemplate.tsx:11-32` — `export const DOC_TOKENS = { ... } as const;` com o mesmo conjunto de cores da branch (`green: '#00c853'`, `dark: '#000000'`, `colorFallback: '#2e7d32'`, superfícies, bordas, tons de texto), só com nomes de chave diferentes (`textDefault` em vez de `inkBody`, etc.).
- Testes e snapshot também na main: `origin/main:src/components/mockup/approval/__tests__/MockupApprovalTemplate.tokens.test.tsx` e `.../__snapshots__/MockupApprovalTemplate.tokens.test.tsx.snap`.
- Não incorporado: só os helpers de deduplicação `sectionLabelStyle()` e `PANTONE_TH_STYLE` (`git grep "sectionLabelStyle\|PANTONE_TH_STYLE" origin/main -- src` → zero). É refactor de estilo repetido, não funcionalidade, e AGENTS.md 4 proíbe refactor não pedido.

## 25. `importado/vps-fabrica/v2/s17-2610081946` — **INCORPORADA**

Lote multi-área entrega as áreas que deram certo e deixa regerar só a que falhou, com teto de 6.

- `MAX_BATCH_AREAS` e `BatchMockupResult`: `origin/main:src/hooks/mockup/useMockupGenerator.ts:47`, `:56`, `:89`; a mensagem de teto está em `:538-540`, **texto idêntico** ao da branch.
- `areaId` nos resultados do lote: `origin/main:src/hooks/mockup/mockupGenerationService.ts:310`, `:436`, `:440`.
- Erro por área + "Regerar esta área": `origin/main:src/components/mockup/MultiAreaManager.tsx:44-46` (props), `:57-59`, `:178-193` (o bloco `role="alert"` com o botão).
- Fiação pelo painel: `origin/main:src/components/mockup/MockupConfigPanel.tsx:85-87`, `:120-122`, `:349-351`.
- Teste: `origin/main:src/hooks/mockup/__tests__/mockupBatch.partial.test.ts` existe.

---

## Tabela

| branch | veredito | o que resgatar |
|---|---|---|
| `importado/vps-fabrica/v2/n52-2610082250` | APROVEITAR | Aviso + "Tentar novamente" quando produtos/técnicas falham no painel do mockup. `MockupConfigPanelLoadError.tsx` (novo) + `MockupConfigPanel.tsx` + teste. ~280 linhas, completo |
| `importado/vps-fabrica/v2/s76-2610081949` | APROVEITAR | Cabeçalho do gerador: cliente visível, "Trocar cliente" com pergunta sobre a marca, "Meus mockups", "Voltar". `MockupToolbar.tsx` + `MockupWizard.tsx` + teste. ~292 linhas, completo |
| `importado/vps-fabrica/v2/s24-2610081947` | INCORPORADA | Nada. `MockupHistoryPage.tsx:62,70,73,76-82,87-99` + `mockupHistoryAdapter.ts:25,27`. A main decidiu teto 200 e manter filtro de `user_id` de propósito (`mockupHistoryAdapter.ts:1-14`) |
| `importado/vps-fabrica/v2/refazer-2c328ea8` | APROVEITAR | Teste que roda o handler REAL do `magic-up-score`. O da main valida o próprio mock e afirma um contrato que a função não tem (teste da main `:15-100` vs função `index.ts:32-52`). 268 linhas, completo |
| `importado/vps-fabrica/v2/n11-2610082244` | APROVEITAR | Editor de logo: rótulos Horizontal/Ambos/Vertical + "Girar", largura/altura proporcionais, cm em "Ajustes avançados". 2 componentes + teste. ~250 linhas, completo |
| `importado/vps-fabrica/v2/s75-2610081948` | INCORPORADA | Nada. `mockupVariantPhotos.ts:17`, `MockupPhotoPicker.tsx:34-37`, `MockupProductSelector.tsx:189,234`, teste `MockupProductSelector.states.test.tsx`. Main está melhor |
| `importado/vps-fabrica/v2/refazer-04c25ae0` | DESCARTAR | Só doc (`MOCKUP_OPERACAO.md`, 201 linhas). §Estados e §Retenção já em `MOCKUP_ESTADOS.md`/`MOCKUP_RETENCAO.md`; citações de linha já vencidas. Zero código |
| `claude/infra-inventario-semanal-261102-1120` | DECISAO_HUMANA | Workflow semanal do inventário (117 linhas) + 1 linha em `codeql.yml` + 1 em `SEGREDOS.md`. Scripts já na main e **mais novos** (não reverter). A main diz que espera o dono: `inventario/estado/README.md:22` |
| `importado/vps-fabrica/v2/s69-2610081946` | DECISAO_HUMANA | Proposta de DDL: snapshot/revisões em `generated_mockups` (5 colunas, 3 CHECKs, índice, trigger de imutabilidade). SQL dentro de markdown; sobrescreveria `PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md` da main |
| `importado/vps-fabrica/v2/n28-2610082246` | APROVEITAR | Teste que roda o handler REAL do `generate-mockup` via bundle esbuild — a main diz no cabeçalho que é impossível (`:4-6`). +172 linhas, completo |
| `recuperado/chore-migration-supplier-rls-261108-2230` | INCORPORADA | Nada. `migrations/20261027195959_supplier_stricker_rls_deny_all.sql:9` diz "substitui 20261027200000, nunca aplicada"; a da main usa RESTRICTIVE (`:56`) e lista de tabelas correta |
| `claude/fix-pr3305-duplicate-ref-261109-0623` | INCORPORADA | Nada. `useKitAutoSave.ts:31` (`BackupFullState`), `useKitBuilderPageState.ts:451`, `e2e/helpers/auth.ts` (guarda idêntica). **Não mergear:** a branch tira acentos das mensagens ao usuário (main: `useKitBuilderPageState.ts:225-226`) |
| `codex/fix-e2e-cleanup-rollback-header-261108` | INCORPORADA | Nada. `drift-baseline.mjs:357-360` + teste `:79-82`; migration vive como `20261108001500_*` com rollback no `:2` e `SYNC_LOG:1187`. Branch só renomeia timestamp. Ver nota: ela discorda do `DROP TABLE` no rollback |
| `importado/vps-fabrica/v2/refazer-0b0b9032` | DESCARTAR | Dossiê de análise de outro agente (159 linhas, zero código). Duplicata exata de `refazer-b14fb844`, `refazer-d295390f`, `refazer-fc9bc61b` (mesmo sha256) |
| `importado/vps-fabrica/v2/refazer-b14fb844` | DESCARTAR | Duplicata exata de `refazer-0b0b9032` |
| `importado/vps-fabrica/v2/refazer-d295390f` | DESCARTAR | Duplicata exata de `refazer-0b0b9032` |
| `importado/vps-fabrica/v2/refazer-fc9bc61b` | DESCARTAR | Duplicata exata de `refazer-0b0b9032` |
| `importado/vps-fabrica/v2/s77-4-2610081951` | INCORPORADA | Nada. `tests/components/mockup/acceptance/grupo4.acceptance.test.tsx` na main tem 293 linhas/4 casos (`:119,:150,:179,:233`) vs 248/3 da branch |
| `claude/fix-e2e-fora-do-banco-de-producao-261114-1003` | DECISAO_HUMANA | E2E do CI para de bater no banco de produção (19 workflows + `client.ts` + `SEGREDOS.md`, +116/−45). **A main ainda aponta para produção: `e2e-cart.yml:82`.** Exige projeto de staging, 2 segredos e aceitar E2E pulado até existir |
| `importado/vps-fabrica/v2/s63-2610081947` | INCORPORADA | Nada. `MockupHistoryPanel.tsx:164,165` e `MockupHistoryPage.tsx:127-136`. Só sobra mudar o limite de comparação de 4 para 3 (decisão de 1 linha) |
| `claude/fix-rollback-e38-e47-e37-261101-2200` | APROVEITAR | 3 arquivos de rollback que faltam para migrations de cron **já aplicadas** (`20260917070000/090000/100000`). 106 linhas, completo; o de e38 restaura 1 job que não funcionaria (avisado no próprio arquivo) |
| `claude/perf-cron004-reduz-jobs-ociosos-261114-1001` | DECISAO_HUMANA | Reduz 7 tarefas automáticas ociosas: 648 → 97 execuções/dia. Migration idempotente + rollback + evidência medida. É a peça que falta da série (main tem cron001-003). DDL em `cron.job` → só pelo `db-apply-migration.yml` |
| `claude/fix-migrations-acesso-rpcs-261112-1050` | DECISAO_HUMANA | 10 de 11 migrations já na main; falta `fn_market_intelligence_macro` + rollback + hook. `SYNC_LOG:1459` confirma que ficou de fora. Hoje o gráfico de inteligência de mercado mostra **mock como dado real** (`useMarketIntelligenceMacro.ts:60`). Decidir: medir performance (seq scan em ~2,84M linhas) e eventual índice |
| `importado/vps-fabrica/v2/s33-2610081947` | INCORPORADA | Nada. `MockupApprovalTemplate.tsx:11-32` (`DOC_TOKENS`) + teste e snapshot na main. Só os helpers `sectionLabelStyle`/`PANTONE_TH_STYLE` faltam — refactor, não funcionalidade |
| `importado/vps-fabrica/v2/s17-2610081946` | INCORPORADA | Nada. `useMockupGenerator.ts:47,56,89,538-540`, `mockupGenerationService.ts:310,436,440`, `MultiAreaManager.tsx:44-46,178-193`, `MockupConfigPanel.tsx:85-87,349-351`, teste `mockupBatch.partial.test.ts` |
