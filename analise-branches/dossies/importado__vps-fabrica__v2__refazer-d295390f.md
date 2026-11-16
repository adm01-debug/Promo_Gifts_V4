# origin/importado/vps-fabrica/v2/refazer-d295390f

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** guarda, em um unico documento, os defeitos ainda vivos do Magic Up (a ferramenta que cria a imagem de anuncio) e as 6 perguntas de negocio que ninguem respondeu ainda — hoje essa lista nao existe em nenhum lugar do sistema.
- **Tip / merge-base / main:** tip `f17c885ce0a21eb14240bd08d640b11301fb032b` · merge-base `1b59d0f5775850b20a8929a9db8c38d6183ab05a` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos de documentacao (`docs(magic-up): resumo das auditorias de front e backend para a
entrevista do modulo` e `docs(magic-up): corrige 3 fatos verificaveis do resumo`). Conteudo proprio:
**um unico arquivo novo**, `docs/MAGIC_UP_AUDITORIA_2026-10-08.md` (159 linhas) —
`git diff --stat 1b59d0f577 f17c885ce0` = `1 file changed, 159 insertions(+)`. Nao toca `src/`,
`supabase/`, `scripts/` nem `.github/`.

O documento consolida duas auditorias do modulo Magic Up feitas em 08/10/2026 (front: 27 achados da
serie E; backend/edge: 13 achados da serie F) porque **os relatorios originais nao existem no repo**
("ficaram em arquivos temporarios da sessao que os produziu", linhas 10-11 do arquivo). Ele tem 5 partes:
§2 tabela de defeitos com arquivo:linha, §3 as 6 decisoes de negocio que as correcoes deliberadamente
nao resolveram, §4 os achados da auditoria que nao viraram cartao nenhum, §5 como reconferir.

Fato relevante: as outras 3,5 mil diferencas entre a branch e a main sao **defasagem** (a branch partiu
de uma main de 13/10/2026). O unico conteudo proprio e esse arquivo. E ele e **identico byte a byte** em
4 branches: `refazer-0b0b9032`, `refazer-b14fb844`, `refazer-d295390f`, `refazer-fc9bc61b` — todas
apontam para o mesmo blob `e8ca87142878d392b6b1a71f74eaf1b448dd6c8e`. Resgatar **uma vez** resolve as quatro.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| O documento em si | **NAO ESTA** | `git cat-file -t origin/main:docs/MAGIC_UP_AUDITORIA_2026-10-08.md` → `fatal: path ... does not exist in 'origin/main'` |
| §4 — achados sem cartao (E-13, E-17, E-19, E-27, F-01, F-03, F-04, F-06, F-10, F-11, F-12) | **NAO ESTA** em nenhum doc da main | `git grep -i "27 achados\|serie E\|E-27" origin/main` → zero resultados de conteudo (so arquivos de auditoria de branch que citam o **nome** do arquivo) |
| §3 — as 6 decisoes de negocio (onde mora a imagem, custo por geracao, moderacao, link publico, vinculo com orcamento, curadoria) | **NAO ESTA**; a main tem o equivalente so do **Mockup** | `origin/main:docs/MOCKUP_DECISOES_2026-10-08.md:1` ("Decisoes do dono sobre o modulo Mockup"); nao existe `MAGIC_UP_DECISOES` |
| E-3 (compartilhar com imagem dentro do link) | **CORRIGIDO** na main | `origin/main:src/hooks/intelligence/magicUpShare.ts:4` ("o link `wa.me/?text=` leva apenas a descricao + o nome do criativo") e `:52` |
| E-6 (brand kit apagando edicoes) | **CORRIGIDO** na main | `origin/main:src/hooks/intelligence/magicUpBrandKitSync.ts` existe; `origin/main:analise-branches/auditoria-261115/VEREDITO_106_APAGADAS.md:100` registra m07 INCORPORADA |
| E-14 (tempo limite de 10 s no prompt) | **CORRIGIDO** na main | `origin/main:src/components/magic-up/PromptGenerator.tsx:188` → `timeoutMs: 60_000`; teste `tests/components/magic-up-prompt-generator.timeout.test.tsx` |
| F-13 (import morto nas edges) | **CORRIGIDO** na main | `origin/main:supabase/functions/generate-ad-image/index.imports.test.ts:2` ("Guarda de imports das edges do Magic Up (F-13 ...)") |
| F-05/F-07 (payload sem teto no score) | **CORRIGIDO** na main | `origin/main:supabase/functions/magic-up-score/index.ts:8-22` (`// F-07 (2026-10-09)`, `MAX_REQUEST_BYTES`, `MAX_IMAGE_URL_BYTES`, `MAX_TEXT_LENGTHS`) |
| F-08 (copy sem cota) | **CORRIGIDO** na main | `origin/main:supabase/functions/word-magic/index.ts:185` ("Quota atomica do usuario (`acquire_ai_quota` ...)"); `word-magic/index.limits.test.ts` |
| E-20…E-26 (tokens, aria-label, i18n, radiogroup, teclado, interativo aninhado, testes falsos) | **CORRIGIDOS** na main | testes proprios na main: `tests/components/magic-up-config.tokens.test.tsx`, `magic-up-config.a11y.test.tsx`, `magic-up-creative.i18n.test.tsx`, `magic-up-curation.a11y.test.tsx`, `magic-up-gallery.nested.test.tsx`, `magic-up-result-panel-keyboard.test.tsx` |
| E-4 (pontuacao de qualidade sem tempo limite nem nova tentativa) | **NAO ESTA** — defeito vivo | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:100-101` chama `supabase.functions.invoke<...>('magic-up-score')` direto, fora do `safeInvokeCall` |
| E-7 (geracao paga sem cancelamento nem chave de idempotencia) | **NAO ESTA** — defeito vivo | `git grep -n "AbortController\|idempot" origin/main -- src/hooks/intelligence/useMagicUpGeneration.ts` → zero resultados |
| E-9 (campos que a edge nao devolve) | **NAO ESTA** — defeito vivo | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:161-165` (tipos `outputChannel`/`qualityMode`/`compositionMode`), envio em `:187-190`, leitura em `:227,252` |
| E-10 (prompt gravado e o resumo, nao o prompt real) | **NAO ESTA** — defeito vivo | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:225` → `prompt_text: deps.fullPromptPreview \|\| deps.effectivePrompt` |
| F-02/E-1 (imagem em base64 dentro da tabela) | **NAO ESTA** — defeito vivo (era o cartao m27, bloqueado) | gravacao em `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:223` (`generated_image_url: data.imageUrl`), leitura em `:543` |
| B F-18 (import do barril do mockup) | **NAO ESTA** — defeito vivo | `origin/main:src/hooks/intelligence/useMagicUpState.ts:13` → `import { useProductCustomizationOptionsForMockup } from '@/hooks/mockup'` |

## A resgatar

1. **`docs/MAGIC_UP_AUDITORIA_2026-10-08.md` §3 — as 6 decisoes de negocio sem resposta.** Sao as unicas
   perguntas escritas do modulo: onde a imagem gerada passa a morar e quem ve a imagem de quem; teto de
   gerações pagas por vendedor e quem pode usar o modo "pro"; se o criativo passa por aprovacao humana e o
   que e proibido; se o cliente aprova por link publico que expira; se o criativo aprovado entra no
   orcamento e quem paga a geracao; qual e o fluxo oficial de curadoria e quem pode marcar
   "aprovado pelo cliente". Nada disso esta na main (o equivalente existe so para o Mockup, em
   `docs/MOCKUP_DECISOES_2026-10-08.md`).
2. **§4 — os 11 achados de auditoria que nunca viraram cartao** (front E-13, E-17, E-19, E-27; backend
   F-01, F-03, F-04, F-06, F-10, F-11, F-12). Os relatorios originais nao existem no repo; essa lista de
   codigos e o unico vestigio de que eles foram encontrados.
3. **§2, reduzido aos 6 defeitos que continuam vivos na main** (E-4, E-7, E-9, E-10, F-02/E-1 e B F-18),
   com o arquivo:linha ja reconferido na main de hoje na tabela acima. Os outros ~17 itens de §2 estao
   corrigidos e devem ser **removidos** no resgate, para o documento nao voltar com retrato vencido.

Forma sugerida do resgate: um doc novo e curto (ex. `docs/MAGIC_UP_PENDENCIAS.md`) com esses tres blocos,
em vez de reviver o arquivo de 159 linhas como estava. Resgatar uma vez cobre as 4 branches gemeas.

## Risco de fechar esta branch

Fechar sem resgatar **nao quebra nada em producao** (a branch nao tem codigo). O que se perde e memoria:
as 6 perguntas de negocio do Magic Up voltam a nao existir por escrito, e os 11 achados de auditoria sem
cartao deixam de ter qualquer registro — os relatorios originais nunca entraram no repo, conforme o
proprio documento (linhas 10-11). Na pratica, a tarefa "Consolidar o dossie do Magic Up: 7 defeitos
abertos + 6 decisoes de negocio", que ja esta na fila de pendencias, ficaria sem a sua fonte.
Risco oposto (resgatar o arquivo inteiro como esta): §2 afirma que 18 correcoes "nao estao integradas ao
main", o que **era** verdade em 13/10 e hoje e falso — reviver o texto cru faria o dono tomar decisao com
dado vencido.

Registro de divergencia: a auditoria anterior da main classificou as 4 gemeas como DESCARTAR
(`origin/main:analise-branches/auditoria-261115/veredito_lote03.md:148-151`), mas o painel consolidado da
mesma auditoria manteve `refazer-0b0b9032 (Magic Up §3/§4)` como "BAIXA docs -> docs trem final"
(`origin/main:analise-branches/auditoria-261115/VEREDITOS_165_BRANCHES.md:51`). Este dossie fica com a
segunda leitura: §2 esta vencido, §3 e §4 nao estao na main e tem valor.

## Nao verificado

- **E-8** (lote que termina em "concluida" mesmo com falha), **E-11** (resposta em voo do produto
  anterior), **E-12** (tecnica/local em dois estados) e **E-18** (re-render do painel inteiro): a main
  reescreveu os dois hooks (`useMagicUpState.ts` tem 851 linhas hoje contra 1025 citadas no documento) e
  nao reconferi o comportamento de cada um; nao afirmo nem que estao corrigidos nem que estao vivos.
- **m28** (indices compostos no historico) e **m27** (bucket privado): o documento so propoe SQL; nao
  consultei o banco de producao para ver se os indices ja existem.
- Se algum dos 11 achados de §4 virou cartao em outro lote: os relatorios originais das series E e F nao
  estao no repo, entao nao ha como conferir aqui.
- Arquivos sem leitura por truncamento: **0** (a branch mexeu em 1 arquivo e ele foi lido inteiro).
