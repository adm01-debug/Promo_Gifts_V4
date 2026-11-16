# origin/importado/vps-fabrica/v2/s17-2610081946

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** quando o vendedor pede o mockup de varias areas do produto de uma vez e uma delas falha, ele recebe as que deram certo e refaz so a que falhou — isso ja esta no ar na producao.
- **Tip / merge-base / main:** tip `526247661beec3688380293731af6f6fa7494c3d` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico: `526247661b` — "feat(mockup): lote multi-área entrega as áreas boas e regera só a que falhou (máx. 6)".

Antes, gerar mockup para varias areas de personalizacao era tudo-ou-nada e o resultado era casado com a
area **pelo nome** da area. Duas consequencias de negocio: se uma area falhava, o vendedor perdia o lote
inteiro; e se duas areas tinham o mesmo nome (duas "Frente"), a imagem podia ser gravada na area errada.

A branch atacou cinco coisas:

1. Limite de 6 areas por lote, com recusa explicada antes de chamar o servico pago de geracao.
2. Passar a identificar cada resultado pelo **id estavel da area**, nao pelo nome.
3. Guardar erro por area (`areaErrors`) para a area que nao voltou no lote, em vez de derrubar o lote.
4. Acao de regerar **so** uma area (`retryArea`), sem tocar nas areas ja salvas, com indicador de
   "regerando" por area.
5. Levar isso a tela: texto de erro por area + botao "Regerar esta área", e teste automatizado cobrindo
   falha parcial, falha na regeracao, estouro do limite e nomes repetidos.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Limite de 6 areas por lote (`MAX_BATCH_AREAS = 6`) | `src/hooks/mockup/mockupGeneratorModel.ts` (movido para fora do hook) | `mockupGeneratorModel.ts:13` `export const MAX_BATCH_AREAS = 6;` |
| Recusa com mensagem antes de chamar a geracao | `src/hooks/mockup/useMockupGenerator.ts` | `useMockupGenerator.ts:523-527`, mensagem `Máximo de ${MAX_BATCH_AREAS} áreas por lote (...)` identica a da branch |
| `areaId` no resultado do lote do servico | `src/hooks/mockup/mockupGenerationService.ts` | `mockupGenerationService.ts:310` `batchResults: { url: string; areaName: string; areaId?: string }[]` e `:436` `areaId: area.id` |
| Tipo `BatchMockupResult` com id estavel | `src/hooks/mockup/mockupGeneratorModel.ts` | `mockupGeneratorModel.ts:16-20`, inclusive o comentario `/** Id estável da área — nomes de área podem se repetir. */` |
| Casar resultado com area por id, nao por nome | `src/hooks/mockup/mockupGeneratorModel.ts` | `mockupGeneratorModel.ts:210` `const area = r.areaId ? areasWithLogos.find((a) => a.id === r.areaId) : areasWithLogos[i];` |
| Erro proprio da area que nao voltou no lote | `src/hooks/mockup/mockupGeneratorModel.ts` + `useMockupGenerator.ts` | `mockupGeneratorModel.ts:234-238` (`okIds`, texto `Falha ao gerar esta área. Tente regerar só ela.`); aplicado em `useMockupGenerator.ts:593` `if (failed) setAreaErrors(failed);` |
| Estado `areaErrors` / `retryingAreaIds` | `src/hooks/mockup/useMockupAreaRetry.ts` (hook proprio) | `useMockupAreaRetry.ts:49-51`; consumido em `useMockupGenerator.ts:501` |
| Acao `retryArea` (regerar so uma area) | `src/hooks/mockup/useMockupAreaRetry.ts` | `useMockupAreaRetry.ts:53-110` — mesma logica da branch (guarda de reentrancia, `areas: [area]`, limpa o erro no sucesso, repoe no erro, `toast.success(\`Área "${area.name}" gerada com sucesso!\`)`) |
| Limpar erros ao iniciar novo lote e no reset | `src/hooks/mockup/useMockupGenerator.ts` | `useMockupGenerator.ts:550` (antes do lote) e `:662` (reset do formulario) |
| Props `areaErrors` / `retryingAreaIds` / `onRetryArea` no painel | `src/components/mockup/MockupConfigPanel.tsx` | `MockupConfigPanel.tsx:71-73` (contrato), `:108-110` (recebe), `:343-345` (repassa) |
| Tela: texto de erro por area + botao "Regerar esta área" | `src/components/mockup/MultiAreaManager.tsx` | `MultiAreaManager.tsx:177-201` — bloco `role="alert"` por area com erro e botao `Regerar esta área`, desabilitado/girando via `retryingAreaIds?.includes(area.id)` |
| Ligacao da pagina ao hook | `src/pages/mockups/MockupGenerator.tsx` | `MockupGenerator.tsx:346-348` `areaErrors={mg.areaErrors}` / `retryingAreaIds={mg.retryingAreaIds}` / `onRetryArea={mg.retryArea}` |
| Chave da grade de resultados por id (nao por indice) | `src/pages/mockups/MockupGenerator.tsx` | `MockupGenerator.tsx:533` `key={batch.areaId ?? idx}` |
| Teste automatizado do lote parcial (4 casos) | `src/hooks/mockup/__tests__/mockupBatch.partial.test.ts` existe na main | mesmo `describe('lote multi-área — falha parcial e id estável')` e os 4 `it(...)` nas linhas 134, 177, 200 e 213 — a main tem a versao ja corrigida (import de `MemoryRouter`, `MAX_BATCH_AREAS` importado de `../mockupGeneratorModel`) |

Quando entrou: `git log -S"retryArea" --oneline origin/main -- src/hooks/mockup` devolve um unico commit,
`294cee8389` (2026-11-01) — "fix(mockup): gerador — medidas, timeout 30 s, lote parcial, editor de logo
(entregas VPS) (#2739)". A PR #2739 e o squash que trouxe as entregas da fabrica VPS, e o proprio titulo
cita "lote parcial", que e exatamente a intencao desta branch. Por ser squash-merge, a branch nao e
ancestral da main e o patch-id nao bate — isso nao indica perda.

Por que os 5 arquivos ainda "diferem" da main: em todos os casos o diff branch -> main e a main **a
frente**, nao a main sem o trabalho. Dois movimentos explicam tudo: (a) o codigo foi repartido em
`mockupGeneratorModel.ts` e `useMockupAreaRetry.ts` para caber no limite de tamanho de arquivo do repo
(o cabecalho de `useMockupAreaRetry.ts:1-4` diz isso com essas palavras), e (b) a main recebeu depois
coisas que a branch nunca teve (erro de carga de tecnicas, logo do cliente vinda do CRM, dialogo de
confirmacao, resolvedor unico de medidas).

## A resgatar

Nada. Os 13 itens de comportamento da branch foram localizados na main com evidencia linha a linha, e o
proprio arquivo de teste que a branch criou esta na main em versao corrigida.

## Risco de fechar esta branch

Baixo. Fechar/apagar esta branch nao muda nada no que o vendedor ve: a entrega parcial do lote, o erro por
area, o botao de regerar so uma area e o limite de 6 areas estao em producao desde a PR #2739, e o teste
que protege esse comportamento esta na main. O unico efeito e perder o historico detalhado deste commit —
que ja esta preservado no squash `294cee8389`.

## Nao verificado

- Nao executei `npm test` nem o teste `mockupBatch.partial.test.ts` nesta sessao: a verificacao foi de
  presenca e de conteudo do codigo e do teste na main, nao de execucao verde. O comportamento em producao
  nao foi exercitado na tela.
- Nao abri as 2 linhas de diferenca restantes entre o teste da branch e o da main alem das mostradas no
  pacote (ajustes de mock e de `await setup`); sao ajustes de teste, nao de comportamento do produto.
