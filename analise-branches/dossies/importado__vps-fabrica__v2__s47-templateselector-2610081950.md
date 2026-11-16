# origin/importado/vps-fabrica/v2/s47-templateselector-2610081950

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Nada muda na tela: a branch apenas joga fora um seletor de "templates de gravacao" que ja estava desligado do sistema, e deixa um alarme automatico para ninguem religar isso por engano. O alarme e a unica parte que ainda falta.
- **Tip / merge-base / main:** tip `55394ba4246c48a7e5264468bdf086aec218726d` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico: `chore(mockup): remove TemplateSelector sem importadores + teste de higiene` (55394ba424, "Fabrica Hermes", 2026-10-09). Duas coisas, nessa ordem:

1. **Apagar codigo morto.** Remover `src/components/mockup/TemplateSelector.tsx` (170 linhas) — o menu "Templates" do gerador de mockup — porque nenhum arquivo o importava. A mensagem cita a "decisao Q15" (faxina de qualidade), registrada em `docs/PLANO_MOCKUP_50_ETAPAS_2026-10-08.md:70` ("G. Qualidade, testes e faxina (Q15, Q17)").
2. **Trocar teste de texto por teste de higiene.** Em `src/hooks/mockup/__tests__/mockup-audit.test.ts`, os dois blocos que liam o texto-fonte do componente (`Analise estatica — TemplateSelector.tsx`, a11y do botao excluir, e o bloco de `aria-hidden` em icones) deixam de existir — eles passariam a falhar com o arquivo apagado. No lugar entra `describe('Higiene — TemplateSelector.tsx removido (sem importadores)')` com duas verificacoes: (a) o arquivo nao existe mais em `src/`; (b) varrendo `src/` recursivamente, nenhum `.ts`/`.tsx` casa com `/from\s+['"][^'"]*TemplateSelector['"]/`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `src/components/mockup/TemplateSelector.tsx` fora de `src/` | **Esta** — a main nao tem o arquivo em `src/`; ele foi movido para `recovery/src-legacy/` em vez de apagado | `git cat-file -e origin/main:src/components/mockup/TemplateSelector.tsx` → `fatal: path ... does not exist in 'origin/main'`. Caminho hoje: `git cat-file -e origin/main:recovery/src-legacy/src/components/mockup/TemplateSelector.tsx` → existe. Rota: `git log --diff-filter=D origin/main -- src/components/mockup/TemplateSelector.tsx` → `5dd9b949d3 chore(repo): move 316 arquivos obsoletos da #3361 de src/ para recovery/src-legacy` |
| Nenhum importador do componente em `src/` | **Esta** (de fato, nao por teste) | `grep -rn "TemplateSelector" src tests scripts supabase` → zero ocorrencias |
| Remocao dos blocos de analise estatica de `TemplateSelector` em `mockup-audit.test.ts` | **Esta** — a main tambem os removeu, pela propria faxina de testes | `git show origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts \| grep -n "TemplateSelector"` → nenhuma linha. Padrao da main: `src/components/mockup/__tests__/mockupA11y.slice2.test.tsx:1-3` ("Fatia 2 do aposentamento de mockup-audit.test.ts: guarda de COMPORTAMENTO no lugar dos blocos estaticos removidos") |
| `describe('Higiene — TemplateSelector.tsx removido (sem importadores)')` com as 2 verificacoes | **NAO ESTA** | O arquivo da main nao menciona `existsSync`, `readdirSync` nem `Higiene`: `git show origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts \| grep -n "TemplateSelector\|existsSync\|readdirSync\|Higiene"` → vazio. E nenhum outro arquivo do projeto guarda isso: o `grep -rn "TemplateSelector" src tests scripts supabase` acima nao retorna nada, logo nao ha guarda equivalente em outro teste ou script |

Observacao sobre a armadilha: a auditoria anterior (`analise-branches/auditoria-261115/veredito_lote04.md:135-138`) marcou esta branch como **INCORPORADA** usando como prova que "a main nao menciona mais `TemplateSelector` (0 ocorrencias)". Essa mesma medicao prova o contrario para o item 4: zero ocorrencias significa que o teste de higiene **nao** entrou. Os dois unicos arquivos da branch estao verificados aqui; o item 4 ficou de fora.

## A resgatar

- **`src/hooks/mockup/__tests__/mockup-audit.test.ts` — bloco `describe('Higiene — TemplateSelector.tsx removido (sem importadores)')`** (≈25 linhas, visivel no diff (A) do pacote de evidencia).
  - **Por que importa:** e o unico conteudo proprio da branch que nao chegou na main. Sem ele, nada impede um agente (ou o Lovable, que commita direto em `main`) de recriar `src/components/mockup/TemplateSelector.tsx` ou importar a copia que continua viva em `recovery/src-legacy/` — e o problema volta sem ninguem perceber, porque hoje nao existe nenhuma verificacao automatica sobre esse arquivo.
  - **Passa hoje, sem ajuste:** a verificacao (a) exige ausencia em `src/` — confirmado acima; a verificacao (b) varre `src/` e nao acha importador — confirmado pelo `grep`. O arquivo preservado em `recovery/src-legacy/` nao quebra o teste, porque a varredura e limitada a `src/`.
  - **Precedente no repo (a favor):** `src/lib/kit-builder/__tests__/dead-code.test.ts:13-20` faz exatamente isso para outros arquivos aposentados (`existsSync(... 'src/lib/kit-builder/mock-data.ts') === false`). O padrao ja e aceito aqui.
  - **Contra (registrado para decisao):** a main escolheu, para componentes aposentados, nao deixar teste nenhum (ver `mockupA11y.slice2.test.tsx:1-3`); e a versao da branch e especifica de um componente. Uma guarda generica ("nenhum arquivo de `src/` importa modulo que vive em `recovery/src-legacy/`") cobriria os 316 arquivos movidos pelo commit `5dd9b949d3`, nao so este. Custo maior, valor maior; a versao da branch e o caminho barato.

## Risco de fechar esta branch

Risco para o cliente final e para o faturamento: **nenhum**. A funcionalidade que a branch mexeu ja nao esta no sistema em uso, e nenhuma tela, rota, tabela ou permissao e afetada — a branch nao toca banco de dados nem funcao de servidor.

O que se perde ao fechar sem resgatar: o alarme automatico. Fica sem protecao contra alguem reintroduzir esse componente morto; o codigo antigo continua guardado em `recovery/src-legacy/` e pode ser religado por descuido. E perda pequena e reversivel (o bloco de teste pode ser reescrito em minutos a partir do diff), mas e perda real de trabalho de outro agente.

## Nao verificado

- Nao foi executado `npm test` nem o vitest sobre o bloco de higiene (a tarefa e somente leitura e nao permite alterar a arvore de trabalho). A afirmacao "passa hoje" esta sustentada por inspecao estatica (`git cat-file`, `grep -rn`), nao por execucao de teste.
- Nao foi investigado se alguma das 19 PRs abertas ja inclui essa guarda de higiene; a verificacao foi feita contra `origin/main` (`e4ab7f85d9`), nao contra branches de PR.
- O diff (B) do pacote de evidencia termina cortado no meio do arquivo de teste (o pacote nao traz marcador `TRUNCADO`). Os fatos que dependiam dessa parte foram checados direto no git (`git show origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts`), portanto nenhum dos 2 arquivos ficou sem leitura.
