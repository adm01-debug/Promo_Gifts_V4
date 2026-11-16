# origin/claude/fix-stock-notes-rollback-header-261101-2151

- **Veredito:** RESGATAR_PARCIAL  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** garante que a tabela de "observações de estoque" tenha um procedimento de desfazer encontrável e aprovado pelos controles internos — hoje o procedimento existe no repositório, mas a migration que criou a tabela não aponta para ele, e é exatamente essa ligação que as travas automáticas do projeto exigem.
- **Tip / merge-base / main:** tip `1343a05df2af1303976be97a7f56d2d6373ec505` · merge-base `d2033d9237fa72971ff9c92ca47442f7437463ff` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelos 4 commits (todos `chore:`, de 2026-11-01), o agente tinha um objetivo único e pequeno: deixar a migration
`20261031000000_create_stock_notes` em conformidade com o contrato de rollback do repositório. Em ordem:

1. `a6672ec77e` — "add `-- Rollback:` header and rollback file for 20261031000000_create_stock_notes":
   acrescentou a linha de cabeçalho na migration **e** criou o arquivo irmão `supabase/rollbacks/20261031000000_rollback.sql`.
2. `814abbc563` e `892a3467eb` — tentaram atualizar o sha256 da version no `supabase/MIGRATIONS_SYNC_LOG.md`.
3. `1343a05df2` — **desfez** o item 2: "restaura MIGRATIONS_SYNC_LOG.md (idêntico ao main) … Commits 814abbc e
   892a3467 corromperam o arquivo acidentalmente … O sha256 do 20261031000000 no SYNC_LOG permanece como no main
   (informativo, gate não valida hash)."

Ou seja: o conteúdo próprio e intencional da branch são **duas coisas**, não três — a linha de cabeçalho e o arquivo
de rollback. O `MIGRATIONS_SYNC_LOG.md` foi explicitamente deixado igual ao main pelo próprio autor, e por isso nem
aparece na lista de arquivos que diferem hoje.

Contexto de por que isso importa no repo: o contrato está escrito em `docs/agentes/banco-migrations.md:73`
("Arquivo em `supabase/migrations/` na PR (com header `-- Rollback:` e arquivo em `supabase/rollbacks/`") e é
cobrado por código em `scripts/preflight-migration-apply.mjs:305` — a ausência do cabeçalho entra na lista de
`problems`, que reprova o job.

## Item por item: está na main?

| item | onde está na main (ou NÃO ESTÁ) | evidência |
|---|---|---|
| Arquivo de rollback `supabase/rollbacks/20261031000000_rollback.sql` | **ESTÁ na main, em versão superior à da branch.** Entrou depois, por outra PR. | `git cat-file -e origin/main:supabase/rollbacks/20261031000000_rollback.sql` → existe. `git log --oneline origin/main -- supabase/rollbacks/20261031000000_rollback.sql` → `b89a44e100 fix(db): trem de banco … (#3665)`. O diff (B) do pacote mostra a main com 53 linhas contra 3 da branch: a da main faz `LOCK TABLE … ACCESS EXCLUSIVE`, cria cópia `_backup_stock_notes_<data>`, liga RLS/`FORCE RLS` na cópia, revoga acesso de `anon`/`authenticated` e confere a contagem antes de `DROP`. |
| Linha de cabeçalho `-- Rollback: supabase/rollbacks/20261031000000_rollback.sql` na migration | **NÃO ESTÁ.** Nunca entrou na main. | `git show origin/main:supabase/migrations/20261031000000_create_stock_notes.sql \| sed -n '1,3p'` devolve só as 2 linhas de comentário originais (`-- Migration: cria tabela stock_notes …` / `-- Onda 2 / Melhoria 12 …`) e já na linha 4 vai para `-- handle_updated_at não existe no banco`. `git log -S"-- Rollback: supabase/rollbacks/20261031000000_rollback.sql" --oneline origin/main -- supabase/migrations/20261031000000_create_stock_notes.sql` → **saída vazia** (nenhum commit da main jamais adicionou nem removeu essa string). O histórico da main nesse arquivo tem só 3 commits, todos anteriores e de outro assunto: `5ae127eade` (#2871, criação), `ab053d95b6` (#2904, `deleted_at` + índice), `cbbabc2f37` (#2902, rota de auditoria). |
| Atualização do sha256 da version `20261031000000` no `supabase/MIGRATIONS_SYNC_LOG.md` | **Não é item a resgatar: a própria branch desistiu.** A main mantém o hash `209ba7ab…`, que é o que a branch deliberadamente restaurou. | Mensagem do commit `1343a05df2` ("restaura … idêntico ao main … permanece como no main (informativo, gate não valida hash)") + o arquivo **não** consta na lista de 2 arquivos que diferem da main hoje. Na main, `supabase/MIGRATIONS_SYNC_LOG.md:972` registra `209ba7abacce4f1c1989dfe19c97b470db9dd7a1d9fc74b224acded12187ebd3`. |

Resumo: metade da branch (o arquivo de rollback) entrou na main por caminho próprio e **melhor**; a outra metade
(o cabeçalho que liga a migration a esse arquivo) ficou de fora.

## A resgatar

**1 item, de 1 linha.**

- **Arquivo:** `supabase/migrations/20261031000000_create_stock_notes.sql`
- **O que:** inserir, depois da linha 2, a linha de comentário
  `-- Rollback: supabase/rollbacks/20261031000000_rollback.sql`
  (apenas comentário SQL; não altera nenhum comando, não toca o banco, não roda nada).
- **Por que importa:** é a ligação que as travas do projeto exigem e que hoje está rompida. A trava está em
  `scripts/preflight-migration-apply.mjs:305` — sem a linha, o preflight acusa
  *"arquivo não tem cabeçalho de rollback lógico (`-- Rollback:` nas primeiras 40 linhas)"*. Essa checagem roda sem
  condição de modo nos dois pontos do fluxo oficial de banco: `.github/workflows/db-apply-migration.yml:119` e
  `:288`. Prático: a main tem o roteiro de desfazer essa tabela, mas quem abrir a migration não descobre que ele
  existe, e qualquer acionamento futuro do fluxo oficial para essa version reprova por falta de um comentário.

**Aviso importante para quem for resgatar:** resgatar é **só** a linha de cabeçalho. O arquivo
`supabase/rollbacks/20261031000000_rollback.sql` da branch (3 linhas, `DROP` direto) **não deve** substituir o da
main — a versão da main protege os dados (faz cópia de segurança e trava a tabela antes de apagar) e a da branch
apagaria as observações escritas pelos usuários sem cópia. Trazer a branch inteira seria uma regressão de segurança
de dados.

## Risco de fechar esta branch

Baixo em dinheiro e em funcionamento do sistema hoje — nada do que o usuário final vê depende disso, e a tabela de
observações de estoque continua existindo e funcionando em produção (`supabase/MIGRATIONS_SYNC_LOG.md:972`: a tabela
EXISTE em produção, com RLS ligada e 4 policies).

O risco é de **controle e de resposta a incidente**, e é real:

- Se essa tabela precisar ser desfeita às pressas, o roteiro certo existe mas está "escondido": a migration não
  aponta para ele. Quem estiver sob pressão tende a escrever o comando na hora — e o comando óbvio (`DROP TABLE`)
  apaga as observações digitadas pelas pessoas sem cópia, que é exatamente o que a versão da main foi escrita para
  evitar.
- O repositório fica em desacordo com a sua própria regra escrita (`docs/agentes/banco-migrations.md:73`), e a
  reprovação só aparece no momento em que alguém aciona o fluxo oficial de banco para essa version — isto é, no pior
  momento possível.
- O custo de resgatar é desprezível (uma linha de comentário), então fechar sem resgatar troca risco por nenhuma
  economia.

## Não verificado

- **Se o preflight seria efetivamente acionado para esta version hoje.** O `MIGRATIONS_SYNC_LOG.md:972` traz uma
  correção de 2026-11-15 dizendo que a version `20261031000000` **já está** no ledger, o que torna a
  "reconciliação repair-only" mencionada em `:1002` provavelmente desnecessária. Portanto não afirmo que haja um
  acionamento pendente e bloqueado hoje — afirmo apenas que a checagem de cabeçalho existe, é incondicional e
  reprovaria se acionada. Para fechar essa dúvida seria preciso consultar o ledger de migrations em produção, o que
  está fora do escopo somente-leitura desta análise.
- **Se existe algum gate que varra o repositório inteiro cobrando o cabeçalho em todas as migrations.** Não
  encontrei nenhum; só a verificação por version dentro do `preflight-migration-apply.mjs`. Não afirmo que a CI da
  main esteja vermelha por causa disso — não está, pelo que apurei.
- **Arquivos sem leitura por truncamento:** nenhum. O pacote não indicou TRUNCADO e os 2 arquivos que diferem foram
  lidos integralmente nos dois lados.
