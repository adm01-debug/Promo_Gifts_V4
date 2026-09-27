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

## Situação por etapa afetada nesta onda

| Etapa    | Estado                       | Evidência e limite                                                                                                                                                    |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KM50-006 | IMPLEMENTADA LOCAL           | Fluxo é serializado em `__draft`, restaurado por `loadKit` e incluído em snapshots. Validação autenticada ainda depende de D8.                                        |
| KM50-007 | IMPLEMENTADA LOCAL           | Briefing da IA é normalizado, persistido/restaurado e limpo no reinício. A origem manual/template/IA completa continua pendente de contrato explícito.                |
| KM50-015 | IMPLEMENTADA LOCAL (parcial) | Busca inclui nome, SKU, categoria e material; cache de estoque não colide por cardinalidade. Virtualização continua pendente.                                         |
| KM50-018 | IMPLEMENTADA LOCAL (parcial) | As ações “Ver tutoriais” e “Como funciona?” abrem o mesmo guia. Conteúdo final e telemetria ainda exigem decisão/validação.                                           |
| KM50-019 | IMPLEMENTADA LOCAL (parcial) | Filtros de categoria/tipo usam botões semânticos com `aria-pressed`. Auditoria assistiva e teclado completo continuam pendentes.                                      |
| KM50-021 | IMPLEMENTADA LOCAL (parcial) | Categorias e materiais usam fonte estável do catálogo; preferência de visualização de itens é persistida. Preferência de caixas e demais estados continuam pendentes. |
| KM50-031 | IMPLEMENTADA LOCAL (parcial) | Estado sem caixa compatível tem chamada comercial explícita. Envio de contexto comercial depende de contrato do canal.                                                |

## Bloqueios preservados

- Dados comerciais de embalagens, acabamento, fechamento e badges: D1, D2 e D6.
- Templates e assets reais: D3.
- Frete e PDF: D4 e D5.
- Definição de publicação na biblioteca: D7.
- E2E autenticado, IA paga, testes de dois usuários, Supabase canônico e publicação Vercel: D8 e autorização operacional específica.

Nenhum DDL, DML, RPC, segredo, Edge Function, deploy ou alteração de cor foi realizado nesta onda.
