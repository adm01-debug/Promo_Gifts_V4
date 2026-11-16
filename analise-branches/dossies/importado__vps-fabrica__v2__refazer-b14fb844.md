# origin/importado/vps-fabrica/v2/refazer-b14fb844

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** e o unico lugar do projeto onde estao escritas, juntas, as perguntas que o dono ainda precisa responder sobre a ferramenta de anuncios com IA (quanto cada vendedor pode gastar por dia, quem aprova o criativo antes de ir ao cliente, onde a imagem do anuncio fica guardada e quem ve a imagem de quem) mais a lista de problemas do modulo que nunca foram triados — nada disso existe na main hoje.
- **Tip / merge-base / main:** tip `7a04b5b6ee6c8de56943725126b3a5b4451b6def` · merge-base `df8b43a56baf9f82b999cb1d518dc114911d1509` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, so de documentacao (`fe5d5b0814` "docs(magic-up): resumo das auditorias de front e backend
para a entrevista do modulo" e `7a04b5b6ee` "docs(magic-up): corrige 3 fatos verificaveis do resumo"),
que criam **um unico arquivo novo**: `docs/MAGIC_UP_AUDITORIA_2026-10-08.md`, 159 linhas
(`git diff --name-status df8b43a5 7a04b5b6` → `A docs/MAGIC_UP_AUDITORIA_2026-10-08.md`, unica entrada).
Nao toca `src/`, `supabase/`, `scripts/`, `tests/` nem `.github/`.

O documento consolida duas auditorias do modulo Magic Up feitas em 08/10/2026 — front (serie **E**,
27 achados) e backend/edge (serie **F**, 13 achados) — porque, segundo a propria secao 1, **os relatorios
originais nao estao no repo**: ficaram em arquivos temporarios da sessao que os produziu. O arquivo tem
quatro conteudos de valor diferente:

1. **catalogo de 40 achados** com arquivo:linha e o cartao de correcao correspondente (`m01`…`m30`);
2. **6 decisoes de produto em aberto** (onde mora a imagem gerada, teto de custo por geracao, moderacao do
   criativo, compartilhamento publico, vinculo com orcamento, governanca da curadoria), cada uma ancorada
   num fato conferido no codigo, escritas como perguntas para a entrevista do dono;
3. **lista dos 11 achados sem cartao rastreavel** (E-13, E-17, E-19, E-27, F-01, F-03, F-04, F-06, F-10,
   F-11, F-12);
4. **estado das correcoes em 13/10/2026** (secao 5) — a parte que envelheceu.

**Duplicata exata:** o blob do arquivo e `e8ca87142878d392b6b1a71f74eaf1b448dd6c8e` nesta branch e nas tres
irmas `refazer-0b0b9032` (`86a179d62f`), `refazer-d295390f` (`f17c885ce0`) e `refazer-fc9bc61b`
(`baec0686ba`) — byte a byte igual. O resgate e **um**, nao quatro.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| O proprio documento `docs/MAGIC_UP_AUDITORIA_2026-10-08.md` | **NAO ESTA** | `git cat-file -e e4ab7f85:docs/MAGIC_UP_AUDITORIA_2026-10-08.md` → `fatal: path ... does not exist`; `git log --oneline origin/main -- docs/MAGIC_UP_AUDITORIA_2026-10-08.md` → vazio |
| Documento equivalente com outro nome | **NAO ESTA** | `git grep -li "Auditoria do módulo Magic Up" origin/main -- docs` → vazio; dos docs de Magic Up na main, `ADR_FRONTEIRA_MOCKUP_MAGICUP.md` e fronteira de modulo e `MAGIC_UP_ONDA5_A11Y.md` e guia de acessibilidade (`head` do arquivo: "Onda 5 a11y guideline") — nenhum traz achados nem perguntas |
| As 6 decisoes de produto (secao 3) | **NAO ESTAO** — e a main registra o vazio | `origin/main:docs/MOCKUP_DECISOES_2026-10-08.md:101` "**Plano próprio do Magic Up** — entrevista ainda a fazer"; `origin/main:docs/auditoria-planejado-nao-executado-2026-10-11/A05_magazine_mockup_ia.md:219` (MU-001) "Nenhum documento de plano do Magic Up no repo" |
| 3.1 imagem do anuncio gravada inteira (base64) dentro da tabela — F-02/E-1, cartao `m27` | **continua assim na main** → pergunta de negocio viva | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:223` `generated_image_url: data.imageUrl`; leitura do historico em `:543` |
| 3.3 moderacao automatica do criativo | **NAO EXISTE na main** → pergunta de negocio viva | `git grep -rin "moderation\|moderacao" origin/main -- src/components/magic-up src/pages/magic-up supabase/functions/generate-ad-image supabase/functions/generate-ad-prompt supabase/functions/magic-up-score` → zero resultados |
| 3.5 criativo nao entra em orcamento/proposta | **continua assim na main** → pergunta de negocio viva | `git grep -rin "magic_up" origin/main -- src/components/quotes src/hooks/quotes src/lib/quotes` → zero resultados |
| E-4 / cartao `m02` (pontuacao de qualidade sem tempo limite nem nova tentativa) | **continua aberto na main** | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:100` ainda chama `supabase.functions.invoke<MagicUpQualityDiagnosis>(` direto, fora do padrao `safeInvokeCall` |
| E-8 / cartao `m04` (lote engole a excecao e se diz concluido) | **continua aberto na main** | `origin/main:src/hooks/intelligence/useMagicUpGeneration.ts:288-291`: o `catch` so faz `log.error` + `toast.error` e o `finally` zera `setGenerating(false)`; nada propaga a falha |
| B F-18 / cartao `m29` (importa o barril `@/hooks/mockup` inteiro) | **continua aberto na main** | `origin/main:src/hooks/intelligence/useMagicUpState.ts:13` `import { useProductCustomizationOptionsForMockup } from '@/hooks/mockup';` |
| E-3, E-6 (compartilhar com imagem no link; Brand Kit apagando edicao local) | **ENTRARAM**, refatorados em arquivos proprios | `origin/main:src/hooks/intelligence/magicUpShare.ts` e `origin/main:src/hooks/intelligence/magicUpBrandKitSync.ts` existem (`git ls-tree -r --name-only origin/main \| grep -i magic`) |
| E-14, E-20, E-21, E-22, E-23, E-24, E-25 (timeout do prompt, tokens, i18n, aria-label, radiogroup, teclado, interativo aninhado) | **ENTRARAM** — cada um tem teste proprio na main | `tests/components/magic-up-prompt-generator.timeout.test.tsx`, `magic-up-config.tokens.test.tsx`, `magic-up-creative.i18n.test.tsx`, `magic-up-config.a11y.test.tsx`, `magic-up-curation.a11y.test.tsx`, `magic-up-variations.keyboard.test.tsx`, `magic-up-result-panel-keyboard.test.tsx`, `magic-up-gallery.nested.test.tsx` |
| F-05 / F-07 (payload sem teto em `magic-up-score` e `word-magic`) | **ENTRARAM** | `origin/main:supabase/functions/magic-up-score/index.limits.test.ts` e `origin/main:supabase/functions/word-magic/index.limits.test.ts` |
| F-08 (`word-magic` sem cota) | **ENTROU** — a afirmacao do documento ficou velha | `origin/main:supabase/functions/word-magic/index.ts:188` `const quota = await acquireAiQuota(auth.userId, AI_FUNCTION_NAME, DEEPSEEK_MODEL);` (recusa em `:189`) |
| 3.7, 1o item: flag `magic_up` "nao governa nada" | **CORRIGIDO na main** — afirmacao velha | `origin/main:src/lib/feature-flags.ts:37,96` definem a flag; ela governa a tela do modulo |
| Secao 5 ("nenhum dos 18 cartoes esta integrado ao main") | **FALSO hoje** | contrariado pelas 5 linhas acima (E-3, E-6, E-14, E-20…E-25, F-05, F-07, F-08 estao na main) |
| As linhas citadas pelo documento | **deslocadas** | o documento cita `useMagicUpState.ts` com 1025 linhas e tecnica/local em `:128-129`; na main o arquivo tem 851 linhas (`git show origin/main:src/hooks/intelligence/useMagicUpState.ts \| wc -l`) e `:124-132` e busca de cliente — por isso o resgate pede reconferencia, nao copia |
| Os 11 achados sem cartao (E-13, E-17, E-19, E-27, F-01, F-03, F-04, F-06, F-10, F-11, F-12) | **NAO ESTAO** em nenhum lugar do repo | os relatorios originais nao existem no repo (secao 1 do documento) e o unico registro deles e este arquivo, ausente da main |

## A resgatar

Nao copiar o arquivo como esta: a secao 5 e o 1o item da 3.7 afirmariam hoje coisa falsa. O que precisa ir
para um documento da main, reconferido linha a linha:

1. **As 6 perguntas de negocio (secao 3)** — onde a imagem do anuncio fica guardada e quem ve a de quem;
   teto de gasto de geracao por vendedor/dia e quem pode usar o modo caro ("pro"); se o criativo passa por
   aprovacao humana antes de ir ao cliente e o que e proibido; se o cliente aprova por link publico e se
   esse link expira; se o criativo aprovado entra no orcamento e quem paga a geracao; quem pode marcar
   "aprovado pelo cliente". **Por que importa:** sao decisoes de dono (custo, permissao, quem ve o que) que
   a propria main reconhece como pendentes (`docs/MOCKUP_DECISOES_2026-10-08.md:101`) e que nenhum
   documento da main enuncia.
2. **A lista dos 11 achados sem cartao (secao 4).** **Por que importa:** apagar a branch apaga a unica
   prova de que esses 11 problemas foram levantados em 08/10/2026, sem ninguem saber se eram defeito
   esquecido ou decisao de produto.
3. **Os defeitos que continuam abertos**, confirmados por leitura da main:
   `useMagicUpGeneration.ts:100` (pontuacao de qualidade sem tempo limite — a tela fica "gerando" com a
   imagem ja paga invisivel), `useMagicUpGeneration.ts:288-291` (um lote pode falhar inteiro e se dizer
   concluido) e `useMagicUpState.ts:13` (acoplamento com o modulo de mockup). **Por que importa:** dinheiro
   gasto em geracao que o vendedor nao recebe, sem aviso.
4. **As duas propostas sem arquivo**: indice composto do historico (F-09 / `m28`) e bucket privado para a
   imagem (F-02 / `m27`, nasceu bloqueado esperando o dono). **Por que importa:** o historico carrega 50
   imagens inteiras em base64 por vez (`useMagicUpGeneration.ts:223,543`) — e o que deixa o Magic Up lento
   e caro; sair do base64 e decisao do dono, nao so codigo.

Processo: ja existe item de trabalho aberto com esse mesmo escopo ("Consolidar o dossie do Magic Up:
7 defeitos abertos + 6 decisoes de negocio") e tres branches irmas com o arquivo identico — o resgate deve
ser feito **uma vez**, e as quatro branches fecham juntas depois.

## Risco de fechar esta branch

Fechar sem resgatar apaga do projeto as 6 perguntas que o dono ainda precisa responder sobre a ferramenta
de anuncios com IA — incluindo quanto cada vendedor pode gastar e quem aprova o criativo antes de ele
chegar ao cliente — e apaga a unica lista existente de 11 problemas levantados em 08/10/2026 que nunca
foram triados. Efeito pratico: a entrevista do modulo tera de ser refeita do zero e o Magic Up continua
gerando imagens pagas sem revisao de conteudo, com a imagem inteira dentro do banco e sem registro de que
isso e uma pendencia. **Nao ha risco tecnico** (a branch nao tem codigo, migration nem edge function);
o risco e so de perda de informacao de negocio.

## Nao verificado

- **Nao reconferi os 40 achados um por um.** Verifiquei por leitura da main 14 linhas da tabela acima:
  3 perguntas de negocio ainda validas, 3 defeitos ainda abertos, 11+ achados incorporados e 3 afirmacoes
  do documento que envelheceram. Sem evidencia propria sobre E-7, E-9, E-11, E-12, E-18, F-13 e os 11 sem
  cartao — e por isso o resgate pede reconferencia, nao copia.
- **E-10 pode estar so parcialmente corrigido:** a main grava `prompt_text: deps.fullPromptPreview ||
  deps.effectivePrompt` (`useMagicUpGeneration.ts:225`); nao confirmei se `fullPromptPreview` e o prompt
  que o servidor montou ou ainda um resumo em portugues.
- **Teto de custo (3.2):** existe cota por usuario em `word-magic` (`index.ts:188`), mas nao verifiquei se
  o caminho de geracao de imagem (`generate-ad-image`) tambem a usa, nem qual e o teto configurado — a
  pergunta de negocio (quanto por vendedor/dia, quem usa "pro") segue aberta.
- **F-09 (indices do historico):** `magic_up_generations` aparece em varias migrations da main
  (`git grep -rln magic_up_generations origin/main -- supabase/migrations`), mas nao conferi se o indice
  composto `(user_id, created_at desc)` existe; nao consultei o banco de producao.
- **MU-006 (qual provedor/modelo de IA roda de fato):** depende da tabela `ai_function_routing` no banco
  vivo, fora do repo. Nao consultei o banco.
- **Arquivos sem leitura por truncamento: 0.** A branch mexeu em 1 arquivo e o pacote traz os dois diffs
  completos.
