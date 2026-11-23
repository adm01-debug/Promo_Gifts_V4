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

- [ ] 001 — Medir quem realmente consome as três views `v_compras_*` antes de mexer nelas — onda 1 — Crítica
- [ ] 002 — Mascarar `cost_price` e os campos de fornecedor em `v_compras_catalogo` — onda 1 — Crítica — APROVAÇÃO
- [ ] 003 — Mascarar `unit_cost` em `v_compras_precos_faixa` — onda 1 — Crítica — APROVAÇÃO
- [ ] 004 — Decidir o destino de `v_compras_precos_variante`, que hoje responde 401 ao `anon` — onda 1 — Alta — APROVAÇÃO
- [ ] 005 — Fazer o gate de views públicas descobrir view nova em vez de conferir uma lista fixa — onda 1 — Alta — APROVAÇÃO
- [ ] 006 — Registrar as três views de compras no contrato de views públicas — onda 1 — Alta
- [ ] 007 — Fechar `tabela_preco_gravacao_oficial_faixa` ao anônimo — onda 1 — Alta — APROVAÇÃO
- [ ] 008 — Fazer o gate de drift rodar também sobre matviews e sobre grants de tabela ao `anon` — onda 1 — Média — APROVAÇÃO
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
- [ ] 103 — Teste que prova a soma das linhas não fechando com o subtotal — onda 3 — Média
- [ ] 104 — Decidir e documentar onde o arredondamento acontece — onda 3 — Média — APROVAÇÃO
- [ ] 105 — Alinhar o cálculo agregado à decisão de arredondamento — onda 3 — Média
- [ ] 106 — Garantir que o PDF usa o mesmo total do banco — onda 3 — Média
- [ ] 107 — Teste de centavo no PDF da proposta — onda 3 — Média
- [ ] 108 — Teste que prova o trigger gravando desconto em dois campos ao mesmo tempo — onda 3 — Alta
- [ ] 109 — Alinhar `fn_quotes_recalc_subtotal_from_items` ao invariante de um campo de desconto — onda 3 — Alta — APROVAÇÃO
- [ ] 110 — Confirmar que o alarme de corrupção parou de disparar em cotação normal — onda 3 — Média
- [ ] 111 — Alinhar as duas funções do banco quanto ao desconto por item — onda 3 — Média — APROVAÇÃO
- [ ] 112 — Constraint que impede desconto percentual e absoluto preenchidos juntos — onda 3 — Média — APROVAÇÃO
- [ ] 113 — Teste do subtotal no caminho kit → cotação — onda 3 — Média
- [ ] 114 — Alinhar `price-calculator.ts` à definição de subtotal do banco — onda 3 — Média
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
- [ ] 131 — Registrar a linha de base da suíte completa de testes — onda 3 — Alta
- [ ] 132 — Resolver os testes de kit-builder que importam um componente que não existe — onda 3 — Alta
- [ ] 133 — Corrigir os 14 casos de `KitBuilderPage.test.tsx` — onda 3 — Alta
- [ ] 134 — Corrigir `KitSummary.weight.test.tsx` — onda 3 — Alta
- [ ] 135 — Corrigir `QuoteCommentsSection.test.tsx` — onda 3 — Alta
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
- [ ] 182 — Teste que prova a corrida na tabela de preço da técnica — onda 5 — Alta
- [ ] 183 — Cancelar a busca anterior em `useTechniquePricingOptions` — onda 5 — Alta
- [ ] 184 — Varredura do padrão "dois `await` e um `setState` sem guarda" — onda 5 — Média
- [ ] 185 — Teste e correção da corrida em `InlinePriceCalculator` — onda 5 — Alta
- [ ] 186 — Invalidar `['quote-item-counts']` nas mutations de orçamento — onda 5 — Média
- [ ] 187 — Varredura de `queryKey` definida e nunca invalidada — onda 5 — Média
- [ ] 188 — Unificar a contagem de aprovações de desconto num único hook — onda 5 — Média
- [ ] 189 — Teste que impede a chave de contagem voltar a ter duas implementações — onda 5 — Baixa
- [ ] 190 — Unificar a `queryFn` de `['video-variant-links']` — onda 5 — Média
- [ ] 191 — Resolver a duplicação de `useReplenishments` — onda 5 — Baixa
- [ ] 192 — Resolver a duplicação entre `usePersonalizationData` e `usePersonalizationManager` — onda 5 — Média
- [ ] 193 — Resolver a duplicação de `useDevGate` — onda 5 — Baixa
- [ ] 194 — Invalidar os widgets do painel de orçamentos — onda 5 — Baixa
- [ ] 195 — Decidir o destino de `useCustomKitsRealtime` — onda 5 — Média — APROVAÇÃO
- [ ] 196 — Decidir o destino de `CredentialsChangedBanner` — onda 5 — Média — APROVAÇÃO
- [ ] 197 — Decidir o destino de `RealtimeBadge` — onda 5 — Baixa
- [ ] 198 — Decidir o destino da assinatura em `notificationPreferenceService` — onda 5 — Baixa
- [ ] 199 — Gate que compara as assinaturas de realtime com a publicação do banco — onda 5 — Média — APROVAÇÃO
- [ ] 200 — Dar sufixo único ao canal de `MyDiscountRequestsWidget` — onda 5 — Média
- [ ] 201 — Teste e correção do item duplicado no kit — onda 5 — Média
- [ ] 202 — Dar retorno ao lote de thumbnails que falha inteiro — onda 5 — Baixa
- [ ] 203 — Registrar com contexto o erro engolido em `useQuotesDashboard` — onda 5 — Baixa
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
|  |  |  |  |

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
