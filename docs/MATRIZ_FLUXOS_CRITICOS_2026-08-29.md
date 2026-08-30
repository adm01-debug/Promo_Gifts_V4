# Matriz de Fluxos Críticos — v0.2 (2026-08-29)

> **Status: RASCUNHO — aguardando `[VALIDAÇÃO PO]`.** Nenhuma linha desta matriz está aprovada.
> **Etapa do plano:** 001 (P0) de `PLANO_PENDENCIAS_CORRECOES_MELHORIAS_50_ETAPAS_2026-08-29.md`.
> **Base:** `MATRIZ_FLUXOS_CRITICOS_2026-08-26.md` (v0.1) — o detalhamento narrativo por fluxo
> (mapa do caminho, contratos DB/RPC/Edge, rollback e pendências) permanece naquele documento.
> Esta revisão adiciona o formato exigido pela etapa 001
> (`fluxo × persona × owner × criticidade × entrada × sucesso × falha × teste`) e três fluxos
> que a v0.1 não tratava como linhas próprias: **Produto (PDP)**, **Desconto** e **Autenticação**.

## 1. Matriz consolidada

Escala de criticidade: **C0** = falha bloqueia operação comercial ou corrompe dados; **C1** = falha
degrada experiência, mas existe fallback operacional; **C2** = conveniência.

| # | Fluxo | Persona primária | Owner | Crit. | Entrada (trigger) | Sucesso (critério) | Falha (modo esperado) | Teste (evidência) |
|---|---|---|---|---|---|---|---|---|
| 1 | Catálogo (descoberta/listagem) | Vendedor interno | TBD | C0 | `/produtos`, `/filtros`, `/novidades`, `/reposicao` | Lista, filtros, ordenação e paginação determinísticos, sem duplicação ou lacunas | Erro explícito; campos acessórios degradam sem tela vazia silenciosa | `e2e/catalog.spec.ts`, `catalog-exhaustive-validation`, `catalog-resilience`, `products-postgrest-load` |
| 2 | Produto (PDP) | Vendedor interno | TBD | C0 | `/produto/:id` (guard `ValidProductIdRoute`) | Somente ID válido; preço, variante, imagem, categoria e estoque coerentes; handoffs preservam `product_id`, SKU, qtd e preço | ID inválido barrado pelo guard; falha de acessório não vira tela vazia | `e2e/routes/app/produto-detail.spec.ts`, `ValidProductIdRoute.test.tsx` |
| 3 | Busca | Vendedor interno | TBD | C1 | `GlobalSearch` no shell, `/busca-preco`, `/match`, `/raio-x` | Resultados úteis e ranqueados; histórico privado por usuário | Sem IA: degrada explicitamente para busca básica; erro visível | Inventário narrativo na v0.1 §4; **lacuna:** E2E de degradação sem IA |
| 4 | Carrinho | Vendedor interno | TBD | C0 | `/carrinhos`, `/carrinhos/:cartId` | Itens, variantes, qtd e empresa sobrevivem a refresh; mutações otimistas revertem em erro; restauração atômica | Rollback de cache + erro explícito; undo de 8 s respeitado | `e2e/carts-module.spec.ts`, `flows/12-cart-checkout`, `13-carts-delete-undo`, `13b-carts-undo-rpc-atomic` |
| 5 | Orçamento | Vendedor interno | TBD | C0 | `/orcamentos/*` | Save/update atômico (RPC transacional); totais consistentes após refresh; status seguem ciclo aprovado | Conflito concorrente explícito; falha externa (Bitrix etc.) não corrompe registro local | `tests/integration/quote-persistence.test.ts`, `quote-save-atomicity`, `useQuoteConcurrencyGuard.test.ts` |
| 6 | Desconto | Vendedor (solicita) / Supervisor (aprova) | TBD | C0 | Fluxo no quote builder; `/admin/limites-desconto`, `/admin/aprovacoes-desconto/:id` | Desconto acima da alçada vira solicitação; aplicação só após aprovação; correlação exata no audit | Fail-closed: sem aprovação não aplica; solicitação órfã bloqueada | `tests/integration/discountApprovalFlow.test.ts`; migrations `*_discount_approval_*` (esta branch); **lacuna:** E2E da aprovação |
| 7 | Estoque | Vendedor / Compras | TBD | C0 | `/estoque` | Paginação keyset sem duplicar/omitar; núcleo (`products`, `product_variants`) falha explicitamente; enriquecimentos degradados identificados | Tabela acessória ausente gera estado degradado visível, não número falso | `stockFetcher.test.ts`, `useRuptureAlerts.test.tsx`, `e2e/stock-module.spec.ts`, `estoque-exaustivo` |
| 8 | Mockup | Vendedor / Marketing | TBD | C1 | `/mockup-generator`, `/magic-up`, `/mockups/historico` | Preview WYSIWYG; lifecycle coerente entre linha DB e objetos Storage | Falha de IA = erro explícito; nunca mock silencioso no lugar de falha | Inventário narrativo na v0.1 §8; **lacuna:** E2E de lifecycle de exclusão |
| 9 | Magazine | Vendedor / Marketing | Promo Brindes Engineering (v0.1, a confirmar) | C1 | `/magazine*` autenticado; `/revista-publica/:token` público | CRUD/publicação sem perda; token público somente válido/publicado; PDF fiel | Token inválido → 404; estado remoto fora → degrada para local explicitamente | `e2e/magazine/*`, `MagazineEditorPage.hooksOrder.test.tsx`, `useMagazinePublish.test.ts` |
| 10 | Kit | Vendedor interno | TBD | C1 | `/montar-kit`, `/meus-kits` | Save manual e autosave persistem o mesmo kit; handoff kit → orçamento atômico | **Lacuna confirmada (v0.1 §10):** `handleSaveKit` é callback vazio; handoff não atômico pode deixar orçamento parcial — exige fail-explicit até correção | `e2e/routes/app/kit-builder.spec.ts`, `useKitBuilderQuote.test.ts` |
| 11 | Autenticação | Todos os usuários | TBD | C0 | `/auth`, `/login`, `/reset-password`, `/forgot-password-confirmation`, `/auth/callback`; guards `ProtectedRoute`/`AdminRoute`/`DevRoute` | Sessão válida; guards redirecionam corretamente; callback SSO completa; 404 público mesmo sem sessão | Credencial inválida = erro explícito sem loop; rota protegida sem sessão → `/login` | `e2e/auth/session-recovery.spec.ts`, `e2e/routes/public/login.spec.ts`, `reset-password.spec.ts`, `AppRoutes.transition.test.tsx` |
| 12 | CRM | Vendedor / Admin | TBD | C0 | `/clientes`, `/clientes/:id`; consumidores: carrinho, orçamento, magazine | Empresa/contato corretos associados aos documentos; isolamento via RLS; PII protegida | Edge externa fora → UX degradada explícita com dados locais coerentes | Inventário narrativo na v0.1 §11; **lacuna:** flag `crm_bridge_enabled` declarada, mas não consultada pelos consumidores |

## 2. Dependências cruzadas

Herdadas da v0.1 §12 (sem alteração de mérito):

| Origem | Consumidores | Risco de contrato |
|---|---|---|
| Catálogo/produto/variante/preço | Busca, carrinho, estoque, mockup, magazine, kit e orçamento | Drift de ID, SKU, preço ou variante se propaga a quase todos os fluxos |
| CRM empresa/contato | Carrinho, orçamento, magazine e BI | Falha externa ou ID incorreto associa documentos ao cliente errado |
| Carrinho | Orçamento | Perda de variante, quantidade ou empresa no handoff |
| Kit | Orçamento | Caminho atual não é atômico e pode gerar orçamento parcial |
| Estoque | Catálogo, carrinho, kit e promessa no orçamento | Dados incompletos podem parecer disponibilidade real se degradação não for visível |
| Magazine público | Edge pública, DB e estado do leitor | Token, RLS e cache local precisam preservar privacidade e revogação |
| Mockup | Storage, Edge e histórico | Linha DB e objetos precisam de lifecycle coerente e exclusão autorizada |
| Desconto | Orçamento (aplicação), admin (alçadas), audit | Aprovação fora do ciclo ou correlação quebrada aplica desconto indevido |
| Autenticação | Todas as rotas protegidas | Guard incorreto expõe superfície autenticada ou bloqueia operação |

Ordem segura para qualquer mudança (v0.1 §12): (1) PO confirma owner/criticidade/critérios →
(2) contract tests e matriz de acesso contra o estado atual → (3) fixtures e staging/doubles sem
mutar produção → (4) autorizações aplicáveis (DESIGN/EXTERNA/BD/DEPLOY) → (5) rollback ensaiado
antes de canário; migrations sempre forward-only.

## 3. Decisões pendentes do PO (consolidado)

| Fluxo | Owner a confirmar | Criticidade a confirmar | Critério de sucesso a aprovar | Flag/rollback a decidir | Aceite PO |
|---|---|---|---|---|---|
| Catálogo | TBD | C0 | Integridade da descoberta ao handoff | Gate global ou rollback por deploy | Pendente |
| Produto (PDP) | TBD | C0 | Coerência preço/variante/estoque e handoffs | — | Pendente |
| Busca | TBD | C1 | Ranking, privacidade e degradação sem IA | Kill switch por modalidade/global | Pendente |
| Carrinho | TBD | C0 | Persistência, undo e handoff sem perda | Gate global, limite e janela de undo | Pendente |
| Orçamento | TBD | C0 | Atomicidade, status, preço e sync idempotente | Política para falha externa e restauração | Pendente |
| Desconto | TBD | C0 | Alçadas, fail-closed e correlação de audit | Escopo do bloqueio sem aprovação | Pendente |
| Estoque | TBD | C0 | Freshness, completude e degradação visível | Cobertura das flags além dos painéis | Pendente |
| Mockup | TBD | C1 | WYSIWYG, segurança e lifecycle DB/Storage | Escopo do kill switch e resultado parcial | Pendente |
| Magazine | Promo Brindes Engineering | C1 | CRUD, publicação, PDF e leitura segura | Gate real e retirada segura do legado | Pendente |
| Kit | TBD | C1 | Save verdadeiro e kit → orçamento atômico | Gate real antes de expor caminho parcial | Pendente |
| Autenticação | TBD | C0 | Sessão, guards, SSO e 404 público | MFA (`mfa.enabled=false`): ativar ou remover flag | Pendente |
| CRM | TBD | C0 | Isolamento, PII, callbacks e degradação | Consumir `crm_bridge_enabled` e testar kill switch | Pendente |

**Nenhuma célula "Pendente" equivale a aceite.** A etapa 001 só se conclui quando o PO registrar
a decisão de cada linha (owners reais, criticidades e critérios finais de sucesso).

## 4. Regras de uso desta matriz

1. Esta matriz é a camada executiva (formato da etapa 001); o detalhamento narrativo, contratos
   DB/RPC/Edge, rollback e riscos por fluxo permanecem em `MATRIZ_FLUXOS_CRITICOS_2026-08-26.md`.
2. Qualquer alteração de criticidade, owner ou critério de sucesso exige nova revisão datada
   deste documento e `[VALIDAÇÃO PO]` registrada em PR.
3. Esta matriz alimenta: etapa 002 (mapa rota → dados → teste), etapa 003 (ownership por domínio)
   e etapa 004 (readiness/lifecycle). Divergência entre os artefatos é defeito a corrigir.
4. Lacunas marcadas como **lacuna** são dívida registrada, não bloqueio desta revisão; cada uma
   já tem etapa própria no plano (ex.: kit na 016–020, flags na 004).

