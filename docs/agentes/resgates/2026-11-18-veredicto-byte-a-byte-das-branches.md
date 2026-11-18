# Veredicto byte a byte das branches abertas — 2026-11-18

Regra do dono: *nenhuma branch é apagada sem certeza de que o trabalho já está na
`main` ou ficou realmente obsoleto*. Este arquivo é o recibo dessa certeza. Cada
branch tem aqui o SHA do seu topo, o que foi medido e o veredicto. **Com o SHA
registrado, qualquer apagamento é reversível** por `git branch <nome> <sha>`.

Base da comparação: `main` em `0c507b86f` (2026-11-18 21:54 UTC).

## Método

Para cada branch, nesta ordem:

1. `git diff --name-only main...branch` — o que a branch mudou desde que divergiu.
2. Para cada arquivo, comparação de **blob sha** entre `branch:arquivo` e
   `main:arquivo`: idêntico, divergente ou ausente da main.
3. `git merge-tree --write-tree main branch` — o que a branch traria para a main.
4. Para os arquivos divergentes, varredura de **símbolos exportados e nomes de
   caso de teste** presentes na branch e ausentes **em toda a main** (não só no
   mesmo caminho: a main costuma ter movido o símbolo de arquivo).

O passo 4 é o que decide. O passo 2 sozinho mente: `main` sempre diverge, porque
seguiu em frente. O que importa é se existe **símbolo ou comportamento** que a
branch tem e a main não tem em lugar nenhum.

## Resultado medido

### Correção de uma medição minha, feita horas depois

A primeira versão deste arquivo afirmava **"nenhum arquivo de nenhuma branch está
ausente da `main`"**. Era **falso**, e o erro é instrutivo: eu só havia olhado os
arquivos que a *branch* mudou (`git diff main...branch`). Um arquivo que a branch
**não tocou** e que a **`main` apagou** não aparece nesse diff — e é exatamente o
caso mais perigoso, porque é trabalho que sumiu sem ninguém mexer nele.

A medição correta é comparar as **árvores inteiras** (`git ls-tree -r`):

| branch | arquivos que existem na branch e **não** na main | dos quais código |
|---|---|---|
| `claude/feat-restauracao-rascunho-orcamento-261117-1620` | 1 | 1 |
| `salvo/claude-fix-mockup-geometria-wysiwyg-261115-0045` | 17 | 4 |
| `salvo/claude-fix-mockup-logo-tamanho-real-261114-2200` | 17 | 4 |
| `salvo/claude-fix-pr3517-gate1-baseline-261113-2336` | 77 | 15 |
| `salvo/claude-fix-resgate-p06-p15-security-261116-2215` | 3 | 2 |
| `salvo/codex-fix-gate1-kit-pdf-types-261109-2252` | 362 | **346** |
| `salvo/importado-vps-fabrica-v2-refazer-dc12be92-261116` | 281 | 135 |
| `salvo/261117-laughing-cori-o9w35e` | 34 | 8 |
| `salvo/261117-schema-snapshot-cancelled-skip` | 34 | 8 |

União, sem repetição: **573 arquivos de código** que a `main` não tem.

### Mas arquivo ausente não é trabalho perdido

A `main` reorganizou muito: o símbolo vive em outro caminho. O que decide é
procurar **cada símbolo exportado** da branch em **todo** o conteúdo da `main`,
não no mesmo caminho.

Índice construído com `git grep -oE '[A-Za-z_][A-Za-z0-9_]{3,}' origin/main`:
**108.238 identificadores distintos**. Dos 573 arquivos, 175 já estavam julgados
nos documentos de resgate anteriores; os outros **398** foram varridos agora,
símbolo a símbolo, contra esse índice.

**Resultado: 24 símbolos exportados, em 6 arquivos, não existem em lugar nenhum
da `main`.** Todo o resto foi re-hospedado.

### Os 6 arquivos, um a um

| arquivo (e branch) | símbolos | veredicto |
|---|---|---|
| `supabase/functions/crm-db-bridge/ownership.ts` (pr3517) | `CRM_PII_TABLES`, `CRM_OWNER_COLUMN`, `CRM_OWNER_VIA`, `CRM_BROAD_READ_ROLES`, `CrmOwnerScope`, `resolveCrmRole` | **superado** — `query-policy.ts` reimplementou com 11 regras de ownership contra as 5 tabelas PII da branch, e **cita o arquivo antigo pelo nome** em `query-policy.ts:341`: *"ownership.ts do main listava como PII apenas companies, contacts, contact_emails, contact_phones e customers"* |
| `src/hooks/useExternalDatabase.ts` (codex) | 11 hooks | **parte superada, parte código morto.** `useExternalBusinessSectors` → `useExternalRamosAtividade`; `useExternalSupplierColors` → `useExternalColorGroups`/`useExternalColorVariations`; `useExternalSupplierMaterials` → `useExternalMaterialGroups`/`useExternalMaterialTypes`, todos em `src/hooks/intelligence/useExternalDatabase.ts`. Os 7 restantes (`PriceTables`, `ProductImages`, `ProductVariants`, `ProductSuppliers`, `SupplierAttributeDefinitions`, `SupplierProductAttributes`, `Tags`) têm **zero consumidores na própria branch** — nunca foram ligados a tela nenhuma |
| `src/services/notificationService.ts` (importado-vps) | `getNotifications`, `getUnreadCount`, `subscribeToNotifications`, `deleteNotification`, `GetNotificationsOptions` | **superado** — virou hook: `src/hooks/ui/useNotifications.ts` devolve `unreadCount` e filtro `unreadOnly`, com módulo completo em volta (`NotificationDrawer`, `NotificationPreferences`, `NotificationsBadgeStatsPanel`, e2e próprios) |
| `src/hooks/useAccessSecurity.ts` (codex) | `CityWhitelistEntry` | **superado** — a funcionalidade está em `src/components/admin/access-security/CityWhitelistTab.tsx`; o tipo foi absorvido na prop `cities` |
| `src/components/products/SmartRecommendationsMock.tsx` (importado-vps) | `SmartRecommendationsMock` | **obsoleto por desenho** — a `main` tem `SmartRecommendations.tsx`, a versão real. O AGENTS.md proíbe mock em produção |
| `src/lib/auth/auth-audit.ts` (importado-vps) | `runAuthAudit` | **obsoleto** — vem do snapshot do VPS de 2026-10-13, não é trabalho novo; o nome só aparece em documentos de análise, nunca em código da `main` |

**Conclusão: nenhum trabalho vivo foi perdido.** O que sumiu da `main` ou foi
re-hospedado com outro nome, ou era código que nunca chegou a ser ligado.

---

## 1. `claude/feat-restauracao-rascunho-orcamento-261117-1620` — **SUPERSEDED**

Topo: `138f1341023c734bc506d4e9b9df334bfb725dbb`

Esta era a mais suspeita: a `main` tem `rascunhoRestauradoEValido` e a branch tem
`mergeRestoredBase` + `readRecoverableDraft` — nomes diferentes, e os 6 casos de
teste da branch não apareciam no mesmo arquivo da main.

Varredura em toda a `main` resolveu:

| procurado | onde está na main |
|---|---|
| `mergeRestoredBase` | `src/hooks/quotes/restoredDraftBase.ts` + `tests/hooks/restoredDraftBase.test.ts` |
| `duplicate clicks` | `tests/components/QuoteAutoSave.recovery.test.tsx` |
| `StrictMode and keeps recovery` | idem |
| `rejected snapshot available` | idem |
| `does not reuse the previous snapshot` | idem |
| `after unmount without starting another` | idem |
| `does not restore automatically` | idem |

Os 6 casos **estão** na main, no mesmo arquivo — eu só não os via antes porque a
main os escreve em várias linhas (`it(\n  '...`) e o primeiro grep exigia a aspa
colada no `it(`. Registro o erro de medição aqui porque ele quase produziu um
"resgate" de trabalho que já estava salvo.

Sobrou um único símbolo sem par de nome: `readRecoverableDraft`. Ele não foi
perdido, foi **repartido**: a main faz o mesmo trabalho em
`src/hooks/quotes/quoteDraftApply.ts`, inclusive a guarda de data —
`quoteDraftApply.ts:138-139` faz `typeof savedAtRaw === 'string' ? new
Date(savedAtRaw).getTime() : NaN` e recusa com `Number.isFinite`, que é
exatamente a guarda da branch. As outras cinco guardas (storage bloqueado, JSON
corrompido, id de outro orçamento, versão inválida, idêntico ao atual) têm caso
de teste nomeado na suíte da main.

**Pode apagar.**

## 2 e 3. As duas branches de mockup — **SUPERSEDED**

Topos: `738445d926953d20c32bf5ade7ea5f6f1a7fd78a` (geometria-wysiwyg) e
`df0ccdfe271de63555484efca4fe13956d07e42d` (logo-tamanho-real). As duas têm o
mesmo título de commit e tocam os mesmos 3 arquivos.

`supabase/functions/generate-mockup/index.geometry.test.ts`: branch 158 linhas /
**main 210**. A main tem 17 casos; a branch, 12. Os 12 da branch têm par na main,
com outra redação:

| caso na branch | par na main |
|---|---|
| `payload SEM dimensões é recusado com 422 / missing_dimensions` | `o handler recusa payload sem nenhuma dimensão real (422 missing_dimensions)` e `sem nenhuma medida: recusa com 422 missing_dimensions` |
| `uma única dimensão real já basta` | `uma medida basta: a outra é inferida como no editor` |
| `sem dimensões a conta cairia na medida inventada 8×20 cm` | `sem dimensões a conta usa 8×20 cm (o que o editor mostra)` |
| `importa e usa o portão e o cálculo, sem o fallback de 20 cm` | `importa e usa o cálculo compartilhado, sem o produto-referência de 20 cm` |
| `o 422 do portão não passa a valer para os outros erros` | `validationError mantém 400 como default e 422 só no portão de medidas` |

E a main tem 5 casos a mais que a branch não tinha. `geometry.ts` e `index.ts`
também são maiores na main (185 vs 178, 573 vs 521).

**Pode apagar as duas.**

## 4. `salvo/importado-vps-fabrica-v2-refazer-dc12be92-261116` — **SUPERSEDED**

Topo: `53473e932aa427e4061b4ab5b20c862cd0f784ef`

Dois arquivos de `e2e-cleanup`. A varredura de símbolos devolveu **zero** casos de
teste e **zero** funções presentes só na branch. A main está muito à frente:
`index.mockups.test.ts` 497 linhas contra 240; `index.ts` 550 contra 226.

**Pode apagar.**

## 5. `salvo/261117-schema-snapshot-cancelled-skip` — **SUPERSEDED (e revertida de propósito)**

Topo: `35d25259e8be43bf3ee7e4560615a27e3a1e7ce7`

Um arquivo: `.github/workflows/schema-snapshot-export.yml`. Dois fatos, os dois
escritos no cabeçalho do arquivo **na própria main**:

- o conserto que dá nome à branch já foi incorporado: *"2026-11-16: export
  deixava de rodar (skipped) quando o drift-gate era cancelado, mesmo com
  force_rotate — o `!cancelled()` do job barrava. **Resgatado** de
  claude/fix-schema-snapshot-export-cancelled-skip-261101-2344 (run 41363217079
  como evidência)"*;
- o resto do diff da branch quer trazer de volta os gatilhos `pull_request` e
  `push`, que a main **removeu de propósito**: *"2026-11-13 (wf-consolida):
  saíram pull_request e push. Sem credenciais (que PR/push nunca recebem desde
  2026-10-15) o script só concatena supabase/migrations em ALL_IN_ONE.sql e sobe
  um artifact que ninguém consome — nada é validado, nenhum gate depende dele."*

Mergear esta branch seria **desfazer** uma decisão de custo (12 min de CI por PR
sem validar nada).

**Pode apagar.**

## 6. `salvo/261117-laughing-cori-o9w35e` — **SUPERSEDED / OBSOLETA**

Topo: `7583533933cdf34d396fd012ef97f84d5949a252` (último commit 2026-11-02).
44 commits, 24 arquivos, mas só 11 são código: 6 workflows, 1 script e 4 de `src/`.

**Código de aplicação:** varredura de todos os símbolos exportados dos 4 arquivos
de `src/` contra **toda** a main: **zero ausentes**. Os tamanhos quase coincidem
(`KitMakerLanding.tsx` 564 vs 563, `useKitBuilderPageState.ts` 552 vs 550,
`types.ts` 390 vs 394, `useRuptureAlerts.test.tsx` 96 vs 96) — é a mesma base,
com a main uma geração à frente.

**Workflows:** a branch inteira gira em torno de três premissas que **deixaram de
valer**:

| premissa da branch | estado hoje na main |
|---|---|
| `supabase/setup-cli@v2` bloqueada pela Actions policy (P46) → instalação nativa | a main usa `supabase/setup-cli@689adcf` em **9 workflows**, todos rodando verde hoje — a action está liberada; a instalação nativa virou código morto |
| `dorny/paths-filter` e `anchore/sbom-action` bloqueadas → removidas | as duas seguem em uso em `_e2e-relevance.yml`, `deploy-gates.yml`, `static-checks.yml` e `update-snapshots.yml`, verdes |
| `schema-snapshot-export.yml` deve rodar em PR e push | a main removeu os dois gatilhos de propósito em 2026-11-13 (mesmo caso da branch 5) |

E o `deploy-gates.yml` da branch é **mais velho**: 907 linhas inseridas contra
1.054 removidas, isto é, a main tem ~150 linhas a mais.

**Pode apagar.**

> ⚠️ **Achado que não é desta branch, mas apareceu auditando-a — vale a sua
> decisão:** a branch trazia em `db-apply-migration.yml` um step
> *"Confirma reviewer obrigatório no environment Production"*. A main
> **removeu** esse step e o `environment: production`, e o próprio arquivo diz
> por quê (`db-apply-migration.yml:9-10`): *"o `environment: production` e o
> step que exigia required reviewers foram removidos para que agentes
> possam…"*. Ou seja: hoje **o workflow que aplica DDL em produção não tem
> aprovação humana obrigatória**. Foi decisão registrada, não acidente — mas
> como é o único portão entre um agente e o banco de produção, fica aqui
> explícito para você reconsiderar se quiser.

---

## As três que NÃO podem ser apagadas ainda

| branch | topo | por que fica |
|---|---|---|
| `salvo/claude-fix-resgate-p06-p15-security-261116-2215` | `c259d9f160788d698d541475571ed8f3ec69764c` | é a fonte da PR #3832 (migration P06), que está aberta e depende de decisão do dono sobre as outras 7 views |
| `salvo/claude-fix-pr3517-gate1-baseline-261113-2336` | `f4e68117728b703c549fa296b9eb10a8837a80e9` | faz parte do inventário de 102 arquivos; 6 itens ainda dependem de decisão do dono |
| `salvo/codex-fix-gate1-kit-pdf-types-261109-2252` | `da57cd671d7e20128dbb6a927f8c0098ae6f33ec` | idem — é a maior das duas (316 arquivos divergentes) |

O inventário dos 102 arquivos e as decisões pendentes estão em
`docs/agentes/resgates/2026-11-18-correcao-do-inventario.md`.

## Nota de método, para o próximo agente

Três armadilhas que eu caí. As duas primeiras custam um "resgate" de trabalho que
já estava salvo; a terceira é a perigosa, porque esconde trabalho de verdade:

1. **Comparar arquivo com arquivo de mesmo caminho.** A main move símbolo de
   lugar o tempo todo. `ProductCardSkeleton` "sumir" de `ContextualSkeleton.tsx`
   não quer dizer nada; é preciso procurar o símbolo em **toda** a main.
2. **Casar nome de teste por regex colada.** `it('...` e `it(\n  '...` são o
   mesmo teste. O segundo escapa de `it\(['"]`, e aí 6 casos que estavam na main
   apareceram como "só na branch".
3. **Usar `git diff main...branch` para procurar arquivo perdido.** Esse diff só
   mostra o que a *branch* mudou. Arquivo que a branch não tocou e que a `main`
   **apagou** não aparece — e é justamente o caso em que trabalho some sem
   ninguém mexer nele. Eu publiquei "0 arquivos ausentes" por causa disso; a
   medida certa é comparar as árvores (`git ls-tree -r`), que devolveu 573.
   Depois disso, o que decide é varrer os símbolos contra a `main` inteira.
