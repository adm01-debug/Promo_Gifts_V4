# origin/claude/fix-attest-provenance-sigstore-261107-1500

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** evita que uma pane de um servico externo de assinatura trave a publicacao do site, ao custo de aceitar que um deploy saia sem o "selo de origem" daquela versao.
- **Tip / merge-base / main:** tip `f25bf30aaf3f81b57588386e3538653a6498f80a` · merge-base `57ada8486af4977550fcb36034d69f1416885c88` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`f25bf30aaf`, 2026-11-07). No dia 07/11 o servico externo Sigstore/Rekor
(o "cartorio" que registra a assinatura de cada build) respondeu erro 500. Isso fez o step
"Attest build provenance (E99)" falhar, o Gate 6 Build falhar e, por consequencia, o
"Gate Final - Deploy Ready" falhar — travando merge e deploy por causa de um problema de
terceiro, fora do controle do projeto. Erro exato citado no commit:
`InternalError: error creating tlog entry - (500) unexpected result from transparency log`.

A branch fez duas coisas:

1. `.github/workflows/deploy-gates.yml`: marcou **aquele step** como tolerante a falha
   (`continue-on-error: true`), de modo que a pane do cartorio externo nao derrube o portao
   inteiro. O autor registrou no proprio comentario do YAML que escolheu o nivel de *step*
   justamente porque a regra R16 do repo proibe isso no nivel de *job*.
2. `PENDENCIAS.md`: abriu o item "25. Gate 6 — Build provenance (Sigstore/Rekor 500 transiente)"
   documentando runs afetados, erro exato, impacto e o que o dono precisaria fazer.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `continue-on-error: true` no step "Attest build provenance (E99)" | **NAO ESTA.** O step na main continua sem nenhuma tolerancia a falha. | `git show origin/main:.github/workflows/deploy-gates.yml` linhas 789-793: o step vem com `name`, `if`, `uses` e `with` — nenhuma linha `continue-on-error`. Na main, `continue-on-error: true` aparece so na linha 639 (job Lighthouse, excecao ja documentada) e numa mencao em comentario na linha 887. |
| Qualquer outra mitigacao para a pane do Sigstore (retry, step opcional, remocao do portao) | **NAO ESTA.** O step nunca foi alterado desde que nasceu. | `git log -S"attest-build-provenance" --oneline origin/main -- .github/workflows/deploy-gates.yml` retorna um unico commit, `adcfcc2ab7` ("feat(ci): E99 — SBOM SPDX-JSON + build provenance attestation no job build"), que e o que criou o step. |
| Item 25 do `PENDENCIAS.md` (documentacao do incidente) | **NAO ESTA — e esta obsoleto.** O `PENDENCIAS.md` da main foi reescrito por outras sessoes (de 412 para 1090 linhas, outro formato, "Gerado em: 2026-11-08") e nao fala do assunto. | `git show origin/main:PENDENCIAS.md \| grep -in "sigstore\|rekor\|provenance\|tlog\|attest"` nao retorna nenhuma linha. |
| A pane que motivou a branch | **Resolvida sozinha.** Era transiente, como o proprio autor concluiu. | Deploy Gates no HEAD atual da main (`e4ab7f85`, 2026-11-16T00:06Z) terminou `success` — run `43778393242`. |

### Fato decisivo: a propria PR foi fechada sem merge pelo autor

A PR desta branch e a **#3156**, `state: closed`, `merged_at: null`, aberta como *draft* e
fechada 1 minuto depois (`closed_at: 2026-11-07T15:03:15Z`). O corpo escrito pelo proprio
autor diz:

> "FECHADO — abordagem invalida. `continue-on-error` e proibido pelas RESTRICOES do stop hook.
> PR encerrado sem merge. A correcao correta e re-run do workflow (erro Sigstore 500 e transiente)."

Ou seja: nao foi esquecimento nem perda de trabalho — foi uma desistencia consciente.

### Por que isso ainda nao fecha o assunto

A justificativa do descarte **contradiz o padrao escrito do repo**. A regra R16 em
`docs/ci/PADRAO_WORKFLOW.md` (linhas 358-374) proibe `continue-on-error: true`
*a nivel de job* e diz textualmente: "Permitido a nivel de step para etapas opcionais
(ex.: notificacoes), nunca no job inteiro". A branch usou exatamente o nivel de step.
Logo, a tecnica que a branch usou **nao** e proibida pelo padrao do repo — o que a barrou foi
uma restricao da sessao daquele agente, nao a norma do projeto. A mesma R16 ainda exige, para
casos assim, "justificativa explicita e comentario no YAML" — que o commit da branch forneceu.

Ficou, portanto, uma lacuna viva: se o Sigstore cair de novo, a publicacao trava de novo, e
hoje a main nao tem nenhuma protecao contra isso.

## A resgatar

| arquivo | o que | por que importa |
|---|---|---|
| `.github/workflows/deploy-gates.yml` | A linha `continue-on-error: true` no step "Attest build provenance (E99)" (hoje linhas 789-793 da main), com o comentario de justificativa exigido pela R16. | **So apos decisao do dono.** Sem ela, uma pane de um servico externo de assinatura volta a travar merge e deploy do site, como ja travou em 07/11. Com ela, o deploy passa mesmo quando o selo de origem do build nao e registrado — ou seja, pode existir versao em producao sem comprovante de origem assinado. E troca de resiliencia por rastreabilidade de seguranca; nao e decisao de agente. |

O item 25 do `PENDENCIAS.md` **nao** deve ser resgatado: documenta uma pane de 07/11 ja
resolvida e aponta "aguarda merge da PR de fix", o que hoje e falso (PR #3156 fechada).

## Risco de fechar esta branch

Baixo e imediato; moderado e recorrente. Nada deixa de funcionar hoje: a publicacao esta
passando (Deploy Gates verde em 16/11) e a pane de 07/11 passou. O que se perde e a unica
proposta escrita de protecao contra o problema: na proxima queda do servico externo de
assinatura, a publicacao do site volta a travar e alguem tera que diagnosticar de novo do zero
e re-rodar o portao na mao. Nao se perde codigo de produto, tela, regra de negocio nem nada
de banco de dados.

A decisao que precisa do dono, em uma frase: **se um servico externo de assinatura cair, voce
prefere (a) que a publicacao trave ate ele voltar, ou (b) que a publicacao siga em frente
sem o comprovante de origem daquela versao?** Hoje a main faz (a) por omissao. A branch
propunha (b).

## Nao verificado

- Nao foi verificado se existe algum hook ou script de sessao vivo hoje que ainda proibiria
  `continue-on-error` em qualquer nivel (a afirmacao do autor da PR sobre "RESTRICOES do stop
  hook" nao foi conferida em arquivo). O que foi conferido e a norma do repo (R16), que
  permite no nivel de step.
- Nao foi medida a frequencia historica de panes do Sigstore/Rekor neste repo (quantas vezes
  o step E99 falhou por erro 500 desde que nasceu). Isso mudaria o peso da decisao, mas exigiria
  varrer o historico de runs do workflow.
