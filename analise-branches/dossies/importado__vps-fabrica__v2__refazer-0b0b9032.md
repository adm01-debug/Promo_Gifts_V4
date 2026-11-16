# origin/importado/vps-fabrica/v2/refazer-0b0b9032

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** e o unico lugar onde estao escritas, juntas, as perguntas que o dono precisa responder sobre o Magic Up (quem paga a geracao de anuncio com IA, quanto cada vendedor pode gastar, quem aprova o criativo antes de ir ao cliente, onde a imagem fica guardada) mais a lista de defeitos do modulo ainda nao corrigidos — nada disso existe na main hoje.
- **Tip / merge-base / main:** tip `86a179d62f946bd245f198e66d3212ad283407d5` · merge-base `1a07395613ca8bb6fde5ed7b40c5347ce21801b8` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, so de documentacao (`d863fbba71` "docs(magic-up): resumo das auditorias de front e backend
para a entrevista do modulo" e `86a179d62f` "docs(magic-up): corrige 3 fatos verificaveis do resumo").
Criam **um unico arquivo novo**, `docs/MAGIC_UP_AUDITORIA_2026-10-08.md` (159 linhas), que consolida duas
auditorias do modulo Magic Up feitas em 08/10/2026 — front (serie **E**, 27 achados) e backend/edge
(serie **F**, 13 achados) — porque **os relatorios originais nao estao no repo**: ficaram em arquivos
temporarios da sessao que os produziu (documento, secao 1).

O arquivo tem quatro conteudos distintos:

1. **Catalogo de defeitos** com arquivo:linha conferido e o cartao de correcao correspondente (`m01`…`m30`);
2. **6 decisoes de produto em aberto** (onde mora a imagem, teto de custo por geracao, moderacao do
   criativo, compartilhamento publico, vinculo com orcamento, governanca da curadoria) — escritas como
   perguntas para a entrevista do dono, cada uma ancorada num fato conferido no codigo;
3. **Lista dos achados sem cartao rastreavel**: front E-13, E-17, E-19, E-27; backend F-01, F-03, F-04,
   F-06, F-10, F-11, F-12 (11 dos 40);
4. **Estado das correcoes em 13/10/2026** — a parte que envelheceu (ver "Nao verificado"/ressalva abaixo).

A branch **nao** altera codigo, teste, migration nem edge function: o diff (A) do pacote mostra um unico
`new file mode` e o diff (B) mostra `deleted file mode` — isto e, o arquivo simplesmente **nao existe na
main**.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| O proprio documento `docs/MAGIC_UP_AUDITORIA_2026-10-08.md` | **NAO ESTA** | `git ls-tree -r --name-only origin/main \| grep -i magic` lista 68 caminhos de Magic Up e nenhum documento de auditoria; `git log --all --diff-filter=A -- docs/MAGIC_UP_AUDITORIA_2026-10-08.md` → so 4 commits, todos em branches `importado/*`, nenhum na main |
| Os codigos de achado da auditoria (E-13, E-17, E-19, E-27, F-01, F-03, F-04, F-06, F-10, F-11, F-12) | **NAO ESTAO** em nenhum documento | `git grep -n "E-13\|E-17\|E-19\|E-27\|F-01\|F-03\|F-04\|F-06\|F-10\|F-11\|F-12" origin/main -- docs` so retorna series alheias (`BUG-SF-*`, `P1-PERF-*`, `BUG-CF-*`) |
| As 6 decisoes de produto do Magic Up (secao 3) | **NAO ESTAO**: a propria main registra o vazio | `docs/MOCKUP_DECISOES_2026-10-08.md:101` — "**Plano proprio do Magic Up** — entrevista ainda a fazer"; `docs/auditoria-planejado-nao-executado-2026-10-11/A05_magazine_mockup_ia.md:219` (MU-001) — "Nenhum documento de plano do Magic Up no repo" |
| 3.1 imagem gerada em base64 dentro da tabela (defeito F-02 / cartao m27, bloqueado) | **continua assim na main** → pergunta de negocio viva | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:223` grava `generated_image_url: data.imageUrl` e `:543` le de volta; a main decidiu so a pasta, nao a migracao (`docs/MOCKUP_DECISOES_2026-10-08.md:73`, Q-D: "Entra **so na estrutura**") |
| 3.3 moderacao automatica do criativo | **NAO EXISTE na main** → pergunta de negocio viva | `git grep -iln "moderation\|moderacao" origin/main -- src/components/magic-up src/pages/magic-up src/hooks/intelligence supabase/functions/generate-ad-image supabase/functions/generate-ad-prompt supabase/functions/magic-up-score` = vazio |
| E-4 / cartao m02 (pontuacao de qualidade chamada sem tempo limite nem nova tentativa) | **continua aberto na main** | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:100-101` ainda usa `supabase.functions.invoke<MagicUpQualityDiagnosis>('magic-up-score', …)` direto, fora do padrao `safeInvokeCall` |
| E-8 / cartao m04 (lote engole a excecao) | **continua aberto na main** | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:288-291`: o `catch` registra e mostra toast, nao propaga — a fila nao distingue falha total de sucesso |
| E-3 (link de WhatsApp com a imagem embutida) | **ENTROU** (refatorado para arquivo proprio) | `origin/main:src/hooks/intelligence/magicUpShare.ts` existe; `git log --oneline origin/main` → `0fbb37bfeb fix(magic-up): compartilhar nunca embute a imagem no link` |
| E-6 (Brand Kit do servidor apagava edicao local) | **ENTROU** | `origin/main:src/hooks/intelligence/magicUpBrandKitSync.ts`; commit `3eaeeeed84 fix(magic-up): brand kit do servidor nao apaga edicoes locais nem desfaz a logo principal (E-6)` |
| E-14, E-20, E-21, E-22, E-23, E-24, E-25 (tempo limite do prompt, tokens, i18n, aria-label, radiogroup, teclado, interativo aninhado) | **ENTRARAM** (ha teste proprio de cada um na main) | `tests/components/magic-up-prompt-generator.timeout.test.tsx`, `magic-up-config.tokens.test.tsx`, `magic-up-creative.i18n.test.tsx`, `magic-up-config.a11y.test.tsx`, `magic-up-curation.a11y.test.tsx`, `magic-up-variations.keyboard.test.tsx` + `magic-up-result-panel-keyboard.test.tsx`, `magic-up-gallery.nested.test.tsx` (todos em `git ls-tree -r origin/main`) |
| F-05 / F-07 / F-08 (payload sem teto em `magic-up-score` e `word-magic`) | **ENTRARAM** | `origin/main:supabase/functions/magic-up-score/index.limits.test.ts` e `origin/main:supabase/functions/word-magic/index.limits.test.ts` |
| E-10 (o prompt gravado era o resumo em portugues, nao o prompt do servidor) | **ENTROU, pelo menos em parte** | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:225` grava `prompt_text: deps.fullPromptPreview \|\| deps.effectivePrompt` |
| 3.7, 1o item: a flag `magic_up` "nao governa nada e descreve o modulo errado" | **CORRIGIDO na main** — a afirmacao do documento esta velha | `origin/main:src/lib/feature-flags.ts:96-98` → `description: 'Geração de criativos com IA (Magic Up)'`; e `origin/main:src/pages/tools/MagicUp.tsx:163` → `if (!isFeatureEnabled('magic_up'))` (a flag governa a tela) |
| Secao 5 do documento ("18 cartoes… **nenhum** esta integrado ao main") | **FALSO hoje** | contrariado pelas 4 linhas acima: pelo menos 11 dos achados viraram codigo/teste na main |

## A resgatar

Nao copiar o arquivo como esta (a secao 5 e o 1o item da 3.7 afirmariam coisa falsa hoje). O que tem de ser
preservado, reconferido linha a linha e levado para um documento da main:

1. **As 6 perguntas de negocio do Magic Up** (`docs/MAGIC_UP_AUDITORIA_2026-10-08.md`, secao 3): onde a
   imagem do anuncio fica guardada e quem ve a imagem de quem; teto de gastos de geracao por vendedor/dia e
   quem pode usar o modo caro ("pro"); se o criativo passa por aprovacao humana antes de ir ao cliente e o
   que e proibido; se o cliente aprova por link publico e se esse link expira; se o criativo aprovado entra
   no orcamento e quem paga a geracao; quem pode marcar "aprovado pelo cliente" na curadoria.
   **Por que importa:** sao 6 decisoes de dono (custo, permissao, quem ve o que) que a main reconhece como
   pendentes (`docs/MOCKUP_DECISOES_2026-10-08.md:101`) e que nenhum documento da main enuncia.
2. **A lista dos 11 achados sem cartao** (secao 4: E-13, E-17, E-19, E-27, F-01, F-03, F-04, F-06, F-10,
   F-11, F-12). **Por que importa:** os relatorios originais nao existem no repo; se esta branch for
   apagada, desaparece a unica prova de que esses 11 achados existiram, sem ninguem saber se eram defeito
   esquecido ou decisao de produto.
3. **Os defeitos do catalogo que continuam abertos na main** — confirmados por leitura:
   `useMagicUpGeneration.ts:100-101` (pontuacao de qualidade sem tempo limite: o cliente fica com a tela
   "gerando" e a imagem ja paga invisivel) e `useMagicUpGeneration.ts:288-291` (um lote pode falhar inteiro
   e se dizer concluido). **Por que importa:** dinheiro gasto em geracao que o vendedor nao recebe, sem
   aviso.
4. **A proposta de indice do historico (F-09 / cartao m28) e a de bucket privado (F-02 / cartao m27)**,
   citadas no documento como proposta SQL sem arquivo. **Por que importa:** a tela de historico carrega 50
   imagens inteiras em base64 por vez (`useMagicUpGeneration.ts:223,543`) — e o que deixa o Magic Up lento
   e caro; sair do base64 exige decisao do dono, nao so codigo.

Observacao de processo: ja existe item de trabalho aberto com esse mesmo escopo ("Consolidar o dossie do
Magic Up: 7 defeitos abertos + 6 decisoes de negocio"), o que reforca que o resgate e necessario e nao
duplica nada.

## Risco de fechar esta branch

Apagar esta branch apaga do historico do projeto as 6 perguntas que o dono ainda precisa responder sobre a
ferramenta de anuncios com IA — inclusive quanto cada vendedor pode gastar e quem aprova o criativo antes
de ele chegar ao cliente — e apaga a unica lista existente de 11 problemas levantados em 08/10/2026 que
nunca foram triados (os relatorios originais nao estao no repo, segundo a secao 1 do proprio documento).
Consequencia pratica: a entrevista do modulo tera de ser refeita do zero, e o modulo continua gerando
imagens pagas sem teto de custo, sem revisao de conteudo e com a imagem inteira dentro do banco, sem que
isso esteja escrito em lugar nenhum. Nao ha risco tecnico em fechar (a branch nao tem codigo), apenas perda
de informacao de negocio.

## Nao verificado

- **Nao reconferi os 40 achados um por um.** Verifiquei, por leitura da main, 13 linhas da tabela acima:
  4 ainda abertas, 1 corrigida de forma parcial, 11 incorporadas e 2 afirmacoes do documento que
  envelheceram. Dos demais achados (E-7, E-9, E-11, E-12, E-18, F-13, B F-18 e os 11 sem cartao) nao tenho
  evidencia propria — e por isso que o resgate pede reconferencia linha a linha, nao copia.
- **E-10 pode estar so parcialmente corrigido:** a main grava `fullPromptPreview || effectivePrompt`
  (`useMagicUpGeneration.ts:225`); nao confirmei se `fullPromptPreview` e o prompt que o servidor montou ou
  ainda um resumo em portugues.
- **Teto de custo (3.2):** a main ganhou teto de *tamanho de payload* (`index.limits.test.ts` nas duas
  edges), mas nao verifiquei se existe cota por vendedor/dia (`acquire_ai_quota`) — a pergunta de negocio
  permanece aberta por falta dessa verificacao.
- **MU-006 (qual provedor de IA roda de fato):** depende da tabela `ai_function_routing` no banco vivo,
  fora do repo (`A05_magazine_mockup_ia.md:224` diz o mesmo). Nao consultei o banco.
- **Arquivos sem leitura por truncamento: 0.** A branch mexeu em 1 arquivo e o pacote traz os dois diffs
  completos.
