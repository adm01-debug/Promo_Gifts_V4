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
resultado: 43 arquivos, 308 testes aprovados

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
