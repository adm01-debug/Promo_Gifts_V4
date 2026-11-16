# origin/importado/vps-fabrica/v2/refazer-dff79a9a

- **Veredito:** RESGATAR_PARCIAL (resgate de valor baixo — ver "Risco de fechar")  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** nada muda no sistema — é só o documento que explica a regra de "lixeira" do Mockup (mockup excluído volta em até 30 dias, rascunho sem uso some em 7 dias); o documento já está publicado na main, esta branch só traz a conferência mais recente dos números de linha que ele cita.
- **Tip / merge-base / main:** tip `5f44bd13c3806aa2e969422d44134bf84929c4ee` · merge-base `8491f623efb9d4aef08092764622dee49966ae65` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um único commit, só de documentação:

```
5f44bd13c3 docs(mockup): roteiro de retencao e lixeira do Mockup (Q7, planejado) reconferido na base 8491f623e
```

A branch mexe em **1 arquivo e nada mais** (`git diff --name-only 8491f623e 5f44bd13c3` → `docs/MOCKUP_RETENCAO.md`).
O arquivo é o roteiro da decisão Q7 do dono: o que acontece quando um vendedor exclui um mockup
(soft delete + lixeira de 30 dias + expurgo dos arquivos no storage), o que disso **já existe** no
sistema e o que ainda é **proposta**. Todo o SQL dentro do documento está marcado como
"PROPOSTA — não aplicar": a branch **não** cria migration, policy, função de banco nem edge function.

A intenção específica deste commit não era escrever o documento (ele já existia em outra branch irmã),
e sim **reconferir** as citações `arquivo:linha` contra uma base mais nova (`8491f623e`, 15/10/2026)
do que a base conferida na versão que entrou na main (`a9c8bd9c4`, 13/10/2026).

## Item por item: está na main?

| item | onde está na main (ou NÃO ESTÁ) | evidência |
|---|---|---|
| O documento `docs/MOCKUP_RETENCAO.md` inteiro (218 linhas: prazos, estado atual, propostas de SQL, fluxo alvo, mapa de etapas) | **Está na main**, entrou pela PR #2736 | `git log --oneline origin/main -- docs/MOCKUP_RETENCAO.md` → `31ebc2d35c test+docs(mockup/magic-up): entregas de teste e doc da fábrica VPS (lote A) (#2736)` (2026-10-29). O diff branch→main tem **só 4 linhas diferentes**, todas de citação/metadado — ver pacote de evidência, bloco (B) |
| §1 Prazos: 30 dias para mockup excluído, 7 dias para rascunho, ambos `[PLANEJADO]` | Está na main, idêntico | diff (B) não toca a seção |
| §2.1 "exclusão de mockup é definitiva hoje" e "`generated_mockups` não tem `deleted_at`" | Está na main, idêntico — e **continua verdade hoje** | `src/hooks/mockup/mockupGenerationService.ts:488` em `origin/main`: `supabase.from('generated_mockups').delete().eq('id', id)`; bloco `generated_mockups` de `src/integrations/supabase/types.ts` (linhas 7976–8422 em `origin/main`) não tem `deleted_at` nem `is_deleted` |
| §3.1–§3.4 propostas: `deleted_at`, `purge_mockup_trash_old()`, job `purge-mockup-trash`, `purge_mockup_drafts_old()`, `restore_mockup_from_trash(uuid)`, guarda de mockup anexado a orçamento (Q21) | Está na main **como texto de proposta**; nenhuma delas foi implementada em código/banco (o que é o esperado: o documento as marca `[PLANEJADO]`) | `git grep -rn "purge_mockup_trash_old\|restore_mockup_from_trash\|purge-mockup-trash\|purge_mockup_drafts_old" origin/main` retorna **só** linhas de `docs/MOCKUP_RETENCAO.md` (100,101,120,122,124,134,147,148,185,187) — nenhum hit em `supabase/` ou `src/` |
| Correção da citação do job de cron de favoritos: `supabase/cron/cron-config.sql:67-78` (a main diz `67-77`) | **NÃO ESTÁ na main** | diff (B): a main tem `(supabase/cron/cron-config.sql:67-77)` em 3 pontos, a branch tem `67-78`. Conferido em `origin/main:supabase/cron/cron-config.sql`: o bloco do JOB 4 vai da linha 67 (`-- JOB 4: Purge favorite trash`) à linha 78 (`);` que fecha o `cron.schedule`) — a citação da branch cobre o comando inteiro, a da main corta a última linha |
| Linha de procedência "conferido na base `origin/main` em `8491f623e`, 15/10/2026" | **NÃO ESTÁ na main** (a main diz base `a9c8bd9c4`, 13/10/2026) | diff (B), linhas 12–13 do arquivo |

## A resgatar

| arquivo | o que | por que importa |
|---|---|---|
| `docs/MOCKUP_RETENCAO.md` | Trocar as 3 citações `supabase/cron/cron-config.sql:67-77` por `67-78` e atualizar a linha de procedência da conferência | **Valor baixo, e declaro isso explicitamente.** Não muda uma vírgula do sistema: só faz o documento apontar para o comando de cron completo em vez de cortar a última linha. O ganho real só aparece se for feito o item do "Risco" abaixo (reconferência completa das citações), porque hoje **todas** as outras citações do documento, na main, estão defasadas ~30 linhas |

## Risco de fechar esta branch

**Risco para o negócio: nenhum.** O documento com a política de lixeira do Mockup está inteiro na main
(entrou pela PR #2736). Apagar esta branch não derruba função, tela, rota, dado nem nada que o vendedor
use: a branch só mexeu em 1 arquivo `.md` e 214 das suas 218 linhas são idênticas às da main.

O que se perde, se fechar: a correção de um número de linha numa citação (`67-77` → `67-78`) e a data
da última conferência. É cosmético.

**O que realmente importa aqui, e é problema da main, não desta branch:** a versão publicada do
documento cita linhas que já não existem mais onde ela diz. Conferido em `origin/main` hoje:

- diz `mockupGenerationService.ts:483-526`; o código está em **474–515** (`deleteMockupFromDb` abre na linha 474, a remoção do storage está em 510–511);
- diz `types.ts:7946-8391` para `generated_mockups`; o bloco está em **7976–8422**;
- diz `types.ts:34791` para `quote_items.mockup_urls`; está em **35160**.

Ou seja: quem abrir esse documento para implementar a lixeira vai bater em linhas erradas e perder
tempo. O conteúdo (a política) continua correto — a exclusão de mockup **segue definitiva** hoje, sem
lixeira e sem restauração. A ação certa não é mergear esta branch e sim reconferir o documento inteiro
contra a main de hoje, numa PR docs-only. Esta branch, se mergeada como está, corrige 1 citação das ~10
defasadas.

## Não verificado

- Não abri a PR de origem no GitHub (nem o histórico da branch irmã que entrou na PR #2736) para saber
  **por que** esta reconferência não foi junto — se foi descarte deliberado ou se ficou para trás.
  Não muda o veredito: o conteúdo está na main e foi conferido arquivo a arquivo.
- Não validei o restante das citações do documento (`useMockupDraft.ts`, `MockupDialogs.tsx:58-72`,
  `MockupHistoryPage.tsx:115-134`, `mockup-storage.ts:36`, `generate-mockup/index.ts:506`,
  `BACKUP_SCHEMA_ONLY_2026-09-16.sql:65573`) uma por uma; conferi 3 (as citadas no bloco acima) e as
  3 estavam defasadas, o que já sustenta a conclusão.
- Arquivos sem leitura por truncamento do pacote: **0** (o pacote trouxe o único arquivo da branch,
  com os dois diffs completos).
