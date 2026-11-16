# origin/claude/fix-kit-maker-publicados-261101-2202

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** mostra na Biblioteca de Kits um contador de "Publicados" (kits ja compartilhados com clientes) e deixa o filtro "Publicados" contar so o que realmente foi compartilhado.
- **Tip / merge-base / main:** tip `8d64b80ec13e2201fd268156a8afd36ecc5e416f` · merge-base `d2033d9237fa72971ff9c92ca47442f7437463ff` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`8d64b80ec1`, 2026-11-01, "feat(kit-maker): stat e filtro Publicados mapeiam status 'shared' (KMM-075)"),
em um unico arquivo (`src/pages/kit-builder/KitLibraryPage.tsx`), com duas intencoes declaradas na mensagem:

1. **Criar o card "Publicados"** na faixa de estatisticas da Biblioteca de Kits, contando kits com `status = 'shared'`
   (rotulo "Publicados", detalhe "Compartilhados com clientes", icone `Sparkles`).
2. **Limpar o filtro "Publicados"**: trocar `!['published', 'shared'].includes(k.status)` por `k.status !== 'shared'`,
   com o argumento de que `'published'` e valor morto para kit ("o banco nunca salva status = 'published'").

A branch nao toca banco, migration, policy nem edge function.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Card "Publicados" na Biblioteca de Kits (rotulo, detalhe, icone) | **ESTA** — foi movido para um componente proprio | `src/components/kit-library/KitLibraryStats.tsx:30-35` (`label="Publicados"`, `detail="Compartilhados com clientes"`, `icon={<Sparkles …>}`), consumido em `src/pages/kit-builder/KitLibraryPage.tsx:34` (import) e `:384` (`<KitLibraryStats kits={myKits} />`) |
| Rastro de que o resgate veio desta branch | **ESTA** | corpo do commit de main `5e59cb9c79` (PR #3660, 2026-11-15): "feat(kit-maker): card de estatistica 'Publicados' na Biblioteca de Kits (KMM-075) / Resgate de claude/fix-kit-maker-publicados-261101-2202 (8d64b80ec), so o card" |
| Criterio do contador = so `'shared'` | **NAO ESTA** — a main conta `['published','shared']` | `src/components/kit-library/KitLibraryStats.tsx:33`: `kits.filter((kit) => ['published', 'shared'].includes(kit.status))` |
| Limpeza do filtro (remover `'published'` do `includes`) | **NAO ESTA** — a main manteve os dois valores, de forma deliberada | `src/pages/kit-builder/KitLibraryPage.tsx:265`: `if (statusFilter === 'published' && !['published', 'shared'].includes(k.status)) return false;` · decisao registrada no commit `5e59cb9c79`: "o hunk do filtro (status so 'shared') NAO foi aplicado — o main decidiu ['published','shared'] em c47af90b8 (#2550)" · `c47af90b8` = "fix: filtro e selo \"Publicado\" do Kit Maker (KMM-075/KMX-037) (#2550)", 2026-10-26 |
| Premissa da branch: kit nunca fica com `status = 'published'` | **Procede** (mas o banco hoje nao impede) | nenhum ponto do app grava `'published'` ou `'shared'` em `custom_kits`: `src/lib/kit-builder/persistence.ts:31-33` (`getPersistedKitStatus` devolve so `'draft'`/`'ready'`), `src/pages/kit-builder/KitLibraryPage.tsx:215` (`status: 'draft'`), e nenhuma edge function escreve em `custom_kits` (`grep -rln "custom_kits" supabase/functions` → so `semantic-search` e `rls-integration-tests`, sem gravacao de status). Em producao (`doufsxqlfjyuvxuezpln`), `select status, count(*) from custom_kits group by status` → `draft: 21`, `ready: 1`. A trava de banco que listava `draft/ready/shared/archived` (migration `20260412231951_…:28-32`) **nao existe mais em producao**: os unicos triggers de `custom_kits` sao `set_updated_at_trigger` e `trg_custom_kits_sync_user_id`, e a unica CHECK e `custom_kits_revision_non_negative` |

## A resgatar

| arquivo | o que | por que importa |
| --- | --- | --- |
| `src/pages/kit-builder/KitLibraryPage.tsx:265` (e, junto, `src/components/kit-library/KitLibraryStats.tsx:33`) | Restringir "Publicados" a `status = 'shared'`, removendo o valor morto `'published'` do filtro e do contador | Efeito pratico hoje: **zero** — nenhum kit tem `'published'` nem `'shared'` (medido em producao). E so limpeza de valor que nunca aparece. Se for aplicado, tem de ser nos **dois** arquivos juntos, senao o cartao e o filtro passam a contar coisas diferentes (`KitLibraryStats.tsx:3` documenta justamente que os dois usam o mesmo criterio). Vale lembrar que a main ja recusou este hunk duas vezes (#2550 decidiu os dois valores; #3660 resgatou so o cartao) |

## Risco de fechar esta branch

Baixo. O que a branch entregou de valor visivel para o negocio — o cartao "Publicados" na Biblioteca de Kits — ja esta
na main desde 2026-11-15 e o proprio commit da main cita esta branch como origem. Fechar a branch perde apenas uma
limpeza de codigo sem efeito na tela, que ja foi avaliada e recusada por quem resgatou. Nao ha risco para dado,
banco, permissao ou fluxo de cliente.

O risco real e outro e **mora na main, nao nesta branch**: o cartao "Publicados" e o filtro "Publicados" contam um
status (`shared`) que nenhuma parte do sistema grava hoje, e o banco perdeu a trava que limitava os status de kit.
Na pratica o vendedor vera sempre "Publicados: 0" e o filtro sempre vazio, mesmo depois de compartilhar um kit.
Isso e um defeito a tratar em tarefa propria, com decisao de negocio sobre o que significa "kit publicado".

## Nao verificado

- Se existe algum caminho fora deste repositorio (job, script manual, painel do Supabase) que grave
  `custom_kits.status = 'shared'` ou `'published'`. A busca cobriu `src/`, `supabase/functions/` e os dados de
  producao; nao cobriu historico de alteracoes de linha (nao ha coluna de auditoria de status consultada).
- Por que a trava de status de `custom_kits` (trigger `trg_validate_kit_status`, migration
  `20260412231951_faf4b360-0a4a-4dd0-b341-673e16044eb5.sql:63-66`) nao esta mais em producao. Constatei a ausencia;
  nao identifiquei a migration ou acao que a removeu.
