# origin/importado/vps-fabrica/v2/s33-2610081947

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** organiza as cores do documento de aprovacao de mockup que o cliente recebe (o "papel timbrado") num unico lugar e deixa escrito por que ele continua verde e nao azul como o resto do sistema — nenhuma cor muda na pratica.
- **Tip / merge-base / main:** tip `7eb5393696c45bfe7bf5411219ed321758a5ccb4` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos de 2026-10-08 ("Fabrica Hermes"):

- `7eb5393696 refactor(mockup): centraliza em tokens as cores do documento timbrado`
- `b827bfb5ee test(mockup): trava as cores do timbrado e o aviso de rodape da previa`

A intencao, lida do codigo e do comentario que a branch escreveu em
`src/components/mockup/approval/MockupApprovalTemplate.tsx`:

1. tirar os ~20 codigos de cor escritos na mao espalhados pelo arquivo (inclusive as constantes
   locais `GREEN` e `DARK`) e junta-los num unico `export const DOC_TOKENS`;
2. registrar a **decisao de negocio** por escrito: *"Decisão Q19: o papel impresso preserva a
   identidade da marca (verde institucional) e o app segue o Blue Premium — por isso este documento
   NÃO usa os tokens de UI"*;
3. aproveitar a passagem para eliminar duplicacao visual: um helper `sectionLabelStyle()` no lugar
   do mesmo bloco de estilo repetido 4x, e um `PANTONE_TH_STYLE` no lugar das 3 colunas identicas da
   tabela Pantone — por isso o arquivo **encolheu** de 715 para 712 linhas mesmo ganhando o bloco de
   tokens;
4. travar tudo com um teste novo (`MockupApprovalTemplate.tokens.test.tsx` + snapshot): nenhum hex
   literal fora de `DOC_TOKENS`, render identico antes/depois, e os avisos de rodape e de previa
   ("Gerado com IA" / "Composição Estática") continuam no documento.

**Historico que explica o resto:** a PR dessa branch e a **#2103**, `head v2/s33-2610081947`, e foi
**fechada sem merge** em 2026-10-09 (`gh api .../pulls/2103` -> `"merged":false,"state":"closed"`).
Dois dias depois a PR **#2111** (`ea132d2b4b`, 2026-10-11) refez o trabalho por conta propria — a
mensagem dela diz literalmente *"substitui #2103"* e *"refactor: centraliza cores do documento
timbrado em DOC_TOKENS (destrava #2111) ... puramente mecânico"* — trazendo o **teste** desta branch
e uma versao **mecanica** dos tokens, sem os helpers e sem a justificativa.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `export const DOC_TOKENS` centralizando as cores | **ESTA**, com outros nomes (`textDefault`, `borderLight`, `bgLight`, `whiteFull`…) | `origin/main:src/components/mockup/approval/MockupApprovalTemplate.tsx` linhas 6-34; commit `ea132d2b4b` "refactor: centraliza cores do documento timbrado em DOC_TOKENS" |
| teste-guarda `MockupApprovalTemplate.tokens.test.tsx` (116 linhas) | **ESTA**, praticamente identico | diff branch->main do arquivo tem **uma** linha de diferenca: main usa `<img {...props} alt={props.alt ?? ''} />`; `git log origin/main -- .../MockupApprovalTemplate.tsx` mostra `ea132d2b4b` "adiciona alt no mock de teste de tokens do timbrado" |
| snapshot `MockupApprovalTemplate.tokens.test.tsx.snap` | **ESTA**, e mais novo que o da branch | unica divergencia nos 14136 caracteres: `max-width: 160%` (branch) vs `max-width: 100%` (main), mudado de proposito em `51772daafd` 2026-10-29 "ficha sem corte, preview responsivo" |
| fim das constantes locais `GREEN` / `DARK` | **ESTA** (viraram `DOC_TOKENS.green` / `DOC_TOKENS.dark`) | `grep -n "color: DOC_TOKENS.green" origin/main:...` devolve 7 ocorrencias (linhas 128, 206, 422, 448, 501, 659, 692) |
| helper `sectionLabelStyle()` (rotulo de secao, 4 usos) | **NAO ESTA** | `git show origin/main:...MockupApprovalTemplate.tsx \| grep -n "sectionLabelStyle"` -> vazio; os blocos de estilo seguem repetidos (`letterSpacing: '0.5px'` aparece 10x no arquivo da main) |
| constante `PANTONE_TH_STYLE` (3 colunas identicas) | **NAO ESTA** | `grep -n "PANTONE_TH_STYLE"` na main -> vazio; `backgroundColor: DOC_TOKENS.dark` repetido nas linhas 516, 529, 542 da main |
| token `shadowFrame: 'rgba(0,0,0,0.08)'` | **NAO ESTA** — unica cor que ficou escrita na mao | `origin/main:...MockupApprovalTemplate.tsx:85` -> `boxShadow: '0 2px 12px rgba(0,0,0,0.08)'`; o teste-guarda so varre `#[0-9a-fA-F]{3,8}`, entao nao pega rgba |
| comentario com a decisao de negocio ("Decisão Q19", verde institucional x Blue Premium) | **NAO ESTA** | `git show origin/main:...MockupApprovalTemplate.tsx \| grep -n "Q19"` -> vazio; a main tem o bloco `DOC_TOKENS` sem nenhuma explicacao acima dele |
| nomes de token sem duplicata | **NAO ESTA** — a main tem `white: '#fff'` **e** `whiteFull: '#ffffff'`, `textDefault: '#333'` **e** `textDarkAlt: '#333333'` | `origin/main:...MockupApprovalTemplate.tsx` linhas 7-33 |
| custo em tamanho de arquivo | a main **cresceu**: 715 -> 737 linhas, e precisou subir o limite para 738 | `.file-size-baseline.json:58` na main = `738`; commit `ea132d2b4b` traz "chore(baseline): MockupApprovalTemplate.tsx +22 linhas no file-size baseline". A versao da branch fazia o mesmo com 712 linhas |

## A resgatar

1. **`src/components/mockup/approval/MockupApprovalTemplate.tsx` — o comentario da decisão Q19.**
   E o item de maior valor e o unico com risco real de negocio: hoje a main nao explica em lugar
   nenhum por que o documento que o cliente assina e verde enquanto o sistema e azul. Qualquer
   agente futuro que "padronize" esse arquivo com os tokens de interface troca a cor do papel
   timbrado da empresa sem perceber que esta contrariando uma decisao tomada.
2. **`src/components/mockup/approval/MockupApprovalTemplate.tsx` — `sectionLabelStyle()` e
   `PANTONE_TH_STYLE`.** Tiram 7 copias do mesmo bloco de estilo. Efeito pratico: hoje, mudar o
   titulo de uma secao do documento exige editar o mesmo codigo em 4 lugares (e a tabela Pantone em
   3), com risco de um deles ficar diferente dos outros. De quebra, devolve ~25 linhas de orcamento
   de tamanho de arquivo que a main gastou.
3. **`src/components/mockup/approval/MockupApprovalTemplate.tsx` — token `shadowFrame` para a sombra
   `rgba(0,0,0,0.08)` da linha 85.** E a unica cor que ficou fora da centralizacao na main, e o
   teste-guarda nao a pega porque so procura hex. Sem isso, a promessa "toda cor do timbrado vive em
   DOC_TOKENS" nao e verdadeira.

**NAO resgatar destes 3 arquivos** (traria regressao):
- o snapshot da branch e o `max-width/max-height: 160%` da imagem — a main trocou para `100%` de
  proposito em `51772daafd` ("ficha sem corte"); voltar o 160% corta/estoura a imagem do mockup na
  ficha de aprovacao;
- o mock do teste sem `alt` — a main tem `alt={props.alt ?? ''}`, que foi justamente a correcao de
  acessibilidade que motivou a PR #2111.

## Risco de fechar esta branch

Baixo e **sem efeito no que o cliente ve hoje**: o documento de aprovacao de mockup funciona, as
cores sao as mesmas e o teste que a propria branch escreveu esta rodando na main protegendo o
rodape, o aviso de previa e o verde das faixas. Fechar a branch nao quebra nada.

O que se perde e: (1) o registro escrito da decisao de que o papel impresso fica verde e o app fica
azul — um agente futuro pode "corrigir" isso e mudar a cara do documento que vai para o cliente; e
(2) a limpeza da duplicacao, que deixa o arquivo maior e com o mesmo estilo repetido em 7 lugares.
Nenhum dado, rota, tela, tabela ou permissao e afetado.

## Nao verificado

- Nao executei `npm test` nem `npm run qa:typecheck` nesta sessao (a tarefa e somente leitura);
  logo, que o teste-guarda esta **verde na main hoje** e inferencia a partir do snapshot da main
  coincidir com o codigo da main (unica divergencia conhecida, o `160%`, foi atualizada junto em
  `51772daafd`), nao medicao.
- Nao verifiquei por que a PR #2103 foi fechada sem merge (nao li os comentarios da PR); sei apenas
  que foi fechada em 2026-10-09 sem merge e que a #2111 se declara substituta dela.
- `arquivos_nao_lidos = 0`: os 3 arquivos foram lidos integralmente (o diff (A) do template vinha
  cortado no pacote e foi completado com `git diff c194982c 7eb5393696 -- <arquivo>`).
