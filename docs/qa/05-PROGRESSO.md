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
- [ ] 019 — Provar a tautologia e escrever o teste que falha antes da correção — onda 1 — Alta
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
- [ ] 040 — Confirmação explícita na exclusão em massa de cotações — onda 1 — Média
- [ ] 041 — Alarme quando a allowlist e o segredo do `e2e-cleanup` saem de sincronia — onda 1 — Média
- [ ] 042 — Restringir o alcance do `e2e-cleanup` a dados marcados como de teste — onda 1 — Média
- [ ] 043 — Ligar `_shared/url-allowlist.ts` no `webhook-dispatcher` — onda 1 — Alta
- [ ] 044 — Ligar o bloqueio da allowlist de URL depois do período de observação — onda 1 — Alta
- [ ] 045 — Exigir auth antes de responder `op=ping` no `crm-db-bridge` — onda 1 — Média
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
- [ ] 057 — Parar de devolver erro cru do Postgres na `crm-db-bridge` — onda 1 — Média
- [ ] 058 — Adotar o helper de erro em `manage-users` — onda 1 — Média
- [ ] 059 — Adotar o helper de erro em `step-up-verify` e `external-db-inspect` — onda 1 — Média
- [ ] 060 — Adotar o helper de erro em `force-global-logout` — onda 1 — Baixa
- [ ] 061 — Gate que exige o helper de erro em edge function nova — onda 1 — Média — APROVAÇÃO
- [ ] 062 — Varredura de segredo em `recovery/`, fixtures e artefatos versionados — onda 1 — Média — APROVAÇÃO

## Onda 2 — Fluxos principais quebrados

- [ ] 063 — Teste que prova o round-trip do template perdendo o custo — onda 2 — Crítica
- [ ] 064 — Gravar `total_cost` ao aplicar o template — onda 2 — Crítica
- [ ] 065 — Verificar as cotações já criadas por template sem custo de personalização — onda 2 — Alta — APROVAÇÃO
- [ ] 066 — Unificar a fórmula de custo de personalização num único módulo — onda 2 — Média
- [ ] 067 — Mover `/magazine/print` para fora do `ProtectedRoute` — onda 2 — Alta
- [ ] 068 — Teste de rota garantindo que a impressão pública não exige login — onda 2 — Média
- [ ] 069 — Acrescentar `admin` ao `ROLE_RANK` do `dispatcher-auth` — onda 2 — Alta
- [ ] 070 — Gate que compara os mapas de papel dos dois helpers de autorização — onda 2 — Média
- [ ] 071 — Conferir se outros consumidores de `dispatcher-auth` estavam negando admin — onda 2 — Média
- [ ] 072 — Expor o erro do catálogo em `useCatalogState` — onda 2 — Alta
- [ ] 073 — Estado de erro em `/produtos` e `/filtros` — onda 2 — Alta
- [ ] 074 — Estado de erro na vitrine inicial — onda 2 — Alta
- [ ] 075 — Teste que impede erro voltar a parecer vazio no catálogo — onda 2 — Média
- [ ] 076 — Propagar o erro de carga em `useCollections` — onda 2 — Alta
- [ ] 077 — Estado de erro em `/colecoes`, separado do vazio com CTA — onda 2 — Alta
- [ ] 078 — Fazer os consumidores de `useQuoteTemplates` lerem o `error` — onda 2 — Alta
- [ ] 079 — Fazer `fetchAllTemplates` registrar o erro em vez de engolir — onda 2 — Média
- [ ] 080 — Teste que prova o teto de desconto ficando desatualizado — onda 2 — Alta
- [ ] 081 — Migrar `useSellerDiscountLimits` para react-query — onda 2 — Alta
- [ ] 082 — Invalidar o limite de desconto depois de alterá-lo — onda 2 — Alta
- [ ] 083 — Reforçar o teto de desconto no banco, não só no front — onda 2 — Alta — APROVAÇÃO
- [ ] 084 — Invalidar `['role-permissions']` depois de gravar permissões de papel — onda 2 — Alta
- [ ] 085 — Substituir o `useState` local de `RolePermissionsPage` pela query compartilhada — onda 2 — Média
- [ ] 086 — Invalidar a lista de comentários depois de comentar no kit — onda 2 — Alta
- [ ] 087 — Decidir e registrar se `kit_comments` entra no realtime — onda 2 — Média — APROVAÇÃO
- [ ] 088 — Fazer o fallback da colaboração cobrir também a ausência de publicação — onda 2 — Média
- [ ] 089 — Corrigir a comparação de `href` que impede o badge de aprovações aparecer — onda 2 — Média
- [ ] 090 — Desligar o `refetchInterval` órfão do badge — onda 2 — Baixa
- [ ] 091 — Dar ação ao botão "Exportar Relatório" da comparação de fornecedores — onda 2 — Média
- [ ] 092 — Varredura dirigida de "erro virando vazio" nas demais telas de fluxo principal — onda 2 — Média

## Onda 3 — Integridade de dados, regras de negócio e a rede de teste

- [ ] 093 — Teste que prova o banco aceitando transição proibida de status — onda 3 — Alta
- [ ] 094 — Trigger de transição de status válida em `quotes` — onda 3 — Alta — APROVAÇÃO
- [ ] 095 — Um único caminho de escrita de status no front — onda 3 — Alta
- [ ] 096 — `useDiscountApproval` passa a escrever status pelo caminho único — onda 3 — Alta
- [ ] 097 — `DiscountApprovalQueue` passa a escrever status pelo caminho único — onda 3 — Alta
- [ ] 098 — `DiscountRequestDetailPage` passa a escrever status pelo caminho único — onda 3 — Alta
- [ ] 099 — `QuoteViewPage` passa a escrever status pelo caminho único — onda 3 — Alta
- [ ] 100 — Remover o bypass `pending → pending_approval` do builder — onda 3 — Média
- [ ] 101 — Fazer `assertDiscountApprovalTransition` valer em todos os pontos de escrita — onda 3 — Baixa
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
- [ ] 141 — Helper único para atualizar `profiles.preferences` sem perder escrita — onda 3 — Média — APROVAÇÃO
- [ ] 142 — `useCatalogPreferences` passa a usar o helper — onda 3 — Média
- [ ] 143 — `useSimulatorPreferences` passa a usar o helper e deixa o erro visível — onda 3 — Média
- [ ] 144 — `useBadgeVisibilityStore` passa a usar o helper nos dois pontos — onda 3 — Média
- [ ] 145 — `useExpertChat` passa a usar o helper — onda 3 — Baixa
- [ ] 146 — Teste de escrita perdida em `profiles.preferences` — onda 3 — Média
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
|  |  |  |

---

## Evidências

> Cole aqui a saída do comando, da consulta ou do request de cada etapa concluída. Uma entrada por etapa.

### Etapa NNN
```
(saída)
```
