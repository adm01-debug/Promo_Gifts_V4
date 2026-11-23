# 03 · Achados, agrupados por causa raiz

> Auditoria somente-leitura · 2026-11-22/23 · commit `ded84e9` · banco `doufsxqlfjyuvxuezpln`.
> **CONFIRMADO** = li o código que roda, ou rodei o comando/consulta/request e vi a saída.
> **HIPÓTESE — NÃO VERIFICADO** = indício consistente sem prova; o motivo e o que faltou estão no item.
> Um problema com N ocorrências é **um** achado com N locais. Achados de mesma causa raiz ficam sob o mesmo grupo.
> Severidade: **Crítica** = perda/vazamento de dado, falha de segurança, fluxo principal quebrado ·
> **Alta** = função importante falha ou dá resultado errado · **Média** = funciona com defeito ou fragilidade · **Baixa** = acabamento e higiene.

## Contagem

| Severidade | Qtd | Achados |
|---|---|---|
| Crítica | 5 | ACH-001, ACH-002, ACH-006, ACH-012, ACH-084 |
| Alta | 31 | — |
| Média | 45 | — |
| Baixa | 22 | — |
| **Total** | **103** | — |

Confiança: **99 CONFIRMADOS** · 4 com parte em HIPÓTESE (ACH-026, ACH-042, ACH-060, ACH-072).
Causas raiz distintas: **31 grupos**.

---

# GRUPO 1 — Custo de compra e identidade de fornecedor alcançáveis sem login
**Causa raiz:** views novas foram publicadas com `security_invoker=false` e `GRANT SELECT` para `anon`
projetando colunas de custo, enquanto a política escrita do próprio repo manda mascarar custo na
superfície pública. Nenhum gate viu, porque o gate olha uma lista fixa de views (Grupo 2).

### ACH-001 · `v_compras_catalogo` entrega custo de compra e fornecedor ao público — Crítica — CONFIRMADO
**Camada:** banco / API.
**Evidência (EXECUTADO, 2026-11-22):** `GET https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1/v_compras_catalogo?select=*&limit=2`
só com a *publishable key* que vai no bundle de produção → **HTTP 200**:
`{"sku":"95108","supplier_code":"STRICKER","supplier_name":"Spot | Stricker","supplier_reference":"95108-160","cost_price":4.34,"sale_price":9.33,...}`
As colunas da view (`information_schema.columns`): `cost_price, sale_price, suggested_price, ipi_rate, ncm_code, min_order_value, ...`.
Estado no catálogo: `pg_class.reloptions = security_invoker=false`, `has_table_privilege('anon', ..., 'SELECT') = true`.
**Contraprova de que a política do repo é a oposta:** a mesma chave em `v_products_public` devolve `"cost_price":null`
porque `.security/public-views-columns.json` lista `cost_price` em `masked_null`.
**Causa raiz:** `supabase/migrations/20261121163000_v_compras_catalogo.sql` e `20261122180000_restore_definer_views_p06_e_compras.sql`
escolheram `security_invoker=false` + grant a `anon` para fazer a view responder, sem aplicar a máscara de custo que a
superfície pública já exigia.
**Impacto no negócio:** qualquer pessoa, inclusive um concorrente, baixa a tabela de custo de compra do catálogo
inteiro e calcula a margem da empresa produto por produto.

### ACH-002 · `v_compras_precos_faixa` entrega custo por faixa de quantidade ao público — Crítica — CONFIRMADO
**Evidência (EXECUTADO):** `GET /rest/v1/v_compras_precos_faixa?select=*&limit=2` com a publishable key → **HTTP 200**
`{"qty_min":1,"qty_max":1,"unit_cost":150.15,"service_code":"TRS1-02-03","table_code":"TRS1-02",...}`.
`reloptions = security_invoker=false`; `anon` tem SELECT.
**Causa raiz:** idem ACH-001 (`20261121183000_v_compras_precos_faixa.sql`).
**Impacto:** expõe o custo de personalização por faixa — a base da política de preço por volume.

### ACH-003 · `tabela_preco_gravacao_oficial_faixa`: 952 preços unitários legíveis por anônimo — Alta — CONFIRMADO
**Evidência:** grant a `anon` + policy de SELECT com `qual = true`, as duas pontas consultadas no catálogo;
952 linhas com `preco_unitario`.
**Impacto:** tabela oficial de preço de gravação fica pública.

### ACH-004 · Cadeia de `GRANT` aberta ao `anon` para servir views que nenhum arquivo deste repo consome — Média — CONFIRMADO
**Evidência:** `supabase/migrations/20261122200000_fix_cadeia_views_compras_e_compositions.sql:65-68` concede a `anon`
SELECT em `vw_variant_sale_prices`, `variant_supplier_sources`, `markup_configurations` e na coluna
`suppliers.default_markup_percent`. `grep -rn "v_compras" src/ supabase/functions/` → **zero resultado**.
O `COMMENT ON VIEW` de `v_compras_catalogo` justifica a exposição dizendo "`useCatalogoPim.ts` consome esses campos";
`find . -name "useCatalogoPim*"` → **não existe neste repositório** (o consumidor é o app externo "Promo Supply V2").
Medido depois do grant: `markup_configurations` → 200 `[]` (RLS corta as linhas); `vw_variant_sale_prices` e
`variant_supplier_sources` → **401 42501**.
**Impacto:** superfície de API aberta ao público para um consumidor que não vive neste repositório, sem ninguém
no app usando — risco sem benefício local.

---

# GRUPO 2 — Guarda escrita, testada e documentada que não está no caminho de execução
**Causa raiz:** o repo tem muitos gates; vários validam a própria configuração em vez do fato, ou ficam fora
da lista que bloqueia merge. O resultado é verde sem garantia. Este grupo é o que deixou o Grupo 1 chegar à produção.

### ACH-005 · O gate de drift das views públicas é cego para view nova — Alta — CONFIRMADO
**Evidência:** `scripts/check-public-views-drift.mjs:72-81` tem a lista fixa `PUBLIC_VIEWS` (8 views) e a consulta
em `:104-114` filtra `AND c.relname IN (${PUBLIC_VIEWS...})`. A checagem que pegaria uma view nova está em
`:202` — `if (!views[r.relname]) errors.push('view pública no banco sem entrada no contrato')` — e é
**inalcançável**, porque `liveRows` só pode conter views que já estão no contrato.
**Impacto:** criar uma view pública nova com coluna de custo passa verde no CI. Foi exatamente o que aconteceu
com as três `v_compras_*`. Resolver isto é o que impede o Grupo 1 de voltar.

### ACH-006 · CodeQL é declarado check obrigatório, mas não é obrigatório de verdade — Crítica — CONFIRMADO
**Evidência:** `.github/required-checks.json` lista 3 checks; o ruleset real de `main` (MCP `github_get_branch_rules`)
exige **um só**: `[{"context":"Gate Final - Deploy Ready"}]`. `Analyze (javascript-typescript)` mora em `codeql.yml`,
workflow separado, e não entra em nenhum `needs:` do Gate Final. O guarda não pega porque lê só o primeiro item:
`required-checks-guard.yml:75` → `jq '.required_checks[0].name'`. `scripts/check-required-checks.mjs` valida só o
sentido inverso (o check aponta para um job que existe), nunca "este check está required no GitHub".
**Impacto:** PR com vulnerabilidade HIGH/CRITICAL apontada pelo CodeQL pode ser mergeada em produção.

### ACH-007 · `static-checks.yml` roda 10+ gates e nenhum bloqueia merge — Alta — CONFIRMADO
**Evidência:** o job `Static checks (consolidado)` roda `check-no-prod-leak`, `check-select-columns` contra `types.ts`,
`actionlint`+`shellcheck`, detector de ghost required checks e o recibo de migration. Não está em
`.github/required-checks.json`, nem no ruleset, nem em `needs:` de `deploy-ready`.
**Impacto:** regressão apontada por esses gates não trava o merge.

### ACH-008 · A allowlist do gitleaks cega o único gate de segredo que bloqueia — Alta — CONFIRMADO
**Evidência:** `[allowlist] paths` de `.gitleaks.toml` isenta `docs/.*`, `audit/.*`, `tests/.*`, `e2e/.*`, `dist/.*`,
`analise-prs/.*` e `src/.*__tests__.*`. Além disso o gate roda com `--no-git`, então **nunca varre histórico** — o
bloco `commits = [...]` do arquivo é configuração morta para ele.
**Impacto:** segredo colado em `docs/` ou num teste passa verde.

### ACH-009 · `_shared/url-allowlist.ts` é guarda morta: o único importador é o próprio teste — Alta — CONFIRMADO
**Evidência:** o módulo existe e é testado; `webhook-dispatcher` faz POST em URL arbitrária vinda do banco sem
consultar a allowlist. Mitigante medido: `outbound_webhooks` é admin-only (`pg_policies`), logo não é SSRF por
usuário comum.
**Impacto:** a proteção contra destino arbitrário existe no repo e não está no caminho de execução.

### ACH-010 · O DO-block da migration das views valida o privilégio errado e dá falso verde — Alta — CONFIRMADO
**Evidência:** `20261122200000_fix_cadeia_views_compras_e_compositions.sql:90-103` confere
`has_table_privilege('anon', '<view>', 'select')` para cada elo. Isso é verdade (o grant está na view), mas a consulta
real falha mais fundo: medido, `GET /rest/v1/v_compras_precos_variante` → **401 `42501 permission denied for table suppliers`**,
porque `vw_variant_sale_prices` está com `security_invoker=true` e roda como `anon`. O próprio cabeçalho da migration
avisa "security_invoker não cascateia" e a verificação não testa a cadeia.
**Impacto:** a migration foi aplicada (consta em `supabase_migrations.schema_migrations`), o recibo foi dado, e a
view continua respondendo 401. Quem for consertar vai partir de uma premissa falsa.

### ACH-011 · `check-production-harnesses.mjs` não cobre `/__visual/` nem 9 harnesses — Média — CONFIRMADO
**Evidência:** `scripts/check-production-harnesses.mjs:5-15` não inclui `/__visual/`, os 9 harnesses declarados em
`AppRoutes.tsx` nem `OptimizedImageDemo`.
**Mitigante medido:** todas as telas de harness são gated por `import.meta.env.DEV`, então **não há brecha hoje**;
o defeito é a cobertura do gate.
**Impacto:** um harness novo pode chegar à produção sem o gate reclamar.

---

# GRUPO 3 — Segredo vazado no histórico e nunca rotacionado

### ACH-012 · `service_role` em 7 commits do histórico; o gate foi silenciado, a chave não foi rotacionada — Crítica — CONFIRMADO
**Evidência:** `.gitleaks.toml` tem 7 entradas em `commits = [...]` anotadas pelo próprio repo como `[ROTACIONAR]` /
"service_role hardcoded — rotacao pendente E001". `PENDENCIAS.md:1049` (§53.4) registra: "Pendência mais antiga desta
frente, e a única travada em você desde o começo." Nenhum valor foi reproduzido nesta auditoria.
**Causa raiz:** o vazamento foi tratado silenciando o detector (allowlist por commit) em vez de rotacionar a chave.
Histórico git é imutável: a chave continua extraível.
**Impacto:** quem tiver acesso ao repositório — hoje ou um clone antigo — obtém uma credencial que **ignora RLS**
no banco de produção: lê, altera e apaga qualquer dado.
**Precisa de aprovação humana:** sim (rotação de segredo).

---

# GRUPO 4 — Isolamento por empresa inexistente em 6 tabelas (policy tautológica)

### ACH-013 · 23 policies comparam a coluna com ela mesma e são sempre verdadeiras — Alta — CONFIRMADO
**Camada:** banco.
**Evidência (EXECUTADO):** 23 policies em `attribute_definitions`, `attribute_groups`, `material_types`,
`material_variations`, `supplier_attribute_definitions`, `supplier_materials` usam a forma
`organization_id IN (SELECT attribute_definitions.organization_id FROM profiles WHERE profiles.id = auth.uid())`.
A subquery seleciona a coluna **da tabela externa**, não de `profiles` → `X IN (X)` → sempre `true`.
Prova em SQL: a mesma linha de outra organização passa `true` na policy atual e `false` na forma correta.
**Mitigante medido:** existe **1 organização** em produção hoje, então não há vazamento efetivo ainda.
**Impacto:** no dia em que entrar a segunda empresa, atributos e materiais de uma aparecem para a outra.
**Armadilha:** corrigir apontando para `profiles.organization_id` reabre o problema por outro caminho (ACH-017);
o padrão certo no repo é `user_organizations`, como em `products_update`.
**Precisa de aprovação humana:** sim (migration em produção).

---

# GRUPO 5 — Arquivo de cliente alcançável por quem tem o link (ou sem link)

### ACH-014 · PDFs de cotação legíveis por anônimo, sem token nem expiração — Alta — CONFIRMADO
**Evidência:** o código grava em `art-files/quotes/<id>/...` (`QuoteActionHandlers.ts:147-150`,
`QuoteBitrixSync.ts:134-137`) e a policy `art_files_quotes_public_read` dá SELECT a `{public}` para
`name ~~ 'quotes/%'`; `anon` tem grant em `storage.objects` (EXECUTADO). Hoje: 3 PDFs, 1.363 kB.
**Impacto:** proposta comercial com preço e cliente acessível por quem descobrir o caminho.
**Precisa de aprovação humana:** sim (migration de policy).

### ACH-015 · `art_files_auth_read` libera a leitura de todo o bucket a qualquer autenticado — Alta — CONFIRMADO
**Evidência:** a policy de SELECT checa só `bucket_id = 'art-files'`, enquanto INSERT/UPDATE/DELETE do mesmo
conjunto checam `owner = auth.uid()`.
**Impacto:** qualquer conta logada lê arte e proposta de qualquer cliente.
**Precisa de aprovação humana:** sim.

### ACH-016 · `mockup_approval_links` permite ao anônimo listar todo link ativo, com o token — Alta — CONFIRMADO
**Evidência:** `mal_public_select_active` deixa `anon` ler qualquer linha ativa, **incluindo a coluna `public_token`**,
sem checar token, `expires_at` nem `max_uses`. Tabela com **0 linhas** hoje → risco estrutural, não ativo.
O padrão correto existe no repo, em `collections`.
**Precisa de aprovação humana:** sim.

### ACH-017 · `recibos-entrega`: qualquer autenticado insere e altera recibo de qualquer entrega — Alta — CONFIRMADO
**Evidência:** policies de INSERT/UPDATE do bucket sem escopo de pasta/dono.
**Impacto:** prova de entrega adulterável — risco jurídico e de cobrança.
**Precisa de aprovação humana:** sim.

### ACH-018 · `mockup-assets`: policy de leitura é `true` disfarçado — Média — CONFIRMADO
**Evidência:** a condição é `name IS NOT NULL AND length(name) > 0`.

### ACH-019 · Link de PDF gerado com `getPublicUrl` em bucket privado não abre — Baixa — CONFIRMADO
**Evidência:** `QuoteActionHandlers.ts:152`, `QuoteBitrixSync.ts:142`.
**Impacto:** o link da proposta que vai para o Bitrix chega quebrado para o vendedor.

---

# GRUPO 6 — Papel do usuário gravável pelo próprio usuário

### ACH-020 · `profiles.role` e `profiles.organization_id` são autoeditáveis — Média — CONFIRMADO
**Evidência (EXECUTADO):** a policy `profiles_update` só checa `auth.uid() = user_id`; `authenticated` tem grant de
UPDATE nas colunas `role` **e** `organization_id`; nenhum trigger bloqueia. Consumido pela policy de
`webhook_dispatcher_log`, que lê `profiles.role = 'admin'`.
**Por que não é Crítica:** o RBAC real (`has_role`, `is_supervisor_or_above`, edge `manage-users`) lê `user_roles`,
que está bem guardada. O caminho dá acesso a `webhook_dispatcher_log`, não a admin de verdade.
**Precisa de aprovação humana:** sim.

### ACH-021 · `current_user_role()` lê o papel de `user_metadata` do JWT, que o usuário edita — Média — CONFIRMADO
**Evidência:** a função lê `auth.jwt()->'user_metadata'->>'role'`. **Sem consumidor hoje** (0 policies, 0 funções,
front não usa) → é uma mina para a próxima policy que a usar.

---

# GRUPO 7 — Correção aplicada em um helper e não no irmão

### ACH-022 · `admin` não existe no `ROLE_RANK` do dispatcher: as 4 contas admin levam 403 — Alta — CONFIRMADO
**Evidência:** `supabase/functions/_shared/dispatcher-auth.ts:25` define `{agente:1, supervisor:2, dev:3}` e filtra em
`:187`; `webhook-dispatcher/index.ts:117` exige `minRole:"supervisor"`. Censo de `user_roles` em produção:
`vendedor` 80, `admin` 4, `dev` 2. `admin` cai fora do mapa → rank 0 → 403 `insufficient_role`.
O helper irmão `_shared/authorize.ts:41-46` **já corrigiu este mesmo bug** e documenta o BUGFIX; não foi propagado.
**Impacto:** "Testar webhook" e "Reenviar entrega" só funcionam para 2 contas dev; os administradores levam erro.

---

# GRUPO 8 — Chamada a terceiro sem timeout, sem teto e sem clamp

### ACH-023 · `fetch` a terceiro sem timeout — 5 locais — Alta — CONFIRMADO
**Evidência:** pior caso `webhook-dispatcher/index.ts:162` e `:305` (POST na URL do banco, zero `AbortSignal`).
Também `github-credentials-test:103,161,225`, `product-visual-search:160`, `analyze-logo-colors:81`,
`validate-access:28`. O padrão correto já existe e é usado em `generate-blurhashes:93`.
**Impacto:** terceiro lento pendura a função até o limite da plataforma e consome invocação paga.

### ACH-024 · `backoff_seconds` vindo do banco sem clamp — Média — CONFIRMADO
**Evidência:** `webhook-dispatcher/index.ts:241-243,342,357` — `max_attempts` é clampado, o delay não; o default já
dorme 155 s dentro da função.

### ACH-025 · `analyze-logo-colors`: download sem timeout, sem teto de bytes e conversão caractere a caractere — Média — CONFIRMADO
**Evidência:** `:81`, `:93-96`. Compare com `image-proxy:133-137`, que tem teto.
**Impacto:** imagem grande derruba a função com erro 500/OOM.

### ACH-026 · `validate-access` consulta geolocalização por `http://` em claro, sem timeout — Média — CONFIRMADO (código) / HIPÓTESE (peso na decisão)
**Evidência:** `validate-access:28`; o cliente falha-aberto (comentário em `:117-118`).
**O que faltou:** medir quanto a cidade pesa na decisão final de acesso.

---

# GRUPO 9 — Falha de carga aparece como "não tem nada" (erro engolido)

### ACH-027 · Catálogo principal sem estado de erro — Alta — CONFIRMADO
**Evidência:** `useCatalogState.ts:260-273` ignora `isError` de `useProductsCatalog`; `FiltersPage.tsx:763-782`
mostra "Nenhum produto encontrado". Zero `isError` nos dois arquivos.
**Impacto:** queda do banco ou erro de RLS parece catálogo vazio em `/produtos` e `/filtros` — a tela mais vista do sistema.

### ACH-028 · Coleções: erro de carga vira "nenhuma coleção" com CTA de criar — Alta — CONFIRMADO
**Evidência:** `useCollections.ts:147-151` só loga; o retorno do hook (`:707-726`) não expõe erro;
`CollectionsPage.tsx:391,403` mostra vazio.
**Impacto:** o vendedor pode recriar coleção que já existe.

### ACH-029 · Templates de orçamento: `error` existe e nenhum consumidor usa — Alta — CONFIRMADO
**Evidência:** `useQuoteTemplates.ts:110-111,464-469` expõe `error`; `QuoteTemplatesList.tsx:74-83` e
`AdminTemplatesManager.tsx:34-35` não leem. `fetchAllTemplates` (`:124-134`) nem seta erro.

### ACH-030 · Erro do Postgres devolvido cru ao navegador — ≥12 locais — Média — CONFIRMADO
**Evidência:** `crm-db-bridge:678,736,760,779,803,829,860` (e esta é `verify_jwt=false`), `manage-users:179,199,213,287,330`,
`step-up-verify:183,335`, `external-db-inspect:125,164`, `force-global-logout:71`. Contraria a política escrita em
`_shared/error-response.ts:5`; adoção do helper: **12 de 112 funções**, sem gate de CI.
**Impacto:** nome de tabela, coluna e código de erro do banco vão para o cliente — ajuda quem está sondando.

### ACH-031 · Mesma `queryKey` com duas `queryFn`: erro de RLS aparece como "sem vínculos" — Média — CONFIRMADO
**Evidência:** `['video-variant-links', productId]` em `useProductVideoGallery.ts:102` (engole com `return []`) e
`useVideoVariantLinks.ts:32` (dá throw).

### ACH-032 · Erros engolidos menores — 3 locais — Baixa — CONFIRMADO
`useProductVideoGallery.ts:545-547` (lote de thumbnails sem feedback se todas falharem),
`useQuotesDashboard.ts:60-62`, `useExpertChat.ts:689-691`.

---

# GRUPO 10 — Cache nunca invalidado e dois donos do mesmo estado

### ACH-033 · Limite de desconto do vendedor com dois donos de estado — Alta — CONFIRMADO
**Evidência:** `useSellerDiscountLimits.ts:69,93` guarda em `useState` e busca só no mount;
`SellerDiscountLimitsPanel.tsx:27,84` usa react-query. Nenhum propaga para o outro.
`useQuoteBuilderState.ts:67` consome esse teto.
**Impacto:** o admin reduz o limite de desconto e o vendedor segue negociando com o teto antigo — desconto acima
do novo limite passa sem aprovação. Dinheiro.

### ACH-034 · `['role-permissions']` nunca é invalidada depois de gravar permissões — Alta — CONFIRMADO
**Evidência:** `RolePermissionsPage.tsx:144-178` grava `role_permissions` e só recarrega `useState` local;
a chave `['role-permissions']` (`useRBAC.tsx:96`, `staleTime` 5 min) aparece **uma única vez em todo o `src/`**.
**Impacto:** por até 5 minutos a interface libera ou esconde ações pelo conjunto antigo de permissões.

### ACH-035 · Comentário de kit não aparece: mutation sem invalidate e realtime em tabela não publicada — Alta — CONFIRMADO
**Evidência:** `useKitCollaboration.ts:133,156` (`postComment`/`resolveComment`) sem `invalidateQueries`; o único
refresh é a assinatura realtime de `kit_comments` em `:115-118`, e `kit_comments` **não está** em
`pg_publication_tables` de `supabase_realtime` (EXECUTADO). O fallback só cobre `CHANNEL_ERROR`.
**Impacto:** quem comenta não vê o próprio comentário até recarregar a página. 0 testes cobrem.

### ACH-036 · `['quote-item-counts']` nunca invalidada — Média — CONFIRMADO
**Evidência:** `useQuoteItemCounts.ts:15`; as mutations de orçamento invalidam só `['quotes']`.
**Impacto:** a coluna "itens" da lista de orçamentos fica errada por até 60 s (`QuotesConfigurableList.tsx:324`).

### ACH-037 · `['pending-discount-approvals-count']`: 3 observers com 3 `queryFn` diferentes — Média — CONFIRMADO
**Evidência:** HEAD em `AdminUsuariosPage.tsx:80` contra GET nos outros dois, com opções divergentes.
**Impacto:** reverte, conforme a ordem de montagem, as correções já documentadas como BUG-DAR-ABORT e BUG-SIDEBAR-ABORT.

### ACH-038 · Preferências do usuário revertem sozinhas — Média — CONFIRMADO
**Evidência:** `useCatalogPreferences.ts:78-102` + `:104-140` e `useSimulatorPreferences.ts:70-99` + `:102-120` —
mutation sem invalidate e efeito com dependência `[cloudPreferences]` sobrescreve estado e `localStorage` no refetch.
No simulador o erro só vai para o log.

### ACH-039 · `profiles.preferences`: 5 read-modify-write sem controle de concorrência — Média — CONFIRMADO
**Evidência:** `useCatalogPreferences.ts:82-98`, `useSimulatorPreferences.ts:75-92`, `useBadgeVisibilityStore.ts:55-70`
e `:97-112`, `useExpertChat.ts:671-685`.
**Impacto:** duas abas salvando preferências diferentes — uma sobrescreve a outra (lost update).

### ACH-040 · Hooks duplicados compartilhando `queryKey` — Baixa — CONFIRMADO
`src/hooks/useReplenishments.ts` (legado) × `src/hooks/products/useReplenishments.ts`;
`usePersonalizationData.ts` × `usePersonalizationManager.ts` (9 chaves iguais);
`src/hooks/useDevGate.ts` × `src/hooks/admin/useDevGate.ts`.

### ACH-041 · Widgets do painel de orçamentos não invalidados — Baixa — CONFIRMADO
`staleTime` de 30–60 s faz o dado se curar sozinho; é fragilidade, não defeito visível.

---

# GRUPO 11 — Condição de corrida que troca o preço exibido

### ACH-042 · Tabela de preço da técnica anterior sobrescreve a atual — Alta — CONFIRMADO (código) / HIPÓTESE (frequência)
**Evidência:** `useTechniquePricingOptions.ts:57-81` e `:150-179` (consumidor `useSimulation.ts:191`) — sem
`AbortController` nem token de requisição; `setTables`/`setAllTables` grava o resultado que chegar por último.
**Impacto:** o orçamento pode sair com o preço de personalização de outra técnica.
**O que faltou:** medir com que frequência acontece na prática (exigiria instrumentar a UI).

### ACH-043 · Faixas de desconto por quantidade da variante errada — Alta — CONFIRMADO
**Evidência:** `InlinePriceCalculator.tsx:113-163` — dois `await` sequenciais e `setPriceTiers` sem nenhuma guarda
(zero `useRef`/`cancel`/`abort` no arquivo).

---

# GRUPO 12 — Realtime prometido em tabela que não está publicada

### ACH-044 · 4 assinaturas realtime em tabelas fora da publicação — Média — CONFIRMADO (EXECUTADO)
**Evidência:** `pg_publication_tables` de `supabase_realtime` **não** contém `kit_comments`, `custom_kits`,
`integration_credentials`, `product_views`, `search_analytics`, `user_notification_preferences`.
Assinam essas tabelas: `useCustomKitsRealtime.ts:24-36`, `CredentialsChangedBanner.tsx:40-43`,
`RealtimeBadge.tsx:21,26`, `notificationPreferenceService.ts:66-72`.
**Impacto:** a interface promete atualização ao vivo que nunca chega; o usuário acha que está vendo o estado atual.

### ACH-045 · Canal realtime sem sufixo único — Média — CONFIRMADO
**Evidência:** `MyDiscountRequestsWidget.tsx:88` usa `dar-seller-${userId}`, único arquivo fora do padrão
BUG-RT-CHANNEL que os outros 4 adotaram.

---

# GRUPO 13 — Fluxo do cliente final quebrado

### ACH-046 · "Imprimir" da revista pública joga o cliente na tela de login — Alta — CONFIRMADO
**Evidência:** `PublicMagazineView.tsx:346` abre `/magazine/print?token=…`; essa rota está em
`tools-routes.tsx:129-136`, dentro do `ProtectedRoute` (`AppRoutes.tsx:175-183`), e `ProtectedRoute.tsx:41-48`
redireciona anônimo para `/auth`.
**Impacto:** o cliente que recebeu o link do catálogo não consegue imprimir — e é um fluxo de venda.

### ACH-047 · Badge de aprovações de desconto nunca aparece no menu lateral — Média — CONFIRMADO
**Evidência:** `SidebarReorganized.tsx:482` compara `href === '/admin/usuarios?tab=discounts'`, href que não existe
(o item em `:252` é `/admin/usuarios`); a query roda com `refetchInterval: 30_000` (`:453-473`) sem consumidor.
O contador do cabeçalho (`Header.tsx:268`) continua funcionando.
**Impacto:** aprovação de desconto fica sem aviso no menu e a consulta roda a cada 30 s sem destino.

### ACH-048 · Botão "Exportar Relatório" sem handler — Média — CONFIRMADO
**Evidência:** `SupplierComparisonModal.tsx:287`, usado em `/produto/:id` via `ProductDetail.tsx:426`.

---

# GRUPO 14 — A matriz de acesso mostrada na tela não corresponde às rotas reais

### ACH-049 · `/admin/rbac-rotas` tem 5 entradas fantasma e omite 25 rotas reais — Média — CONFIRMADO
**Evidência:** `route-matrix.ts:58,66,74,82` (marcadas `public`) e `:424` não existem em `admin-routes.tsx`;
25 rotas reais de `admin-routes.tsx` não constam da matriz.
**Impacto:** quem decide permissão olhando essa tela decide pelo mapa errado.

---

# GRUPO 15 — Dado fabricado exibido sem rótulo

### ACH-050 · Sugestões de produto inventadas sem rótulo no BI — Média — CONFIRMADO
**Evidência:** `ClientHealthHero.tsx:119-127` usa `trends`/`affinity` sem checar `isMock`, enquanto os componentes
irmãos rotulam (`IndustryTrendingProducts.tsx:124`). O fallback mock está em `useIndustryTrends.ts:116-121` e
`useClientAffinity.ts:177-182`; a tela é montada em `BusinessIntelligencePage.tsx:271`.
**Impacto:** o vendedor leva para o cliente uma recomendação que o sistema inventou achando que é dado.

### ACH-051 · Nomes de fornecedor fictícios no gráfico de estoque — Baixa — CONFIRMADO
**Evidência:** `stock-chart-utils.ts:93-99,177-189` via `useStockChartData.ts:59,77`.
**Mitigante:** há badge "dados simulados" em `StockHistoryChart.tsx:127`.

---

# GRUPO 16 — Trabalho repetido e consulta por item (N+1)

### ACH-052 · `/orcamentos/templates` roda as mesmas 3 consultas 3 vezes — Média — CONFIRMADO
**Evidência:** 3 instâncias de `useQuoteTemplates` (página `:37`, lista `:83`, admin `:35`); o hook é
`useState`+`useEffect`, sem deduplicação de react-query.

### ACH-053 · Listagem de produtos do admin carregada duas vezes por abertura — Média — CONFIRMADO
**Evidência:** `useProductsManager.ts:313-316` e `:323-331` — dois efeitos rodam no mount e o debounce de 400 ms
não tem o que cancelar.

### ACH-054 · N+1 de escrita em 3 telas administrativas — Média — CONFIRMADO
**Evidência:** `GroupInheritance.tsx:64-116` (3 laços aninhados, 1 INSERT por combinação),
`RolePermissionsPage.tsx:142-172`, `ProductPersonalizationManager.tsx:177-183`.

### ACH-055 · Item duplicado no kit por efeito sem deduplicação — Média — CONFIRMADO
**Evidência:** `useKitBuilderPageState.ts:261-286` chama `addItem` sem ref de dedupe nem cancelamento; o efeito
irmão `:218-223` usa `hydratedKitIdRef` e faz certo.

---

# GRUPO 17 — Superfície de leitura larga demais

### ACH-056 · ~140 policies de SELECT com `USING (true)` — Média — CONFIRMADO (EXECUTADO)
**Evidência:** contagem no catálogo: **138** policies de SELECT com `qual = true` para `anon`/`authenticated`/`public`.
Fora do catálogo de referência, destacam-se `stock_daily_summary` (3.270.690 linhas, 1,1 GB),
`xbz_upload_mapping` (42.015), `product_properties` (34.177), `suppliers` e `supplier_import_batches`.
**Medido:** `stock_daily_summary` responde **401** ao `anon` — a exposição é a qualquer conta logada, não ao público.
**Impacto:** qualquer conta logada pode baixar 3,2 milhões de linhas de histórico de estoque.

### ACH-057 · 477 objetos visíveis no GraphQL para usuário logado e 65 para anônimo — Média — CONFIRMADO (EXECUTADO)
**Evidência:** advisors do projeto, `pg_graphql_authenticated_table_exposed` 477 e `pg_graphql_anon_table_exposed` 65,
incluindo matviews de schemas internos (`internal.mv_product_leaf_category`, `analytics.categories_tree_visual`).
**Impacto:** o esquema inteiro é descobrível; facilita enumerar o que existe antes de tentar ler.

### ACH-058 · 10 views em `public` rodam como owner e ignoram RLS — Média — CONFIRMADO (EXECUTADO)
**Evidência:** advisor nível ERROR, 10 ocorrências. 8 são decisão documentada e medida nas migrations
(`20261122180000`); as 2 de compras são o Grupo 1.
**Impacto:** sem dono, a lista cresce sozinha — já cresceu de 8 para 10 em dois dias.

### ACH-059 · `magazine-reader-state-write` aceita fingerprint livre na chave do upsert — Baixa — CONFIRMADO
**Evidência:** `magazine-reader-state-write:18,25,59,79-86` — sem teto por revista; estimativa do subagente
~432 mil linhas/dia por IP.

---

# GRUPO 18 — Observabilidade cega no ponto em que mais importa

### ACH-060 · Perder o DSN do Sentry desliga todo o alerta em silêncio — Média — HIPÓTESE, NÃO VERIFICADO
**Evidência:** `src/lib/sentry.ts:161-173` — DSN ausente → `return false` calado; DSN malformado → `warn` **só em DEV**.
**O que faltou:** ler as variáveis de ambiente da Vercel para confirmar que o DSN está lá (ACH-062 bloqueia).
**Impacto se confirmado:** todo o alerta descrito em `docs/OBSERVABILITY.md` §52-63 morre sem um único sinal.

### ACH-061 · `smoke_tests_monthly` está ativo e nunca executou — Média — CONFIRMADO (EXECUTADO)
**Evidência:** `cron.job` jobid 32, `active = true`, `schedule '0 3 1 * *'`, e nenhuma linha em
`cron.job_run_details` — `last_run` nulo.
**Impacto:** a rede de proteção mensal não existe; ninguém foi avisado.

### ACH-062 · O MCP da Vercel não tem acesso ao projeto — Média — CONFIRMADO (EXECUTADO)
**Evidência:** `get_project` → 404, `list_deployments` → 403, `list_projects(team)` → `[]`; vê o time `juca1` e nenhum projeto.
**Impacto:** nenhum agente consegue diagnosticar deploy, variável de ambiente ou log pela Vercel; nesta auditoria
o estado do deploy teve de ser obtido por via indireta, pelo GitHub.

### ACH-063 · O teste de integração da única ponte autorizada ao CRM externo não bloqueia — Média — CONFIRMADO
**Evidência:** `edge-functions-deno-tests.yml:192-201` com `continue-on-error: true` por desenho desde `f84444c1e`.

### ACH-064 · `_shared/cors-snapshot.json` defasado e inutilizável para auditoria — Baixa — CONFIRMADO
**Evidência:** `generated_at 2026-11-08`, total 110 contra 112, falta `mockup-assistant`, e grava
`allowOrigin: null` nos 105 registros `shared` → o painel `cors-audit` não mostra quem responde `*`. Sem gate de CI.

---

# GRUPO 19 — Configuração de ambiente sem dono

### ACH-065 · 10 variáveis `import.meta.env.*` usadas e não documentadas, e a chave do Supabase documentada é a errada — Média — CONFIRMADO
**Evidência:** `VITE_TURNSTILE_SITE_KEY`, `VITE_PUBLIC_URL`, `VITE_GOTRUE_CAPTCHA`, `VITE_AUTH_DEBUG`,
`VITE_SHOW_DEV_INFRA_MESSAGES`, `VITE_USE_CANVAS_STARFIELD`, `VITE_NAV_METRICS_SAMPLE_RATE`,
`VITE_ENABLE_NAV_METRICS` e 2 outras não estão em `.env.example` nem em `docs/ci/SEGREDOS.md`.
Pior: `.env.example` publica `VITE_SUPABASE_ANON_KEY`, mas `client.ts:30-31` lê primeiro
`VITE_SUPABASE_PUBLISHABLE_KEY`. O gate 1.14 tem ponto cego **declarado**:
`check-secrets-inventory.mjs:5-6,42` varre só `secrets.*`/`vars.*` em workflows e `Deno.env.get()` em edges;
`import.meta.env` em `src/` não é varrido por ninguém.
**Impacto:** quem for montar um ambiente novo erra a chave e o Turnstile/captcha não sobe.

### ACH-066 · `scripts/check-env.mjs` é código morto e exige a variável de fallback — Baixa — CONFIRMADO
**Evidência:** não referenciado em workflow nem em `package.json`; exige `VITE_SUPABASE_ANON_KEY`.

---

# GRUPO 20 — Atrito de processo que trava o repositório

### ACH-067 · O gate de recibo de migration trava toda PR do repositório 24 h após cada migration — Alta — CONFIRMADO
**Evidência:** step bloqueante no job `lint-typecheck` (`deploy-gates.yml:390-395`); `PENDENCIAS.md` §53.5 registra
7 PRs de recibo abertas em conflito entre si. Os dois últimos commits de `main` são justamente recibos
(`#3991`, `#3992`) — o ciclo está vivo.
**Impacto:** correção de bug em produção fica parada por um gate de documentação.
**Precisa de aprovação humana:** sim (mexe em workflow).

### ACH-068 · `main` ficou vermelha 6 vezes no mesmo dia pelo gate E40 de drift — Alta — CONFIRMADO (EXECUTADO)
**Evidência:** Deploy Gates vermelho às 13:21, 13:22, 13:31, 14:04, 17:40 e 18:19 UTC de 2026-11-22, sempre por
`R_SCHEMA_DRIFT: failure` → `Gate E40 Schema Drift`, com os outros gates verdes. Mais 3 falhas de
`schema-snapshot-export` e 2 do workflow E15 ("CONCURRENTLY detectado: não é transacional e conflita com `psql -1`").
**A última corrida em `main` (18:33, run 45055736919) está verde.** A PR aberta `#3993` é a tentativa de corrigir
a normalização desse gate.
**Ressalva:** a janela observada cobriu ~10,5 h (12:54Z→23:32Z), não 24 h.

---

# GRUPO 21 — Infraestrutura dormente

### ACH-069 · `webhook_outbox` vazia com o processador desligado — Baixa — CONFIRMADO (EXECUTADO)
**Evidência:** `select count(*) from webhook_outbox` → 0; `cron.job` jobid 202 `process-webhook-outbox`,
`active = false`.
**Impacto:** se alguém religar a escrita no outbox, nada sai e ninguém é avisado.

### ACH-070 · 7 cron jobs cadastrados e inativos — Baixa — CONFIRMADO (EXECUTADO)
`refresh-analytics-mv-product-intelligence`, `process-webhook-outbox`, `image-dimensions-backfill`,
`refresh-analytics-mv-stock-velocity`, `monitor-connections`, `pipeline-classify-categories`, `dispatcher-log-sync`.
**Verificado:** nenhum deixou backlog órfão.

### ACH-071 · `e2e-cleanup` ativo em produção, apagando `quotes`/`quote_items` — Média — CONFIRMADO
**Evidência:** v309, `verify_jwt=false`. **Barreiras medidas:** token com comparação em tempo constante (`:150`) e
allowlist fail-closed (`:235`). O próprio código alerta sobre dessincronia entre allowlist e segredo (`:252-253`).
**Impacto:** função de limpeza destrutiva exposta em produção; hoje protegida, mas uma dessincronia de configuração
a abre.

### ACH-072 · 50 edge functions marcadas como órfãs e ativas em produção — Média — HIPÓTESE, NÃO VERIFICADO
**Evidência:** o deploy das 50 está CONFIRMADO; o "órfã de verdade" é hipótese, porque o gerador só vê chamada
estática. **Falso positivo comprovado:** `quote-sync-promo-champions` consta como órfã e é chamada em
`src/pages/quotes/quote-view/QuotePromoChampionsSync.ts:45`.
Entre as marcadas estão `mcp-keys-issue/revoke/rotate`, `bulk-random-passwords`, `force-global-logout`,
`block-ip-temporarily`, `secure-upload`, `verify-2fa-token`, `verify-email`.
**O que faltou:** confirmar caso a caso quem chama (pode haver cliente MCP externo).

---

# GRUPO 22 — Código morto e órfão com peso

### ACH-073 · 17 componentes órfãos acima de 150 linhas, ~5.000 linhas sem nenhum import — Baixa — CONFIRMADO
**Maiores:** `admin/ProductPersonalizationManager.tsx` (790), `simulator/TechniqueCard.tsx` (557),
`search/GlobalSearch.tsx` (481), `admin/DiscountApprovalQueue.tsx` (351), `goals/SalesGoalsCard.tsx` (301).
**Agravante:** três são nomes duplicados que sombreiam o arquivo realmente usado — quem edita pode editar o errado.

### ACH-074 · 5 rotas sem nenhum ponto de entrada na interface — Baixa — CONFIRMADO
`/ferramentas/cobertura` (dashboard de negócio, `tools-routes.tsx:95`), `/admin/badges-inteligencia`,
`/admin/qa/sidebar`, `/admin/storage-test`, `/external-db-test`.

### ACH-075 · `/orcamentos/lista` duplica `/orcamentos` sem nenhum link — Baixa — CONFIRMADO
`quote-routes.tsx:22,24`.

### ACH-076 · `art_file_attachments.user_id` sem FK, embora 4 policies dependam dela — Baixa — CONFIRMADO
**Verificado:** 0 órfãos hoje.

---

# GRUPO 23 — Acessibilidade e foco

### ACH-077 · Modais próprios sem armadilha de foco — Média — CONFIRMADO
**Evidência:** `KitOnboardingTour.tsx:73-77` (sem foco inicial, sem Escape) e `VoiceSearchOverlay.tsx:219-220`.
O repo já tem `useFocusTrap`, sem uso nesses dois.

### ACH-078 · 6 botões de ícone sem nome acessível — Baixa — CONFIRMADO
`BIAiCopilot.tsx:252`, `ClientSelector.tsx:127`, `FavoritesClientPicker.tsx:81`,
`NotificationDrawer.tsx:467,505`, `SupplierComparisonModal.tsx:287` (o tooltip gera `aria-describedby`, que não é nome).

---

# GRUPO 24 — O inventário gerado não é confiável como evidência

### ACH-079 · `rotas.json` marca rota protegida como não protegida — Média — CONFIRMADO
**Evidência:** 22 rotas `/admin/*` constam `protegida: false` (ex.: `/admin/permissoes`, `/admin/roles`), e todas
estão dentro de `<Route element={<AdminRoute />}>` (`admin-routes.tsx:66`) ou `<DevRoute>` (`:118`). O gerador só
detecta wrapper direto, não rota de layout.
**Impacto:** um agente que planeje por esse JSON "conserta" proteção que já existe, ou conclui que há falha de
segurança onde não há. Nesta auditoria o falso positivo foi descartado lendo o código.

### ACH-080 · `edge-functions.json`: falso positivo de órfã e de "chamada sem pasta" — Média — CONFIRMADO
**Evidência:** `chamadas_sem_pasta: ["receive-quote-sync"]` é na verdade a URL de **outro** projeto Supabase
(`supabase/functions/quote-sync-promo-champions/index.ts:16`); e ver ACH-072 para a flag `orfa`.

### ACH-081 · A contagem de edge functions do repo está 1 acima da realidade — Baixa — CONFIRMADO
**Evidência:** o gerador conta `supabase/functions/tests/` como edge (total 112), `build-cors-snapshot.mjs:7` a
exclui, e produção tem 111.

### ACH-082 · `docs/contexto/supabase/edge-functions.md` está vazio — Média — CONFIRMADO
**Evidência:** o arquivo traz "Management API desabilitada: defina SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN".
**Impacto:** a fonte declarada como dona do fato "o que está deployado" não responde; só o MCP responde.

### ACH-083 · Regra de negócio documentada já resolvida continua marcada como risco — Baixa — CONFIRMADO (EXECUTADO)
**Evidência:** `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` §6 diz "criar partições de
`supplier_products_raw_history` para 2027 antes de 2026-12-15 — pipeline para em 2027-01-01". Consulta a
`pg_inherits`: **`p2027_01` a `p2027_12` existem**.
**Impacto:** risco falso na lista do dono rouba atenção do risco real.

---

# GRUPO 31 — Lints de desempenho do banco ainda abertos

### ACH-103 · 11 lints de severidade baixa no catálogo do banco — Baixa — CONFIRMADO (EXECUTADO)
**Camada:** banco.
**Evidência:** coleta de lints do projeto (`docs/contexto/supabase/lints.md`, gerada do catálogo vivo, e advisors do MCP):
- **FK sem índice (2):** `business_calendar.business_calendar_created_by_fkey` (coluna `created_by`) e
  `freight_settings.freight_settings_updated_by_fkey` (coluna `updated_by`) — join e `DELETE`/`UPDATE` na tabela pai
  fazem varredura.
- **`auth.uid()`/`auth.jwt()` sem subselect em policy (7):** `order_items_insert`, `order_items_select`,
  `order_items_update`, `orders_insert`, `orders_select`, `orders_update` e a policy
  `storage.objects."Users can upload their own mockup assets"` — a função é reavaliada **por linha** em vez de uma vez.
- **Extensão no schema `public` (2):** `pg_repack` e `pgstattuple` (o recomendado é o schema `extensions`).
**Impacto no negócio:** consultas de pedido ficam mais lentas conforme a tabela cresce; nada quebra hoje.

---

## Verificado e LIMPO (contraprova, para não re-auditar)

Registro do que foi checado e **não** tem defeito, com o método:

| Verificação | Resultado | Marca |
|---|---|---|
| Tabelas em `public` sem RLS | 0 de 417 | EXECUTADO |
| Funções `SECURITY DEFINER` sem `search_path` fixo | 0 | EXECUTADO |
| Vulnerabilidade de dependência | `npm audit` (com e sem dev): **0** em todas as severidades | EXECUTADO |
| Segredo comitado hoje | gitleaks v8.21.2, comando do CI: 30 achados, **todos** em `graphify-out/cache/stat-index.json`, gitignored e ausente do checkout do CI | EXECUTADO |
| Segredo em edge function | 0 em todos os `.ts` de `supabase/functions/` | EXECUTADO |
| Chave privada no bundle do front | nenhuma; só **nomes** de secret em telas admin | EXECUTADO |
| Papel vindo de `localStorage` ou do JWT no front | não ocorre | RASTREADO |
| Injeção SQL | `fn_cron_safe_run(p_sql)` só `postgres`/`service_role`; `comparar_precos_spot` usa `USING $1` | EXECUTADO |
| Injeção PostgREST | `useGlobalSearch.ts:489` remove `% _ \ ( ) , . *` do termo | RASTREADO |
| IDOR em cotação/pedido | `quotes_select_scope` + `can_access_quote()` cobrem o id vindo da URL | RASTREADO |
| Registro órfão | 0 em 6 relações (`quote_items`→`quotes`, `order_items`→`orders`, `product_variants`/`product_images`→`products`, `profiles`→`auth.users`, `art_file_attachments`→`auth.users`) | EXECUTADO |
| `select('*')` sem paginação em tabela grande | nenhum; `login_attempts`/`bot_detection_log` usam `limit(2000)`, `range()` ou `head:true` | EXECUTADO |
| `scripts/check-select-columns.mjs` | exit 0 | EXECUTADO |
| `scripts/check-timer-cleanup.mjs` | exit 0, nenhum `setTimeout` sem `clearTimeout`; 0 `setInterval` sem clear | EXECUTADO |
| Atualização otimista sem rollback | nenhum caso; `useSellerCarts.ts:319,357` tem `cancelQueries` + rollback | RASTREADO |
| Rota `/admin/*` sem proteção | **nenhuma** | RASTREADO |
| Harness de teste acessível em produção | nenhum; todos gated por `import.meta.env.DEV` | RASTREADO |
| Edge repo × produção | 0 divergência de `verify_jwt`; 0 função em produção ausente do repo | EXECUTADO |
| Chamada do front para edge inexistente | 0 | EXECUTADO |
| Idempotência de webhook | índices `crm_callback_events_idempotency_uk`, `idx_webhook_idempotency` e os únicos de `magazine_reader_state`/`magazine_public_reactions` presentes; dispatcher usa claim atômico via RPC | EXECUTADO |
| Assinatura de webhook | HMAC-SHA256 por endpoint em `webhook-inbound` (bypass interno removido, `:203-204`); `x-api-key` em tempo constante + janela anti-replay de 7 dias em `receive-crm-callback` | RASTREADO |
| `dispatcher-auth.ts` sem segredo configurado | fail-closed (401), comparação em tempo constante (`:227-244,282-299`) | RASTREADO |
| As 36 edges `verify_jwt=false` | todas validam antes de mutar (JWT+`user_roles`, dispatcher-secret, cron-secret do vault, ou escopo MCP com hash em `mcp_api_keys`) | RASTREADO |
| Envenenar `login_attempts` para trancar conta alheia | não funciona: `fn_check_login_allowed` conta por par (email, ip) e só zera com `verified=true` decidido na edge | EXECUTADO |
| Permissão de workflow | 0 `write-all`, 0 `pull_request_target`, 0 `if: false`; 100% das actions pinadas em SHA de 40 caracteres; `default_workflow_permissions: read`; `allowed_actions: selected` | EXECUTADO |
| 26 `continue-on-error: true` | todos deliberados ou em workflow advisory, exceto ACH-063 | RASTREADO |
| Saúde do pg_cron | `fails_7d = 0` em 100% dos jobs ativos | EXECUTADO |
| Deploy de produção | deployment 7983148308, `state=success`, sha `ded84e97` = HEAD de `main`; sem divergência de branch | EXECUTADO |
| Tipos e lint | `qa:typecheck` exit 0; `lint` exit 0 (0 erros, 0 warnings vs baseline) | EXECUTADO |
| Validação só no navegador nos fluxos de orçamento | nenhum caso: `quote_items` tem CHECKs (`quantity > 0`, `subtotal >= 0`, `unit_price >= 0`) e trigger `fn_deferred_quote_discount_integrity`; `seller_discount_limits` tem CHECK 0–100 | RASTREADO |
| Falsos positivos de RLS descartados | `true` em `kit_collaborators`/`notification_preferences` é RESTRICTIVE (no-op); policies com alias `uo.` usam `user_organizations` legitimamente; `product_customization_prices` (28k) e `product_relationships` (154k) têm policy `public` mas **sem grant a anon** | EXECUTADO |

---

# GRUPO 25 — Custo de personalização perdido no caminho de volta do template
**Causa raiz:** o objeto de personalização tem dois formatos (um com `unit_cost`/`setup_cost`, outro com
`total_cost`) e cada ponta usa um. Quem monta não grava o campo que quem soma lê.

### ACH-084 · Aplicar um template zera o custo de personalização da cotação — Crítica — CONFIRMADO
**Camada:** regra de negócio.
**Evidência:** `src/lib/quotes/applyTemplateToQuote.ts:100-107` monta `personalizations[]` só com `unit_cost` e
`setup_cost`, nunca `total_cost`. `src/hooks/quotes/quoteHelpers.ts:59-62` soma **só** `p.total_cost` → resultado 0.
A lista de templates, porém, mostra o custo certo: `src/lib/quotes/templateTotal.ts:52-62` calcula
`unitCost * qty + setupCost`.
**Por que os testes não pegam:** os 27 testes dos dois arquivos passam porque cada lado é testado isolado;
ninguém testa o round-trip (EXECUTADO: `npx vitest run` nos dois arquivos, 27 passed).
**Impacto no negócio:** o vendedor aplica um template, a tela mostra o custo da gravação na lista e a cotação
sai **sem** esse custo. É perda de receita direta, silenciosa, em cada orçamento feito por template.

### ACH-085 · Duas calculadoras mortas de preço de personalização, com regras diferentes da que roda — Média — CONFIRMADO
**Evidência:** `src/lib/personalization/calculators.ts:22-87` e `usePrecoCalculation.ts:136-178`, ambas sem consumidor,
divergem da RPC que realmente calcula; e as duas caem na primeira faixa em silêncio quando a quantidade está abaixo do MOQ.
**Impacto:** quem for mexer em preço de gravação tem três fontes e nenhuma indicação de qual vale.

---

# GRUPO 26 — A máquina de estados da cotação só existe no navegador
**Causa raiz:** o mapa de transições válidas está em TypeScript; o banco só valida o conjunto de valores, não o par
(de → para). E parte do front escreve status sem passar pela própria guarda.

### ACH-086 · Transição proibida pela regra é aceita pelo banco — Alta — CONFIRMADO
**Evidência:** a função `fn_quotes_enforce_immutability` em produção faz
`IF OLD.status NOT IN ('approved','converted') THEN RETURN NEW` — ou seja, qualquer outra transição passa;
`valid_quote_status` é apenas um CHECK de valores permitidos. `src/lib/quote-status-config.ts:120-131` proíbe
`cancelled → approved` e `rejected → approved`, e o banco aceita os dois.
**4 caminhos de escrita que não chamam a guarda do front:** `useDiscountApproval.ts:209`,
`DiscountApprovalQueue.tsx:162`, `DiscountRequestDetailPage.tsx:107`, `QuoteViewPage.tsx:321`.
**Impacto:** cotação cancelada ou recusada pode voltar a aprovada por outro caminho (CRM, SQL, outra tela) e virar pedido.
**Precisa de aprovação humana:** sim (migration).

### ACH-087 · O próprio front fura a sua SSOT de status — Média — CONFIRMADO
**Evidência:** `useQuoteBuilderState.ts:736-746` libera `pending → pending_approval`, par que não está no mapa de
`quote-status-config.ts`.

### ACH-088 · `assertDiscountApprovalTransition` diz cobrir todos os pontos de escrita e tem 1 call site — Baixa — CONFIRMADO

### ACH-089 · `discount_approval_requests` nunca chega a `expired` — Média — CONFIRMADO (EXECUTADO)
**Evidência:** nenhum dos 168 cron jobs faz essa transição (varredura de `cron.job`).
**Impacto:** a fila do admin mostra "Aprovado" para uma aprovação que o banco já trata como vencida.

---

# GRUPO 27 — Banco e front discordam sobre quanto é o total da cotação
**Causa raiz:** o mesmo total é calculado em pelo menos quatro lugares (front por linha, front agregado, trigger no
banco, caminho do kit) com definições diferentes de subtotal, ordem de desconto e momento do arredondamento.

### ACH-090 · O trigger grava o estado que o front chama de "corrupção" — Alta — CONFIRMADO
**Evidência:** o front mantém **só um** campo de desconto não-zero (`quoteHelpers.ts:128-144`);
`fn_quotes_recalc_subtotal_from_items` grava `discount_amount` **mantendo** `discount_percent`.
Resultado: o alerta de `useQuoteBuilderState.helpers.ts:541-543` dispara em toda cotação com desconto percentual.
**Impacto:** alarme falso constante em cotação normal — e o time para de confiar no alarme.
**Precisa de aprovação humana:** sim (migration).

### ACH-091 · No PDF, a soma das linhas não fecha com o subtotal impresso — Média — CONFIRMADO (EXECUTADO)
**Evidência:** markup aplicado por linha (`quoteMarkup.ts:40-50`) contra markup agregado (`quoteHelpers.ts:88`).
Prova numérica executada: unitário 1,01 × 7 com markup de 13% → **7,98** somando linhas e **7,99** no subtotal persistido.
**Impacto:** o cliente recebe uma proposta em que as contas não fecham por centavos. Desgasta a credibilidade.

### ACH-092 · Kit → cotação usa outra definição de subtotal — Média — CONFIRMADO
**Evidência:** `price-calculator.ts:95-96` calcula subtotal **sem** personalização; o trigger do banco regrava
**incluindo** personalização.

### ACH-093 · Desconto por item: duas funções do banco discordam — Média — CONFIRMADO
**Evidência:** `fn_quote_items_calc_subtotal` subtrai `discount_amount`; `fn_quotes_recalc_subtotal_from_items` ignora.
**Hoje latente** porque o front grava 0; fura por CRM ou SQL.

### ACH-094 · `shipping_cost` é persistido mesmo quando não entra no total — Baixa — CONFIRMADO
**Evidência:** três tratamentos distintos do mesmo campo nos caminhos de cálculo.

---

# GRUPO 28 — Regra de negócio documentada e sem implementação
**Causa raiz:** o documento manual de regras (prioridade máxima no repo) descreve limites que nenhuma camada aplica.

### ACH-095 · A quantidade mínima de pedido não é validada no orçamento — Alta — CONFIRMADO
**Evidência:** a validação existe no kit (`useKitMinQuantityValidation.ts:19-57`, via `vw_products_min_quantity`),
e há **zero** validação em `src/hooks/quotes`, `src/components/quotes` e `src/pages/quotes`; no banco só
`CHECK (quantity > 0)`.
**Contraria:** §5 do documento manual ("MOQ abaixo do mínimo do fornecedor: não possível; sistema deve exibir erro
antes do envio do orçamento").
**Impacto:** o orçamento sai com quantidade que o fornecedor não aceita; a quebra aparece na produção, com o cliente já comprometido.

### ACH-096 · A alçada intermediária de desconto não existe — Alta — CONFIRMADO
**Evidência:** `approval_required_above` (default 10%, documentado no `COMMENT` da própria tabela) **não é lido**
por front, edge nem SQL. Os degraus de 15% e 30% do documento manual também não existem em nenhuma camada.
**Impacto:** desconto que deveria subir para o gerente de vendas não sobe. Dinheiro.

### ACH-097 · Contrato de cotação de frete exportado, testado e sem nenhum consumidor — Média — CONFIRMADO
**Evidência:** `quoteContract.ts` e `rankQuotes.ts` (frete Loggi) não têm consumidor e não há edge function
correspondente; o frete é digitado à mão em `QuoteBuilderPage.tsx:655`.
**Impacto:** a automação de frete foi construída e nunca ligada; cada cotação depende de o vendedor acertar o valor.

---

# GRUPO 29 — Cotação aprovada é imutável no UPDATE e deletável

### ACH-098 · Cotação aprovada pode ser apagada, com os itens em cascata — Alta — CONFIRMADO
**Evidência:** `fn_quotes_enforce_immutability` é `BEFORE UPDATE` **apenas**; a policy `org_admins_delete_quotes`
permite DELETE e não há trigger `BEFORE DELETE`; `quote_items` está em `ON DELETE CASCADE`.
A interface expõe exclusão em massa (`useQuotesListPage.ts:164,244`).
**Impacto:** um clique em massa apaga cotação aprovada e todo o histórico de itens, sem volta.
**Precisa de aprovação humana:** sim (migration).

---

# Complementos aos grupos 22 e 24

### ACH-099 · `ItemsListEditor.tsx` não é renderizado em lugar nenhum — Baixa — CONFIRMADO
Código morto no caminho do dinheiro (edição de itens de cotação).

### ACH-100 · `docs/QUOTE_NUMBERING.md` afirma risco de duplicidade que a produção já resolveu — Baixa — CONFIRMADO
**Evidência:** o documento e a telemetria `trigger_strategy: 'max_plus_one_no_lock'` descrevem risco de número de
cotação duplicado; produção tem advisory lock e a constraint `quotes_quote_number_key UNIQUE`.
**Impacto:** mesma distorção do ACH-083 — risco falso competindo com risco real.

---

# GRUPO 30 — A suíte de testes está vermelha em `main` e o CI não vê
**Causa raiz:** o único gate de teste que bloqueia merge roda uma lista fixa de arquivos, não a suíte. O resto da
suíte pode apodrecer sem alarme — e apodreceu.

### ACH-101 · 26 testes falhando em `main`, em 7 arquivos — Alta — CONFIRMADO (EXECUTADO)
**Camada:** testes.
**Evidência:** `npm test` (`TZ=America/Sao_Paulo vitest run`) no commit `ded84e9`:
`Test Files  7 failed | 1731 passed | 131 skipped (1869)` · `Tests  26 failed | 32841 passed | 1 expected fail | 1143 skipped | 24 todo (34035)` · `EXIT=1`.
Arquivos que falham: `tests/components/pages/KitBuilderPage.test.tsx` (14 casos),
`tests/components/kit-builder/FreightEstimator.test.tsx`, `tests/components/kit-builder/KitBuilderComponents.test.tsx`,
`tests/components/kit-builder/KitSummary.weight.test.tsx`, `tests/components/QuoteCommentsSection.test.tsx`,
`tests/pages/legacy-KitBuilder.partial-preservation.test.tsx`, `tests/scripts/drift-baseline.test.mjs`.
**Causa raiz medida nos arquivos de kit-builder:**
`tests/components/kit-builder/FreightEstimator.test.tsx:10` importa `@/components/kit-builder/FreightEstimator` e
`Failed to resolve import ... Does the file exist?`. Confirmado em disco: `src/components/kit-builder/FreightEstimator.tsx`
**não existe** (`src/components/kit-builder/KitSummary.tsx` existe). O componente foi removido ou renomeado e os
testes ficaram para trás.
**`tests/scripts/drift-baseline.test.mjs`** falha com `expected [] to deeply equal [ "20261114014500_p09_reconcile_ledger_schema_migrations.sql" ]` —
é exatamente o assunto da PR aberta `#3993` (gate E40), ou seja, falha conhecida e em tratamento.
**Impacto no negócio:** o kit-builder — um dos fluxos de montagem de produto — está sem rede de teste funcionando, e
ninguém é avisado. Quem mexer nele vai achar que está coberto.

### ACH-102 · O gate de teste obrigatório cobre ~70 de 1.869 arquivos de teste — Alta — CONFIRMADO
**Camada:** CI.
**Evidência:** `deploy-gates.yml`, job `Gate 2 - Unit Tests`, roda `npm run test:ci-core`. Esse script
(`package.json`) é uma **lista fixa** de cerca de 70 arquivos. O job está em `needs:` de
`Gate Final - Deploy Ready` (o único check required de `main`), portanto é o único teste que bloqueia merge.
`ci.yml:198` e `:250` rodam `npx vitest run --coverage` (suíte inteira), mas `ci.yml` não entra no `needs:` do
`deploy-ready` nem no ruleset — logo não bloqueia (mesma causa do ACH-007).
**Causa raiz:** a lista fixa foi criada para o gate ser rápido e virou o contrato de qualidade do repo.
**Impacto:** 1.799 arquivos de teste podem quebrar sem travar nenhum merge. O ACH-101 é a prova de que isso
acontece na prática.

---

## Lacunas desta auditoria (o que ficou sem prova)

| Item | Motivo |
|---|---|
| Round-trip real de cotação (INSERT/UPDATE) | Escreveria em produção. Os achados "o banco sobrescreve o front" vêm do **corpo das funções em produção**, não de ida-e-volta medida. |
| Corpo das RPCs `create_quote_transactional`, `update_quote_transactional`, `create_kit_quote_transactional` | Não lido; podem conter regra que muda a leitura dos grupos 26 e 27. |
| Aprovação pública de cotação por token | Não testada. |
| DSN do Sentry em produção | O MCP da Vercel não tem acesso (ACH-062). |
| Frequência real das corridas de ACH-042 e ACH-043 | Exigiria instrumentar a interface. |
| Quem chama, caso a caso, as 50 edges marcadas órfãs | Volume; a flag do gerador tem falso positivo comprovado. |
