# origin/release-please--branches--main--components--gifts-store

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada muda no sistema para o usuario — e so a "etiqueta de versao" do projeto (1.1.0 -> 1.2.0) e a lista de mudancas (CHANGELOG); o problema e que o numero 1.2.0 ja foi usado em outubro, entao publicar de novo cria duas versoes com o mesmo nome.
- **Tip / merge-base / main:** tip analisado `a5e25fecfeeb9014ad69277ae9641565ce482c0a` (ja superado: a branch foi reescrita pelo bot e hoje esta em `80232e4ed38fc9154d501821bcac837420a5c1c5`) / merge-base `956593c027a45574a38d4f18ed82445f38e9d1d9` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Branch automatica do robo `release-please` (nao e trabalho de agente nem de pessoa). Um unico commit,
`a5e25fecfe chore(main): release 1.2.0`, autor `github-actions[bot]`, 4 arquivos — todos de versionamento:

- `package.json`, `package-lock.json`, `.release-please-manifest.json`: trocam `1.1.0` por `1.2.0`;
- `CHANGELOG.md`: acrescenta a secao `## [1.2.0] ... (2026-11-15)` com ~280 linhas listando commits que
  **ja estao na main** (mockup, kit-builder, CI, migrations etc.).

Ela existe para ser mergeada e, no merge, criar a tag `v1.2.0` e o GitHub Release
(`.github/workflows/release-please.yml:5-8`, comentario do proprio workflow).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `version: 1.2.0` em `package.json` | NAO ESTA — main continua `1.1.0` | `git show origin/main:package.json` -> linha 4: `"version": "1.1.0"` |
| `version: 1.2.0` em `package-lock.json` | NAO ESTA — main continua `1.1.0` | diff (B) do pacote: `-"version": "1.2.0"` / `+"version": "1.1.0"` em `package-lock.json` |
| `".": "1.2.0"` em `.release-please-manifest.json` | NAO ESTA — main continua `1.1.0` | `git show origin/main:.release-please-manifest.json` -> `{ ".": "1.1.0" }` |
| Secao `## [1.2.0] (2026-11-15)` no `CHANGELOG.md` | NAO ESTA — o topo da main e `## [1.1.0] ... (2026-11-13)` | `git show origin/main:CHANGELOG.md \| grep -n "^## \["` -> linha 8 = `## [1.1.0] ... (2026-11-13)` |
| Conteudo descrito nessa secao (features/fixes de mockup, kit-builder, CI, migrations) | JA ESTA na main — a secao so lista commits que a main tem | os SHAs citados na secao sao commits da propria main (ex.: `f1044db`, `a78b0ba`, `7307f53` aparecem na historia de `origin/main`) |
| Tag/release `v1.2.0` que esse merge criaria | JA EXISTE, de outra versao | `git log -1 --format='%H %ad %s' v1.2.0` -> `65c4e89d63 2026-10-18 chore(main): release 1.2.0 (#2153)` |

Contradicao registrada: se essa branch for mergeada, o `CHANGELOG.md` passa a ter **tres** secoes
`## [1.2.0]` (2026-11-15 da branch, 2026-10-30 e 2026-10-18 que a main ja tem — `grep -n "^## \[1\.2\."`
na main devolve linhas 932 e 1573) e o robo tenta criar a tag `v1.2.0`, que ja aponta para `65c4e89d63`.
A numeracao foi reiniciada em 13/11 (`bcba4c29a0 2026-11-13 chore(main): release 1.1.0` vem depois de
`5a4ad7211d 2026-11-13 chore(main): release 1.9.0`), e o repo nunca resolveu esse reinicio.

## A resgatar

Nada de codigo. A branch nao contem trabalho humano nem de outro agente: 1 commit de bot, 4 arquivos de
versionamento. O conteudo e regenerado automaticamente — o proprio robo ja reescreveu a branch depois do
tip analisado (`git ls-remote origin refs/heads/release-please--branches--main--components--gifts-store`
-> `80232e4e`, e `.release-please-manifest.json` nesse novo tip tambem traz `1.2.0`).

## Risco de fechar esta branch

Fechar/apagar nao perde trabalho (nada aqui e escrito a mao e tudo e regeravel), mas tambem **nao resolve
nada**: o workflow `release-please.yml` esta ativo em `push: branches: [main]` e roda com sucesso a cada
push (ultimo run em `2026-11-16T00:06Z` sobre `e4ab7f85d`, conclusao `success`), entao a branch e a PR
voltam sozinhas. Isso ja aconteceu tres vezes com o mesmo titulo: PR #3503 (fechada sem merge), PR #3524
(fechada sem merge) e a atual **PR #3566, aberta**, `mergeable=true`, `mergeable_state=blocked`, label
`autorelease: pending`.

O risco real nao e perder codigo, e publicar uma versao duplicada: mergear cria a tag/release `v1.2.0`
em producao quando `v1.2.0` ja existe desde 18/10. Decidir isso e do dono porque e politica de versao
(que numero a proxima publicacao recebe) e porque o efeito e uma tag/release de producao — Git 7 do
AGENTS.md manda a PR ficar aberta e chamar o dono.

Caminhos possiveis (escolha do dono, nao do agente):
1. retomar a numeracao antiga (pular para `1.9.1`/`2.0.0`), ajustando `.release-please-manifest.json` na main;
2. aceitar o reinicio e apagar/reaproveitar as tags antigas `v1.0.0`..`v1.8.1` (destrutivo em tags publicas);
3. desligar o `release-please` e parar de versionar, assumindo que CHANGELOG e tags ficam congelados.

## Nao verificado

- Qual check especifico deixa a PR #3566 em `blocked` (a API devolve o estado agregado, nao o check que falta).
- Por que as PRs #3503 e #3524 foram fechadas sem merge: nao ha comentario humano explicando o motivo nos
  comentarios lidos de #3524 (so bots: supabase, codex, SSOT report, bundle size).
- Nao confirmei se o `release-please` falharia ou sobrescreveria a tag `v1.2.0` existente: isso so se sabe
  mergeando, o que nao foi feito (e nao deve ser, sem decisao do dono).
