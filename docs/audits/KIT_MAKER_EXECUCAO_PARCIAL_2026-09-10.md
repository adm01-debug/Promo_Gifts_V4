# Kit Maker — execução, simulações e evidências (10/09/2026)

Este registro acompanha a implementação iniciada a partir do plano de 200 etapas em
`docs/plans/KIT_MAKER_PLANO_200_ETAPAS_2000_SUBETAPAS_2026-09-10.md`.

Status: **publicado para revisão** no PR [#1854](https://github.com/adm01-debug/Promo_Gifts_V4/pull/1854),
commit `587997d4`. Este documento não transforma etapas pendentes em concluídas,
nem registra merge, deploy, alteração no Supabase canônico ou troca da paleta atual.

## Escopo realizado nesta onda

| Área do plano | Entrega verificada | Situação |
| --- | --- | --- |
| KM-021–029 | Dois percursos explícitos (`items-first` e `box-first`), transições, passos ordenados, atalhos coerentes e preservação da composição ao trocar a caixa. | Parcialmente entregue e testado. |
| KM-034–036, KM-061–065, KM-081–085 | Catálogo real sem fallback silencioso para mocks; erros recuperáveis; paginação determinística além de 200 resultados; filtros de medida, preço, material e tipo. | Parcialmente entregue e testado. |
| KM-041–042 | Salvamento manual efetivo; autosave bloqueado durante hidratação de rascunho para não sobrescrever conteúdo salvo. | Parcialmente entregue. |
| KM-051–055, KM-059 | Tela de entrada com os dois caminhos, biblioteca, guia contextual e assistente de IA. A IA aplica **filtros**, nunca uma composição fictícia. | Parcialmente entregue. |
| KM-091–100 | Origem das medidas distinguida; medidas ausentes são inconclusivas; encaixe por orientação e volume útil preservados; peso continua validado quando o catálogo o fornece. | Parcialmente entregue e testado. |
| KM-101–104 | Ranking conservador de caixas: compatível, inconclusivo ou incompatível; o rótulo declara que a ocupação é estimada. | Parcialmente entregue e testado. |
| KM-111–119 | Etapa de personalização está integrada ao wizard; custo por item usa quantidade por kit × lote e a sincronização reativa evita ciclos de atualização. | Parcialmente entregue. |
| KM-141–149 | Identificação manual do cliente para o orçamento; payload de orçamento passa cliente e composição para a RPC transacional única. | Parcialmente entregue e testado por contrato local. |
| KM-151–160 | Assistente recebe e mostra sugestão estruturada; aplicação conservadora como filtro de catálogo. | Parcialmente entregue. |
| KM-171–180 | Caixa navegável por teclado, atalhos de wizard adaptados ao percurso e preservação de desfazer/refazer nativos em campos textuais. | Parcialmente entregue e testado. |

## Cenários simulados e resultado

| Cenário | Resultado observado |
| --- | --- |
| S01 — itens antes da caixa | Permitido; composição é preservada quando a embalagem é removida ou substituída. |
| S03 — medida desconhecida | Exibido como pendente/inconclusivo; não recebe selo de compatibilidade confirmada e não libera a validação final. |
| S06 — capacidade excedida | `checkItemFits` bloqueia o acréscimo e mantém o motivo verificável. |
| S10 — falha/vazio no catálogo | Não há mais retorno automático de `MOCK_BOXES`/`MOCK_ITEMS`; a tela mostra erro e permite tentar novamente. |
| S11 — resultado após a posição 200 | A busca percorre páginas estáveis por `name, id`; teste cobre 450 registros. |
| S12 — autosave na hidratação | O autosave fica suspenso até concluir a restauração do rascunho. |
| S16 — falha tardia ao criar orçamento | O cliente chama somente `create_quote_transactional`; não faz inserções parciais de `quotes`, `quote_items` e personalizações. |
| S26 — teclado | Setas e 1–4 seguem a ordem do percurso; campos de texto mantêm seu desfazer/refazer nativo. |

## Evidência local desta onda

Executados com sucesso:

```text
npm run ssot:validate
npm run build:dev
npm run test -- [9 arquivos focados de Kit Maker]
```

Resultado da suíte focada: **9 arquivos / 63 testes aprovados**. O build Vite de
desenvolvimento concluiu. Os avisos de import dinâmico emitidos pelo build são
preexistentes/fora do Kit Maker e não foram suprimidos.

O lint estrito dos arquivos modificados e `git diff --check` não apontaram erro.
O `typecheck` global foi iniciado; a captura interativa do ambiente expira antes de
retransmitir o resultado final, portanto ele permanece como evidência a reconfirmar
no gate de CI, sem ser declarado aprovado neste registro.

## Limites e próximas pendências

1. A análise de arranjo físico ainda é heurística de dimensões/volume: não prova
   acomodação real, orientação obrigatória, berços ou empilhamento.
2. A referência visual R1–R7 ainda exige inventário e aceite de assets; nenhuma
   imagem ou cor global foi alterada nesta onda.
3. O CRM está disponível para futura seleção vinculada, mas a tela atual aceita os
   dados de cliente manualmente e ainda não persiste esse contexto no rascunho.
4. Frente/verso, upload seguro de arte, zoom, prévia de mockup e recuperação de
   geração assíncrona não foram reimplementados nesta onda.
5. A RPC `create_quote_transactional` foi verificada por tipos, migration local e
   teste de payload. A leitura live do Supabase está bloqueada: a CLI não tem
   `SUPABASE_ACCESS_TOKEN` e o MCP configurado pede scopes legados rejeitados pelo
   servidor. Não há evidência nova de execução no banco canônico.
6. Não foram aplicadas migrations, RLS, grants, funções, triggers, dados ou secrets
   no projeto `doufsxqlfjyuvxuezpln`.
7. O commit `587997d4` foi enviado à branch
   `codex/kit-maker-integration-20260910` e abriu o PR #1854 contra `main`.
   O merge permanece bloqueado pelos gates em execução. As alterações locais de
   outros agentes foram preservadas separadamente antes do rebase e não integram
   esta entrega.

## Arquivos principais desta onda

- `src/pages/kit-builder/KitBuilderPage.tsx`
- `src/hooks/kit-builder/useKitBuilder.ts`
- `src/hooks/kit-builder/useKitBuilderQueries.ts`
- `src/lib/kit-builder/box-recommendations.ts`
- `src/components/kit-builder/KitMakerLanding.tsx`
- `src/pages/kit-builder/useKitBuilderQuote.ts`
- `tests/lib/kit-box-recommendations.test.ts`
- `tests/hooks/useKitBuilderQueries.test.ts`
- `tests/hooks/useKitWizardShortcuts.test.tsx`
