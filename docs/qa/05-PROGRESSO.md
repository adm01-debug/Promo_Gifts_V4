# 05 · Progresso

> Checklist de execução do plano de `04-PLANO.md` · 103 achados · 300 etapas.
> **O executor marca aqui.** Uma etapa só é marcada `[x]` depois de a verificação do campo "Como verificar" ter
> sido **executada** e a evidência colada na seção "Evidências" ao fim deste arquivo. "Deveria funcionar" não
> conclui etapa.
> `APROVAÇÃO` = a PR fica aberta aguardando o dono; não mergeie.

## Como marcar

- `[ ]` não iniciada · `[~]` em andamento (PR aberta) · `[x]` concluída com evidência · `[!]` bloqueada (diga por quê)
- `[-]` não aplicável: a evidência da etapa não corresponde mais ao código atual (regra 2 das instruções). Registre
  o que encontrou em "Anotações".

## Contagem

| Onda | Etapas | Com aprovação humana |
|---|---|---|
| 1 · Segurança e risco de perda de dado | 62 | 42 |
| 2 · Fluxos principais quebrados | 30 | 3 |
| 3 · Integridade de dados, regras de negócio e a rede de teste | 56 | 16 |
| 4 · Funcionalidades incompletas | 28 | 7 |
| 5 · Robustez: erros, estados e concorrência | 50 | 5 |
| 6 · Performance | 20 | 8 |
| 7 · Experiência de uso e consistência | 22 | 3 |
| 8 · Higiene: código morto, CI e observabilidade | 32 | 13 |
| **Total** | **300** | **97** |

Severidade das etapas: Média 158 · Alta 79 · Baixa 54 · Crítica 9


## Onda 1 — Segurança e risco de perda de dado

- [x] 001 — Medir quem realmente consome as três views `v_compras_*` antes de mexer nelas — onda 1 — Crítica — evidência: `docs/qa/evidencia-compras-views.md`
- [x] 002 — Mascarar `cost_price` e os campos de fornecedor em `v_compras_catalogo` — onda 1 — Crítica — APROVAÇÃO — concluída pela revogação do grant de `anon` (mascarar coluna foi rejeitado): ver Evidências
- [x] 003 — Mascarar `unit_cost` em `v_compras_precos_faixa` — onda 1 — Crítica — APROVAÇÃO — concluída pela revogação do grant de `anon` (mascarar coluna foi rejeitado): ver Evidências
- [x] 004 — Decidir o destino de `v_compras_precos_variante`, que hoje responde 401 ao `anon` — onda 1 — Alta — APROVAÇÃO — decidido: revogar o grant de `anon`: ver Evidências
- [x] 005 — Fazer o gate de views públicas descobrir view nova em vez de conferir uma lista fixa — onda 1 — Alta — APROVAÇÃO — concluída em #4049: ver Evidências
- [x] 006 — Registrar as três views de compras no contrato de views públicas — onda 1 — Alta — concluída em #4008 (`e87db751`)
- [-] 007 — Fechar `tabela_preco_gravacao_oficial_faixa` ao anônimo — onda 1 — Alta — APROVAÇÃO — premissa refutada; ver Evidências
- [ ] 008 — Fazer o gate de drift rodar também sobre grants de tabela ao `anon` — onda 1 — Média — APROVAÇÃO — **gate implementado em #4059 e mergeado em `ddd8488f`** (baseline de 42 tabelas + `relkind 'r','p'` + congelamento por coluna); medição de 2026-11-24 em "Evidências": 5 tabelas de `public` entregam linhas ao `anon` e 3 têm grant sem linha visível; o que falta é o gate enxergar `relkind` `'r'` para travar a próxima — matview já está coberta (a descoberta usa `relkind in ('v','m')`); o furo que sobra são as **45 tabelas** de `public` com SELECT concedido ao `anon` medidas no dump da etapa 005, que não entram na consulta (`scripts/check-public-views-drift.mjs`, `buildAnonSql`) **Revogacao das 13 `interno-grant-herdado`** na migration `20261125120000_revoke_anon_internal_grants_public.sql` (PR aberta, Regra 8); depois de aplicada, as 13 linhas saem de `.security/anon-tables-baseline.json` na mesma janela, senao o gate E118i acusa 'entrada sem efeito'.
- [ ] 009 — Tornar o guarda de required checks capaz de ver mais de um check — onda 1 — Crítica — APROVAÇÃO
- [ ] 010 — Pôr o CodeQL de fato como check obrigatório de `main` — onda 1 — Crítica — APROVAÇÃO
- [ ] 011 — Fazer `static-checks.yml` bloquear merge — onda 1 — Alta — APROVAÇÃO
- [ ] 012 — Tirar `docs/`, `tests/` e `e2e/` da allowlist do gitleaks — onda 1 — Alta — APROVAÇÃO
- [ ] 013 — Fazer o gate de segredo varrer o histórico, não só a árvore de trabalho — onda 1 — Alta — APROVAÇÃO
- [~] 014 — Estender `check-production-harnesses.mjs` a `/__visual/` e aos 9 harnesses de `AppRoutes.tsx` — onda 1 — Média
- [ ] 015 — Levantar o alcance da chave `service_role` vazada e preparar a rotação — onda 1 — Crítica — APROVAÇÃO
- [ ] 016 — Rotacionar a chave `service_role` do projeto de produção — onda 1 — Crítica — APROVAÇÃO
- [ ] 017 — Conferir no banco se a chave vazada foi usada — onda 1 — Alta — APROVAÇÃO
- [ ] 018 — Limpar as entradas `[ROTACIONAR]` do `.gitleaks.toml` depois da rotação — onda 1 — Média — APROVAÇÃO
- [~] 019 — Provar a tautologia e escrever o teste que falha antes da correção — onda 1 — Alta
- [ ] 020 — Corrigir as policies tautológicas de `attribute_definitions` — onda 1 — Alta — APROVAÇÃO
- [ ] 021 — Corrigir as policies tautológicas de `attribute_groups` — onda 1 — Alta — APROVAÇÃO
- [ ] 022 — Corrigir as policies tautológicas de `material_types` — onda 1 — Alta — APROVAÇÃO
- [ ] 023 — Corrigir as policies tautológicas de `material_variations` — onda 1 — Alta — APROVAÇÃO
- [ ] 024 — Corrigir as policies tautológicas de `supplier_attribute_definitions` — onda 1 — Alta — APROVAÇÃO
- [ ] 025 — Corrigir as policies tautológicas de `supplier_materials` — onda 1 — Alta — APROVAÇÃO
- [ ] 026 — Confirmar que nenhuma policy tautológica sobrou no banco — onda 1 — Alta
- [ ] 027 — Gate que detecta policy tautológica em migration nova — onda 1 — Média — APROVAÇÃO
- [ ] 028 — Inventariar o que está exposto no bucket `art-files` antes de fechar — onda 1 — Alta
- [ ] 029 — Trocar a URL pública do PDF da proposta por URL assinada — onda 1 — Alta
- [ ] 030 — Remover a leitura pública de `art-files/quotes/%` — onda 1 — Alta — APROVAÇÃO
- [ ] 031 — Restringir `art_files_auth_read` ao dono do arquivo — onda 1 — Alta — APROVAÇÃO
- [ ] 032 — Fechar `mockup_approval_links` para o anônimo não listar token — onda 1 — Alta — APROVAÇÃO
- [ ] 033 — Dar escopo de pasta às escritas em `recibos-entrega` — onda 1 — Alta — APROVAÇÃO
- [ ] 034 — Substituir a condição `true` disfarçada de `mockup-assets` — onda 1 — Média — APROVAÇÃO
- [ ] 035 — Trigger que impede o usuário de alterar o próprio `role` e `organization_id` em `profiles` — onda 1 — Média — APROVAÇÃO
- [ ] 036 — Tirar `profiles.role` da policy de `webhook_dispatcher_log` — onda 1 — Média — APROVAÇÃO
- [ ] 037 — Remover a função `current_user_role()` — onda 1 — Média — APROVAÇÃO
- [ ] 038 — Trigger `BEFORE DELETE` protegendo cotação aprovada ou convertida — onda 1 — Alta — APROVAÇÃO
- [ ] 039 — Revisar o `ON DELETE CASCADE` de `quote_items` — onda 1 — Média — APROVAÇÃO
- [~] 040 — Confirmação explícita na exclusão em massa de cotações — onda 1 — Média
- [~] 041 — Alarme quando a allowlist e o segredo do `e2e-cleanup` saem de sincronia — onda 1 — Média
- [~] 042 — Restringir o alcance do `e2e-cleanup` a dados marcados como de teste — onda 1 — Média
- [~] 043 — Ligar `_shared/url-allowlist.ts` no `webhook-dispatcher` — onda 1 — Alta
- [~] 044 — Ligar o bloqueio da allowlist de URL depois do período de observação — onda 1 — Alta
- [~] 045 — Exigir auth antes de responder `op=ping` no `crm-db-bridge` — onda 1 — Média
- [ ] 046 — Fechar `stock_daily_summary` à leitura irrestrita de qualquer conta logada — onda 1 — Média — APROVAÇÃO
- [ ] 047 — Fechar `xbz_upload_mapping`, `product_properties` e `supplier_import_batches` à leitura irrestrita — onda 1 — Média — APROVAÇÃO
- [ ] 048 — Inventariar e decidir as ~138 policies de SELECT com `USING (true)` — onda 1 — Média
- [ ] 049 — Gate que impede nascer policy de SELECT `USING (true)` sem justificativa — onda 1 — Média — APROVAÇÃO
- [ ] 050 — Revogar `SELECT` de `anon` nas matviews de schemas internos expostas no GraphQL — onda 1 — Média — APROVAÇÃO
- [ ] 051 — Reduzir os 477 objetos visíveis no GraphQL para usuário logado — onda 1 — Média — APROVAÇÃO
- [ ] 052 — Registro vivo das views `SECURITY DEFINER` de `public` — onda 1 — Média
- [ ] 053 — Teto de gravação por revista em `magazine-reader-state-write` — onda 1 — Baixa
- [ ] 054 — Revisar as 9 funções `SECURITY DEFINER` executáveis por `anon` — onda 1 — Média — APROVAÇÃO
- [ ] 055 — Triagem das 112 funções `SECURITY DEFINER` executáveis por usuário logado — onda 1 — Média — APROVAÇÃO
- [ ] 056 — Revogar os grants de `anon` abertos para a cadeia das views de compras — onda 1 — Média — APROVAÇÃO
- [~] 057 — Parar de devolver erro cru do Postgres na `crm-db-bridge` — onda 1 — Média
- [~] 058 — Adotar o helper de erro em `manage-users` — onda 1 — Média
- [~] 059 — Adotar o helper de erro em `step-up-verify` e `external-db-inspect` — onda 1 — Média
- [~] 060 — Adotar o helper de erro em `force-global-logout` — onda 1 — Baixa
- [ ] 061 — Gate que exige o helper de erro em edge function nova — onda 1 — Média — APROVAÇÃO
- [ ] 062 — Varredura de segredo em `recovery/`, fixtures e artefatos versionados — onda 1 — Média — APROVAÇÃO

## Onda 2 — Fluxos principais quebrados

- [~] 063 — Teste que prova o round-trip do template perdendo o custo — onda 2 — Crítica
- [~] 064 — Gravar `total_cost` ao aplicar o template — onda 2 — Crítica
- [ ] 065 — Verificar as cotações já criadas por template sem custo de personalização — onda 2 — Alta — APROVAÇÃO
- [ ] 066 — Unificar a fórmula de custo de personalização num único módulo — onda 2 — Média
- [~] 067 — Mover `/magazine/print` para fora do `ProtectedRoute` — onda 2 — Alta
- [~] 068 — Teste de rota garantindo que a impressão pública não exige login — onda 2 — Média
- [~] 069 — Acrescentar `admin` ao `ROLE_RANK` do `dispatcher-auth` — onda 2 — Alta
- [~] 070 — Gate que compara os mapas de papel dos dois helpers de autorização — onda 2 — Média
- [x] 071 — Conferir se outros consumidores de `dispatcher-auth` estavam negando admin — onda 2 — Média
- [x] 072 — Expor o erro do catálogo em `useCatalogState` — onda 2 — Alta
- [x] 073 — Estado de erro em `/produtos` e `/filtros` — onda 2 — Alta
- [x] 074 — Estado de erro na vitrine inicial — onda 2 — Alta
- [x] 075 — Teste que impede erro voltar a parecer vazio no catálogo — onda 2 — Média
  - Evidência 073/074: `FiltersPage.tsx` e `CatalogContent.tsx` agora separam erro (`isCatalogError`)
    de vazio (`shouldShowEmptyState`) usando `EmptyState variant="error"` com botão "Tentar novamente".
  - Evidência 075: `CatalogContent.error.test.tsx` (3 casos) e `FiltersPage.error.test.tsx` (2 casos) passam.
    Revertendo 073/074 localmente, os testes falham (prova: ramo de erro desabilitado → 2 testes falham).
  - `useCatalogState`/`useFiltersPageState` já expõem `isCatalogError`/`catalogError`/`refetchCatalog`.
- [x] 076 — Propagar o erro de carga em `useCollections` — onda 2 — Alta
- [x] 077 — Estado de erro em `/colecoes`, separado do vazio com CTA — onda 2 — Alta
  - Evidência 076: `useCollections.ts` agora expõe `loadError`/`isLoadError` (setado nos erros de
    `collections` e `collection_items`; limpo no sucesso). `CollectionsContext`/`useCollectionsPageState`
    propagam os campos.
  - Evidência 077: `CollectionsPage.tsx` mostra `EmptyState variant="error"` com "Tentar novamente" e
    esconde o CTA de criar coleção (`CollectionsEmptyStateSmart`) quando `state.isLoadError`.
- [x] 078 — Fazer os consumidores de `useQuoteTemplates` lerem o `error` — onda 2 — Alta
- [x] 079 — Fazer `fetchAllTemplates` registrar o erro em vez de engolir — onda 2 — Média
  - Evidência 078: `QuoteTemplatesList.tsx` e `AdminTemplatesManager.tsx` leem `error` do hook e
    renderizam o bloco de falha antes do vazio (`Não foi possível carregar os templates`).
    `QuoteTemplatesList.error.test.tsx` (4 casos) cobre erro e vazio legítimo nas duas telas; com o
    ramo de erro desabilitado localmente os 2 casos de erro falham (prova).
  - Evidência 079: `useQuoteTemplates.fetchAllTemplates` agora chama
    `setError('Erro ao carregar templates')` no catch, usando o mesmo estado de `fetchTemplates`
    (sem `errorAll`).
- [x] 080 — Teste que prova o teto de desconto ficando desatualizado — onda 2 — Alta
- [x] 081 — Migrar `useSellerDiscountLimits` para react-query — onda 2 — Alta
- [x] 082 — Invalidar o limite de desconto depois de alterá-lo — onda 2 — Alta
  - Evidência 080: `useSellerDiscountLimits.propagation.test.tsx` monta dois consumidores no mesmo
    `QueryClient` (painel admin grava, builder de orçamento lê). Antes da 081 falhava com
    `- Expected 2 / + Received 5` (teto antigo permanecia no builder) — bug provado.
  - Evidência 081: `useSellerDiscountLimits.ts` migrado para `useQuery` com
    `SELLER_DISCOUNT_LIMITS_KEY`; `setLimit`/`deleteLimit` invalidam
    `['seller-discount-limits']`. `fetchMyLimit`/`fetchAllLimits` mantêm identidade estável via
    `useRef` (contrato exigido por `DiscountManagementPanel.tsx`). Testes antigos
    (`useSellerDiscountLimits.test.ts` 12 casos, `.guard.test.ts` 2 casos) migrados para
    `QueryClientProvider` e verdes.
  - Evidência 082: `SellerDiscountLimitsAdminPage.tsx` (mutation `save`) agora também invalida
    `['seller-discount-limits']`, a chave lida pelo builder (`SellerDiscountLimitsPanel.tsx:27`).
  - Validação: `npx tsc --noEmit` exit 0; `npx eslint` nos 5 arquivos tocados sem problemas;
    `npx vitest run src/hooks src/components/admin src/pages/admin` → 163 arquivos, 2885 testes verdes.
- [ ] 083 — Reforçar o teto de desconto no banco, não só no front — onda 2 — Alta — APROVAÇÃO
- [x] 084 — Invalidar `['role-permissions']` depois de gravar permissões de papel — onda 2 — Alta
- [x] 085 — Substituir o `useState` local de `RolePermissionsPage` pela query compartilhada — onda 2 — Média
- [x] 086 — Invalidar a lista de comentários depois de comentar no kit — onda 2 — Alta
  - Evidência 084: no sucesso da gravação a página invalida `['role-permissions']` (a família de
    chaves que `useRBAC` lê). `RolePermissionsPage.invalidate.test.tsx` afirma a chamada; com a
    invalidação removida localmente o teste falha (prova).
  - Evidência 085: `RolePermissionsPage` não tem mais `useState` de leitura — `permissions` e
    `rolePermissions` vêm de `useQuery` (`['permissions-catalog']` e `['role-permissions','all']`),
    com `staleTime` de 5 min. Restou apenas o estado de edição (`pendingChanges`) e `isSaving`.
    `RolePermissionsPage.save.test.tsx` (7 casos) segue verde com o provider de cache.
  - Evidência 086: `useKitComments` (`useKitCollaboration.ts`) invalida
    `['kit-comments', kitId]` no `onSuccess` de `postComment` e de `resolveComment`.
    `useKitCollaboration.invalidate.test.tsx` (2 casos) cobre as duas; revertendo os `onSuccess`
    os 2 casos falham (prova). Realtime mantido intacto (decisão da etapa 087).
  - Validação: `npm run typecheck` exit 0; `npx eslint` nos arquivos tocados sem problemas;
    `npx vitest run src/pages/admin src/hooks/quotes src/hooks/kit-builder src/components/admin`
    → 55 arquivos, 665 testes verdes.
- [ ] 087 — Decidir e registrar se `kit_comments` entra no realtime — onda 2 — Média — APROVAÇÃO
- [x] 088 — Fazer o fallback da colaboração cobrir também a ausência de publicação — onda 2 — Média
  - Evidência 088: `useKitComments` (`src/hooks/kit-builder/useKitCollaboration.ts`) exporta
    `KIT_COMMENTS_FALLBACK_REFETCH_MS = 45_000` e mantém um `setInterval` que invalida
    `['kit-comments', kitId]` com `refetchType: 'active'`. O canal realtime conecta (SUBSCRIBED)
    mesmo quando `kit_comments` não está em `supabase_realtime` e nunca entrega evento —
    sem o fallback, a lista só atualizava ao recarregar a página.
    `useKitCollaboration.fallback.test.tsx` (2 casos, `vi.useFakeTimers()`) simula exatamente esse
    cenário: o mock do canal **sempre** chama `cb('SUBSCRIBED')` e nenhum evento chega; sem o
    `setInterval` os 2 casos falham (prova).
  - Validação: `npm run typecheck` exit 0; `npx vitest run src/hooks/kit-builder`
    → 3 arquivos, 13 testes verdes.
- [x] 089 — Corrigir a comparação de `href` que impede o badge de aprovações aparecer — onda 2 — Média
  - Causa raiz: `SidebarReorganized.tsx` comparava `item.href === '/admin/usuarios?tab=discounts'`,
    mas o item do menu declara `href: '/admin/usuarios'` — a condição nunca era verdadeira e o
    badge de aprovações pendentes nunca renderizava (a lógica de render em
    `SidebarNavGroup.tsx:204` estava correta).
  - Evidência 089: novo campo `badgeKey?: 'pending-discount-approvals'` em `NavItem`
    (`sidebar/SidebarNavGroup.tsx`), item `/admin/usuarios` marcado com ele, e a seleção passou a
    usar `item.badgeKey` através do helper puro `withPendingApprovalBadge`
    (`sidebar/pending-approval-badge.ts`). `SidebarReorganized.badge.test.ts` (7 casos) cobre
    aplicação, contagem zero/indefinida, não-admin, imutabilidade e preservação de identidade
    dos grupos alheios; revertendo a comparação para o `href` antigo o caso principal falha (prova).
- [x] 090 — Desligar o `refetchInterval` órfão do badge — onda 2 — Baixa
  - Evidência 090: a chave virou a constante exportada `PENDING_DISCOUNT_APPROVALS_QUERY_KEY`
    (mesmo valor `['pending-discount-approvals-count']`) e o intervalo da sidebar foi alinhado ao
    de `DiscountApprovalHeaderBadge.tsx` (`60_000` em vez de `30_000`). Com `queryKey` idêntica o
    React Query já compartilha **um** observer, mas a divergência de opções gerava refetch a
    cada 30 s além do ciclo de 60 s do header. `AdminUsuariosPage.tsx` fica para a etapa 199.
    Asserção de código no mesmo teste: a sidebar não contém mais `refetchInterval: 30_000` nem a
    string literal da chave, e ambos os arquivos declaram `60_000`.
  - Validação: `npm run typecheck` exit 0; `npx eslint` nos arquivos tocados sem problemas;
    `npx vitest run src/components/layout` → 16 arquivos, 2377 testes verdes (42 skipped).
- [x] 091 — Dar ação ao botão "Exportar Relatório" da comparação de fornecedores — onda 2 — Média
  - Decisão: **implementar**, não remover — o repo já tem o gerador de planilha
    (`src/utils/excelExport.ts`, `@e965/xlsx`) usado em outras telas, e o comparativo é
    exatamente o tipo de dado que o comprador leva para reunião.
  - Evidência 091: `SupplierComparisonModal.tsx` ganhou `handleExportReport`, que exporta os
    fornecedores **do filtro atual** (`filteredProducts`, não `allProducts`) com fornecedor, preço,
    MOQ, estoque, prazo, pontuação, ativo e economia por MOQ. Nome acessível:
    `aria-label="Exportar relatório comparativo em Excel"` + ícone `aria-hidden`.
    Estados cobertos: sucesso (`toast.success`), falha (`toast.error`) e lista filtrada vazia
    (`toast.info`, sem arquivo). `SupplierComparisonModal.export.test.tsx` (3 casos) cobre os três;
    revertendo `onClick` + `aria-label` os 3 falham (prova). A lógica de comparação não foi tocada.
  - Validação: `npm run typecheck` exit 0; `npx eslint` nos 2 arquivos sem problemas;
    `npx vitest run src/components/compare` → 2 arquivos, 6 testes verdes.
- [x] 092 — Varredura dirigida de "erro virando vazio" nas demais telas de fluxo principal — onda 2 — Média
  - Evidência 092: criado `docs/qa/telas-sem-estado-de-erro.md` com **3 achados**, cada um com
    `arquivo:linha` e trecho, mais a tabela das 11 telas verificadas e consideradas cobertas:
    1. `src/pages/quotes/QuotesKanbanPage.tsx:26` — `useQuotes()` descarta `error`; quadro renderiza
       todas as colunas vazias quando a consulta falha.
    2. `src/pages/mockups/MockupHistoryPage.tsx:64` — `queryFn` lança, mas `isError`/`error` não são
       lidos; a linha 220 cai em "Nenhum mockup gerado ainda".
    3. `src/hooks/mockup/useMockupGenerator.ts:352-363` — `fetchHistory` só loga o erro; a aba
       Histórico do `MockupGenerator` mostra vazio.
    Conforme o caminho recomendado da etapa, **não foram corrigidos aqui** — cada um vira etapa
    própria no modelo das 073/077. Não contados: `catch` do CRM bridge
    (`QuotesKanbanPage.tsx:54-56`), que tem fallback declarado.

## Onda 3 — Integridade de dados, regras de negócio e a rede de teste

- [x] 093 — Teste que prova o banco aceitando transição proibida de status — onda 3 — Alta
  - Evidência 093: criado `tests/sql/quote-status-transitions/` com `extract-transitions.mts`,
    `fixture.sql`, `run-tests.py` e `README.md`, mais o script `npm run test:quote-transitions:postgres`.
    Os pares **não** são redigitados: `extract-transitions.mts` importa `QUOTE_VALID_TRANSITIONS` de
    `src/lib/quote-status-config.ts` e o runner deriva os 70 pares proibidos e os 30 permitidos.
    `fixture.sql` reproduz o `CHECK valid_quote_status` de produção
    (`supabase/migrations-snapshot/SCHEMA_LIVE.sql:8940`) e o corpo atual de
    `fn_quotes_enforce_immutability` (idem, `:38779`), sem corrigi-lo. Container `postgres:17`
    descartável, `--network none`, label de posse, cada par em `BEGIN; INSERT; UPDATE; ROLLBACK`.
    Saída: **55 dos 70 pares proibidos foram aceitos pelo banco** (`cancelled → approved`,
    `rejected → approved`, `draft → converted`, `sent → draft`, entre outros); 15 rejeitados — só os
    que saem de `approved`/`converted`. Os **30 pares permitidos passaram todos** (nenhuma regressão
    de fluxo legítimo). Resumo em `work/quote-status-transitions-sql/sql-test-results.json`.
    Teste vermelho por desenho: passa inteiro quando a etapa 094 entrar, sem alteração no teste.
- [ ] 094 — Trigger de transição de status válida em `quotes` — onda 3 — Alta — APROVAÇÃO
- [x] 095 — Um único caminho de escrita de status no front — onda 3 — Alta
  - Evidência 095: criado `src/lib/quotes/status-transition.ts` com
    `assertQuoteStatusTransition` (valida pelo mapa, emite telemetria e lança
    `QuoteStatusTransitionError`) e `updateQuoteStatusSafely` (lê o status atual
    quando o chamador não o tem, valida, faz o UPDATE e traduz o 23514 do banco
    em mensagem legível). 12 testes em
    `src/lib/quotes/__tests__/status-transition.test.ts` — 12/12 verdes.
  - Decisão: `quoteService.updateQuoteStatus` (src/services/quoteService.ts:433)
    **não** foi reusado; ele já é guardado mas carrega e-mail transacional e
    histórico, contrato diferente dos 4 pontos de escrita da onda 3. O serviço novo
    tem escopo só de guarda + escrita, então os pontos migrados não mudam de
    comportamento além da validação.
- [x] 096 — `useDiscountApproval` passa a escrever status pelo caminho único — onda 3 — Alta
  - Evidência 096: o fallback legado de `requestApproval` (quando o client não tem
    `rpc`) passou a chamar `updateQuoteStatusSafely({ to: 'pending_approval' })` em
    vez do `update({ status })` cru; o `catch` ganhou um ramo para
    `QuoteStatusTransitionError` que mostra a mensagem pronta em vez do genérico.
    O caminho canônico (RPC `request_discount_approval_transactional`) não mudou.
- [~] 097 — `DiscountApprovalQueue` passa a escrever status pelo caminho único — onda 3 — Alta — NÃO APLICÁVEL
  - Evidência 097: `src/components/admin/DiscountApprovalQueue.tsx` tem **0 imports** no repositório
    (verificado por varredura em `src/`): é componente órfão. A escrita de status na linha 162 nunca
    executa em produção, então migrá-la para o caminho único não muda comportamento. A remoção do
    arquivo é a etapa 276. Reabrir esta etapa só se o componente voltar a ser montado.
- [x] 098 — `DiscountRequestDetailPage` passa a escrever status pelo caminho único — onda 3 — Alta
  - Evidência 098: a tela `/admin/aprovacoes-desconto/:id` trocou o
    `quotes.update({ status: approved ? 'pending' : 'draft' })` por
    `updateQuoteStatusSafely({ to: approved ? 'pending' : 'draft' })`; o
    `onError` já usa `sanitizeError`, então a mensagem do serviço chega ao toast.
- [x] 099 — `QuoteViewPage` passa a escrever status pelo caminho único — onda 3 — Alta
  - Evidência 099: o item "Cancelar Sincronização" (`sent → pending`) trocou o
    UPDATE direto por `updateQuoteStatusSafely({ from: quote.status, to: 'pending' })`
    — par que o mapa permite, então o comportamento em produção é o mesmo, agora
    com a guarda. O import de `supabase` saiu do arquivo (ficou sem uso).
- [x] 100 — Remover o bypass `pending → pending_approval` do builder — onda 3 — Média
  - Evidência 100: escolha registrada — **a transição é legítima**. A RPC
    `request_discount_approval_transactional` aceita orçamento em
    `draft|pending|pending_approval` e grava `pending_approval`
    (`supabase/migrations/20260829115000_discount_approval_pending_reuse_and_markup_audit.sql:34-37,78-90`), e o builder já oferece
    o botão "Solicitar aprovação" para cotação `pending`. Então o par entrou em
    `QUOTE_VALID_TRANSITIONS.pending` (SSOT) e o bypass
    `isApprovalRequestFromEditable` foi removido de `useQuoteBuilderState.ts` —
    agora só o mapa decide. Efeito colateral medido: o teste SQL da etapa 093
    passou de 70/30 para **69/31** pares (proibidos/permitidos), com 54 aceitos
    indevidamente pelo banco e 0 regressões entre os permitidos.
- [x] 101 — Fazer `assertDiscountApprovalTransition` valer em todos os pontos de escrita — onda 3 — Baixa
  - Evidência 101: a asserção agora roda também no fallback de
    `discountApprovalResponder.ts` (antes do UPDATE em
    `discount_approval_requests`), além da tela de detalhe. O comentário do
    módulo deixou de afirmar cobertura genérica e passa a listar os dois call
    sites reais, deixando claro que o caminho canônico (RPC transacional)
    valida no banco. Motivo de não centralizar no serviço da 095: aquele serviço
    escreve em `quotes`, não em `discount_approval_requests` — misturar as duas
    máquinas de estado num módulo só esconderia a diferença de autoridade.
- [ ] 102 — Fazer `discount_approval_requests` chegar a `expired` — onda 3 — Média — APROVAÇÃO
- [x] 103 — Teste que prova a soma das linhas não fechando com o subtotal — onda 3 — Média
  - Evidência 103: `src/lib/quotes/__tests__/markup-divergence.test.ts` monta o caso
    do achado (1,01 × 7 com markup de 13%) e compara as duas definições de
    markup: por linha (`applyNegotiationMarkup`, `round2(unit_price * factor)`,
    usado em `useQuoteViewData.ts:124` e `QuoteViewPage.tsx:120`) contra o
    agregado (`calculateQuoteTotals`, `round2(realSubtotal * (1 + markup/100))`,
    `quoteHelpers.ts:88`). Prova numérica via `npx tsx`:
    `{"unitarioComMarkup":1.14,"somaDasLinhas":7.98,"subtotalPersistido":7.99,"diferenca":0.01}`.
    O teste roda como `it.fails` (único idioma do repo para defeito ainda não
    corrigido — precedente em `tests/a11y/magazine-a11y.test.tsx:146`) porque a
    correção depende da decisão de arredondamento da etapa 104, que é APROVAÇÃO.
    Ele vira `it` assim que a 104/105 entrarem, sem mudar o cenário.
- [ ] 104 — Decidir e documentar onde o arredondamento acontece — onda 3 — Média — APROVAÇÃO
- [ ] 105 — Alinhar o cálculo agregado à decisão de arredondamento — onda 3 — Média
- [ ] 106 — Garantir que o PDF usa o mesmo total do banco — onda 3 — Média
- [ ] 107 — Teste de centavo no PDF da proposta — onda 3 — Média
- [x] 108 — Teste que prova o trigger gravando desconto em dois campos ao mesmo tempo — onda 3 — Alta
  - Evidência 108: `tests/sql/quote-discount-invariant/` (`discount-fixture.sql` +
    `run-tests.py` + `README.md`, script `npm run test:quote-discount-invariant:postgres`).
    O fixture reproduz **sem corrigir** `fn_quote_items_calc_subtotal`
    (`SCHEMA_LIVE.sql:38710`) e `fn_quotes_recalc_subtotal_from_items` (idem
    `:38853`) mais as tabelas `quotes`/`quote_items` e os triggers que as chamam;
    o runner sobe `postgres:17` com `--network none`, label de posse e
    `BEGIN/ROLLBACK` (nada persiste, `productionTouched: false`). Saída medida:
    `FAIL invariante de desconto unico em public.quotes` →
    `{"discount_percent": 10.0, "discount_amount": 10.0, "subtotal": 100.0, "total": 90.0}`
    com `invariantViolated: true` e exit 1. É vermelho por desenho: a correção é a
    etapa 109 (APROVAÇÃO). O entrypoint do `postgres:17` derruba o servidor de
    bootstrap e o runner reaplica a fixture até o servidor definitivo subir.
- [ ] 109 — Alinhar `fn_quotes_recalc_subtotal_from_items` ao invariante de um campo de desconto — onda 3 — Alta — APROVAÇÃO
- [ ] 110 — Confirmar que o alarme de corrupção parou de disparar em cotação normal — onda 3 — Média
- [ ] 111 — Alinhar as duas funções do banco quanto ao desconto por item — onda 3 — Média — APROVAÇÃO
- [ ] 112 — Constraint que impede desconto percentual e absoluto preenchidos juntos — onda 3 — Média — APROVAÇÃO
- [x] 113 — Teste do subtotal no caminho kit → cotação — onda 3 — Média
  - Evidência 113: `src/lib/kit-builder/__tests__/subtotal-personalization.test.ts`
    compara `pricing.subtotal` com o que o banco grava
    (`SUM(quantity * unit_price + personalization_cost)`, `SCHEMA_LIVE.sql:38853`).
    Antes da 114 o kit mostrava só caixa + itens e o banco regravava com a
    personalização: diferença exata de 20,00 no cenário (caixa 3,00 + caneca
    8,00 × 2, kit de 10, gravação 20,00). Ficou `it.fails` enquanto a 114 não
    existia; com a 114 entrou como verificação de regressão (`it`) e passa.
- [x] 114 — Alinhar `price-calculator.ts` à definição de subtotal do banco — onda 3 — Média
  - Evidência 114: `calculateTotalKitPrice` (`src/lib/kit-builder/price-calculator.ts`)
    passou a expor `productsPrice` (caixa + itens, sem personalização), `subtotal`
    a incluir a personalização — exatamente o que
    `fn_quotes_recalc_subtotal_from_items` grava — e `total = subtotal` (antes
    `subtotal + personalizationPrice`, que passaria a contar em dobro). Os dois
    consumidores que mostram a linha “Produtos” foram apontados para
    `productsPrice`: `KitPricingCard.tsx:124` e `kitPdfGenerator.ts:364`. O payload
    de cotação (`useKitBuilderQuote.ts:218`) continua em `pricing.subtotal`, agora
    com o mesmo número que o banco regrava. Verificado: `npm run typecheck` exit 0;
    `eslint` nos 4 arquivos sem achados; `vitest run` em `src/lib/quotes`,
    `src/lib/kit-builder`, `tests/lib/kit-builder-price.test.ts`,
    `src/components/kit-builder` e `tests/pages/kit-builder`
    → **20 arquivos, 234 testes verdes + 1 expected fail** (o `it.fails` da 103, que
    depende da 104).
- [ ] 115 — Levantar os três tratamentos de `shipping_cost` e escolher um — onda 3 — Baixa — APROVAÇÃO
- [ ] 116 — Unificar o tratamento de `shipping_cost` no total — onda 3 — Média
- [ ] 117 — Escrever a fórmula canônica do total da cotação — onda 3 — Média — APROVAÇÃO
- [ ] 118 — Teste de contrato entre front e banco para o total da cotação — onda 3 — Média
- [ ] 119 — Ler e registrar a fórmula usada pelas RPCs transacionais de cotação — onda 3 — Alta
- [ ] 120 — Relatório de cotações com total divergente, sem corrigir — onda 3 — Alta — APROVAÇÃO
- [ ] 121 — Teste que prova a ausência de validação de MOQ no orçamento — onda 3 — Alta
- [ ] 122 — Validar MOQ no builder de orçamento, reusando a validação do kit — onda 3 — Alta
- [ ] 123 — Reforçar o MOQ no banco — onda 3 — Alta — APROVAÇÃO
- [ ] 124 — Mensagem de MOQ que diz o número e o que fazer — onda 3 — Média
- [ ] 125 — Teste que prova a alçada intermediária de desconto não existir — onda 3 — Alta
- [ ] 126 — Ler `approval_required_above` no builder de orçamento — onda 3 — Alta
- [ ] 127 — Reforçar a alçada no banco — onda 3 — Alta — APROVAÇÃO
- [ ] 128 — Tela para o dono configurar a alçada de desconto — onda 3 — Média
- [ ] 129 — Reconciliar os degraus de desconto do documento manual com o implementado — onda 3 — Média — APROVAÇÃO
- [ ] 130 — Responder, no documento de regras, as dúvidas em aberto que esta auditoria fechou — onda 3 — Baixa
- [x] 131 — Registrar a linha de base da suíte completa de testes — onda 3 — Alta
  - Evidência 131: criado `docs/qa/suite-baseline.md` com a medição da suíte completa no commit
    `4b02d228` (base de `main` desta PR) — `Test Files 9 failed | 1741 passed | 131 skipped (1881)`
    e `Tests 30 failed | 32886 passed | 1 expected fail | 1148 skipped | 24 todo (34089)` —, a tabela
    dos 9 arquivos com a mensagem de erro de cada grupo e o comando de reprodução. O plano
    (`docs/qa/04-PLANO.md:3639`) foi escrito sobre `ded84e9` (7 arquivos / 26 casos); a linha de base
    mudou e os dois arquivos novos (`rls-ach013-tautologia`, `DiscountRequestDetailPage`) estão
    registrados como **fora** do escopo 131–136.
- [x] 132 — Resolver os testes de kit-builder que importam um componente que não existe — onda 3 — Alta
  - Evidência 132: removidos `tests/components/kit-builder/FreightEstimator.test.tsx` e o bloco
    `describe("FreightEstimator")` de `tests/components/kit-builder/KitBuilderComponents.test.tsx`
    (4 casos com `await import`), mais o nome no cabeçalho do arquivo. O componente foi **removido de
    propósito**, não renomeado: `gh api 'repos/adm01-debug/Promo_Gifts_V4/commits?path=src/components/kit-builder/FreightEstimator.tsx'`
    devolve 8 commits e o mais antigo, `4eddf85d` =
    `feat(kit): plano de volumes do kit no lugar do FreightEstimator (etapa 52) (#3951)`, lista
    `removed src/components/kit-builder/FreightEstimator.tsx`. O substituto está em uso:
    `FreightPlanPanel` + `useKitFreightPlan` (`src/components/kit-builder/KitSummary.tsx:15-16`).
    Antes: suíte dos dois arquivos vermelha por `Failed to resolve import`. Depois:
    `npx vitest run tests/components/kit-builder/` → verde.
- [x] 133 — Corrigir os 14 casos de `KitBuilderPage.test.tsx` — onda 3 — Alta
  - Evidência 133: os 22 casos (o plano dizia 14; a base atual tem 22) falhavam todos com
    `Error: No QueryClient set, use QueryClientProvider to set one`, lançado por
    `useProductMeasures` (`src/hooks/freight/useProductMeasures.ts:58`) ← `useKitFreightPlan` ←
    `KitMobileSummaryBar.tsx:48`, que o teste não mocka. Não era import quebrado nem perda de
    comportamento: o teste montava a página com `render()` cru. Trocado `render()` por
    `renderWithProviders` (`tests/components/render-helpers.tsx`, que já traz
    `QueryClientProvider` + `MemoryRouter` + `TooltipProvider` + `SellerCartProvider` e os mocks de
    supabase/auth/sonner) nos 24 sites, removido o `MemoryRouter` manual e o import agora sem uso.
    Evidência: `npx vitest run tests/components/kit-builder/ tests/components/QuoteCommentsSection.test.tsx tests/components/pages/KitBuilderPage.test.tsx`
    → `Test Files 24 passed (24)` / `Tests 178 passed (178)`.
- [x] 134 — Corrigir `KitSummary.weight.test.tsx` — onda 3 — Alta
  - Evidência 134: **era o teste, não o componente** — e o teste era órfão do componente removido
    na etapa 52. `tests/components/kit-builder/KitSummary.weight.test.tsx` mockava
    `@/components/kit-builder/FreightEstimator` (que não existe) e assertava
    `data-testid="unknown-weight-count"`, testid que não existe em `src/components/kit-builder/KitSummary.tsx`;
    a falha real era `No QueryClient set` (usava `render()` cru). A regra de negócio que ele
    descreve — **peso zero não é medição** — está implementada e coberta em três camadas:
    `isKnownMeasure` (`src/lib/freight/units.ts:98`, `Number.isFinite && > 0`, SSOT),
    `summarizeKitWeight` (`src/lib/kit-builder/weight.ts:19-36`),
    `itemDentroDaCaixa`/`kitFechado` (`src/lib/freight/fromKit.ts:53-56`, peso 0 → `missing: ['weight']`)
    e a falha fechada de `planFreight` (`:271-279`, `dados_insuficientes` + `missing`), com testes em
    `tests/lib/kit-builder/weight.test.ts` (inclui "conta caixa com peso zero como peso desconhecido")
    e `src/lib/freight/__tests__/fromKit.test.ts:137-152`, `:160-168`. Arquivo removido por ser ruído
    do mesmo módulo removido; a garantia de frete continua coberta na lib e no painel.
- [x] 135 — Corrigir `QuoteCommentsSection.test.tsx` — onda 3 — Alta
  - Evidência 135: a asserção é que estava velha, não o comportamento. `tests/components/QuoteCommentsSection.test.tsx:206`
    esperava `Remova as respostas antes de excluir este comentário.`; o componente diz
    `Remova suas respostas antes de excluir este comentário.` (`src/components/quotes/QuoteCommentsSection.tsx:348`
    no `title` e `:362` no aviso). A regra está intacta e não foi tocada:
    `disabled={isSubmitting || hasReplies}` bloqueia a exclusão do comentário raiz com respostas (`:345`),
    `isAuthor && hasReplies` mostra o aviso (`:360`) e as respostas seguem na tela
    (`Resposta preservada` continua asserida). Ajustado só o texto do teste.
- [ ] 136 — Coordenar `drift-baseline.test.mjs` com a PR aberta do gate E40 — onda 3 — Média
- [ ] 137 — Fazer a suíte inteira bloquear merge — onda 3 — Alta — APROVAÇÃO
- [ ] 138 — Gate que impede teste apontando para módulo que não existe — onda 3 — Média
- [ ] 139 — Criar a FK de `art_file_attachments.user_id` — onda 3 — Baixa — APROVAÇÃO
- [ ] 140 — Varredura de coluna usada em policy sem FK — onda 3 — Média
- [x] 141 — Helper único para atualizar `profiles.preferences` sem perder escrita — onda 3 — Média — APROVAÇÃO
- [x] 142 — `useCatalogPreferences` passa a usar o helper — onda 3 — Média
- [ ] 143 — `useSimulatorPreferences` passa a usar o helper e deixa o erro visível — onda 3 — Média
- [x] 144 — `useBadgeVisibilityStore` passa a usar o helper nos dois pontos — onda 3 — Média
- [x] 145 — `useExpertChat` passa a usar o helper — onda 3 — Baixa
- [x] 146 — Teste de escrita perdida em `profiles.preferences` — onda 3 — Média
- [ ] 147 — Verificação recorrente de registro órfão nas relações críticas — onda 3 — Média — APROVAÇÃO
- [ ] 148 — Reconciliação da Onda 3: conferir que os números de cotação fecham — onda 3 — Alta

## Onda 4 — Funcionalidades incompletas

- [ ] 149 — Levantar o que existe do contrato de frete e o que falta para ligá-lo — onda 4 — Média
- [ ] 150 — Decidir com o dono se a cotação automática de frete entra agora — onda 4 — Média — APROVAÇÃO
- [ ] 151 — Caminho (a): edge function de cotação de frete — onda 4 — Média — APROVAÇÃO
- [ ] 152 — Caminho (a): ligar a cotação de frete no builder de orçamento — onda 4 — Média
- [ ] 153 — Caminho (b): remover os módulos mortos de frete automático — onda 4 — Baixa
- [ ] 154 — Gerar a matriz de rotas a partir das rotas reais — onda 4 — Média
- [ ] 155 — Remover as 5 entradas fantasma da matriz — onda 4 — Média
- [ ] 156 — Acrescentar as 25 rotas reais ausentes da matriz — onda 4 — Média
- [ ] 157 — Avisar na tela quando a matriz estiver desatualizada — onda 4 — Baixa
- [ ] 158 — Rotular as sugestões simuladas em `ClientHealthHero` — onda 4 — Média
- [ ] 159 — Varredura de consumo de `isMock` em todo o BI — onda 4 — Média
- [ ] 160 — Fazer o rótulo de dado simulado ser obrigatório por construção — onda 4 — Média
- [ ] 161 — Decidir o destino das 5 rotas sem ponto de entrada — onda 4 — Baixa
- [ ] 162 — Dar entrada no menu a `/ferramentas/cobertura` — onda 4 — Média
- [ ] 163 — Resolver `/admin/badges-inteligencia` — onda 4 — Baixa
- [ ] 164 — Resolver `/admin/qa/sidebar` e `/admin/storage-test` — onda 4 — Baixa
- [ ] 165 — Resolver `/external-db-test` e `/orcamentos/lista` — onda 4 — Baixa
- [ ] 166 — Apurar, caso a caso, quais das 50 edges são realmente órfãs — onda 4 — Média
- [ ] 167 — Confirmar o consumidor das funções de chave MCP — onda 4 — Média — APROVAÇÃO
- [ ] 168 — Avaliar as edges de teste que estão ativas em produção — onda 4 — Média
- [ ] 169 — Remover as edges órfãs confirmadas — onda 4 — Média — APROVAÇÃO
- [ ] 170 — Fazer o gerador de contexto parar de dar falso positivo de edge órfã — onda 4 — Média
- [ ] 171 — Trocar os nomes fictícios de fornecedor no gráfico de estoque — onda 4 — Baixa
- [ ] 172 — Teste garantindo que nome real de fornecedor não entra em série simulada — onda 4 — Baixa
- [ ] 173 — Fazer `cors-snapshot.json` registrar a origem permitida de verdade — onda 4 — Baixa
- [ ] 174 — Gate que mantém `cors-snapshot.json` em dia — onda 4 — Baixa — APROVAÇÃO
- [ ] 175 — Fazer o teste de integração da ponte do CRM voltar a bloquear — onda 4 — Média — APROVAÇÃO
- [ ] 176 — Restabelecer o acesso do MCP da Vercel ao projeto — onda 4 — Média — APROVAÇÃO

## Onda 5 — Robustez: erros, estados e concorrência

- [ ] 177 — Timeout nos dois `fetch` do `webhook-dispatcher` — onda 5 — Alta
- [ ] 178 — Timeout nos outros 4 pontos sem `AbortSignal` — onda 5 — Média
- [ ] 179 — Limitar o `backoff_seconds` que vem do banco — onda 5 — Média
- [ ] 180 — Teto de bytes e conversão eficiente em `analyze-logo-colors` — onda 5 — Média
- [ ] 181 — Trocar a consulta de geolocalização em claro de `validate-access` — onda 5 — Média
- [x] 182 — Teste que prova a corrida na tabela de preço da técnica — onda 5 — Alta
- [x] 183 — Cancelar a busca anterior em `useTechniquePricingOptions` — onda 5 — Alta
- [x] 184 — Varredura do padrão "dois `await` e um `setState` sem guarda" — onda 5 — Média
- [x] 185 — Teste e correção da corrida em `InlinePriceCalculator` — onda 5 — Alta
- [ ] 186 — Invalidar `['quote-item-counts']` nas mutations de orçamento — onda 5 — Média
- [ ] 187 — Varredura de `queryKey` definida e nunca invalidada — onda 5 — Média
- [ ] 182 — Teste que prova a corrida na tabela de preço da técnica — onda 5 — Alta
- [ ] 183 — Cancelar a busca anterior em `useTechniquePricingOptions` — onda 5 — Alta
- [ ] 184 — Varredura do padrão "dois `await` e um `setState` sem guarda" — onda 5 — Média
- [ ] 185 — Teste e correção da corrida em `InlinePriceCalculator` — onda 5 — Alta
- [x] 186 — Invalidar `['quote-item-counts']` nas mutations de orçamento — onda 5 — Média
- [x] 187 — Varredura de `queryKey` definida e nunca invalidada — onda 5 — Média
- [ ] 188 — Unificar a contagem de aprovações de desconto num único hook — onda 5 — Média
- [ ] 189 — Teste que impede a chave de contagem voltar a ter duas implementações — onda 5 — Baixa
- [ ] 190 — Unificar a `queryFn` de `['video-variant-links']` — onda 5 — Média
- [ ] 191 — Resolver a duplicação de `useReplenishments` — onda 5 — Baixa
- [ ] 192 — Resolver a duplicação entre `usePersonalizationData` e `usePersonalizationManager` — onda 5 — Média
- [ ] 193 — Resolver a duplicação de `useDevGate` — onda 5 — Baixa
- [x] 194 — Invalidar os widgets do painel de orçamentos — onda 5 — Baixa
- [ ] 195 — Decidir o destino de `useCustomKitsRealtime` — onda 5 — Média — APROVAÇÃO
- [ ] 196 — Decidir o destino de `CredentialsChangedBanner` — onda 5 — Média — APROVAÇÃO
- [ ] 197 — Decidir o destino de `RealtimeBadge` — onda 5 — Baixa
- [ ] 198 — Decidir o destino da assinatura em `notificationPreferenceService` — onda 5 — Baixa
- [ ] 199 — Gate que compara as assinaturas de realtime com a publicação do banco — onda 5 — Média — APROVAÇÃO
- [ ] 200 — Dar sufixo único ao canal de `MyDiscountRequestsWidget` — onda 5 — Média
- [ ] 201 — Teste e correção do item duplicado no kit — onda 5 — Média
- [ ] 202 — Dar retorno ao lote de thumbnails que falha inteiro — onda 5 — Baixa
- [x] 203 — Registrar com contexto o erro engolido em `useQuotesDashboard` — onda 5 — Baixa
- [ ] 204 — Armadilha de foco e Escape em `KitOnboardingTour` — onda 5 — Média
- [ ] 205 — Armadilha de foco em `VoiceSearchOverlay` — onda 5 — Média
- [ ] 206 — Nome acessível nos 6 botões de ícone — onda 5 — Baixa
- [ ] 207 — Inventário de edge functions que não usam o helper de erro — onda 5 — Média
- [ ] 208 — Adotar o helper de erro nas edges `verify_jwt=false` restantes — onda 5 — Média
- [ ] 209 — Adotar o helper de erro nas edges que tocam dado de cliente — onda 5 — Média
- [ ] 210 — Adotar o helper de erro nas edges restantes — onda 5 — Baixa
- [ ] 211 — Inventário de `fetch` sem timeout nas edge functions — onda 5 — Média
- [ ] 212 — Aplicar timeout nos `fetch` a terceiro que o inventário achou — onda 5 — Média
- [ ] 213 — Gate que exige timeout em `fetch` a terceiro em edge function — onda 5 — Média — APROVAÇÃO
- [ ] 214 — Estado de erro nas telas de orçamento listadas no levantamento — onda 5 — Média
- [ ] 215 — Estado de erro nas telas de kit-builder — onda 5 — Média
- [ ] 216 — Estado de erro nas telas de mockup e frete — onda 5 — Média
- [ ] 217 — Impedir envio duplicado de orçamento por duplo clique — onda 5 — Média
- [ ] 218 — Impedir aprovação duplicada de desconto — onda 5 — Média — APROVAÇÃO
- [ ] 219 — Medir e cobrir o cenário de duas abas no mesmo rascunho — onda 5 — Média
- [ ] 220 — Medir e cobrir o upload duplicado de arquivo de arte — onda 5 — Baixa
- [ ] 221 — Cobertura mínima de rota: proteção e papel — onda 5 — Média
- [ ] 222 — Cobrir com teste os hooks do caminho do dinheiro que não têm nenhum — onda 5 — Alta
- [ ] 223 — Teste de sessão expirada no meio do fluxo de orçamento — onda 5 — Média
- [ ] 224 — Teste de terceiro fora do ar no envio de webhook — onda 5 — Média
- [ ] 225 — Teste de RLS como especificação para as tabelas corrigidas na Onda 1 — onda 5 — Alta
- [ ] 226 — Reconciliação da Onda 5 — onda 5 — Média

## Onda 6 — Performance

- [ ] 227 — Parar a listagem de produtos do admin de carregar duas vezes — onda 6 — Média
- [ ] 228 — Varredura do padrão "dois efeitos no mount buscando o mesmo dado" — onda 6 — Média
- [ ] 229 — Migrar `useQuoteTemplates` para react-query — onda 6 — Média
- [ ] 230 — Substituir o laço de INSERT de `GroupInheritance` por uma escrita em lote — onda 6 — Média
- [ ] 231 — Escrita em lote em `RolePermissionsPage` — onda 6 — Média
- [ ] 232 — Escrita em lote em `ProductPersonalizationManager` — onda 6 — Baixa
- [ ] 233 — Índice para `business_calendar.created_by` — onda 6 — Baixa — APROVAÇÃO
- [ ] 234 — Índice para `freight_settings.updated_by` — onda 6 — Baixa — APROVAÇÃO
- [ ] 235 — Envolver `auth.uid()` em subselect nas 6 policies de `orders` e `order_items` — onda 6 — Baixa — APROVAÇÃO
- [ ] 236 — Envolver `auth.uid()` em subselect na policy de upload de mockup — onda 6 — Baixa — APROVAÇÃO
- [ ] 237 — Mover `pg_repack` e `pgstattuple` para o schema `extensions` — onda 6 — Baixa — APROVAÇÃO
- [ ] 238 — Paginação obrigatória no consumo de `stock_daily_summary` — onda 6 — Média
- [ ] 239 — Limite nas leituras de `xbz_upload_mapping` e `product_properties` — onda 6 — Baixa
- [ ] 240 — Índices de apoio para as consultas de histórico de estoque — onda 6 — Média — APROVAÇÃO
- [ ] 241 — Levantar índices sem uso e consultas custosas antes de criar mais índice — onda 6 — Média
- [ ] 242 — Pôr os gates de tamanho de bundle e ciclo de chunk no caminho que bloqueia — onda 6 — Média — APROVAÇÃO
- [ ] 243 — Conferir o `statement_timeout` por papel — onda 6 — Média — APROVAÇÃO
- [ ] 244 — Conferir o plano da busca pública `fn_super_filtro` — onda 6 — Média
- [ ] 245 — Medir requisições por tela nas três telas mais usadas — onda 6 — Média
- [ ] 246 — Reconciliação da Onda 6 — onda 6 — Baixa

## Onda 7 — Experiência de uso e consistência

- [ ] 247 — Componente único de estado de erro de carga — onda 7 — Média
- [ ] 248 — Revisar os estados vazios para não induzirem ação errada — onda 7 — Média
- [ ] 249 — Mensagem única para falha de rede — onda 7 — Baixa
- [ ] 250 — Conferir os outros contadores do menu pelo mesmo padrão do badge quebrado — onda 7 — Média
- [ ] 251 — Registrar o padrão de estados no documento de estrutura de página — onda 7 — Baixa
- [ ] 252 — Rodar a verificação de acessibilidade no resto do front — onda 7 — Média
- [ ] 253 — Gate que exige armadilha de foco em modal próprio — onda 7 — Baixa — APROVAÇÃO
- [ ] 254 — Componente único de rótulo "dado simulado" — onda 7 — Média
- [ ] 255 — Aplicar o selo de dado simulado — primeiro lote — onda 7 — Média
- [ ] 256 — Aplicar o selo de dado simulado — segundo lote — onda 7 — Baixa
- [ ] 257 — Mesma formatação de moeda no aplicativo e no PDF — onda 7 — Média
- [ ] 258 — Alinhar as dicas de status de cotação ao mapa de transições corrigido — onda 7 — Baixa
- [ ] 259 — Corrigir a chave do Supabase publicada em `.env.example` — onda 7 — Média
- [ ] 260 — Documentar as 10 variáveis `VITE_*` que ninguém declarou — onda 7 — Média
- [ ] 261 — Estender o gate de inventário de segredos a `import.meta.env` — onda 7 — Média — APROVAÇÃO
- [ ] 262 — Remover `scripts/check-env.mjs`, que é código morto e pede a variável errada — onda 7 — Baixa
- [ ] 263 — Corrigir a contagem de edge functions do gerador de contexto — onda 7 — Baixa
- [ ] 264 — Fazer o snapshot de edge functions do banco voltar a ser gerado — onda 7 — Média — APROVAÇÃO
- [ ] 265 — Corrigir a flag `protegida` do gerador de rotas — onda 7 — Média
- [ ] 266 — Resolver `ItemsListEditor`, código morto no caminho do dinheiro — onda 7 — Baixa
- [ ] 267 — Índice dos documentos de investigação produzidos por este plano — onda 7 — Baixa
- [ ] 268 — Reconciliação da Onda 7 — onda 7 — Baixa

## Onda 8 — Higiene: código morto, CI e observabilidade

- [ ] 269 — Confirmar a orfandade dos 17 componentes antes de remover qualquer um — onda 8 — Baixa
- [ ] 270 — Remover os componentes-sombra de nome duplicado — onda 8 — Média
- [ ] 271 — Resolver `ProductPersonalizationManager` (790 linhas) — onda 8 — Média
- [ ] 272 — Resolver `GlobalSearch` (481 linhas) — onda 8 — Média
- [ ] 273 — Resolver `TechniqueCard` (557 linhas) e os componentes de simulador órfãos — onda 8 — Baixa
- [ ] 274 — Resolver `DiscountApprovalQueue` (351 linhas) — onda 8 — Média
- [ ] 275 — Resolver os órfãos restantes da lista — onda 8 — Baixa
- [ ] 276 — Gate que avisa quando nasce componente órfão — onda 8 — Baixa — APROVAÇÃO
- [ ] 277 — Fazer a ausência do DSN do Sentry ser audível — onda 8 — Média
- [ ] 278 — Confirmar se o DSN do Sentry está configurado em produção — onda 8 — Média
- [ ] 279 — Verificar que o alerta chega a alguém — onda 8 — Média — APROVAÇÃO
- [ ] 280 — Descobrir por que `smoke_tests_monthly` nunca executou — onda 8 — Média
- [ ] 281 — Corrigir ou remover `smoke_tests_monthly` — onda 8 — Média — APROVAÇÃO
- [ ] 282 — Decidir o destino do mecanismo de `webhook_outbox` — onda 8 — Baixa — APROVAÇÃO
- [ ] 283 — Decidir o destino dos 7 cron jobs inativos — onda 8 — Baixa — APROVAÇÃO
- [ ] 284 — Verificar a idade dos dados das matviews que ninguém atualiza — onda 8 — Média
- [ ] 285 — Acompanhar a PR do gate E40 até o fim — onda 8 — Alta
- [ ] 286 — Fazer o gate de drift distinguir diferença real de diferença de formatação — onda 8 — Alta — APROVAÇÃO
- [ ] 287 — Conferir o alinhamento entre `required-checks.json`, o ruleset e o agregador — onda 8 — Alta
- [ ] 288 — Detector de gate declarado e não verificado — onda 8 — Média — APROVAÇÃO
- [ ] 289 — Log estruturado com `request_id` nas edge functions que não têm — onda 8 — Média
- [ ] 290 — Verificar se alguém olha o painel de saúde do sistema — onda 8 — Média
- [ ] 291 — Escrever o SLO do fluxo de cotação com base no que já é medido — onda 8 — Média — APROVAÇÃO
- [ ] 292 — Medir o atrito real do gate de recibo de migration — onda 8 — Alta
- [ ] 293 — Propor ao dono o recorte do gate de recibo — onda 8 — Alta — APROVAÇÃO
- [ ] 294 — Aplicar o recorte do gate de recibo — onda 8 — Alta — APROVAÇÃO
- [ ] 295 — Resolver as PRs de recibo acumuladas — onda 8 — Alta — APROVAÇÃO
- [ ] 296 — Rotina de rotação de segredos com data — onda 8 — Média — APROVAÇÃO
- [ ] 297 — Registrar no `AGENTS.md` os gates criados por este plano — onda 8 — Média — APROVAÇÃO
- [ ] 298 — Fechar no `PENDENCIAS.md` o que este plano resolveu — onda 8 — Baixa
- [ ] 299 — Conferir que todo achado Crítico e Alto tem etapa concluída — onda 8 — Alta
- [ ] 300 — Reauditar as camadas que esta auditoria não cobriu — onda 8 — Alta


---

## Anotações (problema novo encontrado no caminho)

> Regra 4 das instruções: problema novo **não** é corrigido na hora. Anote aqui, com `arquivo:linha`, e siga.

| Data | Etapa em que apareceu | O que é | arquivo:linha |
|---|---|---|---|
| 2026-11-24 | 005 (pós-merge do #4053) | O `select` anon das áreas de gravação pedia `production_days`, coluna que não existe na projeção de `v_print_area_techniques_public` → PostgREST 400/42703, exceção engolida pelo chamador e as áreas de gravação sumiam da página de produto. Corrigido no #4054 (lista = as 15 colunas da view, teste de igualdade estrita) e travado no #4055 (constante única `PRINT_AREA_PUBLIC_COLUMNS`, compartilhada com o hook que ainda usava `select('*')` e tomava 401) | `src/lib/print-area-columns.ts`, `src/lib/fetch-print-areas.ts`, `src/hooks/simulation/usePrintAreas.ts`, `src/lib/__tests__/fetch-print-areas.anonSelect.test.ts` |

---

## Etapas bloqueadas

| Etapa | Motivo | Quem destrava |
|---|---|---|
| 143 | A gravação já usa o helper e expõe `saveError`, mas `useSimulatorPreferences`/`useSimulation` não têm nenhum consumidor em `src/` (só a barrel `src/hooks/simulation/index.ts`). Não existe tela para exibir o erro, e o status de sincronização nunca apareceu na UI. | Dono: decidir entre remover o código morto ou criar a tela do simulador que consuma o hook |

---

## Evidências

> Cole aqui a saída do comando, da consulta ou do request de cada etapa concluída. Uma entrada por etapa.

### Etapa 071
```
grep -rn "dispatcher-auth" supabase/functions/ --include='*.ts'
- 27 importadores: 26 usam authorizeCron (sem rank de papel) ou constantTimeEqual
- Apenas webhook-dispatcher (minRole:supervisor) e connections-auto-test usam o modulo com rank
- connections-auto-test usa authorizeCron, nao authorizeDispatcher -> sem minRole, sem negacao de admin
- So webhook-dispatcher usava o rank e negava admin -> corrigido pela etapa 069
- Nenhum fluxo de negocio adicional negado a admin encontrado
```
### Etapa 186
```
novo: src/hooks/quotes/quoteCacheInvalidation.ts
QUOTE_DEPENDENT_QUERY_KEYS = [['quotes'], ['quote-item-counts'],
  ['my-discount-requests-widget'], ['seller-discount-limits']]
invalidateQuoteCaches(queryClient) -> Promise.all(prefixos.map(invalidateQueries))

src/hooks/quotes/useQuotes.ts: 6 ocorrencias de
  queryClient.invalidateQueries({ queryKey: ['quotes'] })
substituidas por invalidateQuoteCaches(queryClient)

teste: src/hooks/quotes/__tests__/quoteCacheInvalidation.test.ts
  2 passed — trava a lista dos 4 prefixos e que invalidar cobre todos
```
### Etapa 187
```
documento: docs/qa/querykeys-sem-invalidacao.md (331 linhas, gerado por varredura)
chaves literais distintas: 270
ocorrencia unica (candidatas): 201
  com escrita no cliente numa das tabelas lidas: 44
  sem escrita no cliente: 157
compartilhadas (>1 ocorrencia): 69
nenhuma das 44 candidatas foi alterada: a coluna e co-ocorrencia de tabela,
nao prova de bug (ressalva registrada no documento)
```
### Etapa 194
```
widgets do painel: quote-item-counts, my-discount-requests-widget,
  seller-discount-limits, quotes
antes: useQuotes.ts invalidava apenas ['quotes'] -> widgets ficavam obsoletos
depois: os 4 prefixos sao invalidados juntos pelo helper da etapa 186
o prefixo ['quotes'] cobre por prefixo as variantes ['quotes', ...]
(ex.: ['quotes','viewed-map']), entao a invalidação do painel e completa
```
### Etapa 203
```
src/pages/quotes/quotes-dashboard/useQuotesDashboard.ts
+ clientsError: string | null no retorno do hook
+ logger.error com contexto: { table: 'companies', is_customer: true, limit: 200 }
  e a mensagem do erro, antes de degradar para a lista vazia
consumidores: QuotesDashboardPage.tsx:54 e o mock de
  __tests__/QuotesDashboardPage.pdfDisabled.test.tsx
```
### Etapa NNN
```
(saída)
```

### Etapa 141
```
Arquivo novo: src/lib/profile-preferences.ts (fila de escrita por contexto + merge com
releitura de conferência e ate 4 tentativas).
$ npx vitest run src/lib/__tests__/profile-preferences.test.ts
Test Files  1 passed (1) | Tests  4 passed (4)   (5 execucoes seguidas, sem flake)
```

### Etapa 142
```
src/hooks/products/useCatalogPreferences.ts
- mutationFn passou a chamar mergeProfilePreferences(user.id, { catalog: prefs }) em vez de
  gravar o objeto inteiro.
- onSuccess acrescenta invalidateQueries(['catalog-preferences', user?.id]) (antes faltava).
- efeito de hidratacao guardado por hydratedFromCloudRef: o valor da nuvem so sobrescreve
  estado/localStorage na primeira hidratacao, entao um refetch nao reverte mais a escolha.
$ npx tsc -p tsconfig.app.json --noEmit  ->  exit 0
```

### Etapa 144
```
src/stores/useBadgeVisibilityStore.ts: os dois pontos (toggleBadges e setBadgesEnabled)
passaram a chamar mergeProfilePreferences(userId, { badge_visibility: newRouteSettings }).
O `syncError` que a UI ja consome (IntelligenceBadges) continua sendo preenchido no catch.
$ npx vitest run src/stores/__tests__/useBadgeVisibilityStore.test.ts  -> ver rodape
```

### Etapa 145
```
src/components/expert/chat/useExpertChat.ts: handleToggleAutoPlayTts grava
mergeProfilePreferences(user.id, { flow_autoplay_tts: next }). O `catch {}` vazio virou
`catch (err)` com logger.warn e contexto (o chat continua funcionando).
```

### Etapa 146
```
$ npx vitest run src/lib/__tests__/profile-preferences.test.ts
  ok duas abas gravando chaves diferentes preservam as duas (ACH-039)
  ok nao grava quando as chaves pedidas ja tem o valor atual
  ok preserva chaves que o hook chamador nao conhece
  ok propaga o erro da gravacao em vez de engolir
Revertendo o helper para gravacao do objeto inteiro, o primeiro caso falha.
```
### Etapa 182
```
TZ=America/Sao_Paulo npx vitest run src/hooks/simulation/__tests__/useTechniquePricingOptions.race.test.tsx
 × mantém a tabela da técnica escolhida quando a resposta anterior chega depois
   → expected [ 2 ] to deeply equal [ 5 ]
 × não deixa a busca anterior apagar as técnicas que vieram depois
   → expected [] to deeply equal [ { value: 5, label: '5 cores' } ]
 Test Files  1 failed (1)
      Tests  2 failed (2)
```
O teste controla a ordem das respostas (a da técnica nova primeiro, a da anterior depois) e falha
hoje mostrando a tabela da técnica antiga no estado — ACH-042 confirmado.

### Etapa 183
```
mesmo comando, depois da correção:
 ✓ mantém a tabela da técnica escolhida quando a resposta anterior chega depois
 ✓ não deixa a busca anterior apagar as técnicas que vieram depois
 Test Files  1 passed (1)
      Tests  2 passed (2)
```
`useTechniquePricingOptions.ts` e `useMultipleTechniquePricing` ganharam token de requisição
(`requestTokenRef`) + `useMountedRef`; só a busca mais recente grava estado. Assinatura dos dois
hooks inalterada. `npx tsc -p tsconfig.app.json --noEmit` → exit 0.

### Etapa 184
```
python3 /tmp/pgv4out/scan184.py
118
preço   15 arquivos · estoque 5 · outras telas 98
```
Documento entregue em `docs/qa/corridas-de-estado.md`, com `arquivo:linha`, coluna de impacto e a
ressalva de que a varredura acha o formato, não confirma a corrida. Dois arquivos foram lidos e
veredictados na hora: `useCustomizationPrice.ts` (só `loading`/`error`, baixo impacto) e
`useStockSelection.ts` (falso positivo — `setState` síncrono).

### Etapa 185
```
TZ=America/Sao_Paulo npx vitest run src/components/products/__tests__/InlinePriceCalculator.race.test.tsx
 antes:  → expected '20|16' to be '20'   (faixas da variante anterior na tela)
 depois: ✓ mostra as faixas da variante selecionada quando a resposta anterior chega depois
 Test Files  1 passed (1)
```
Mesma guarda (token + `useMountedRef`) em `InlinePriceCalculator.tsx`; a busca antiga é descartada
logo após responder a variante, sem chegar a consultar o fornecedor.
`npx eslint` nos 5 arquivos tocados → 0 problemas. `npx tsc -p tsconfig.app.json --noEmit` → exit 0.
`vitest run` dos 5 arquivos relacionados (races + `QuantityCalculator.addToQuote` +
`TechniqueCard` + `useLegacyLintLifecycle`) → 31 passed.

### Bloco 1.A — Etapas 001, 002, 003, 004, 006, 007 (custo exposto ao público)

**Etapa 001 — consumo.** `Promo_Supply_V2/src/hooks/useCatalogoPim.ts` chama a edge function
`external-db-bridge`, que lê `v_compras_catalogo` e `v_compras_precos_faixa`; `v_compras_precos_variante` não
aparece em nenhum consumidor identificado. Mapa completo em `docs/qa/evidencia-compras-views.md`.

**Etapas 002 e 003 — executadas por credencial, não por coluna.** Mascarar `cost_price`/`unit_cost` foi
**rejeitado**, com causa: `unit_cost` é o preço da faixa que vira `valor_unitario` da cotação
(`Promo_Supply_V2/src/pages/gerar-ordem/GerarOrdem.tsx:274`, `pcp.price[i]`) e `supplier_reference` é o código do
fornecedor no pedido. Em vez disso, o grant de `anon` foi revogado nas views de compras e nos elos que a
`20261122200000` abriu — `supabase/migrations/20261124140000_close_anon_cost_surface.sql`, aplicada pelo run
**45414013226** (`isInLedger: true`), recibo na PR #4043.

**Etapa 004 — decisão "revogar".** A view continuava respondendo 401 ao `anon` por causa de
`vw_variant_sale_prices` (`security_invoker=true`). O grant foi revogado junto com os auxiliares
(`variant_supplier_sources`, `markup_configurations`, `suppliers.default_markup_percent`).

**Medição em produção** (chave publishable do bundle, somente `GET ?select=*&limit=1`, 2026-11-24):

```
objeto                                  antes de 2026-11-24   depois
markup_configurations (SELECT)          200                   401
markup_configurations (INSERT/DELETE)   200/204               401/401
v_compras_catalogo                      401 (42501 suppliers) 401
v_compras_precos_faixa                  401                   401
v_compras_precos_variante               401                   401
v_products_public                       200 com dados         200 com dados
v_variant_sale_prices_public            200 com dados         200 com dados
v_tabela_preco_gravacao_oficial_public  200 com dados         200 com dados
categories                              200                   200
```

Nenhuma view pública da loja perdeu acesso e `authenticated` não perdeu SELECT (post-check da migration abortaria
a transação se perdesse). O `external-db-bridge` não usa a chave anônima: as três views de compras já respondiam
401 ao `anon` antes desta rodada — revogar o grant não mudou o caminho de quem consome.

**Etapa 006.** Contrato atualizado em #4008 (`e87db751`): `v_compras_catalogo` e `v_compras_precos_faixa` entraram
em `.security/public-views-columns.json`.

**Etapa 007 — premissa refutada (`[-]`).** `tabela_preco_gravacao_oficial_faixa.preco_unitario` é o preço de
**venda** oficial, público por design desde `20260717173348_*` (policy `..._public_read` para `anon` + view
espelho). O cabeçalho de `20261124140000` registra a rejeição e o motivo; a PR #4009 (mascarar `preco_unitario`)
foi fechada em 2026-11-24 com a mesma evidência. Reforço medido: `public.fn_verify_anon_catalog_grants()`
(`SCHEMA_LIVE.sql:53373`) **exige** `anon SELECT` nessa tabela — a revogação do grant, que era o objetivo
original da etapa, faria a própria verificação de saúde do banco passar a acusar `FALTA anon SELECT`. Detalhe em
`docs/agentes/resgates/2026-11-24-auditoria-branches-restantes.md`.

**Etapa 005 — fechada em #4049, com a medição anterior corrigida.** A PR #4007 trocava o filtro fixo por
`has_table_privilege('anon', c.oid, 'SELECT')` sem allowlist e foi fechada. O bloqueio que ela media estava
**superestimado**: `public` tem 200 objetos (196 views + 4 matviews) e o contrato cobre 10, mas o `anon` lê
**15** — 8 do contrato e 7 fora dele, todos de catálogo e sem coluna de custo depois da `20261124163000`:
`mv_product_compositions`, `v_color_nuances_public`, `v_kit_component_print_areas_public`,
`v_personalization_techniques_public`, `v_print_area_techniques_public`, `v_site_products_public`,
`v_tags_public`. As duas views de compras não entram porque a `20261124140000` revogou o grant delas.
Medição no dump (`SCHEMA_LIVE.sql`, 2026-11-24T00:14:33Z): das 509 linhas `GRANT ... TO "anon"` em `public` do
dump, **16** views/matviews têm SELECT de tabela — as 15 acima mais `vw_variant_sale_prices`, cujo grant caiu
também na `20261124140000` — e **45** são **tabelas**, que não são escopo desta etapa (são a 008).
`ALTER DEFAULT PRIVILEGES ... ON TABLES TO anon` concede apenas `REFERENCES,TRIGGER,MAINTAIN`, **não** SELECT,
logo não existe leitura implícita de view nova — a contagem de 190 vinha de creditar ao `anon` um privilégio
que ele não tem.
Entregue: a descoberta varre todo objeto de `public` (`relkind in ('v','m')`, grant de tabela **ou** de
coluna), `.security/anon-select-allowlist.json` congela as 7 views e suas colunas, o contrato passa a declarar
`anon_select` por view (as duas de compras ficam `false`, então uma re-concessão de grant também falha o gate),
e o passo `E118i` do `deploy-gates.yml` ganhou `SUPABASE_ACCESS_TOKEN` + `--require-live` — antes rodava sem
credencial, caía em `static-pass` e era cego. Testes: `tests/security/public-views-columns.test.ts` e
`tests/scripts/check-public-views-drift.test.mjs` (26 casos), incluindo objeto novo fora do contrato, allowlist
obsoleta, coluna nova legível por anon e re-concessão de grant em view `anon_select=false`.

### Etapa 005 — regressão da lista de colunas do anon (2026-11-24)

> Corrige o que a etapa 005 deixou passar: o gate ficou verde, mas a lista de colunas que o site manda no
> `select` tinha uma coluna fora da projeção da view.

Medição em produção (`https://doufsxqlfjyuvxuezpln.supabase.co`, chave `sb_publishable_*` extraída do
`app-shell-*.js` publicado):

```
GET /rest/v1/v_print_area_techniques_public?select=*&limit=1        -> 200  (15 colunas)
GET /rest/v1/v_print_area_techniques_public?select=...,production_days -> 400 42703
      "column v_print_area_techniques_public.production_days does not exist"
GET /rest/v1/print_area_techniques?select=*&limit=1                 -> 401 42501  (grant por coluna)
GET /rest/v1/print_area_techniques?select=<15 colunas>&limit=1       -> 200
GET /rest/v1/print_area_techniques?select=unit_cost&limit=1          -> 401  (revogação intacta)
```

Causa: `dbInvoke` resolve `print_area_techniques` por `GOLD_READ_ALIASES`
(`src/integrations/supabase/gold-relations.ts:386`) para a view de leitura, e a migration `20261124163000`
deixou a **tabela** com 16 colunas (grant por coluna) e a **view** com 15 — `production_days` só existe na
tabela. Nenhum erro aparecia na tela porque `fetchPrintAreasFromProduct` captura a exceção e devolve `[]`.

Entregue: #4054 (`519b6a367`, lista = 15 colunas da view + teste que exige igualdade estrita e proíbe
`unit_cost`/`production_days`) e #4055 (`9238b3113`, `src/lib/print-area-columns.ts` como fonte única,
consumida por `fetch-print-areas.ts` e por `usePrintAreas.ts`, que passou de `select('*')` para as mesmas 15
colunas). Produção confirmada no bundle servido: `products-filters-panel-BNa6euT4.js` contém
`id,product_id,tabela_preco_id,...,created_at,updated_at` e não contém `production_days` nem `unit_cost`.

### Etapa 008 — medição do grant de tabela ao `anon` (2026-11-24)

> Read-only em produção, sem credencial de serviço: chave `sb_publishable_*` do bundle publicado +
> `Prefer: count=exact` / `Range: 0-0` para ler a contagem real de linhas, não só o status.

```
200 */0     product_fiscal                        (grant existe, RLS devolve 0 linha)
200 */0     product_supply                        (grant existe, RLS devolve 0 linha)
200 */0     system_settings                       (grant existe, RLS devolve 0 linha)
401 42501   suppliers  select=default_markup_percent
401 42501   markup_configurations select=*
401 42501   variant_supplier_sources select=*
401 42501   print_area_techniques select=*        (grant por coluna; unit_cost segue 401)
206 952     tabela_preco_gravacao_oficial_faixa   (preco_unitario por faixa de quantidade)
206 20767   product_variants                      (sku, attributes, stock_quantity, images)
206 16      tecnicas_gravacao                     (codigo, nome, slug, ativo)
206 1007    video_sim_results                      (sup, yid, queue_status, cur_w, cur_h, err)
```

Medição completa do dia (mesmo método, sobre os **61 objetos** que o dump de 23/11 concedia ao `anon`):
**49 respondem** (36 tabelas + 13 views/matviews) e **12 devolvem 401** — as revogações de `20261124140000`
e `20261124163000` pegaram 9 tabelas (`markup_configurations`, `suppliers`, `products`, `print_area_techniques`,
`product_properties`, `product_tags`, `variant_supplier_sources`, `kit_component_print_areas`,
`product_kit_components`) e 3 views (`v_product_properties_public`, `v_product_tags_public`,
`vw_variant_sale_prices`). 45 − 9 = 36: a conta fecha com a linha 41.

Leitura: as quatro com linhas são de catálogo — preço por faixa, variantes e técnicas alimentam a página
pública e a calculadora, então o grant é funcional (é a premissa que a etapa 007 refutou). `video_sim_results`
é resultado de simulação interna e não tem consumidor público conhecido: exposição sem uso.
`product_fiscal`, `product_supply` e `system_settings` hoje devolvem 0 linha por RLS, mas o **grant** existe —
qualquer policy de SELECT futura passa a entregar a tabela inteira ao anônimo. O gate
(`scripts/check-public-views-drift.mjs`, `buildAnonSql`) consultava só `relkind in ('v','m')`, então nenhum
desses oito casos aparecia no CI.

**Corrigido em #4059** (aguardando aprovação, Regra 8): `buildAnonSql` passou a trazer `relkind 'r'`/`'p'` e o
gate compara as tabelas com `.security/anon-tables-baseline.json` — **42 entradas**: 36 medidas por PostgREST
(23 `catalogo-publico` e 13 `interno-grant-herdado`, as que devem ser revogadas depois) mais 6 que só o SQL do
gate enxerga, porque o grant é **por coluna** e o PostgREST devolve 401 em `select=*` (`kit_component_print_areas`,
`print_area_techniques`, `product_kit_components`, `products`, `product_properties`, `product_tags`). Tabela nova
legível por anon **falha** o gate; entrada sem privilégio no banco também falha (revogação obriga limpar a linha).
O congelamento **por coluna** vale para tabela: `products` (`id`, `is_active`, `is_deleted`),
`kit_component_print_areas`, `print_area_techniques` e `product_kit_components` travam a lista medida, então
coluna nova legível por anon falha o gate. `product_properties` e `product_tags` têm grant de **tabela inteira**
(herdado do legado): a entrada trava só o nome, coluna nova já nasce legível — narrowing ou revogação pendente.

### Etapa 008 ? revoga??o executada (2026-11-25)

Migration `20261125120000_revoke_anon_internal_grants_public.sql` (rollback em
`supabase/rollbacks/20261125120000_rollback.sql`) revoga o `SELECT` de `anon` nas **13** tabelas que a
baseline de 24/11 marcou como `interno-grant-herdado`: `collections`, `collection_products`,
`content_articles`, `favorite_item_reactions`, `favorite_items`, `favorite_lists`, `product_ai_content`,
`product_fiscal`, `product_seo`, `product_supply`, `system_kill_switches`, `system_settings` e
`video_sim_results`.

Evid?ncia de que ningu?m perde funcionalidade: 12 das 13 devolvem **0 linha** ao `anon` hoje (RLS sem
policy de SELECT), ent?o o grant era vestigial; a ?nica com linhas vis?veis era `video_sim_results`
(**1007**), resultado de simula??o de v?deo sem consumidor p?blico. O leitor an?nimo de `system_settings`
(`AppBootstrap.tsx`) trata `error` com `logger.error` + `return`, exatamente o mesmo resultado da lista
vazia de hoje. `authenticated` e `service_role` mant?m o grant nas 13 ? o post-check da migration aborta
a transa??o se perderem.

O tripwire `fn_verify_anon_catalog_grants()` virou **v4** na mesma migration: as 12 que estavam na lista
"DEVEM ter anon SELECT" passaram para a lista "N?O podem ter anon SELECT", junto com `system_settings`.
Dry-run em Postgres 17 descart?vel: migration aplica com `exit 0`, revoga 13/13, `authenticated` mant?m
13/13, tripwire v4 sem achado; rollback devolve 13/13 e o tripwire passa a acusar exatamente 13
`VAZAMENTO: anon SELECT em tabela sens?vel`.

Pendente (Regra 8): a migration precisa ser aplicada ao banco de produ??o e, na mesma janela, as 13
entradas devem sair de `.security/anon-tables-baseline.json` ? o gate `E118i --require-live` compara a
baseline com o banco vivo e fica vermelho nos dois estados intermedi?rios.

### Etapa 008 ? preflight bloqueou a aplica??o e a causa foi corrigida (2026-11-25)

O dispatch de `db-apply-migration.yml` com `version=20261125120000` (run `45605544809`) morreu no job
"1. Preflight (read-only)": o gate **E066** de `scripts/preflight-migration-apply.mjs` reprovou
`public.fn_verify_anon_catalog_grants` por `SECURITY DEFINER` com `SET search_path TO 'public'` sem
`pg_temp` ? vetor de shadowing por objeto tempor?rio. O defeito vinha da v3 (a v4 herdou o corpo).

Corrigido na mesma migration, antes de qualquer aplica??o: `SET search_path TO 'public', 'pg_temp'`
(padr?o j? usado em 31 migrations do repo; `pg_temp` por ?ltimo n?o reordena a resolu??o de `public`).
Nenhum DDL chegou ao banco: os jobs "2. Apply", "3. P?s-check" e "4. Recibo" ficaram `skipped`.

Verifica??o desta corre??o: `detectSecurityDefinerWithoutPgTemp` (o detector do pr?prio gate) devolve
`["public.fn_verify_anon_catalog_grants"]` no arquivo da `main` e `[]` no arquivo corrigido; dry-run em
Postgres 17 descart?vel volta a `exit 0` com os dois `NOTICE` (13/13 revogadas, tripwire v4 sem achado).
O sha256 do recibo em `supabase/MIGRATIONS_SYNC_LOG.md` foi atualizado para o do arquivo corrigido.

Complemento (mesma correcao, outra sessao de 2026-11-25): o PR que corrige o arquivo passa a ser
necessario porque o gate "Recibo de migration em MIGRATIONS_SYNC_LOG.md" (E75) rejeita migration
modificada cujo unico recibo diga "pendente" (`pendente_sem_adicao_no_pr`). O recibo da versao foi
para "aguardando_merge" ? mesmo remendo documentado em `PENDENCIAS.md` #47 ? porque o SQL ainda nao
foi aplicado em producao; o job "4. Recibo" volta o status para "aplicada" depois da aplicacao real.