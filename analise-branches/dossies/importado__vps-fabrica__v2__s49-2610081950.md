# origin/importado/vps-fabrica/v2/s49-2610081950

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** separa no papel duas ferramentas que estavam descritas como uma so — o gerador de mockup (monta logo sobre o produto, sem IA) e o Magic Up (cria peca de anuncio com IA) — para que cada uma tenha dono, criticidade e teste proprios.
- **Tip / merge-base / main:** tip `96ce55d354d85f9fd0cd6114243e6647623dd7d4` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit, `96ce55d354` — "docs(adr): separar fronteira Mockup x Magic Up e corrigir docs de
lifecycle" — alterando **3 arquivos, todos `.md`** (`git diff --name-status c194982c5 96ce55d354`:
`A docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md`, `M docs/MATRIZ_FLUXOS_CRITICOS_2026-08-29.md`,
`M docs/READINESS_LIFECYCLE_FEATURES_2026-08-29.md`). Nenhum arquivo de codigo, migration, policy
ou edge function.

A intencao era tripla:
1. criar um ADR registrando que Mockup e Magic Up sao modulos independentes (rota, pagina, hooks,
   edge functions, tabelas, bucket e flag de cada um), com owner Joaquim e criticidade C1;
2. tirar `/magic-up`, "IA externo gerenciado" e a flag `magic_up` da linha do Mockup na matriz de
   fluxos criticos e no painel de readiness, criando linha propria para o Magic Up (fluxo 13);
3. registrar as pendencias de codigo que a separacao expos (descricao errada da flag `magic_up`,
   assistente "Matheus" simulado, tabelas/RPCs sem consumidor).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| ADR da fronteira Mockup x Magic Up (arquivo novo) | `docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md`, versao ampliada | `git log --follow origin/main -- docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md` -> `446a46f8a5 docs(adr): fronteira entre Mockup e Magic Up (#2087)`; `git show --stat 446a46f8a5` lista exatamente os 3 mesmos arquivos da branch |
| ADR: tabela modulo x artefato (rotas, paginas, componentes, hooks, edges, tabelas, storage, flag, kill switch, owner, criticidade) | presente e expandida (ganhou linha "Codigo compartilhado", detalhe de `generated_mockups` / `art_file_attachments`, roteamento `ai_function_routing`) | diff (B) do pacote: todas as linhas da secao 3 da branch aparecem como contexto ou substituidas por versao mais completa; nenhuma removida |
| ADR: secao 4 de evidencia por `git grep` | presente, com 3 linhas a mais (roteamento de IA, tabelas do Mockup separadas das do Magic Up, "so no schema") | diff (B): linhas `+| Roteamento de IA |`, `+| Tabelas do Mockup |`, `+| So no schema |` |
| ADR: pendencias de codigo (flag `magic_up`, Matheus simulado, tabelas sem consumidor) | presentes e ampliadas de 3 para 5 itens (soma a Edge `mockup-assistant` com DeepSeek Flash e o bucket `mockup-assets` publico) | diff (B), secao 5 da main |
| ADR: status `PROPOSTO ... aguarda [VALIDACAO PO]` | main evoluiu para `ACEITO pelo dono (Joaquim)`, mantendo que o registro `[VALIDACAO PO]` em PR continua necessario | diff (B), primeiras linhas: `-- **Status:** PROPOSTO` / `+- **Status:** ACEITO pelo dono (Joaquim)` |
| Matriz: linha 8 (Mockup) sem `/magic-up` e sem IA | `docs/arquivo/2026-08/MATRIZ_FLUXOS_CRITICOS_2026-08-29.md:25` — texto identico ao da branch, com owner preenchido (`Joaquim` em vez de `TBD`) | `git show origin/main:docs/arquivo/2026-08/MATRIZ_FLUXOS_CRITICOS_2026-08-29.md \| grep -n "^\| 8 "` |
| Matriz: linha 13 (Magic Up) nova | mesmo arquivo, linha 30 — presente, com owner `Joaquim` e 3 testes citados que a branch nao tinha | mesma saida, linha 30 |
| Matriz: Magic Up na lista de decisoes pendentes do PO | mesmo arquivo, linha 65 (`\| Magic Up \| Joaquim (decidido no ADR) \| C1 \|...`) — item que a branch nao tinha | mesma saida, linha 65 |
| Readiness: linha Mockup sem flag e sem IA | `docs/arquivo/2026-08/READINESS_LIFECYCLE_FEATURES_2026-08-29.md:20` — identica a da branch, com a ressalva extra do Matheus | `git show origin/main:docs/arquivo/2026-08/READINESS_LIFECYCLE_FEATURES_2026-08-29.md \| grep -n "Magic Up"` |
| Readiness: linha Magic Up nova | mesmo arquivo, linha 21 — **texto literalmente identico** ao da branch | mesma saida, linha 21 |
| Os 2 arquivos `*_2026-08-29.md` "sumiram" da main | NAO sumiram: foram movidos para `docs/arquivo/2026-08/` no commit `d5e6a0c7fc docs(arquivo): ... (#2273)` | `git log --name-status origin/main -- docs/arquivo/2026-08/READINESS_LIFECYCLE_FEATURES_2026-08-29.md` -> `A` em `d5e6a0c7fc`; `git ls-tree -r --name-only origin/main -- docs` mostra os dois arquivos sob `docs/arquivo/2026-08/` |

Por que o pacote de evidencia mostrou "deleted file mode" para esses dois arquivos: o diff
branch->main compara caminho a caminho e nao segue o `rename`. O conteudo esta na main, no caminho
novo, com as alteracoes da branch dentro.

## A resgatar

Nada. Os 3 arquivos da branch entraram na main pela PR #2087 (commit `446a46f8a5`, mesmos 3
arquivos), e o que a main tem hoje e superconjunto do que a branch escreveu: cada frase da branch
aparece preservada ou substituida por versao mais detalhada. Nao foi encontrada nenhuma afirmacao,
linha de tabela ou pendencia da branch ausente da main.

## Risco de fechar esta branch

Nenhum risco pratico. A branch e so documentacao, nao toca codigo, banco nem deploy, e seu texto
ja esta publicado na main em versao mais completa (o ADR ate evoluiu de "proposto" para "aceito
pelo dono"). Apagar a referencia nao muda nada no sistema em producao e nao apaga decisao alguma:
a decisao de negocio registrada aqui — Mockup e Magic Up sao duas ferramentas distintas, as duas
com dono Joaquim e criticidade C1 — continua valendo em `docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md`.

Observacao para o dono, que vem desta branch e segue aberta na main: o ADR lista 5 pendencias de
codigo (entre elas o assistente "Matheus" responder com frases sorteadas em vez de IA de verdade, e
os arquivos do bucket `mockup-assets` ainda ficarem com link publico quando a decisao era link
assinado). Fechar a branch nao resolve nem apaga essas pendencias — elas estao registradas na main.

## Nao verificado

- Nao foi conferido se a PR #2087 nasceu exatamente desta branch (o repo usa squash-merge, e a
  branch nao e ancestral da main). A coincidencia de titulo (`docs(adr): ... fronteira ... Mockup
  ... Magic Up`), de data (2026-10-09 / 2026-10-08) e dos 3 mesmos arquivos e a evidencia usada.
  Isso nao altera o veredito: o conteudo esta na main, qualquer que tenha sido o caminho.
- As afirmacoes tecnicas de dentro do ADR (modelos de IA em uso, tabelas sem consumidor, flag sem
  gate) nao foram re-auditadas contra o codigo nesta analise; o que se verificou e que o texto da
  branch esta na main.
