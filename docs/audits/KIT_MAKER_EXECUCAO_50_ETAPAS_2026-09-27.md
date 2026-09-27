# Kit Maker — recibo de execução do plano de 50 etapas

Data: 27/09/2026. Branch: `codex/kit-maker-plano-50-20260927`.

Este recibo não transforma pendências de dados, banco ou produção em itens concluídos. Ele registra apenas a primeira onda de código que foi simulada e validada localmente. O plano-fonte continua sendo [KIT_MAKER_PLANO_CORRECOES_50_ETAPAS_2026-09-27.md](../plans/KIT_MAKER_PLANO_CORRECOES_50_ETAPAS_2026-09-27.md).

## Simulação executada antes da consolidação

| Cenário                                                               | Resultado                                                                                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Dois catálogos com a mesma quantidade, mas IDs distintos              | Corrigido: a chave de consulta de estoque é a lista completa e ordenada de IDs, não apenas a quantidade.                    |
| Jornada iniciada pelos itens ou pela caixa, seguida de salvar/reabrir | Corrigido localmente: o fluxo é persistido e restaurado de forma compatível com rascunhos antigos.                          |
| Sugestão de IA aplicada, salva e reaberta                             | Corrigido localmente: briefing estruturado é validado, persistido e restaurado; valores malformados são ignorados.          |
| Filtro de categoria sem resultado temporário                          | Corrigido: facetas usam o catálogo estável, portanto opções não desaparecem durante o filtro.                               |
| Nenhuma caixa cadastrada ou compatível para itens já escolhidos       | Corrigido: o usuário recebe saída comercial explícita em vez de uma tela silenciosa.                                        |
| Preferência grade/lista                                               | Corrigido para a seleção de itens: a preferência é reaplicada após remontagem quando o armazenamento local está disponível. |

## Evidências locais

```text
npx tsc -p tsconfig.app.json --noEmit --pretty false
resultado: exit 0

npx vitest run tests/lib/kit-builder-persistence.test.ts \
  tests/hooks/useKitBuilder-flow.test.tsx \
  tests/hooks/useKitBuilderQueries.contract.test.ts \
  tests/components/kit-builder/ItemSelector.parity.test.tsx \
  tests/components/kit-builder/ItemSelector.filters.test.tsx \
  tests/components/kit-builder/BoxSelector.test.tsx \
  tests/components/kit-builder/BoxSelector.materialFilter.test.tsx \
  tests/components/kit-builder/KitMakerLanding.test.tsx \
  --maxWorkers=1 --retry=0
resultado: 8 arquivos, 42 testes aprovados
```

Após a segunda onda, a suíte ampliada também foi executada no mesmo worktree:

```text
npx vitest run tests/components/kit-builder tests/components/kit-library \
  tests/components/pages/KitBuilderPage.test.tsx tests/hooks/useKit tests/lib/kit \
  tests/lib/buildCustomKitInsert.test.ts tests/pages/kit-builder \
  tests/audit/kit-maker-plan-review.test.tsx tests/contracts/kit-maker \
  src/lib/external-db/kit-coverage.test.ts --maxWorkers=1 --retry=0
resultado: 44 arquivos, 309 testes aprovados

npx tsc -p tsconfig.app.json --noEmit --pretty false
resultado: exit 0
```

## Situação por etapa afetada nesta onda

| Etapa    | Estado                       | Evidência e limite                                                                                                                                                               |
| -------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KM50-006 | IMPLEMENTADA LOCAL           | Fluxo é serializado em `__draft`, restaurado por `loadKit` e incluído em snapshots. Validação autenticada ainda depende de D8.                                                   |
| KM50-007 | IMPLEMENTADA LOCAL           | Briefing da IA é normalizado, persistido/restaurado e limpo no reinício. A origem manual/template/IA completa continua pendente de contrato explícito.                           |
| KM50-015 | IMPLEMENTADA LOCAL (parcial) | Busca inclui nome, SKU, categoria e material com normalização de acentos; cache de estoque não colide por cardinalidade. Falta validar payload/variante em ambiente autenticado. |
| KM50-018 | IMPLEMENTADA LOCAL (parcial) | As ações “Ver tutoriais” e “Como funciona?” abrem o mesmo guia. Conteúdo final e telemetria ainda exigem decisão/validação.                                                      |
| KM50-019 | IMPLEMENTADA LOCAL (parcial) | Filtros de categoria/tipo usam botões semânticos com `aria-pressed`. Auditoria assistiva e teclado completo continuam pendentes.                                                 |
| KM50-021 | IMPLEMENTADA LOCAL (parcial) | Categorias e materiais usam fonte estável do catálogo; preferência de visualização de itens é persistida. Falta validar resposta atrasada e combinação com API real.             |
| KM50-023 | IMPLEMENTADA LOCAL (parcial) | Acima de 48 itens, a lista usa janela virtualizada com fallback inicial não vazio. Falta benchmark com catálogo real de milhares de produtos.                                    |
| KM50-024 | IMPLEMENTADA LOCAL (parcial) | Preferências grade/lista existem em itens e caixas; preço/nome têm desempate por nome e ID. Falta validar scroll e foco em viewport físico.                                      |
| KM50-025 | IMPLEMENTADA LOCAL (parcial) | Limpar filtros preserva a composição. O drawer mobile da referência continua condicionado ao desenho aprovado de KM50-020.                                                       |
| KM50-027 | IMPLEMENTADA LOCAL (parcial) | Faixas inválidas mostram alerta e não eliminam silenciosamente o catálogo. Fechamento e dados comerciais continuam bloqueados por D1/D2.                                         |
| KM50-030 | IMPLEMENTADA LOCAL (parcial) | A comparação identifica a melhor opção pelo ranking conservador do seletor e explica o critério. Badges comerciais continuam bloqueados por D6.                                  |
| KM50-031 | IMPLEMENTADA LOCAL (parcial) | Estado sem caixa compatível tem chamada comercial explícita. Envio de contexto comercial depende de contrato do canal.                                                           |

## Bloqueios preservados

- Dados comerciais de embalagens, acabamento, fechamento e badges: D1, D2 e D6.
- Templates e assets reais: D3.
- Frete e PDF: D4 e D5.
- Definição de publicação na biblioteca: D7.
- E2E autenticado, IA paga, testes de dois usuários, Supabase canônico e publicação Vercel: D8 e autorização operacional específica.

Nenhum DDL, DML, RPC, segredo, Edge Function, deploy ou alteração de cor foi realizado nesta onda.

## Remediação pós-auditoria de 27/09 — sessão e retry

Uma revisão adversarial posterior encontrou quatro falhas que não estavam cobertas pelo primeiro recibo. Esta onda corrige o código da branch, **não** atesta homologação ou produção.

| Simulação | Resultado local | Limite |
| --- | --- | --- |
| Kit A → início → Kit B, inclusive navegação para a mesma URL | A página remonta por navegação; autosave e histórico não são reaproveitados. O primeiro snapshot do kit carregado só é capturado após a hidratação. | Ainda falta E2E autenticado com dois kits reais. |
| Usuário A → usuário B na mesma aba | O editor remonta por identidade da conta, e `custom-kits` usa chave de cache por usuário. O clone de template não semeia cache global. | RLS real e sessão entre duas contas dependem de D8. |
| RPC de orçamento confirma mas a resposta se perde; autosave cria ID antes do retry | A operação mantém o mesmo request ID, grupo e payload; o recibo de `sessionStorage` guarda apenas digest/IDs, sem nome, e-mail ou corpo do orçamento. Kits salvos diferentes usam recibos distintos. | Hash compacto pode colidir; o servidor deve rejeitar payload distinto. Recibos legados já gravados por versões anteriores podem persistir até o fim da sessão. |
| Catálogo com 205 IDs e produto com 501 variantes | Consulta de variantes dividida em até 100 IDs por lote, no máximo quatro lotes simultâneos, com paginação completa e falha fechada. | Benchmark com volume/latência reais e catálogo canônico ainda depende de D8. |

Evidência reproduzível nesta branch, antes de integração com `origin/main`:

```text
npm run typecheck:full -- --pretty false
exit 0

npx vitest run tests/components/kit-builder tests/components/kit-library \
  tests/components/pages/KitBuilderPage.test.tsx tests/hooks/useKit \
  tests/lib/kit tests/lib/buildCustomKitInsert.test.ts tests/pages/kit-builder \
  tests/audit/kit-maker-plan-review.test.tsx tests/contracts/kit-maker \
  src/lib/external-db/kit-coverage.test.ts \
  tests/routes/kit-builder-route-lifetime.test.tsx --maxWorkers=1 --retry=0
45 arquivos, 317 testes aprovados

npm run build
exit 0; guardas SSOT, ciclos de chunks e harnesses de produção aprovados
```

**Bloqueios que permanecem:** D1–D8; corrida de `is_favorite` entre atualização direta e autosave exige contrato transacional/validação de objeto específico no banco; ambiente autenticado e visual real não foram testados. Não elevar etapas do plano a `CONCLUÍDA` com base nesta suíte local.

### Gates remotos e reconciliação da base

O PR #1924 estava sobre `46d36b6d6`; `origin/main` avançou pelos PRs #1922 e #1923. Esses commits foram integrados sem conflitos. O teste `validate-migration-target.test.mjs` ainda procurava um `psql -1` no início do passo, mas #1922 tornou o comando condicional para migrations `transaction:none`; o teste foi ajustado para exigir os dois caminhos e a guarda anterior ao DDL (40/40 localmente). O `bun.lock` tinha `@lhci/cli` 0.13.0, enquanto `package.json` já declara 0.15.1; foi regenerado sem mudar o manifesto, e `bun install --frozen-lockfile --ignore-scripts` passou com Bun 1.4.2, a versão observada no job falho. Esses resultados locais **não** convertem checks remotos em verde até a nova execução do PR.

### Verificação read-only do canônico e isolamento da biblioteca

Consulta ao `pg_catalog` do projeto `doufsxqlfjyuvxuezpln` confirmou as assinaturas `save_custom_kit_atomic(uuid,uuid,integer,jsonb)`, `create_kit_quote_transactional(uuid,jsonb,jsonb)` e `set_custom_kit_pinned(uuid,boolean)`: `SECURITY INVOKER`, `EXECUTE` para `authenticated`, sem `EXECUTE` para `anon`. `custom_kits`, `kit_save_requests` e `kit_quote_requests` têm RLS ativo. A policy `ck_select_own_or_coord` permite que coordenadores leiam kits alheios; por isso a consulta “Meus kits” precisava filtrar `user_id` explicitamente. A leitura, exclusão e alteração de favorito agora são limitadas à conta atual no cliente, com teste de contrato; **não** houve alteração de policy, tabela, função ou dado.

A inspeção das funções do canônico encontrou `save_custom_kit_atomic` e `set_custom_kit_pinned`, mas nenhuma RPC exclusiva de favorito. A atualização direta de `is_favorite` ainda não incrementa `revision`, enquanto o autosave atômico pode regravar o valor de um snapshot antigo. Corrigir essa corrida de forma transacional exige uma proposta forward-only para um objeto específico e autorização explícita do PO antes de aplicação; não há solução honesta em apenas atualizar o cache React.
