# origin/importado/vps-fabrica/v2/refazer-68f33d86

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada muda no sistema — e um documento de planejamento que explica como funcionaria uma "lixeira de mockup" (30 dias para recuperar um mockup excluido); o documento ja esta na main, e o que ficou de fora foi so uma correcao de 3 referencias erradas dentro dele.
- **Tip / merge-base / main:** tip `5746994553eaf7876c8c0a91d281b72b745da670` · merge-base `0a64ef316e4fed7a44c0b8791b8058fae2bb43bd` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

A branch e **100% documentacao**: `git diff --stat 0a64ef31 5746994553` retorna um unico arquivo,
`docs/MOCKUP_RETENCAO.md | 218 ++++++`. Nao toca codigo, banco, migration, edge function nem workflow.

Pelas mensagens dos 5 commits, a intencao foi, em duas etapas:

1. **Criar o roteiro** (`d2413968ec`, 09/10): registrar por escrito a decisao Q7 do dono — mockup
   excluido fica recuperavel por 30 dias, rascunho nao salvo e limpo em 7 dias — separando com rigor
   o que **ja existe** no codigo (`[IMPLEMENTADO]`) do que e apenas **proposta** (`[PLANEJADO]`), e
   propondo o desenho (coluna `deleted_at`, funcao `purge_mockup_trash_old()`, job de cron,
   RPC `restore_mockup_from_trash`, edge function de limpeza do bucket).
2. **Manter as referencias honestas** (`0505cc1a50`, `769416efaf`, `65209a2662`, `5746994553`):
   os tres commits seguintes nao mudam uma letra do conteudo — apenas **reconferem os `caminho:linha`**
   citados no documento contra a main daquele dia, porque a main andava e os numeros envelheciam.
   O ultimo commit (`5746994553`) corrige o fim do intervalo do JOB 4 do cron: `67-77` -> `67-78`.

Ou seja: a branch e um documento + a disciplina de manter os ponteiros dele corretos.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| O arquivo `docs/MOCKUP_RETENCAO.md` inteiro (218 linhas: politica Q7, secoes 1 a 6, SQL proposto, mapa de etapas) | **ESTA** na main | `git cat-file -e origin/main:docs/MOCKUP_RETENCAO.md` -> existe; entrou pela PR #2736 (`git log --oneline origin/main -- docs/MOCKUP_RETENCAO.md` -> `31ebc2d35c test+docs(mockup/magic-up): entregas de teste e doc da fabrica VPS (lote A) (#2736)`) |
| Commits `d2413968ec` + `0505cc1a50` + `769416efaf` (criacao + 2 primeiras reconferencias) | **ESTAO** na main | o diff (B) branch->main tem apenas 4 hunks, todos de numeracao; a main cita `base main em a9c8bd9c4`, que e exatamente a base declarada pelo commit `769416efaf` — logo a main recebeu a branch ate esse ponto |
| Reconferencia `types.ts: generated_mockups 7946-8391`, `mockup_drafts 13868-13915`, `quote_items.mockup_urls 34791` (commit `769416efaf`) | **ESTA** na main | nao aparece no diff (B) branch->main, ou seja a main ja tem esses mesmos valores |
| Reconferencia `generate-mockup/index.ts:506`, `mockup-storage.ts:36`, `DeleteMockupDialog 58-72`, `deleteMockupFromDb 483-526` (commit `769416efaf`) | **ESTA** na main | ausente do diff (B); e confirmei que duas delas continuam certas hoje: `MockupDialogs.tsx` linhas 58-72 = o bloco de `DeleteMockupDialog` (58 `export function DeleteMockupDialog`, 65 `description="Esta ação não pode ser desfeita."`, 72 `}`) e `mockup-storage.ts:36` = `const filePath = \`${userId}/logos/${Date.now()}-${safeName}.${extension}\`` |
| **Correcao `cron-config.sql:67-77` -> `67-78`** (commit `5746994553`), em 3 lugares do documento | **NAO ESTA** na main — a main ainda diz `67-77` | `git show origin/main:docs/MOCKUP_RETENCAO.md \| grep -n 'cron-config.sql:'` -> linhas 65, 115 e 212 todas com `67-77`. E a correcao da branch e a **correta hoje**: em `origin/main:supabase/cron/cron-config.sql` a linha 67 e `-- JOB 4: Purge favorite trash (daily at 04:00 UTC)` e a linha 78 e `);` — o `67-77` da main para no `$$` (linha 77) e corta o fechamento do bloco |
| **Linha de base do documento `a9c8bd9c4` (13/10) -> `1b59d0f57` (15/10)** (commit `65209a2662`) | **NAO ESTA** na main — a main ainda diz `a9c8bd9c4`, 13/10/2026 | `git show origin/main:docs/MOCKUP_RETENCAO.md \| grep -n 'base .main. em'` -> linha 12: `(base \`main\` em \`a9c8bd9c4\`, 13/10/2026)`. Mas hoje a main esta em `e4ab7f85` (15/11/2026): **as duas versoes estao desatualizadas** — resgatar essa linha nao a torna verdadeira |

## A resgatar

1. **`docs/MOCKUP_RETENCAO.md`** — trocar as 3 ocorrencias de `supabase/cron/cron-config.sql:67-77`
   por `67-78` (linhas 65, 115 e 212 da versao da main). **Por que importa:** quem for implementar a
   lixeira de mockup vai usar o JOB 4 do cron de favoritos como molde; o intervalo da main corta a
   ultima linha do bloco (`);`), entao quem copiar o trecho citado copia SQL incompleto. A correcao
   da branch foi conferida contra a main de hoje e esta certa.

Nao resgatar: a linha de base (`a9c8bd9c4` -> `1b59d0f57`). Ela so declara em que commit o documento
foi conferido, e **nenhum dos dois** vale hoje (main em `e4ab7f85`). Trocar um sha velho por outro sha
velho da falsa impressao de documento conferido. Se alguem for mexer nesse arquivo, o certo e
reconferir tudo contra a main atual — ver "Risco" abaixo.

## Risco de fechar esta branch

Baixo, mas nao zero.

- **O que NAO se perde:** todo o conteudo de decisao (os prazos de 30 e 7 dias, o desenho da lixeira,
  o SQL proposto, a regra de nao excluir mockup anexado a orcamento) ja esta na main. Fechar a branch
  nao apaga nada disso.
- **O que se perde:** a correcao das 3 referencias do cron (item acima). Custo: quem for implementar
  a lixeira perde alguns minutos ou copia um bloco de SQL truncado. Nao ha risco para producao, para
  dado de cliente nem para o site — a branch nunca executou nada, e um texto.
- **Risco maior, que a branch nao resolve:** o documento que esta na main **ja envelheceu em outros
  pontos**. Ele diz que a funcao de exclusao esta em `mockupGenerationService.ts:483-526` com a
  limpeza do storage em `518-525`; na main de hoje a funcao comeca na linha **474** e a limpeza do
  storage esta em volta de **498-515** (`grep -n 'deleteMockupFromDb' origin/main:src/hooks/mockup/
  mockupGenerationService.ts` -> `474:export async function deleteMockupFromDb(...)`;
  `510: .from('mockup-assets')`; `513: logger.warn('[deleteMockupFromDb] Storage cleanup failed...`).
  Isso vale tanto para a versao da main quanto para a da branch — resgatar a branch **nao** conserta
  esse ponto. A nota honesta para o dono: o roteiro continua valido como **decisao**, mas os
  "enderecos no codigo" dele precisam de uma reconferida antes de alguem implementar a lixeira.

## Nao verificado

- **Se a lixeira de mockup foi implementada depois** (coluna `deleted_at` em `generated_mockups`,
  funcao `purge_mockup_trash_old`, job `purge-mockup-trash`, RPC `restore_mockup_from_trash`, aba
  "Lixeira"). Nao verifiquei porque e irrelevante para o destino desta branch: a branch nunca propos
  implementar nada, so documentar. Se isso ja existir, o documento da main esta desatualizado no
  rotulo `[PLANEJADO]` — mas quem conserta isso e uma tarefa nova, nao esta branch.
- **As demais referencias `caminho:linha` do documento** (`types.ts:7946-8391`, `13868-13915`,
  `34791`, `generate-mockup/index.ts:506`, `MockupHistoryPage.tsx:115-134`,
  `quoteHelpers.ts:234`, `useKitBuilderQuote.ts:250,284`, `BACKUP_SCHEMA_ONLY_2026-09-16.sql:65573`).
  Conferi 3 (`cron-config.sql:67-78`, `MockupDialogs.tsx:58-72`, `mockup-storage.ts:36` — certas) e
  1 errada (`mockupGenerationService.ts:483-526`). As outras nao foram conferidas: nao mudam o
  veredito, porque sao identicas na branch e na main.
- **Arquivos sem leitura por truncamento:** nenhum. O pacote nao foi truncado e o unico arquivo da
  branch foi lido por inteiro, nos dois diffs.
