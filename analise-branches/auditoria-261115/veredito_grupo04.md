# Veredito — grupo04 (13 branches apagadas do GitHub, commits ainda no clone local)

Metodo: para cada branch, `merge-base` + `git log` + `git diff` do SHA; leitura do diff real
dos arquivos de producao; busca do equivalente na `origin/main` (por nome e por implementacao
equivalente com outro nome), citando arquivo:linha da main. Nenhuma escrita foi feita.

Resumo: **1 APROVEITAR**, **11 INCORPORADA**, **1 DESCARTAR**, 0 DECISAO_HUMANA.

---

## 1. claude/feat-ft134-ai-apply-confirm-261108-2341 — `e608fe9604` — INCORPORADA
Objetivo: confirmar antes de substituir o kit ao aplicar a composicao da IA (FT-134).
Arquivos: `src/components/kit-builder/KitAIPromptDialog.tsx`, `KitBuilderHeader.tsx`.

A main tem a mesma protecao de negocio com outro nome de prop (`hasExistingItems` em vez de
`hasKitContent`):
- `origin/main:src/components/kit-builder/KitAIPromptDialog.tsx:70,159` — prop `hasExistingItems`.
- `origin/main:src/components/kit-builder/KitAIPromptDialog.tsx:514-517` — aviso
  "⚠ Isso substituirá a composição atual do kit."
- `origin/main:src/components/kit-builder/KitAIPromptDialog.tsx:520` — botao vira
  "Substituir e usar esta composição".
- `origin/main:src/components/kit-builder/KitBuilderHeader.tsx:402` — `hasExistingItems={hasContent}`.

Diferenca que sobra e só de estilo de UX: a branch usava um modal `AlertDialog` ("Substituir o kit
atual?"); a main avisa na propria tela e troca o texto do botao. Nenhuma regra de negocio da branch
esta ausente da main.

## 2. importado/vps-fabrica/v2/m30-2610082251 — `9a29c26fbc` — INCORPORADA
Objetivo: limitar tamanho (10 MB) e formato (PNG/JPG/WebP) do logo no `generate-ad-image`.

Codigo identico na main, mesmos nomes:
- `origin/main:supabase/functions/generate-ad-image/index.ts:67` `LOGO_MAX_BYTES`
- `:70` `LOGO_ALLOWED_MIME_TYPES` · `:79` `decodedBase64Bytes` · `:90-108` `rejectLogoBase64`
  (413 `logo_too_large`, 415 `logo_type_not_allowed`) · `:168` chamada no handler.
- Teste presente: `origin/main:supabase/functions/generate-ad-image/index.logo.test.ts:102,125`.

`git diff --stat origin/main 9a29c26fbc -- supabase/functions/generate-ad-image/` mostra a main
**a frente** (tem ainda `sanitize.ts`, `index.imports.test.ts`, `index.sanitize.test.ts`).

## 3. importado/vps-fabrica/v2/feat-botao-principal-gerar-mockup-separa-2610081909 — `d8f1b0cb06` — INCORPORADA
Objetivo: separar o botao "Gerar Mockup" do "Gerar documento".

Main tem a separacao e e superconjunto:
- `origin/main:src/components/mockup/approval/MockupLayoutButtons.tsx:161` `handleGenerateDocument`
- `:168` `handleGenerateMockup` · `:321` botao "Gerar Mockup" · `:343` botao "Gerar documento"
- `:183` `handleLayoutStatic` — a main **preservou** a composicao estatica ("Gerar Layout", `:369`)
  que esta branch apagava; 422 linhas na main contra 241 na branch.
- Teste na main com mais casos: `origin/main:src/components/mockup/__tests__/MockupLayoutButtons.test.tsx:61-139`
  (13 casos) contra 7 da branch.

## 4. claude/fix-ft005-cron-scheduled-261108-2215 — `d05254b1ea` — INCORPORADA
Objetivo: versionar em migration os cron jobs dos relatorios agendados (FT-005).

A mesma migration existe na main com outro timestamp no nome:
- `origin/main:supabase/migrations/20261108030000_ft005_cron_scheduled_reports.sql` — mesmos jobs
  (`process-scheduled-reports` em `'5 * * * *'`, `send-scheduled-reports` em `'10 * * * *'`),
  mesma URL do projeto `doufsxqlfjyuvxuezpln`, mesmo header `x-cron-secret` via
  `public.get_edge_function_secret('CRON_SECRET')`, mesmo `timeout_milliseconds:=55000`,
  mesma estrategia idempotente (unschedule + schedule).
- Rollback tambem presente: `origin/main:supabase/rollbacks/20261108030000_rollback.sql`.

Nao e DECISAO_HUMANA porque nao ha DDL pendente: o efeito ja esta versionado e aplicado pela main.

## 5. importado/vps-fabrica/v2/refazer-6db13404 — `a151aa42cb` — **APROVEITAR**
O que e, em linguagem de negocio: trocar testes que apenas procuravam texto no codigo-fonte por
testes que **de fato clicam e conferem o comportamento** de acessibilidade de 4 telas do mockup
(nome do template, remover anotacao, dropdown de cor Pantone, identificacao dos cartoes).

Arquivo a aproveitar: `src/components/mockup/__tests__/mockupA11y.slice2.test.tsx` (+41 linhas,
4 casos). **Ausente da main** — `git ls-tree -r --name-only origin/main | grep mockupA11y` nao
retorna nada, e `git grep -ln "fatia 2 do mockup-audit\|slice2" origin/main` tambem nao.
Os testes de comportamento equivalentes nao existem em
`origin/main:src/components/mockup/__tests__/a11y.mockup.test.tsx` (cobre ProductSearchCombobox,
MockupColorSelector, LogoSizeControls — nao SaveTemplateDialog, MockupAnnotations nem
LogoColorAnalyzer).

Esta completo? O arquivo novo esta completo e autossuficiente. A segunda metade do commit (apagar
~355 linhas de testes estaticos de `src/hooks/mockup/__tests__/mockup-audit.test.ts`) **nao se
aplica mais**: a main evoluiu esse arquivo para 1945 linhas e ainda carrega os blocos estaticos
(`origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts:140,330,421,442`). Ou seja: aproveitar
so o arquivo novo (aditivo, sem conflito); a limpeza teria de ser refeita contra a main atual.
Risco: baixo (so teste, nao toca producao). Os atributos que o teste exige existem na main
(`aria-label="Remover anotação"` e `aria-label={`Selecionar cor Pantone (atual:` conferidos em
`origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts:429,453`).

## 6. backup/ratchet-42901eb4 — `42901eb4af` — INCORPORADA
Unico arquivo de producao: `.github/workflows/ratchet-weekly.yml` (+2/-1) — evitar SIGPIPE ao
truncar o diff do baseline. A main resolve o mesmo problema por outro caminho:
- `origin/main:.github/workflows/ratchet-weekly.yml:148-150` — "Grava diff em arquivo tmp para
  evitar SIGPIPE ao truncar com head" + `head -40 /tmp/ratchet-diff.txt`.
Os outros 7 arquivos sao ruido: `PENDENCIAS.md`, `RELATORIO_CI.md`, `analise-prs/RELATORIO_PRS.md`,
`analise-prs/dossies/PR-*.md`, `analise-prs/prs.json`.

## 7. docs/reconciliar-espelho-google-20261028 — `5680ae96d8` — DESCARTAR
Diff inteiro = 3 arquivos markdown de registro/analise, nenhum arquivo de producao:
`PENDENCIAS.md` (+53/-21), `RELATORIO_CI.md` (+8), `supabase/MIGRATIONS_SYNC_LOG.md` (+4/-4).
Ruido por definicao do metodo (dossie/historico; o proprio AGENTS.md trata `PENDENCIAS.md` como
"historico, nao ordem"). Nada de codigo, migration, edge ou workflow.

## 8. codex/harden-magazine-publish-smoke-261107 — `ab7743612e` — INCORPORADA
Branch grande (79 arquivos, 4983 linhas; 4953 = 99% ja na main). Conferi um a um os 7 arquivos que
o indicador apontava como "fora da main" — em todos a branch esta **atrasada**, nao a frente:
- `.github/workflows/db-schema-drift-check.yml`: a branch ainda tem o gatilho `pull_request` e o
  detector E12; a main os removeu de proposito ("O gatilho pull_request próprio saiu em 2026-11-13
  (wf-consolida)", `origin/main:.github/workflows/db-schema-drift-check.yml:27-32`) e usa um pin de
  `supabase/setup-cli` mais novo (`:151`).
- `.github/workflows/e2e-quotes.yml`: a branch tem `pull_request:`; a main o removeu em 14/11 para
  nao sobrecarregar o banco de producao (`origin/main:.github/workflows/e2e-quotes.yml:13`).
- `scripts/drift-baseline.mjs`: a main tem **mais** (normalizacao de BOM UTF-8 e 2 entradas extras
  em `REPLAY_PIPELINE_REWRITES`).
- `scripts/migration-ledger-remote-only-allowlist.json`: a main tem a revisao de 2026-11-08
  (versao `20261107180000` a mais).
- `supabase/baseline/20261108000000_cron_jobs.json`: snapshot de schema (ruido) e, ainda assim, a
  main tem os horarios mais novos (stagger CRON-001/002).
- `supabase/functions/e2e-cleanup/index.ts`: a branch usa `ReturnType<typeof createClient>`; a main
  usa o tipo `SupabaseClient` importado (`origin/main:supabase/functions/e2e-cleanup/index.ts:18`).
- `supabase/MIGRATIONS_SYNC_LOG.md`: log markdown (ruido).

## 9. importado/vps-fabrica/v2/fix-rascunho-do-mockup-deixa-de-perder-a-2610081909 — `520a04be9c` — INCORPORADA
Objetivo: rascunho do mockup parar de perder a logo (subir a logo para o bucket em vez de gravar
base64 / descartar).

Main tem a correcao, mesmos nomes e mais robusta:
- `origin/main:src/hooks/mockup/useMockupDraft.ts:9` import de `uploadLogoToStorage`
- `:87` `uploadedLogosRef` (na main guarda a *Promise*, evitando upload duplicado em paralelo)
- `:161-198` `areasWithLogos` com upload e cache · `:215` grava `areasWithLogos` na linha do banco.
- A segunda metade da branch (re-hidratar logo do backend por indice quando a copia local vence)
  foi **deliberadamente substituida** na main por `resolvePendingLogos`
  (`origin/main:src/hooks/mockup/useMockupDraft.ts:369`), com o comentario em `:364-368`
  explicando que o pareamento por indice saiu de proposito para nao ressuscitar logo removida pelo
  usuario nem fazer uma area nova herdar logo de outra.

## 10. claude/fix-ux-batch3-261101-0015 — `a32a9d605d` — INCORPORADA
Duas correcoes, as duas na main:
- Confete respeita `prefers-reduced-motion`: `origin/main:src/hooks/kit-builder/useKitBuilderPageState.ts:286-293`
  (guarda `!window.matchMedia('(prefers-reduced-motion: reduce)').matches`, identica).
- Confirmacao antes de limpar o formulario do mockup: `origin/main:src/components/mockup/MockupConfigPanel.tsx:418-429`
  (`ConfirmDialog` "Limpar formulário?" / "Limpar tudo", FT-172, `onConfirm={onReset}`) — mesma
  protecao que a branch fazia com `AlertDialog`.

## 11. claude/feat-drift-mirror-cron001-261101-2335 — `e6ce83941b` — INCORPORADA
Os dois arquivos-espelho de migration ja estao na main:
`origin/main:supabase/migrations/20261101223908_cron001_stagger_additional_jobs.sql` e
`origin/main:supabase/migrations/20261101232022_cron001_stagger_schedules_reapply.sql`.
`git diff origin/main e6ce83941b` nesses dois arquivos muda **apenas um comentario** (a branch
acrescenta "(PR #3015, fechada sem merge)" na linha de referencia); o SQL e byte a byte igual.
Resto: `analise-branches/RELATORIO_BRANCHES.md` e `supabase/MIGRATIONS_SYNC_LOG.md` = ruido.

## 12. claude/fix-legacy-filters-261113-1430 — `fb72d72a1b` — INCORPORADA
Objetivo: modulo de filtros legados (`_search` / `_name_prefix`) do `external-db-bridge` com escape
de LIKE e de valor do PostgREST.

A main tem a mesma implementacao, mais completa, em outro caminho:
- `/home/user/Promo_Gifts_V4/supabase/functions/tests/external-db-bridge/legacy-filters.ts:20`
  `escapeLikePattern` · `:28` `quotePostgrestValue` · `:32-50` `applyFilters` com `_search`
  (mesmas 5 colunas: name, sku, supplier_reference, brand, description) e `_name_prefix`.
  A versao da main tem ainda `InvalidFilterError`, descendentes de categoria e promocao de
  operadores por sufixo — a da branch nao.
- Confirmado em `origin/main` por `git ls-tree origin/main supabase/functions/tests/external-db-bridge/`.
O outro arquivo, `.migration-refs-baseline.json`, e baseline gerado de gate (ruido) e as entradas
que a branch adiciona apontam para `analise-prs/2026-11-12/prs.json`, que nem existe mais na main.

## 13. claude/infra-edge-npm-261106-1708 — `359b9263cb` — INCORPORADA
Objetivo: migrar os imports das edge functions de `esm.sh` para especificadores `npm:`.

A migracao esta na main de forma ampla (`git grep -l 'npm:@supabase/supabase-js' origin/main --
supabase/functions/` retorna dezenas de arquivos, `_shared/ai-router`, `_shared/auth`,
`_shared/authorize`, etc.). Nos arquivos que o indicador apontava, a branch esta **atras** ou
contraria uma decisao explicita da main:
- `supabase/functions/asia-ingestion/index.ts`: a main pina `npm:@supabase/supabase-js@2.49.4` (a
  branch deixava `@2`) e passa `supabase` para `resolveCredential`.
- `supabase/functions/block-ip-temporarily/index.ts` e `detect-new-device/index.ts`: a branch ainda
  monta cliente e checagem de admin a mao; a main usa o helper `authorize` com `requireAal2`
  (`origin/main:supabase/functions/_shared/authorize.ts`) — endurecimento que a branch nao tem.
- `supabase/functions/deno.json`: a main mantem o mapa `https://esm.sh/... -> npm:...`
  (`origin/main:supabase/functions/deno.json`), que de fato redireciona import antigo; a branch
  trocou por auto-mapeamentos `npm:x -> npm:x`, inertes.
- `deno.json` na raiz (`{"nodeModulesDir":"auto"}`, ausente da main): a main escolheu o oposto de
  proposito — `origin/main:supabase/functions/deno.json:4,6` documenta
  `"nodeModulesDir": "none"` como o que "forca" o padrao `npm:` do Supabase (idem
  `mcp-server/deno.json:2` e `quote-sync/deno.json:2`). Nao e trabalho a resgatar.
