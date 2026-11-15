# Revalidação dos planos e pendências — 2026-10-31

**Base GitHub:** `main` em `42839b3ce8da3d047c82f515f9a990d4851ef7b9`.
**Escopo:** revalidar referências de PR, execução de workflows e consistência dos registros de produção. Consulta ao banco canônico foi somente leitura/indireta por evidências já versionadas; esta rodada não aplicou SQL, migration, repair, deploy ou mudança de dados.

## Resumo executivo

Os planos continuam em execução. A documentação de produção tem snapshots anteriores e contém referências de PR já obsoletas, dois recibos incompatíveis para as mesmas versões de migration e uma afirmação sobre `kill_switch_hits` contradita por uma inspeção posterior de `pg_catalog`. Essas divergências foram registradas para reconciliação; não foram convertidas em mudanças no banco.

## Estado atual de PRs relevantes

Estado consultado na API do GitHub em 2026-10-31:

| PR | Estado confirmado | Evidência / próxima ação |
|---|---|---|
| [#2443](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2443) | **Merged** em 26/10 | Remover das listas de “aguardando PO”; validar cada item de banco separadamente, sem presumir que o merge aplicou migrations. |
| [#2714](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2714) | **Fechado sem merge** | O drift continua sem resolução certificada. Reabrir apenas com classificação atualizada e pacote revisto; não aplicar nada a partir do PR fechado. |
| [#2730](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2730) | **Merged** em 29/10 | Atualizar as listas de PRs abertas; o merge trata do contrato `repair-only`, não prova paridade integral do schema. |
| [#2860](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2860) | **Aberto**; Gate Final verde; Copilot falhou por cota HTTP 402; Vercel foi cancelado | Requer avaliação dos checks requeridos e sincronização com a `main`; não mesclado nesta revisão. |
| [#2867](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2867) | **Aberto**; Gate Final verde; Copilot falhou por cota HTTP 402; Vercel foi cancelado | A mudança remove o workflow vazio que fazia `actionlint` falhar. A falha do Copilot é externa; nenhum check foi contornado. |
| [#2864](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2864) | **Aberto**; Gate Final verde, mas Vercel e checks E2E de swatch/personalização/auditoria em falha | Não atribuir causa ao código do deployment sem logs; não mesclar até resolver os checks requeridos. |

## Estado de CI observado na `main`

As últimas execuções consultadas mostram que há falhas ativas, portanto o estado não é “CI todo verde”. Exemplos de execução mais recente observada por workflow:

| Workflow | Última execução observada | Estado |
|---|---|---|
| [Workflow Lint](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41197359691) | 31/10 | failure; associado ao arquivo vazio `.github/workflows/main.yml` |
| [CI Security & Drift Checks](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41197359584) | 31/10 | failure; lint 0029 não conseguiu consultar pg-meta (HTTP 544), inconclusivo por indisponibilidade externa |
| [Deploy Gates](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41197359704) | 31/10 | failure no Gate 1.13, consulta live `pg_policies` retornou HTTP 544; inconclusivo por indisponibilidade de pg-meta |
| [E2E — Personalization Flow](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41197359696) | 31/10 | failure; requer diagnóstico do fluxo autenticado |
| [E2E — Critical Flows & Error Boundaries](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41197359717) | 31/10 | failure; requer diagnóstico do fluxo autenticado |
| [E2E • Swatch QuickView](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41197359630) | 31/10 | failure nos navegadores; fixtures não têm os produtos V2 esperados e alguns cenários falham em `E108` |
| [Edge Integration Tests — All Functions](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41194108331) | 31/10 | failure; a causa deve ser separada por função/teste |
| [db-schema-drift-check](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41189181134) | 31/10 | failure; o resumo aponta resíduo na partição `supplier_products_raw_history_p2026_07`; ledger parity passou |
| [edge-functions-drift-check](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41187780553) | 31/10 | failure; 31 conteúdos divergentes, sem prova isolada de qual lado é canônico |
| [Uptime Monitor](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41199730511) | 31/10 | success nesta execução; houve falha às 11:33Z e sucesso às 11:04Z, portanto o comportamento recente é intermitente |
| [Quote Number Hardening — Verify](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41200689945) | 31/10 | success |

Também permanecem falhas já documentadas em `PENDENCIAS.md`: [Kit Coverage Integration #41165671545](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41165671545) consulta `v_kit_component_complete` como `anon` e recebe permission-denied; um run autenticado de branch chegou a 56% de cobertura, abaixo da meta de 70%, então corrigir a identidade, sozinho, não fecha o gate. [Nightly Full CI #41161391625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41161391625) inclui 14 falhas de autenticação em magazine-header por falta de credenciais no job visual e timeouts dos seletores de produto na rota pública color-swatch. Não ampliar grants públicos nem reduzir o limite de cobertura para fazer esses testes passarem.

## Divergências que precisam reconciliação

1. **PRs documentadas como abertas:** `docs/estado/PENDENCIAS.md` ainda lista #2443 como aguardando PO, embora tenha sido mergeado. #2714 é citado como aberto, mas foi fechado sem merge. #2730 foi mergeado, não está mais em aberto. Atualizar o status sem tratar merge como evidência de DDL aplicada.
2. **Recibos conflitantes:** `supabase/MIGRATIONS_SYNC_LOG.md` registra `20261022194000`, `20261022194100` e `20261022194200` como aplicadas com runs nas linhas 794–796 e as repete como pendentes nas linhas 1562–1564, com hashes diferentes. Comparar hashes dos arquivos, statements/ledger e recibos dos runs antes de alterar o log. Não reaplicar SQL como diagnóstico.
3. **Seis aplicações sem prova final:** o mesmo log marca `20261027180000`, `20261027200000`, `20261027220000`, `20261027230000`, `20261027233000` e `20261027234500` como pendentes nas linhas 719–724. Confirmar ledger e pós-checks; não declarar aplicadas só porque existe um run próximo.
4. **E049 / rate guard:** `PENDENCIAS.md` descreve `kill_switch_hits` como existente sem trigger; `docs/SCHEMA_REFERENCE.md` §3.1, gerado depois e baseado em `pg_catalog`, diz que a tabela não existe e que as seis tabelas presentes têm trigger. A existência precisa ser reconsultada antes de mexer em manifest/gate. Não criar trigger para objeto cuja existência não foi confirmada.
5. **Allowlist e baseline:** a documentação de 25/10 fala em 645 versões na allowlist; a leitura mais recente do arquivo na main contou 651. O run [41189181134](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41189181134) mostra ledger parity verde e um resíduo de schema da partição de julho. Não reduzir allowlist nem girar baseline por inferência; reconciliar usando o método do workflow e o fluxo de snapshot autorizado.
6. **Tipos:** a paridade estrutural de Tables/Views/Enums por nome está documentada para 29/10 (398/398, 197/197, 15/15). Isso não certifica contratos de colunas, tipos ou todas as funções; atualizar essa prova por `pg_catalog` antes de declarar sincronização integral.
7. **Gates E045/E049/E055 não verificam o estado vivo no caminho do CI:** `deploy-gates.yml` chama `--gate`; os três scripts retornam `static-pass` antes da consulta live, mesmo quando há credenciais no workflow (E049 nem recebe as credenciais). No E049, as sete entradas do manifest têm `verified_at: "pendente"`. Corrigir exige definir com precisão o comportamento em forks sem segredo e validar as tabelas/triggers reais antes de transformar a checagem em gate bloqueante.
8. **Relatórios de Playwright ainda podem publicar traces de autenticação:** `playwright.config.ts` conserva traces em falhas e há workflows que enviam diretórios completos `test-results`/`playwright-report`; a remoção de `test-results/**/trace.zip` não cobre necessariamente cópias anexadas ao relatório HTML. Reduzir/coletar artefatos por allowlist e separar setup de login precisa de PR dedicado, sem publicar credenciais em artefatos.
9. **E048 policy baseline não compara semântica completa:** há fallback por nome/comando e tolerância a mudança pelo identificador; revisar role/command/predicates da policy antes de declarar drift coberto.

## Feature gaps priorizados

Comparação somente de leitura dos planos com os módulos atuais. Não inclui itens que dependem de decisão comercial ou autorização de schema como se fossem tarefas prontas para implementação.

| Prioridade | Item ainda parcial/ausente | Evidência local | Dependência |
|---|---|---|---|
| P0 | Preço autoritativo do Kit Maker validado no servidor | [useKitBuilderQuote.ts](../../src/pages/kit-builder/useKitBuilderQuote.ts#L366) reconfirma no cliente, mas envia valores calculados pelo navegador em `:412`; o writer SQL grava `unit_price` do JSON em [20260828141100_forward_only_create_quote_transactional_auth_scope.sql](../../supabase/migrations/20260828141100_forward_only_create_quote_transactional_auth_scope.sql#L141). | Definir contrato comercial e migration versionada; seguir fluxo E15 e aprovação necessária antes de qualquer alteração no canônico. |
| P1 | Mínimos e múltiplos comerciais por produto no kit | Nenhuma validação localizada nos módulos `src/hooks/kit-builder` e `src/pages/kit-builder`; FT-079 em [backlog de funcionalidades](./backlog/funcionalidades.md). | Regra comercial aprovada pelo PO. |
| P1 | Limite de peso/estrutura da caixa | A guarda lê `maxWeight` em [useKitBuilder.ts](../../src/hooks/kit-builder/useKitBuilder.ts#L140), mas [useKitBuilderTransformers.ts](../../src/hooks/kit-builder/useKitBuilderTransformers.ts#L87) não fornece o valor. | Fonte confiável de limite e regra de composição aprovadas. |
| P1 | Geração de PDF do Magazine | [MagazinePrintPage.tsx](../../src/pages/magazine/MagazinePrintPage.tsx#L60) usa `window.print()`; não há evidência de geração de PDF no servidor no plano inspecionado. | Definir requisito de exportação e avaliar implementação sem criar backend/infra por inferência. |
| P2 | Frete real por CEP no Kit Maker | [FreightEstimator.tsx](../../src/components/kit-builder/FreightEstimator.tsx#L29) usa estimativa de tabela fixa; interface identifica o resultado como estimativa. | Escolha e credenciais de provedor de frete. |
| P2 | Sincronização remota de progresso do leitor Magazine | [PublicMagazineView.tsx](../../src/pages/magazine/PublicMagazineView.tsx#L54) usa `localStorage`; o hook remoto não tem consumidor de produção localizado. | Decisão sobre persistência/identidade e revisão do fluxo público. |
| P2 | Histórico de preços no PDP | [PriceHistoryChart.tsx](../../src/components/products/PriceHistoryChart.tsx#L26) existe sem consumidor localizado; roadmap em `docs/05_ROADMAP_PROXIMOS_PASSOS.md`. | Prioridade de produto e fonte de histórico adequada. |

**Itens que não devem ser reabertos por cópia de auditorias antigas:** FT-001 (diálogos removidos), FT-002 (inteligência usa valor real ou estado vazio) e FT-090 (peso zero tratado como desconhecido) foram verificados como corrigidos pela inspeção de código. A aprovação pública de orçamento está marcada como descontinuada pelo PO.

## Próximas ações seguras

1. Atualizar `docs/estado/PENDENCIAS.md`, `docs/estado/backlog/banco.md` e o `MIGRATIONS_SYNC_LOG.md` com os estados verificados; preservar o histórico e anotar que a reconciliação de recibos está pendente.
2. Diagnosticar cada falha de workflow pelo resumo do job/step, começando pelo arquivo vazio e pelos E2E autenticados; não aumentar timeouts nem enfraquecer asserções como substituto de causa raiz.
3. Fazer leitura nova do schema canônico para resolver os casos `kill_switch_hits`, partition drift, ledger e tipos. Qualquer DDL continua sujeita às regras E15/E056 e aprovação correspondente.
4. Avançar a fila de funcionalidades a partir dos IDs FT do backlog somente depois de confirmar prioridade e dependências. Esta revalidação não declara concluídas as 416 entradas nem substitui a matriz de execução.

**Limite:** este documento registra estado e próximos passos, não certifica execução integral de todos os planos. Nenhum dado de clientes/produtos foi copiado para o repositório e nenhuma alteração foi feita no Supabase.
