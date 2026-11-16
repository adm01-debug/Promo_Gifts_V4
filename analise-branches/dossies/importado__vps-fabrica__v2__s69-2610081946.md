# origin/importado/vps-fabrica/v2/s69-2610081946

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** guarda uma "foto" congelada de cada mockup aprovado, para que a imagem e a ficha tecnica enviadas ao cliente nunca mudem sozinhas depois e para que cada nova versao fique registrada em vez de apagar a anterior.
- **Tip / merge-base / main:** tip `f4b24655a06ef29e3c419fed2983e843e497b66a` · merge-base `c194982c5f1f32234b769c00bc4e0703e8450a1d` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Dois commits, ambos de 08/10/2026 (`e8a85a6413` "docs(mockup): proposta SQL de snapshot e revisoes de generated_mockups" e `f4b24655a0` "docs(mockup): registra prova no banco de teste da proposta de snapshot/revisao"). A branch e a entrega da **etapa 69** do plano do mockup, feita como documento de proposta — nao como migration. Ela cria `docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md` (191 linhas) com cinco entregas:

1. **DDL completo** para `public.generated_mockups`: colunas `snapshot jsonb`, `snapshot_version integer`, `revision integer NOT NULL DEFAULT 1`, `parent_mockup_id uuid` com FK auto-referente `ON DELETE SET NULL` e `is_stale boolean NOT NULL DEFAULT false`; 3 CHECKs (`generated_mockups_snapshot_version_chk`, `generated_mockups_revision_chk`, `generated_mockups_parent_not_self_chk`); indice `idx_generated_mockups_parent_mockup_id`.
2. **Trigger de guarda** `trg_generated_mockups_snapshot_guard` + funcao `public.fn_generated_mockups_snapshot_guard()` (`SECURITY INVOKER` de proposito, `SET search_path = public, pg_temp`): torna o snapshot imutavel depois de gravado e exige que o "pai" da revisao seja do mesmo dono — isto e o que impede ligar uma revisao ao mockup de outro vendedor.
3. **Bloco `-- Rollback:` executavel** e analise explicita de RLS/GRANT ("nenhuma mudanca"; cita as policies existentes `gm_select_own_or_admin`, `gm_insert_self`, `gm_update_own_or_admin`, `gm_delete_own_or_admin`).
4. **Contrato do JSON `snapshot` (`snapshot_version = 1`)**: forma em snake_case com `identity`, `product`, `brand`, `colors`, `areas[]` (com `area_id` estavel), `client`, `created_at`, mais a regra de evolucao de versao e a estrategia expand/contract (colunas legadas `area_config`/`logo_*`/`position_*` continuam preenchidas).
5. **Prova ja executada** em banco de teste clonado de `teste_base` em 08/10/2026, com papel `authenticated`: revisao 1 e 2 inseridas (`a1 | 1 | True | NULL` e `a2 | 2 | False | a1`), consulta legada intacta, tres negativos falhando com os codigos certos (`23514` para snapshot imutavel, `23503` para pai de outro usuario, `23514 generated_mockups_revision_chk` para `revision = 0`) e rollback executado com hash de schema identico ao de antes (`sha256=0926470d…ed99e`, 13943 itens).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| A **decisao de negocio** "snapshot de revisao" (conceito) | **ESTA** | `origin/main:docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md:14` ("Conceito-chave adotado do Codex: SNAPSHOT DE REVISAO") e `origin/main:docs/MOCKUP_ESTADOS.md:118-124` (secao "3.4 Desatualizada (`is_stale`) — planejado") |
| O **cartao da etapa 69** com os nomes das colunas | **ESTA, so como uma linha** | `origin/main:docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md:51` — "69. [F:workersql][O2] PROPOSTA SQL — snapshot de revisao em `generated_mockups`: `snapshot jsonb` …, `revision int`, `is_stale boolean`, `snapshot_version int` … Rollback incluso." Lista o que fazer; nao traz o SQL |
| O **DDL** (ALTER TABLE, 3 CHECKs, indice) | **NAO ESTA** | `git grep -nE "is_stale\|snapshot_version\|parent_mockup_id\|snapshot_guard" origin/main -- supabase src` → **zero linhas**. Nenhuma das 18 migrations de mockup em `origin/main:supabase/migrations/` toca essas colunas |
| A **funcao e o trigger de guarda** (`fn_generated_mockups_snapshot_guard` / `trg_…`) | **NAO ESTA** | `git grep -n "fn_generated_mockups_snapshot_guard" origin/main` → **zero linhas** |
| O **bloco de rollback executavel** e a analise de RLS/GRANT por policy | **NAO ESTA** | mesmo grep acima; o texto da main (`:51`) apenas diz "Rollback incluso", sem o bloco |
| O **contrato do JSON `snapshot` v1** (chaves, regra de versao, expand/contract) | **NAO ESTA** | a main descreve o conteudo em prosa (`origin/main:docs/MOCKUP_ESTADOS.md:119-121`: "produto+variante+foto, marca e versao aplicada, cores, geometria por area, cliente, data"), mas nao tem a forma do JSON nem a regra de `snapshot_version` desconhecida = erro explicito |
| O **teste SQL** `tests/sql/generated_mockups_snapshot_revision.test.sql` (+3 negativos) | **NAO ESTA** | `git ls-tree -r --name-only origin/main -- supabase/migrations` e o grep acima nao mostram o arquivo nem os simbolos; nao existe teste com esses nomes |
| A **prova ja executada no clone** (resultados, codigos de erro, hash pos-rollback) | **NAO ESTA** | nenhum arquivo da main cita `sha256=0926470d` nem os resultados `a1 \| 1 \| True`; a main afirma o oposto do estado aplicado: `origin/main:docs/MOCKUP_ESTADOS.md:124` — "**Estado no codigo:** **nao existe.**" |
| As colunas **em producao** (`doufsxqlfjyuvxuezpln`) | **NAO ESTAO** | consulta somente leitura em `information_schema.columns` + `pg_trigger` + `pg_proc` para as 5 colunas, o trigger e a funcao → retorno `[]` (vazio). Logo **nao e DRIFT_VERSIONAR** |
| Pendencia ja reconhecida pela propria main | **ESTA** | `origin/main:docs/auditoria-planejado-nao-executado-2026-10-11/A05_magazine_mockup_ia.md:94` — MK-069 marcado ❌, acao "Proposta SQL + aplicar", impacto "Mockup aprovado pode mudar sem rastro" |

**Conflito de caminho (nao e defasagem):** a branch e a main escrevem documentos **diferentes** no mesmo arquivo. A main tem 125 linhas ("Adendos 1 a 4", etapas 51–92); a branch tem 191 linhas (so a etapa 69). Mergear a branch como esta **apagaria os Adendos 1–4 da main**. Por isso o resgate tem de ir para um arquivo novo, nunca por merge direto. Evidencia: diff (B) do pacote mostra o arquivo inteiro sendo substituido (`@@ -1,191 +1,125 @@`).

## A resgatar

1. **O DDL completo + bloco de rollback + analise de RLS/GRANT** — arquivo de origem `docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md` na branch (linhas 1–130 da versao dela). Por que importa: e o unico lugar onde existe o SQL exato, revisado, com volta testada. Sem ele, quem for aplicar a etapa 69 reescreve tudo e pode esquecer o trigger de dono (o que permitiria ligar a revisao de um vendedor ao mockup de outro).
2. **O contrato do JSON `snapshot` versao 1** — mesmo arquivo. Por que importa: define exatamente o que a ficha tecnica e o PNG leem. A main so tem a descricao em prosa; sem a forma fixa, duas telas podem gravar formatos diferentes e a ficha do cliente sai errada.
3. **O teste SQL com os tres casos negativos** — a nascer em `tests/sql/generated_mockups_snapshot_revision.test.sql`, descrito no arquivo da branch. Por que importa: e a prova de que o snapshot nao pode ser alterado depois de aprovado e de que ninguem anexa revisao ao mockup de outro vendedor.
4. **O registro da prova executada no banco de teste da fabrica (08/10/2026)** — mesmo arquivo, secao final. Por que importa: esse trabalho (aplicar, testar os negativos, rodar o rollback e comparar o hash do schema) ja foi feito e custou tempo; perder o registro obriga a refazer tudo antes de o dono poder autorizar a aplicacao.

**Forma do resgate (sem risco):** copiar o texto da branch para um arquivo NOVO (ex.: `docs/PLANO_MOCKUP_ETAPA69_SNAPSHOT_SQL.md`) e deixar `docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md` da main intacto, apenas com um link na linha 51. Isso e mudanca so de documentacao: nao cria migration, nao toca producao, nao muda comportamento. **Aplicar o DDL em producao continua sendo decisao do dono** e segue o caminho obrigatorio (migration em `supabase/migrations/` + workflow `db-apply-migration.yml`); nada neste resgate antecipa isso.

## Risco de fechar esta branch

Fechar sem resgatar joga fora a unica copia do SQL pronto, do contrato do JSON, do teste e da prova ja rodada no banco de teste — trabalho de um dia que a propria main reconhece como pendente (`A05_magazine_mockup_ia.md:94`, MK-069). O efeito pratico para o negocio: continua possivel um mockup ja aprovado pelo cliente mudar depois sem deixar rastro, e a ficha tecnica sair diferente da imagem que o cliente aprovou — sem historico para provar o que foi combinado. Nao ha risco em manter a branch aberta: ela nao altera codigo, nem banco, nem deploy.

Risco oposto (mergear sem cuidado): sobrescrever os Adendos 1–4 da main, que contem as etapas 51–92 e as decisoes fechadas de 08/10 — perda imediata de planejamento. Por isso o resgate e por arquivo novo.

## Nao verificado

- **Se o dono aprova a aplicacao do DDL em producao.** E decisao dele (Git 7: DDL em producao). O resgate proposto aqui nao decide isso.
- **Se o "banco de teste da fabrica" clonado de `teste_base` citado na prova ainda existe e se a prova e reproduzivel hoje.** O documento cita resultados e um hash (`sha256=0926470d…ed99e`), mas nao da como identificar o banco; nao ha como reconferir de fora. A prova foi lida como relato da branch, nao reexecutada.
- **Se o conflito "coordenador ≡ manager" e as etapas 85–92 (pasta por vendedor) da versao da main interagem com as policies citadas.** Fora do escopo desta branch; nao foi investigado.
