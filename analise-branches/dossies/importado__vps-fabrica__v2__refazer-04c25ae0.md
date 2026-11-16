# origin/importado/vps-fabrica/v2/refazer-04c25ae0

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** e o manual do modulo de Mockup — explica o passo a passo, o que
  aparece na tela quando da erro, e quem pode ver ou apagar o mockup de quem; parte desse manual
  nao existe em nenhum outro lugar hoje.
- **Tip / merge-base / main:** tip `59b46a8993946a9b731486835890fdaf8cbd9d3e` · merge-base
  `0a64ef316e4fed7a44c0b8791b8058fae2bb43bd` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Branch **somente documentacao**: um unico arquivo novo, `docs/MOCKUP_OPERACAO.md` (201 linhas),
criado em `a9987c37b8` ("docs(mockup): guia de operacao do modulo (fluxo, estados, falhas,
permissoes, retencao)") e depois so corrigido 4x (`61b17fe35d`, `94ae66e7a4`, `c6b86e00ff`,
`59b46a8993` — ajuste de linhas citadas e de fragmentos de texto). Nao ha nenhum outro arquivo:

```
$ git diff --name-status 0a64ef31 59b46a89
A   docs/MOCKUP_OPERACAO.md
```

A intencao era reunir num so guia: (1) fluxo ponta a ponta do mockup; (2) os tres estados
(imagem / projeto salvo / ficha); (3) tabela de falhas "sintoma → mensagem → onde"; (4) permissoes
(RLS e storage por vendedor); (5) retencao; (6) resumo do que e `[PLANEJADO]`.

Na main de hoje o arquivo **nao existe** (o diff B do pacote mostra `deleted file mode`), e ele
nunca existiu em nenhum ponto da main — o unico commit que o adiciona no repositorio inteiro e o
da propria branch:

```
$ git log --oneline --all --diff-filter=A -- docs/MOCKUP_OPERACAO.md
a9987c37b8 docs(mockup): guia de operacao do modulo (...)
```

Docs irmas da mesma fabrica entraram por outra PR (`31ebc2d35c`, PR #2736, "lote A"):
`docs/MOCKUP_ESTADOS.md` (203 linhas) e `docs/MOCKUP_RETENCAO.md` (218 linhas). Por isso o guia
ficou **parcialmente** coberto: os capitulos que viraram documento proprio entraram; os que so
existiam dentro do guia ficaram de fora.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| §2 Estados (imagem gerada / projeto salvo / ficha) | ESTA, em documento proprio e mais detalhado | `docs/MOCKUP_ESTADOS.md:24-33` (tabela resumo dos estados), `:46-80` (detalhe por estado) |
| §5 Retencao / exclusao definitiva / sem lixeira | ESTA, em documento proprio e mais detalhado | `docs/MOCKUP_RETENCAO.md:18-24` (prazos planejados), `:31-44` ("A exclusao de mockup e DEFINITIVA hoje") |
| §1.1 Anexar mockup ao orcamento ainda nao existe (`quote_items.mockup_urls` nao e preenchido) | ESTA, em tres lugares | `docs/MOCKUP_ESTADOS.md:136,142`; `docs/MOCKUP_RETENCAO.md:168,176`; `docs/auditoria-planejado-nao-executado-2026-10-11/A05_magazine_mockup_ia.md:68` (MK-038) |
| §4 Observacao "coordenador/manager nao estao em `is_supervisor_or_above`" | ESTA | `docs/MOCKUP_DECISOES_2026-10-08.md:86-87` ("`is_supervisor_or_above()` nao cita 'coordenador' literalmente — confirmar...") |
| §6 "AIMockupAssistant nao chama IA alguma" | ESTA | `docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md:143` ("hoje respostas simuladas com `Math.random`"); `docs/auditoria-planejado-nao-executado-2026-10-11/A01_roadmap_produto.md:141` |
| §3 Tabela de falhas: sintoma → mensagem exata ao usuario → arquivo:linha (12 linhas, incluindo codigos de erro da edge 400/422/500/501/504, kill switch, bloqueio SSRF, trava de 3 tentativas da ficha) | **NAO ESTA** em nenhum doc da main | `git grep -F "Tempo esgotado ao gerar mockup" origin/main -- docs` → vazio; `git grep -F "canvas_runtime_unavailable" origin/main -- docs` → vazio; `git grep -F "nao puderam ser geradas" origin/main -- docs` → vazio. Nao existe runbook de mockup: `git ls-tree -r --name-only origin/main -- docs \| grep -i runbook` lista 16 runbooks, nenhum de mockup |
| §4 Permissoes **em vigor** do mockup em texto (nomes das policies `gm_select_own_or_admin` / `gm_update_own_or_admin` / `gm_delete_own_or_admin` / `gm_insert_self`, mesmo padrao em `mockup_drafts` e `art_file_attachments`, pastas de storage por `auth.uid()` nos buckets `mockup-assets` e `mockup-art-files`, limite 10 MB do bucket) | **NAO ESTA** em prosa; so dentro de dumps SQL | `git grep -l gm_select_own_or_admin origin/main -- docs` → apenas `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql` e `docs/db/LEDGER_DATA_2026-09-16.sql` (dumps, nao documentacao de uso). `docs/MOCKUP_DECISOES_2026-10-08.md:70-77` descreve a regra **decidida** (coordenador+ le todas as pastas), nao a que esta no ar |
| §1 Fluxo ponta a ponta numerado (7 passos: selecionar → upload → gerar → salvar historico → ficha timbrada/PDF → compartilhar → excluir, + rascunho com debounce) | **PARCIAL**: os pedacos existem espalhados em `docs/MOCKUP_ESTADOS.md`, mas nao ha um passo a passo unico de operacao | `docs/MOCKUP_ESTADOS.md:46-80` cobre "como se chega" por estado, nao o roteiro de uso; nenhum doc da main contem a sequencia dos 7 passos |
| §3 "limite de 60s" e "1 retry automatico apos 2 s com a mesma Idempotency-Key" | **DESATUALIZADO**: a main mudou de proposito (decisao Q16) para **um** timeout de 30 s e **uma** tentativa | `src/hooks/mockup/mockupGenerationService.ts:315-316` ("Q16: um unico timeout de 30 s por chamada da edge"), `:383-395` ("UM timeout de 30 s e UMA tentativa (antes eram tres orcamentos empilhados + um race de 60 s...)"). `git grep -F "Tempo esgotado ao gerar mockup" origin/main -- src` → vazio |

## A resgatar

1. **`docs/MOCKUP_OPERACAO.md` §3 — tabela de falhas do mockup.** Unico lugar do repositorio que
   liga o sintoma que o vendedor ve ("nenhuma area gerada", "demorou e falhou", "logo recusado") a
   mensagem exata na tela e ao ponto do codigo. Sem isso, cada erro relatado pelo vendedor vira
   investigacao do zero. **Resgatar com correcao obrigatoria**: as duas linhas de tempo/retry estao
   erradas para a main de hoje (30 s, uma tentativa — `mockupGenerationService.ts:315,383-395`).
2. **`docs/MOCKUP_OPERACAO.md` §4 — quem ve/edita/exclui mockup de quem, hoje.** A main tem a regra
   *decidida* (`MOCKUP_DECISOES_2026-10-08.md:70-77`) e o SQL cru nos dumps, mas nao tem a traducao
   do que esta no ar: cada vendedor so ve o seu, gestao (`dev`/`supervisor`/`admin`) ve de todos, e
   os arquivos ficam em pasta por vendedor no storage. E justamente o ponto onde o decidido e o
   implementado divergem — documentar so o decidido induz a erro.
3. **`docs/MOCKUP_OPERACAO.md` §1 — roteiro de uso em 7 passos** (incluindo a ficha de aprovacao
   timbrada, a captura automatica do `layout_url` e a exclusao). Material de treinamento de
   vendedor; o que existe na main e organizado por estado tecnico, nao por "o que eu faco primeiro".

Forma sugerida do resgate: **nao** restaurar o arquivo inteiro como esta (ele duplicaria
`MOCKUP_ESTADOS.md` e `MOCKUP_RETENCAO.md` e reintroduziria as 2 afirmacoes vencidas). Levar §3 e
§4 para um doc novo e enxuto (ex.: `docs/MOCKUP_FALHAS_E_PERMISSOES.md`), com as linhas reconferidas
na main, e §1 como secao de abertura; os capitulos ja cobertos entram como link.

## Risco de fechar esta branch

Perde-se o unico manual de "o que fazer quando o mockup falha" e a unica explicacao em portugues
claro de quem pode ver e apagar o mockup de quem. Consequencia pratica: cada reclamacao de vendedor
("nao gerou", "sumiu meu mockup") passa a exigir leitura de codigo por um agente, e existe risco
real de alguem afirmar ao vendedor a regra de permissao *planejada* (coordenador ve tudo) em vez da
regra *que esta no ar* (so `dev`/`supervisor`/`admin` veem de todos) — ou seja, prometer acesso que
o sistema nao da. Nao se perde nada de codigo, banco, edge function ou configuracao: a branch so
tem um arquivo `.md`.

## Nao verificado

- Nenhum arquivo ficou sem leitura: a branch tem 1 arquivo e o pacote traz os dois diffs completos
  (nao houve truncamento).
- Nao confirmei as **demais** `arquivo:linha` do guia uma a uma contra a main de hoje (o guia cita
  cerca de 60 referencias). Conferi por amostragem as que sustentam o veredito: o kill switch
  `edge_generate_mockup` (`supabase/functions/generate-mockup/index.ts:335`), o toast de area
  parcial (`src/hooks/mockup/mockupGenerationService.ts:456`) e o `fetch-guard.ts` (existe em
  `supabase/functions/generate-mockup/`). Como a main andou desde 15/10, **todo** numero de linha do
  guia deve ser reconferido no momento do resgate — ja achei 1 bloco vencido (timeout/retry).
- Nao verifiquei se existiu PR para esta branch nem por que ela nao foi mergeada junto com o lote A
  (PR #2736): nao consultei o GitHub nesta analise.
