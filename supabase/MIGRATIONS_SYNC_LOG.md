# Migration Sync Log

> **Etapa E48** (`docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`,
> §E48) reformulou este arquivo em **2026-09-16**: de narrativa ("sincronizado",
> sem hash) para **contrato de recibo tabular** — uma linha por aplicação real
> de migration, com hash verificável. Nada abaixo desta seção foi apagado: todo
> o conteúdo anterior (narrativa, incluindo as seções de E11 e E46) foi movido,
> **sem alteração**, para `## Legado — não verificado` no final deste arquivo.
> Nenhuma escrita foi feita no banco por esta etapa — é reformatação de
> documento (`[GIT]`) + um gate novo de CI (`scripts/check-migrations-sync-log-gate.mjs`).

## Contrato (vigente a partir de 2026-09-16)

Toda aplicação nova de migration no projeto canônico `doufsxqlfjyuvxuezpln`
deve ganhar uma linha na tabela abaixo, com estas colunas:

| coluna | significado |
|---|---|
| `versão` | `version` de `supabase_migrations.schema_migrations` (14 dígitos UTC, ou id não-canônico documentado) |
| `sha256 arquivo` | SHA-256 do arquivo local `supabase/migrations/<versão>_*.sql` correspondente (`—`/nota se não houver arquivo ou houver colisão de versão — ver E10) |
| `md5 statements` | `md5(array_to_string(statements, E'\n'))` da linha do ledger; `—` quando `statements IS NULL`/`'{}'` (ver E11 — 483 linhas históricas, todas `version <= 20260623111612`) |
| `executor` | quem/o quê aplicou (pessoa, sessão Claude, MCP, CI) |
| `método` | um de `E15` (workflow de aplicação controlada), `repair` (`migration repair`, metadata-only), `MCP-ticket` (`apply_migration`/`execute_sql` com ticket), ou `n/d (pré-E48)` para o backfill retroativo desta etapa, onde o ledger não registra método por linha |
| `data UTC` | timestamp da aplicação; para o backfill retroativo, derivado do próprio `version` (é a convenção do CLI Supabase — o prefixo *é* o timestamp UTC de criação/aplicação) |
| `pós-check` | evidência de verificação pós-aplicação, quando capturada |

**Regra do gate** (`scripts/check-migrations-sync-log-gate.mjs`, wiring de CI —
ver seção "Gate de CI (E48)" abaixo): todo PR que toca `supabase/migrations/**`
precisa adicionar pelo menos uma linha nova nesta tabela cujo `versão` bata com
um arquivo novo/modificado do diff. Isso não valida hash nem semântica — só que
o recibo foi escrito (é um lembrete estrutural, não uma prova criptográfica de
que a aplicação aconteceu; a prova de aplicação real é o `mcp__supabase__execute_sql`
usado para popular esta tabela).

### Backfill retroativo (dados reais, não inventados)

A tabela "Recibos" abaixo foi populada com uma consulta **ao vivo, somente
leitura**, via `mcp__supabase__execute_sql`, contra
`supabase_migrations.schema_migrations` do projeto canônico
`doufsxqlfjyuvxuezpln`, filtrada para `version` canônica (14 dígitos) **maior**
que o cutoff já estabelecido pela E11 (`20260623111612`) — a fronteira exata
onde a E11 confirmou que **toda** linha canônica tem `statements` preenchido
(598/598 então; **598/598 reconfirmado nesta sessão**, mesmo número, nenhuma
migration nova aplicada entre as duas sessões). Abaixo desse cutoff, ou fora do
formato canônico, uma linha não tem `statements` capturado no momento do
registro — não há como reconstruir isso retroativamente (ver E11) —, então
essas ~1.906 linhas (2.504 total − 598 pós-cutoff) permanecem como narrativa em
`## Legado — não verificado`, não como linhas tabulares individuais fabricadas.

- **SHA-256** de cada linha = hash real do arquivo local
  `supabase/migrations/<versão>_*.sql`, calculado nesta sessão
  (`sha256sum` sobre o conteúdo atual do arquivo no repositório).
- **MD5 statements** = calculado **no próprio Postgres** (`md5(array_to_string(statements, E'\n'))`),
  não localmente — elimina qualquer risco de transcrição incorreta do SQL.
- **`executor`/`método`/`pós-check` por linha**: o ledger não registra essas
  três informações por linha (não existe coluna para isso em
  `schema_migrations`), então ficam `n/d` no backfill em massa — **isto é a
  verdade, não uma lacuna de preenchimento**. As poucas linhas com contexto
  documentado (ex. Kit Maker, `20260911130357`) têm esses campos preenchidos
  com a evidência real já registrada em `## Legado`.
- **3 exceções conhecidas** dentro das 598: `20260623120000` e `20260623130000`
  têm **2 arquivos locais cada** com o mesmo prefixo de versão (colisão já
  documentada pela E10 — `sha256 arquivo` marca `AMBIGUO:<nome-do-arquivo>` em
  vez de escolher um dos dois arbitrariamente); `20260916155725`
  (`catalog_stats_price_range_top_colors_materials`) está no ledger **sem
  nenhum arquivo local correspondente** — achado novo desta sessão, candidato a
  out-of-band (mesma classe do E12), fora do escopo de remediação de E48
  (`[GIT]`, sem escrita); reportado aqui, não corrigido.
- Dados completos (hash íntegro, sem truncar) também em
  `docs/E48_LEDGER_RECEIPTS_2026-09-16.json` (fonte única — a tabela abaixo é
  gerada dele) — usar esse arquivo para qualquer verificação automatizada.

### Definição de "ledger hash"

O plano (E48) não especifica a fórmula — definida explicitamente aqui:

```
ledger_hash = sha256(
  join("\n", [f"{versão}|{sha256_arquivo}|{md5_statements ou '-'}" for cada linha,
              em ordem ascendente de versão])
)
```

Cobre **todas** as 598 linhas da tabela "Recibos" (não só as últimas N — o
volume é pequeno o suficiente para cobrir o conjunto inteiro sem custo real).
Recalculável com `docs/E48_LEDGER_RECEIPTS_2026-09-16.json` + qualquer
implementação de SHA-256.

### Último recibo

| versão | nome | data UTC |
|---|---|---|
| `20260916155725` | `catalog_stats_price_range_top_colors_materials` | `2026-09-16 15:57:25 UTC` |

**Nota:** este é o registro de maior `version` no ledger no momento do
backfill — e é exatamente a linha sem arquivo local citada acima. Não é uma
aplicação feita por esta etapa (E48 não escreve no banco).

### Ledger hash (valor calculado nesta sessão, 2026-09-16)

```
8086444739de2607c127a1fedf231f96505c27482d5a18fc5cdbead6a4c85193
```

598 linhas, `version` de `20260623111856` a `20260916155725`.

## Recibos — aplicações confirmadas por hash (598 linhas, `version` canônica > `20260623111612`)

<details>
<summary>Expandir tabela completa (598 linhas — hashes SHA-256/MD5 íntegros, ver <code>docs/E48_LEDGER_RECEIPTS_2026-09-16.json</code> para a fonte estruturada)</summary>

| versão | sha256 arquivo | md5 statements | executor | método | data UTC | pós-check |
|---|---|---|---|---|---|---|
| `20260623111856` | `8c66fcd450cfb1fec7d2b33f6e4a2df01d383ae1d86992d19bcfa9411e2ddd44` | `7ebf41aae43405adeff2506663eb57fb` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:18:56 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623112002` | `849367eea2f534e9d9186f442748d4254e06f852a03fb3e5d86f1e7464f60a7f` | `6c0171fd36995dccd5c6e6c2c5820189` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:20:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623112038` | `7a2627c8e737ae9c2860cb90c4f0defa0f2fff9d4153ff206e585e809bbbce6a` | `50db7a73526ecaf99f21fd52c903eaed` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:20:38 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623112539` | `008cfb1e6021ef6c915e44f7b9dce250918bfdd60d59a7bcfe75d14bb71c9ae2` | `0bdc9a14dc5dbf15a3ec83dd32368065` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:25:39 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623112733` | `0e4e414f7fe93f97f41c526df5173dc2ed47e52440d7cb861a5661bea3565021` | `9a1a3d70bfd02d5cdb5d3e7092d58682` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:27:33 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623112825` | `927d2afa22d691f87c27ef350971910ba4be72741bc46f274ae1596f31b84ad9` | `ceb52011c0ea3c5b07ee7abf697438ef` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:28:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623113125` | `e8e82b98d35fda0100432c240849d58b79304379c574e7726726e4b1747f7826` | `1596242c4225a0d4c9c86f98548ec7ca` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:31:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623113215` | `e2234b447e56a512f0e97291795a731a87ce26036f4920d30ea0fc525aec634c` | `7b779dd9168eb3f1d4d5ed8169adf815` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:32:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623113644` | `3aab760409f226232cfcd5987e66462a12cba299c3b8024259d01796c2a5e161` | `82a830854de10b022cb3653fe4d857c1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:36:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623114616` | `ea7e5b366ea15c153f1cfcd36d9f079c9b53a7ba9faa1e8944571ceb80eff79e` | `9b3a27e2f6c639f6b236b2f08890c059` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:46:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623114736` | `0c3bb8bfbed00fe3e981d6dfda5163b8136e6d7cf032f98533c798e302ca7e20` | `f6f294d7e721f4cf14e89faa44a22f7c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:47:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623115007` | `83688ea970c070837c5fdbe9686b292a685a3e04f6d2449c202f0f4382d73735` | `d1ad3e90308d0d101bcf931ac93c24e6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:50:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623115523` | `e9b0fa930149ab310044947d4a21db675af43bce4614e07feca2b5643159c7eb` | `701d4682c7ca99f1a3ef6a7bb08114ff` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 11:55:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623120000` | `AMBÍGUO (2 arquivos com esse prefixo — ver E10)` | `7fe63e2a0f71aec97b8ef8fd4b4f36bf` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 12:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623120006` | `cdb18de031ed3554376731a31d7fd4c460b4e71e877faa2a8557ac591ee87aac` | `9771f76298adbd9bfdc67c4064f7f951` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 12:00:06 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623120356` | `fe1a6dc458b8046015ce5e19f41b221d3aa1bf639183dca448fba583c40e2ae0` | `b68e4c61f5e1c844525b0562a9f9162e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 12:03:56 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623120434` | `f57f9eeb89d176ae2f11ff59fefb15d80034976bbd294f8ca11d90025155d7b0` | `57fb58d6479fbeee4781b74fb1cc99a7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 12:04:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623120509` | `47ecf2e30f390429dd4965b859251e271ca27989a57114786dc406b6b2724191` | `6a6da9e494f10a028172312dc7ba1ca7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 12:05:09 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623120521` | `ba89bb127dcb79269a0b71685e99b4fa8c728cfd8777318289c8a9687d6804c5` | `3cb8c42d091187c6510809fe12de8331` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 12:05:21 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623120615` | `9bbb03e6067675d04136d771096a34bebdb0daa0bf03efaccf139a959cdac395` | `144bdf52da0aa3ccec856b92be58a4f6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 12:06:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623120652` | `12ddb783f8f2e5bcd86d1a79a44934274a0c5907e3cd25871ce80a74a04ca677` | `d87a31df7de79d309d27739396de3dc4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 12:06:52 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623120948` | `71b96e625485c81d6b5f4bbf8f7205fabb9b459efb7583b6e29462626ae6255b` | `9e6c9d712fcd9d009b9c55525012f530` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 12:09:48 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623130000` | `AMBÍGUO (2 arquivos com esse prefixo — ver E10)` | `6bad200896284777098e2a2ca5bdb194` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623130516` | `08024eb94f6349e041788e0e37566311670737ea1ec50c39cccd2b280b83d0c8` | `80c2a9d35de41d5b641f16b1a06380c3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:05:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623130951` | `d9801d02e8e9eee9cee8c9ab19383b23cfc10de58d2366224b05d72208839303` | `ea0855a2f9a965ac9bbba84b0fe5e538` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:09:51 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623131125` | `61dd3fa3ec70573f6c08ca1d02654ecf06a2dd4157c31d48c3eca641a04f469a` | `a96fa00fb54ff13a9597603af19c0310` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:11:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623131241` | `6c80fcbd1acf8420af77703fb30e1f4c11bf69442b550d78d65162a0341d538d` | `5534f7148e43cad25836ae87fa813b78` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:12:41 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623131628` | `216a7d2f8afdd40971d143400abc45978b4bcda3d92e06edecb2a2437b6a07f6` | `a5b51ae15696d1cccb03f8c1c4f3cdf6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:16:28 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623131753` | `85d62e59b2a693407a6b07af29ffa89fd18c54f293d08396a941888c5a870ae7` | `dd93c66ae86caaf4b8e4f4b48d1c95d9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:17:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623131900` | `2ca5d6e9d14f43b2fc93dfcf890163cdd91daccd8c84486e5f790a0ed78866e1` | `fdcd15859e4dadebdadd978b74479e1b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:19:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623132117` | `7a844a37c4a1db44e71af4c445cf9514291557f886de1155b2ab50af944933c1` | `3e4c4c632c9df08b0cb2fa5c59958037` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:21:17 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623132323` | `cfe683f561d8f3a6be99a7b245c29c80d18774297f256798b76835a3d8730073` | `c0847cccd5707a4bda95a3f3e4f563b6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:23:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623132729` | `74240bf0733dccddc3e5c8b80be31fea8371d1b603c8b2d4d8c913b75ce92604` | `22c1f484176559995e9a922840ef8ea5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:27:29 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623132743` | `02ca09ba78702d9c92f2094c48d7ce0b51b7202ab2ff455437835aa733aa6553` | `671f85403e790785a2f915b65d5499d8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:27:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623132758` | `449e3faa6feec0ede80f2f2230a7a4dc88008aac4dbcb977f65aa52d0ed7ded1` | `2086650186a8d189cdddc8cd51ceb6ce` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:27:58 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623132822` | `a4a99be6ddba4f8dc779bf3b798fd55a989f61f13cd16214378debeedd67b075` | `732444d5d2b08c57e8fca9ba57b9d8d3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:28:22 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623132844` | `f6bced02b06ec1c9cb45408e8288db531e08b5649eee6b7787e131ddfb9be0db` | `cd210cc571f8a671230b628f9b108812` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:28:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623132913` | `09aeee72372038c6f4a4bf1c005b7f9a83d2b34635b6d3cea6739e785af3a19b` | `1143ad41e1a13feaae5b68800e2d2510` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:29:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623132942` | `23078c870d3907f63b522f3cd13ed8e0de216587e9bd421392f8984f3d1cb7e8` | `26bd627012a2e5f5e59d4dc8c3538fd3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:29:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623133008` | `d54704c11b2cd5fd6db44ac1b7a0a7233b8a76157a6daa57d71add03a88fcd92` | `3a2df519ad5d53eaba6d50b133d18a1e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:30:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623133053` | `b171407834cea21a9a178ea86828be44edda3ae219a2482423d2de9fedf41dc9` | `c727a2f06d79971f3b2ae2fc05c6910e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:30:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623133132` | `b1302747dd591e6c314c733eb5df6bdbd8ac7f9516d6c029edaabda8b78eca75` | `1b59843dd04c95d0fd41bec656dac832` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:31:32 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623134031` | `90219a8f56d7843841628fb380a8af4d63d081012bd59b4d29b3042d7aaf6189` | `0dd7dc7b845524cc589e3361428f30e3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:40:31 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623134124` | `a4bd9d9d4947f6594f799b7ac4db551ae71e7ef635e30c08c047aca3b1716c24` | `f0fe2b05a6c0cdca3064a6487e8deb5d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:41:24 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623134342` | `07dc636f0f729132177fdbb46abaec7a9b9107a995b27845a99a914c989e4fc3` | `18461c1b9ea1203618f8c7e1fdd332b0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:43:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623134530` | `3946c65d8a3287972e3c2cac70acf6110ee2e9bc91a760086f920f443644ab70` | `2abbf33cb2f82d8a42f00c2b1a0992dd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:45:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623135907` | `b3710a63374a9401be45fd9adcdd8fb60c3c5639de88167c438b86c74446a491` | `9be6bf63023db94c17e07cc88717e90f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:59:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623135936` | `60280a0ea3c08be7fd4cf048afb65b84d1b7d2cf191b9ec93374d6c482c95d2a` | `d006b05cc2b7f68bda84529b1c61a004` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 13:59:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623140015` | `20042aced4beed83b7683d8ce351b10053260b876c0680c9417718bd66f7b02c` | `a44069f19cf4c8fa0366d3de63a9418a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 14:00:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623140051` | `d6ec6790a9e01170b74bfcf0c24bf3df71ae53259f3755ccf4c0f9e6368794aa` | `ba01270164727cba8fd45ca911ac88ef` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 14:00:51 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623140516` | `b34b2491cb5605d4f5c80323a1bb9176478d3dbc3628828f82b121b03b11acab` | `d98810436d3379ad0004c155a30d60d9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 14:05:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623140525` | `4ad671ed423991101a7e84683f1c4a68fa99faf745850d490000e98a9658b80b` | `6320c5809f4c8e1118dd68827a785a05` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 14:05:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623140543` | `51d5b5440ff966f8937b08b90b84a8469157f51c0b38c09503730a32479b5504` | `b5c0237c0adb817386945d01455e1554` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 14:05:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623141442` | `a90338b687e90c268662a41dcee15931358f2b5bd8f3832a4c75f4bdd7829180` | `d7f56fbd276ebb6ef36499ba4f0688bd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 14:14:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623141532` | `bcff3cb6fea82f62018a496c5a1d5ba2fdce21f2958f9f7ee57bd8ab6ffc4eac` | `7a00698d9fb1d19f2a1b74aabe4f8051` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 14:15:32 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623145237` | `1fdc8b9b30aca12fba1ad20e3ecd2876a5fca1156a720ebffc1518ea77fec101` | `5bbc87298e53c94e46accd59e428160b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 14:52:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623155246` | `8f61ae69d24a8a45b924626bb74f3cb23d6e1856a4f79e422f11fff703e4c087` | `f73ac88512cc978676569ebace1b7ab0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 15:52:46 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623161949` | `a16a72a5ff1e7c9009291e2ec7597ac37b93988be8ada9f92f1aa15e52803adb` | `9ed3bcfde2a23c69437c7a2a38863c9b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 16:19:49 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171100` | `97c53fe29272eba236d848df6e71dc4c7aa82156ba6990876ceedc328e986ad2` | `0f43754b15c79641d939e1775bfc8c42` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:11:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171200` | `c267a83eda9e3bd3d0326c3231a0cff979f548d1cdede14f141f40123de93858` | `6417abf38e17ae4670bf52cc71e3177c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:12:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171621` | `d4db69729c3bb1ce08b3516fc1c286f4695236d85e7ba2f7a4dfd4d37b0c3d33` | `d79c0d3a6b2b83610e2665eae700ae87` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:16:21 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171712` | `8d99892df89119fb5c48f11b4fde63dfcb6aa1d6ccf7fa24e1f20a1fcf3b678b` | `1c0fe1febec7f3ec1529de958f3d737d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:17:12 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171736` | `90e8b46ec5927e6a8ad5a74a46cd351a3f18870baeda2474a20c9b523a0f1e57` | `4849a43c431a219ae0de4074e2562ea0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:17:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171803` | `e1a5446e242ac618635731fe0c06365f3dbae5a780b7cd05945324a68db01c6e` | `fa23e63f8f57b1901f1b5d9b50f8c46e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:18:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171825` | `f7ca1b60b4c0f5076110c8380d30e87d762c13aa4c13b359474048bf837f2a6b` | `7cf6f70927fe83469907cdbbf8a38dc3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:18:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171843` | `b5997d51f4f4d33bf4ba8d2d64a39f4bf6604d63d5749181a0da79876649b256` | `928034511ee1b34181acbf6e70aebc20` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:18:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171906` | `00dafa3bcc01f0bc4a27566aa0a11654bfc493fa9d273efabe22c1293a400a1a` | `a6c9e8fb9490ac8957c9a78958cc6f69` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:19:06 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171928` | `b466863179cd30f5b4bf0d694996d6215c466305ecfc7e261e36d0a32fd6456b` | `2edcf73cf7714017f2e9b7cb0b1966df` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:19:28 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623171946` | `b91d257286ee3e472719be07d0e65cecb4554098bc4fc670c815afd71cce8778` | `75946034c06e03f5e655000ba4f84fe0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:19:46 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623172143` | `bbe85fdd6b29512f40aa830566fed72ffc9671a876ddc34433ec3cf40dd29eb4` | `5d26fce8d3cd911e90374fbd432ccdcc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:21:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623172206` | `51bb232dea59ad0fb65faa6cad0777b2c5698bcb8c9c006c58dc236e9060c855` | `a56f15150efa76cbcbf08fe82c3e0ec5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:22:06 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623172316` | `9850b4c7b30c4401408ddf7c021c6ad423558755745cf9724ba3c9e8eb6566e0` | `54556fc1c4196d25d5a9cf80249c85f4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:23:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623172515` | `8b9e30980b5263f55cdb6b57888412fb1b7762d9078650f3537a8cf0625f8f75` | `b53a98a32bb6b6937c955f82ae7e9dcd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:25:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623172541` | `d35ddfa6b7dca9a09b8f8ca584ff121530155b0f50a589bdcff6f14061338d17` | `479c368c036e9ba491f375330bc81cab` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:25:41 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623172737` | `8eb854fedbe9a289824e7046e2a81072fd017dfff5a0c57c37e94ea5b3038c20` | `60dcc6e9679d68d15170ca2bfc819fdc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 17:27:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623180000` | `9a75b8d177702aa0a1d63f76634c25d59130fda421f5c757f92c11d14d03e16a` | `1ca3c0b3c09f817b2e897a42e48e9ba4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623180001` | `a148c29417ce56d54daab6f2844da2ffa29573073ab51d335af7b2c70a79b7c9` | `922839345e179851bc9183e9db04aed6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:00:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623182054` | `7f251ad9e3f02be620a27f5d5694554166517d09f0e5b82ee947ff45c33fbaa1` | `2e9bde8b1c04122aa60ddc1f2471c72e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:20:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623182551` | `0924d4ab6b086580260433341551ec50eefb619effd683f5b4e2a7be941c1bb4` | `acd109f033e4e599fa87710f386d1390` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:25:51 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623182609` | `9c1fff3b560e26b5990c12ca182b903c0dd3903368be33b259584768a942287f` | `aa5b4a0b52d23a634d0e05dd9f227ccd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:26:09 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623182623` | `ec4f1982e62c680ceaa583a049e4cbd0901057a9ede521298a4fc302f5551c6d` | `8ce89059872e78196732e8d763e8348e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:26:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623182947` | `cb85ba4ac2de1fb2eb1f644981f984a10eaed40c6db1f796a264c82c37847442` | `aa7d760fcf91c617d263668c1194f468` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:29:47 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183000` | `4b70e67b21a163a45e885ca7bbda68d32da63fa2e10554e1f26c5ae7ca5a6bcd` | `a79d0b0d695ac447e04b0fd152267d08` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:30:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183004` | `f36ea62031f5643ac89b85ba9e395e4a203de5959cdcf8078681ea31c5d0fdc3` | `6a6c731b8e7f0bde6c3a929653b7b6bb` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:30:04 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183027` | `55189b830ce76fc8c9265ed1f0253e6f545c4de91c1ce3d851d1dffbfd443a5f` | `ba0f318c2303546b11c442b145dc7a24` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:30:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183033` | `6f6ba94392f6813e139d013cc930a069a8667b847e8510177dcfdffbf3d631c1` | `a97a1d91878dd2c624f5e12575b7b975` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:30:33 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183128` | `caa8827f486dc9bb21d9602f52dace647cf823ce20f4b493751b358c69cad611` | `c816edc4e90964ea11de800551a1220b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:31:28 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183141` | `2be117e490a6211019974d5858f75260dfe3cd9a2114886850431a09210b29bd` | `e09b0acee9d475c661fac13e6d2d7698` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:31:41 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183156` | `ba6a856c4c875fd76e42ab6927df86c9180024fa18debe716fe780b6a01ecc50` | `311ea5a53cd9c1454b4080fc7ae03bee` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:31:56 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183200` | `c845591df74959d68ba1ac7751a7002eec11a324e92af0dcd2c4418d0764eedb` | `513ff3d7f35dbb5844a47e5f33ee1771` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:32:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183209` | `34bef61f9f4c5bb321eaa460306934865e537ae4c4f792bb6124bc095dcbb1b7` | `06c304bac314200b7abd3ec20923d189` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:32:09 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183300` | `6fccfec0953b9e28ea06aaf43e8090453168c711376e16627c2d425570d7651a` | `d27bb4bb2525df06e045038722982c7b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:33:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183418` | `e2c329f5f68260ca602fb6f71b46c0e22f8122edc22199f7d4d7510e4c609e7d` | `766a3529e0ae729d1d6ed290e5578ec8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:34:18 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183422` | `89cd4a67d5b9930bf25eb18944f4f8b46690c1aea87076e0bd4256d1e06003b6` | `94836a73e6ae38822525d75b149977f2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:34:22 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183444` | `f327a657a4b10ed0cd6a31f8a06bd713c7dfb23f04888629ea19ec8a367e7219` | `2da1dd860a1bb8a6f8ee678300b803ec` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:34:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183559` | `4742795105c9bb35ed6f24d530437cdcbc39254e4ca40c05e9375968705a832a` | `dc3223e74a43d6a8ab0c3aef35c1f73d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:35:59 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183712` | `9f44e2b726572f9c9c10c2c2e828890eaf773122779bb7e2c3d7d4370f9d4424` | `5116622d84def935f808f8ea3d794f13` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:37:12 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183814` | `f74a95af206d581b141476aae63962468646fb3db37548837322a357526994e4` | `ed1210e382ca94588142bd0ba6846a93` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:38:14 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183831` | `41cf13282ba0133dd12433511af475792e083e083e4931f3ff5b22d66abcc3be` | `ff00277bd7819e1c5cfb9d9ec6dd3e3e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:38:31 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183842` | `64ca8fe77998556d152e316df7a6d624f9cfb17ffcb529ec338e442ff56184c0` | `03ad1a4dfce07c234be3bba58f61c717` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:38:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183854` | `f0deb0954bf4c785bc9a77d5319cb73660e191c092f8df14f7d25362d3e6be36` | `ea096fca7c9860d301a72bdeff55ab0d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:38:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183907` | `484aea4c6203d7333038c8ad40ae4f581c59b333228c8a24e311ba3a6383a636` | `8646f5adab2b4eb4e9512b474e2f3002` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:39:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623183927` | `9d760a9a3dbad44428e711e9f33f674394e97b33dba1ab6b12af935a5988fa50` | `b88aca512b81a0a09372ece080ce80ff` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:39:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184007` | `bd1824745c327fcc35d8f2f631cb28a23e75358fb9d998d5769175c20701e335` | `710384a21d4eae39aeaeb3e942d8e50a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:40:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184012` | `d911b4e2b20523ee8b8e1607316ad9d5827371d7089640a250bf726a767f3949` | `6f65f4716c0e45cacb6f37ffe1ce4224` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:40:12 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184019` | `09f4b42e0cad74aafd5eb1c06168187681f345158d428bda040cd7f7c7502d2c` | `ca71fa012cc749e646c9e7bb5b160582` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:40:19 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184119` | `e4fe42f92aa3d1eda8cb074b2db433d6e1807b84fcfb0ef87c44125d22b42576` | `69f58b35535f395f8d9e78ef31dda941` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:41:19 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184122` | `d6ac51be8a57b21b1490dca018c0109a9dfb251f1c49c8f433e74210f0381190` | `fbc1b5f8da052b8731d0f194f7505e43` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:41:22 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184206` | `3fdcb5892f4ee6d4b844483b2c4ff5066efece38cc210bb95c6abd298d25e599` | `24137a79c7a4e6c7972d63119854a19f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:42:06 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184318` | `8d300cc6117ee29885f47bce636f1c33dc705792f5ca7088cc66a0bec0dcee60` | `a4b3410cc9a966cd147c04f96ff7e0c1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:43:18 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184328` | `862c292a73498d142cf1ae0bcdec0873614377e601868cd881f3391fd9526441` | `bb17ee627a41bf556b1295e443d991d4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:43:28 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184340` | `1388ac7dcad28506e63f4c1a7838dd40d796ec55495540b0ab15c91cafcea89b` | `7b60daa7e61193fc1a8451eed4397c81` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:43:40 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184442` | `b5a2bc5c41128fbdc2a6a65791460e17a30f46e6063cc468622527cc0a6e00c4` | `fddc36bb3b39ac3c9583644915c1124b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:44:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184459` | `9149c8325d6b5e30d502bc0b26eb1c4edbbba031c70a98f35df49b73f928e507` | `93ce0c6a9b8b3fab4dd8c606bb7559ff` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:44:59 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184827` | `69f941988ab3b98072d0b42bf2afb6b20f8a103fb15b362c39210d3b5b6a4032` | `62204aab6ffdf832ec1fd084ca0580b0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:48:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623184852` | `a3e5c816de5bb3912cdb408b732510e628e2d54b7ed29c17089db53d21b9e0b9` | `601ddf3fde11c2b6bcd401b118812b21` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:48:52 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623185150` | `09e80df1e622b1d218ac43ce15bbd1cf55a39b180cb9bfcea7b195bad837ca15` | `e703ec2a643c2cf37d30943456f1068f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:51:50 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623185802` | `d6aeaa16f6fc066f68c6f6d4987c2dc7b4a3563cc835436c78fee00746cb4d44` | `ac582a46e6215f77a7a9bde887f1bf5e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:58:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623185820` | `7f61e36e3c50ff84aabbd53a18acf438ef065d006d723d4620fa856db9fd1cce` | `29db7eee441d4dd89fbc9f999f2a19ef` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:58:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623185850` | `8d9706e8026b30dabc8256a60ec663a1a07ea2ad56a2dfcd16899af62b1587cf` | `81532db91815a4cfda809b9df13eb737` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:58:50 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623185900` | `e53ce188ee215943e51ba6b94b1655c590dbbbb9ece62dc513c49ed1ebeee539` | `91b44cd643bac3d0bd418dc0c1d760b1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 18:59:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623190004` | `ecf423347d714ced9eeb702eef8fcd51ac05901212f80a26740a64ac8009fbdb` | `2c0ce2af4901de581cd01430ea0fa01d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 19:00:04 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623190039` | `51f26923015fbe2be5369a6eb25a0968501d8961b35876141d947a4c75491bfd` | `47e860f58bf84d0fc979beb4358473a0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 19:00:39 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623190337` | `b91f653c2169c4b9c213744c1faccecf0cf2a0b1e5457182fbe439d7e5c4ba22` | `1b356018b4c1b44fe16e4d41237ef298` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 19:03:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623190430` | `0bff0bcb0e2990ac94771c17906785f1e8ccb910639382c28893162e0353fd76` | `61617fa631e188feebd8dddac9fce729` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 19:04:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623201801` | `aef4c163590e55074b367c6989ad426cd470b20defe6c549b911e390cbbbe322` | `148da9dafcb25a50301105aa3a430831` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 20:18:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623202630` | `bb91f1e13c6127223693d183b3b56fedef39d9467fc32a56fea16bd4257873b1` | `c0a097e114833006902ef2aef65118a2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 20:26:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623202703` | `2889a8b85a40f6ad482dc41be2b27d7c8ff633900eab4ad9e98f7180af895d3a` | `d88abe73b6c0ee5bf3fdf1b8e6057249` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 20:27:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623202808` | `02032c620c523767d68147f6da18cb590cdc94d8d86b66785a8bba27352e40a7` | `95ff1cdf7f0f6bd8d57775c42829ff30` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 20:28:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623210000` | `339ed32932bd6c28382ffe85144a7b6350c0650ed7762b062bd023255906d17c` | `ac3975d9054f31ca6b72728775d7ed5c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 21:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623210001` | `075318eb36e92257246a4b345c7c357b36fdea72986f18532ffe1da01fcb171d` | `10e925320075c07f6e1c6927c91c939b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 21:00:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623210002` | `1ba6b3bc3855526ee62ee8bc9afbebe6f11ae8ffd2a9bd61389b70fc8e3a6cca` | `5eb77da0d2665d76b90170e6eff0d151` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 21:00:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260623210003` | `553bb0e2383618a52c57a46ad6fd9bb584b96d778f135077571151b858e342b4` | `42fde1028c3645e2c6bae10709f740fb` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-23 21:00:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624135450` | `cec8c1753f77a892408ea169835f3ddeabd1cb0aab3fd8aded42250a46b147f8` | `f5af9d523dca9e3a3b83322e8ab227e7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 13:54:50 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624135644` | `21409cce36c16620c0a1e929c2227a4c2482e30312566773e3dcc0670fe49801` | `b4d663520bdd666f5326d14434570616` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 13:56:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624140204` | `4562a0e6092a31abbf730240208e8937262a7c940c2635830a9453ed2e35aeec` | `5f3f0099c4a1d702f322e2f13e21b49a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 14:02:04 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624140703` | `be7f94d128f4c9a9cb25a3bcb6d6678245455b035f057f9870180669fe3b7ced` | `54788c9bea1d134d79b07f654cc6ec76` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 14:07:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624141116` | `24e1940f5e9dfa37a927915867785173ee03d575a2930bafc6980694060caefe` | `007c785c586d447de7107cd3969f05c3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 14:11:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624144301` | `d91054aace0df9c1cee4a6e5be53c41311e9dafa656d24adea737d9bd1ed8828` | `fa04d1f9479ad9f3327f0f14c1aff1ef` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 14:43:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624145739` | `02b3a41735f4400ebd52fe57529eef5a8637097b5268774c15d1ce4cc97884f9` | `1c87f390203580503a92d889b55c0599` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 14:57:39 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624153343` | `bd0b5d199ceddac5cce34d5966872c278b9550aa944d1b2d65f2bce937001156` | `befa57c409bd76c6bc9d7096ecf3613b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 15:33:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624153509` | `f39e9c33a2b92bbf7080a2cfb36c696307b4a75a6f21d0aecbc85bb6d2c8908a` | `e4b3ca46ac143b2f3e1621d23f499d63` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 15:35:09 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624154320` | `5d5553edb46531311e5bc06d99d41c4cb345c1fedafc0cb01b8ad7caca63f4af` | `05def178acf91f2c665348c9f535e4bd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 15:43:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624154640` | `d56abd9c84e2e025f8aff6698211ec52922661c28e42d02f275dc00966cb1253` | `f983de67750244310e181a7941746f11` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 15:46:40 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624154952` | `f9b72ede481985cda07f3c647066533274848e9f8adf75dfc633ff9599ac9fb4` | `6f564a085cecbf9eccb965ce6e26c4e0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 15:49:52 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624162848` | `0e6eaee316e15a6fd33824657613cb0bba9fddbfa9fa7209143b5789ac8fdb13` | `6bd9d92d52283ef1f3f970ea1170d356` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 16:28:48 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624185240` | `81a4a7c18e002b12134e24dd00284697e050b4abfff3e6e97516523c97a3a859` | `aa386173d07bba2e569d141124637b07` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 18:52:40 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624185410` | `272794469fc4b4cda4302791aea2fe157736c7b54ff2c17e0467d92a7a99d5b1` | `ac4c7466ff9a1ede235d0941368877a7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 18:54:10 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624185543` | `266332f35dd425dbf3ea465deef65b8b6af660a03734aaf9b2781e462903751f` | `955a63f16f3f3178a71c830e54938351` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 18:55:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624185745` | `dcd25d245363821244d4fb39f376320b697624db1647dd03088278c6bf6e4ffb` | `67e509c327c25c171720eda58a32585e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 18:57:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624190015` | `2f2312e76e8caa7de713ae067ebe81738c3b7071c820068283c0206af8f0d160` | `aaa2dbbcfd819941ac8ac16d64edaade` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:00:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624191050` | `8b2bc5f554969d6a56abc7bfbd775509de6b1298e9dcda63e46a734d71074193` | `03454a3e93150a5961235f0109496370` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:10:50 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624191218` | `650e851c2256b2b794048a150abede7399e77d07216d5ab9c235072c5f3d8605` | `c7dffc3756e7fbad389444a713390ec3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:12:18 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624193255` | `4e8ea1906bf89544e2b40dba91855d25178aab3a462761eb70f7a70d1225884a` | `6c6f14c5899dc4f53b2b5babad2e5059` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:32:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624193517` | `582d4e8b7b69784ca18d37f5384074c1c5e4b73a69cdf3e52d723965bc07a3fb` | `d06029e0ca4457b2f7626b47d4ac47a6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:35:17 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624193801` | `d1970bd510f8d1d0c4f40630441337ce96b2b8a73a8e7dbcdfe850519348b770` | `31cf2dcbe8e1e20c109858a36cd2f755` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:38:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624193820` | `cd78ade81d22d2d226d527b6adcd480f4178134417810821fbc12b95a7890090` | `27115cff176a5f81f6eb0af86a8baba3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:38:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624194049` | `e63b26436391cd46f580c73e309fa4bb0319090c748c56c179ebbd6b3b1e45fb` | `97aaf7bc16df074bb73255e75d01e544` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:40:49 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624195100` | `fa4d324ee25e17e3b05e956b6f898688cf01f81e300504724f56d40c4f6c65be` | `bb6700cb4e62de37ca6c72d821473f13` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:51:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624195559` | `dc9ef566a3b997f4e2d203ea2d3f92cbf60baeb5af1cf237bebccffd58c22ede` | `88d2b23202edd24c38771bbad7fe495c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 19:55:59 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624204327` | `9fa0879508cecb44545fef811cb373a19dc0337c242dbf4deadd4a019a0417a2` | `03aaf7bf07a16e0dc002039cde1c401d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 20:43:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624204942` | `587588257b2cd20611602b82146904b9eb931a7d2796769175701e3c40e5f609` | `e96420850672a28d6d57125b65408a0c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 20:49:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624205756` | `68b38fe8cb8e1a73de1f89fa073f717f254f347d294954303a9abb251f892c37` | `c641c870eb962bd317d17ba09798ebdb` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 20:57:56 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624205955` | `9212da132b6a0fd8bf4012f72b43cccad37afc6c8fe99a5578324c775cef8cd4` | `7dfdaf42e576ba7fb4c2d1a78669ea36` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 20:59:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260624210854` | `ec42828dd0ac9e53c52b0852380be965a5c1762f9395047d7cc58de678872c5a` | `dab54848832b64aa72ce9e41a6b62790` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-24 21:08:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625000001` | `e6eb6eaa4776a23d3bde97a6c924c1c24bb4a22217cdcd0b08971967a8a95e43` | `f3ad5d1808f9a6c930f85550b20bf61f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 00:00:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625103741` | `93bb669f102c3edfe65a280014f47a6fc41a80b6f97d2af3120fa8f343958c19` | `464594a0dd12b29b2217f981e0aaf354` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 10:37:41 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625104036` | `ebf7605e37354adb0e011a320d5dddbc9aceec3cda542bda43582f39f6cf369d` | `a320502fa38cb551117cc248cd1116d2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 10:40:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625110627` | `f9be1fc0ebd9932c0a74ad60838d4317e11d7c19e2c260f4aca4223e2a291b75` | `a686d5b86385f969a570121bf29f253f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 11:06:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625113346` | `e41056c1ceaba0367eb31f831fc79630bb49234879490e969e130f4130308778` | `2dda08c774727c3ea4f32b8dde8a6fb4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 11:33:46 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625113445` | `1618e760efea98499185341e64c795145805d0f724a69c209542555b0ce79731` | `7810ecdf459c73e16cd3c9e0ee041f8e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 11:34:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625114937` | `9f0baa12d699e2f7ce7dfa6a285b218b8d834f47b39ca93f216870d95d587551` | `5d713b4ffcf8232d03989e05babc9c26` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 11:49:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625124148` | `be94670a2f62c1375e70838c6fee2df68b195c3ff0d54517f75c04b4cec3189d` | `07fe7c27ee28deb4af1da71e27e76177` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 12:41:48 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625142440` | `cced413b5a5331c2b758f4a809486dfc74a1b3da838ac4c51906ad444140786e` | `f24555ab2cdfd323441635fbb28ff897` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 14:24:40 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625142557` | `90d129671cddbea09ffaefcb06880bd737d98a8d31b7979aa511631da94eb1e5` | `cbcfa8211caa5230fdc8a8bd3686cb6b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 14:25:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625142757` | `600c0bc0c30a66657cfcacff75f72b83861754f14f2d5e4f4c74d3715487eee2` | `7fd1ca3b653769379f119a2181679e0c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 14:27:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625142951` | `1d3e402520f0a56179349cb4fb2e0362c84a67ae388a0dce78af8ead5516b6fa` | `76e8eac3c1ac58db967fc5e4c9690fd6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 14:29:51 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625143033` | `ef62199666537cd47e671156307ef51e5cb953ed0cb2b798c93190f220fec2d0` | `d07c4dcd06f21f6288bec57474bb7017` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 14:30:33 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625143945` | `4611f051a45cf2d262e6452e09d8b521ab9e613969c633b51466a41f86aef68b` | `cacfe1c1e77c69911f52ac0f3b6b7c71` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 14:39:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625150245` | `a7cf468d86aa2d789407ac5c218b593a5c27b47d6365dc50957284554e3e87a6` | `92f16be69d71ee0e7cda2d4cda6fe5fc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 15:02:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625153327` | `4dbbe2304434d96c7c1c4b5d01e4b194ea820265fa3e69b37ebcf0db62d56db6` | `6c3e9c7adb8bc8775dcad259c6d5432f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 15:33:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625153447` | `e5e76426c4d83a0da6664fedf7a9c78efba597b5ec593e46ce56335c58e657d2` | `3d5ffc28f45540e06a49309634d48e03` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 15:34:47 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625153536` | `dfa6a7b604f8e72802d370d4f12e7d5e995ffab2f27da5e1994756f504306d18` | `3f1002b991fa192a3270ab1877b0431f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 15:35:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625153619` | `62d7c66d6abe85caa56f24f0694b9acb68ac4d505a6283a4f55af1c76068f982` | `349db92ac8109d13a8631e31652ec752` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 15:36:19 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625161934` | `496b1640650b0e4e75758d1b8f375a97cce5d5225d0e3fa19a4b6c9ce4596aa7` | `e5015e09a508832485e29274b345739e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 16:19:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625162113` | `9c9aa6895f7de089d1a856bad1cdc41b08aa064348a99e404f9739d6807afb9a` | `915918ee18a79555a4eb50d2ecd3d0f0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 16:21:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625162653` | `aabbe093d4cafcb990b194efd7624e8e8d6b47a8de205b59f21d48510fcd9146` | `af032a07211d1bae2de534795875181a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 16:26:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625181704` | `65f020df20630852886b6af2d776a0f40b1bb22b6415df7958e3ac66fbcd6f4e` | `3f703e24424e04415041d50a82a7ac4d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 18:17:04 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625195535` | `7f702d91572532e1d2e860e137bb95a900bf6ba4a0960ce021862c0d3fcd7aa1` | `2b0c2e64cfbdee4eb1de4d527b992017` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 19:55:35 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625220823` | `7b622ba9ffe4668e3c3533292bc76b889ff0c7ad8e56646e381f268f23aa556c` | `c1cb2bd09e64e336ad89aaf002c7ba63` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 22:08:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625221024` | `4e941219986337ebb3caeda02c3c9af44a5e298376192f624ad75a1da77393c0` | `42ae79bf35ceebc1d0abb1e9ab94c1fd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 22:10:24 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625221320` | `5d56881206837646276c2c54bff3bd4a4152601c0fc01a903be77711ed745f66` | `8b6d7bd600abb674f92f4dcb4483fb41` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 22:13:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260625221758` | `b028799e4e87148c152a7a5530a4a2d28ed53bd881a3b3ab4843464a61abf136` | `60f4869e6666c3b42b529fe182b4536b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-25 22:17:58 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626000001` | `5d4d0588b8785c46a469d06f543d315849a2cfa011bbbe79f7833fe2c9ed3f20` | `d69891b723c083f2ab0b1d930c8b003e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 00:00:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626123517` | `d4737e3251e33206c866d057c7734bffe324ae05d9f72987c6bb9bd4100c4a63` | `8f206942a887912996d67c8526d0c3ab` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:35:17 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626123656` | `c1948e97e984d86d0c351d5cef4bd9b0940205c8389483367c3e825a30bf7cfd` | `ce5bcfbb472836713eb5a7484d64736f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:36:56 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626124042` | `307b85e377a2fc03baff45cc4a1ef1b69ef40d9658ee88557a2bbbc51db98b14` | `e77e7853a5aab743e7f4dacabba6634f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:40:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626124204` | `1b8d40d13f2decf338c507aa810a2bc3a661ff8c25702da1af5f2ee9863766e4` | `44e595877dc3c3ce52d9e21edf426cef` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:42:04 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626124225` | `64dda3bc8bea11858b089b14c1ac1c9280b34d01340f303ac20aeb1a3846a9ab` | `a347cc19594ca38d759ae1226f7af9cc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:42:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626124226` | `66d153c26beebfcf95804e7715945801d0644183bef43d70289aedaef0c862c7` | `ed061c603cc54bf868416f0eb2079b56` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:42:26 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626124231` | `e64bfb9cffbef51e43da4ce81b9aa4481bb9956ad8e7eb5c46d5794af4e0e779` | `b2364abc216077c528ad5d253476f383` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:42:31 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626124626` | `f634215226518333c7d7793d3e0d61f8efc958f582c5b3c3ee8771e08744e868` | `02754d69452ae41fc101eb67817eedce` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:46:26 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626124627` | `32ab6805d81c0fec35fdc2aa096b6c42bba8206c16e067bbf393fac45563f0ac` | `a66dec65d81e40d64f0e7f7c2b4a7b52` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:46:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626124734` | `9f014aa0fb5161bbd3d911d4b79ae67c774ff8f582e325aadcbf9515975819c1` | `dc59bb3846f858d56daa69f914b9e73e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:47:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626124820` | `b6ffe14bcc673e9877ce7f0e94f2793eeb8ea797c23d7c968f259f02edf8abb1` | `d6cb798a04f575291e32650f9510bf02` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:48:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626125038` | `4d845f4f38698c00beccb74011bd76c8b9849c5dd855d7e558644eba229ee975` | `4aabc848a3c34eed00e71ad8172aabbf` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:50:38 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626125209` | `fcd35189e77196eacc404ecf54de0e420d0a65055b80c695a8a9ace86b206bcf` | `041c929c7539c6e0b3734c3381fc2bd9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:52:09 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626125227` | `b86d9417dd166f5d7a4eb8de5f06a07a42dcfa33ffd854a4a1e33166a2e7fc51` | `4a72c9459c19fb07417d43f8fb99b81c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:52:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626125736` | `054050e856030f0925bc8fbace7c425f5c27c3699baa3f3c79d6a79d97ee528b` | `7a6259ea78e0efa2c680d5d387b12f66` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:57:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626125803` | `a30f2554ed328019278664ffc7d81da34a08ce9ef6af4aef0b60d784a6034d89` | `85c5ca2f78b931bc44b627e41c47f401` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 12:58:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626130134` | `f4420149f53b4377ae7d1934991ac225cc8acece27b64635973702fac9bc49fe` | `e8240509fda6f6da596b02eb2984ea82` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:01:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626134648` | `96d5a2d24229e7556cab3764063f00c008133540d775a90b441def5538f16812` | `f19504d284967cb545b12d0038596671` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:46:48 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626134734` | `1c967eadb1c86ad935c5210565c985ff0f792c257a0da5cdcf2afe676ec7fb7e` | `b128a7ca50fdbf3f3afa9900f6cf6849` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:47:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626134930` | `2647d2323966eec8f2f59419e1bb7753b7e87cd1d4bc63e94544b70f74864d92` | `072ec488b2f7b9e8250ee7f56b5cbaba` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:49:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626134951` | `2ada245e4f80873b4a9fa4e05f364be19f2ebe985cb6bcafeed665622fe47eea` | `d400a0c14c8adef841bf9eab6c3fc4c5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:49:51 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626135003` | `6aef5387b2a7827458367840e6b44102ce6d34320a5e4b10fc11823c4923c9cf` | `de73cd6236a03d7e8389fe77ea06784d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:50:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626135209` | `74579287a84a4f3af9ff12449beea58b4e3d35ab58460fba891a5942faac25e5` | `5fd192a32a748fcdd5e0f43ea13c383e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:52:09 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626135215` | `674b36e5b43cc17d0c9262bb094172218b989602a1090dbb5cc75e97ce7591dc` | `7112f50bfe00779d505b65a999e29a49` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:52:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626135354` | `5a1d869ea7b4685a4aa79ff1c54578dca37cde43af1740327918ca62156f53d6` | `4a10bc4a3802589d1c390ef579d8a413` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:53:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626135600` | `34ad8e50ff9e84ce5c3b88135787046bf9e5432bf9e3222782c241e0905421e7` | `017708d63bc903a6cf3e472d41f9c5f3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:56:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626135752` | `bc1ccbdb1240b3f33a98282880f2b7f7ef7c8aee5afc98edc80126b5fd389935` | `8305c4a2f59ce21e1c310a68c195312b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 13:57:52 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626140336` | `3b9a51c8ddd2476b8b26f81c3c220282d43085d9ed6c5653a7d40b02d35149b4` | `50073a64b7a2def1e6a8ef80d75cb10e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:03:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626141245` | `a8fbeeed4c0a8b59ba18ba94eb21fd04655bfb5a8d82d2282553c26ac342f3f9` | `8505d1444f6ade1b8f7ce43581fcad1e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:12:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626141516` | `108551cad913b6525bcfd062841bd42c00307bf55b14edecc3cd830277ef7fdb` | `503e75d57ba5ff7bef5851da1999c0f1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:15:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626141520` | `879d7d9c05d13cfc96fabe7a141cc36a8b3f5cc9359e5e0b82fd85237fcce165` | `6f4213910f881a494a6bb862d5970b0b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:15:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626141540` | `6683ad057bdb0924c961406c3b6eb6ea33cdac0e1cbc8c4feb28d2a2e342436f` | `66596795f71a00840bae263a39718daf` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:15:40 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626141713` | `7ef482f58d00497b4b748c3b93ce155f485ccca79aa3e8e9132283775d1476fe` | `c36ddc139970f9173c043e1146cdc48b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:17:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626141721` | `3e41a255de6e81a6d5ce604a39a1e006dad95f50d97dd35f8110fb405b882a41` | `26b13885cf1ab2338a654af09c65a368` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:17:21 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626141849` | `1aa92981735d1617e611fd2ba283dfa81017b2436a401bb8460300d6b9e5bcfc` | `9eaf6464f25e5abd443131dee3491d0f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:18:49 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626142008` | `76bed5be52605e0391c986183e316dc90c217a30a2f092151a848d9423904915` | `f86ba3a9edb225d5c0afcaab904eab1f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:20:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626142027` | `67db336efd67559e3393c2a51de9900146f651e81d99df650b981330bfdfd3ca` | `d513c7594da03d8cef72c400a632b4ea` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:20:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626142134` | `0f10cb0318a001084d89c5f1541117e7bac6e5966463a80711c72fe3f0bb2ced` | `4f1e4114c32305a5e7996f7ced381914` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:21:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626142220` | `55ebd95c7f5f478e8d7b8cee0947baf406d89600aced6d6c8bc01853cc975874` | `32c52d876ac45586e9aa618c70c4d2e8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:22:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626142237` | `8ff2307763e4f07b47a825486c2531c8971b23229564004047766891ea31558b` | `784e6760db20c38afa1e6280bb72d6a9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:22:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626142308` | `1a1a63fccfd70da1f32a4796812b7a094b2f58f5563e15f18e3d724270c501f6` | `d5c06fa102cbd003102cabc7c8eb272c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:23:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626142542` | `bb775f7c0a4004085be6e2be75923d0acef41b03e9f0a760d5c135e3174c7c32` | `a31c6fad971c1674985021708283d4d1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:25:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626142940` | `005021bf97cf367f42bb409931b075ee2ae6155869068f8bd2bea58f5e9ecf6b` | `9727c4a11c391cdb9ba2a332c56d02a4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:29:40 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626143605` | `bc641026a213b5933b758bf0ee56060735836fb1bebdaf7f77d56dfc42bf3c2b` | `1f1178baaa9ff50e4f00fdac6c86dcf5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:36:05 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626143854` | `708c1bdd6489857c3b2a0c631e25d52c5a79dfe4bb9149905d8872a9d20bc318` | `6b317b0887a01e96cbd468dfb55f6af1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:38:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626143911` | `e1737c4ec164de8a8c76b65ec9a135373689f81888fddd78c9186d98b5ca3023` | `210734bc1d953c0cae13ae487a3d733b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:39:11 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626144524` | `3c301590d1e813154d6bb28df84daeb82e07419ae30069e92ba3069ac730550e` | `14e86353e766d9f86a150a73f204148e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:45:24 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626144654` | `e7c3f44694931040f1184ed8284b371769084a40eedbb96a287e880563ebba13` | `e21c387fb104e82ab877a60c03fa6e74` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:46:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626144835` | `f7e16caea3cb29ba2e7d4c41c61a2f02f59716bd1c7e882a25f8251e86d9cdb5` | `0f21cffb2e2dfb44f3ec163087ef2f45` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:48:35 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626145051` | `aa3377af7d75889076bea9711c5a1346cdbab0729fc388edcf8fe0e8e370e4f1` | `c63b741d0f23f1a019eb9e25f04a9aa9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:50:51 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626145058` | `7cb35729d668b68a3d8bb4a81eee8e75ad4a4faf6a5b94f7c371db7669882997` | `ceb1eef3b2526bba9baa535723673010` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:50:58 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626145127` | `0535585c8b92ec6e10372878c6edaa22cc1b0eab1d8a0379ba19146e480f70bd` | `732a2f73f914316f46c076501cbd2673` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:51:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626145136` | `5115b72f5bab4669fc27f257cf18800b81857c37ef971020993f0bf16e50d3f7` | `43645a5580bb729493616c1ea87f5748` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:51:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626145754` | `7f07f2d1be0e7c6a94a24634cf6d86b8e3d92d525d9612c5ce152f23cdafe394` | `91586fb0f245d543717c5a7ba5cbb1dc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 14:57:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626150046` | `74e791f4d42f9d1d358e13df39fbce17a52f2ede452c04011b3dd29976a4702f` | `336fe3164f466b1069a4307e564e8e54` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:00:46 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626151155` | `a3ac54a9b0bca866eda7da1651f07ef6ad35797e4cd6623e6410643d7b0d3a1a` | `65a4541fc301a8b989f09ea6811f1c41` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:11:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626151211` | `aa95da6f3581bb8f75e8f98b3b92d37cfeac11bd39a226585c60e0bef0100c8b` | `fb621bf76e4f9771768511893be00535` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:12:11 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626151302` | `f1f8818fefee3a5c182434cd5a3654a45d1dedafe02f9ee5d0335c6d862bf0cf` | `0972c6af5d66b2e9d427ea9a44841c9d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:13:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626151333` | `823a614eeb5863937012c06011399a22a522afde58c9bdea783e64717cf79021` | `60395c277f99c5396c21080401ff6874` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:13:33 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626152341` | `0eb3ae563b2e235e52aec2377a8ef92d35b0b086eee487366221413b3580f632` | `e1166fe665a8203c1c216fe6006a6cd6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:23:41 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626152721` | `8796017c7fbaafbf417699e8c554524b4deb9fb82dc4eb6740b7f4656f0b48bd` | `703bca96b5e244c83cacbe9b366984af` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:27:21 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626152810` | `a0eb3b412465397c86e399ffea8cb3a8895fcfc56c79078b417c40b231ee5457` | `35ef4e64a6bfba6ab142f2168cd0b0ad` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:28:10 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626153257` | `9dbe859d45b13c691c101a96dabeef6f7e6e576a95558952017df06b45ee8e78` | `ad14ae4d0336f2153f17a061fba31fe6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:32:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626153453` | `190e2c7bb5e837b14e8a5a47062560e622862d48cc5d194ce5154c2298921ab6` | `c51966b8461dd067ad1cef0218f98330` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:34:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626153617` | `cb19f52cd662dd0a3e08ed5809c944cddcb8966c14dfc2242c0da8ecc327dfc6` | `b91da4b4eff610a6f5038e6cf20cfe18` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:36:17 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626153637` | `1191755fba028cdba2067aade4ca24123f4379ccd603ce0829706f5e91e8fa7a` | `8c9bdef83e6c1bac5617e3ee5a7f5550` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 15:36:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626161404` | `2b7cfeb04fa2d8f48164daf2c0035ff65f0cf2ef1c5ff53aae3f6374f535d03c` | `d5416f90529b7dec73348f4307fa4c31` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 16:14:04 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626162308` | `b9abaa8fbaf5c8746e9cf625e4200726615a839b774c1d83ae83e1312d1258a4` | `fe551782276b893a216765cfe377db60` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 16:23:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626163054` | `e2411ee94d372be1189b43582417ee6f6788142615120ef446285f4cea603a83` | `4ec6cb8969c6783a860212ddfb1b70a7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 16:30:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626164420` | `003c4408e5c7fd3e4cf6c0ef32d9607a53910aa4d7ddf32a27617a696dadfdd7` | `3437ca0cf00f33bf9dbe364c6ceb78ca` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 16:44:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626164430` | `2e9d4627bd2e446fef0a4db55f7d804deb73c83be53d9c57f1096caa46b8a666` | `505265108b54a70500f60f209d3104b5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 16:44:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626164441` | `b503153b2e7f3802501674381674e112ab6a227ed2490b3dc638e3a0cb42cc0a` | `fa131e87b3c706cff9f9ba67ef49083b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 16:44:41 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626164505` | `d245ee07ba6339b6b79eb684a60217324271bff4a488264565957a9c92f2ea44` | `7885f9698e7f0c94ca897152988ef848` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 16:45:05 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626164514` | `29fc31dcf03e567e40abf3fe7fc89277eb9fb4fd7c12b34c40d63f428b27cfac` | `1818d7834e49f6fd160787359807d3c5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 16:45:14 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626164522` | `43ed6fb65dbc7a445933c56a5f50bace7a1470f38745b6d2f144d17f7a50a867` | `c3ce0529aa0ddd5623efccc8a667e95a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 16:45:22 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626170358` | `5f3ec0d2263fed135de9b54d3b32d82268a6e82124729a42cfe6cdd000a780f6` | `bde61748538ed055fb8c3dd8b22343d8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 17:03:58 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626170611` | `6b792f6146bb7d44c2d0439f2701f6f7084f2d3fe8a786259f58733cb78c6a55` | `bd801d278083d875ebcc094d44389ebc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 17:06:11 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626170735` | `9e8d6b8bf3064ea41a0c4c2eec8564ef999ac4d38b6d382b7c041aac8d4913ae` | `6402650762934db93d822e4ab543d769` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 17:07:35 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626170757` | `18f880aa9bbd38337161ead6601149cab484adbebf582ea4460108eb5745849f` | `6740dbf9db60886eadb0e28786efeb54` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 17:07:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626170936` | `c39ae3fcb1d21ee6332f8b109485122b944cd4fe82844fa2c53e959d4a515d0b` | `a7705ae713a87c0f6e499cd9ad25863b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 17:09:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626170950` | `f5d00dd97dc647353bf663bda6647a9a24c19d7f3614e992ad44efefc3deeef0` | `8a74a045a586194ef5b8f202945dc4c3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 17:09:50 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626171122` | `08c4af66799eba72327dce5271d1473380f3d8fa3562e18d34aa19aa4bf8491c` | `320c45a72016c04d00974e242918bcbe` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 17:11:22 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626171307` | `1185b4b8284bcd819ab95608da589e70881038cc3328181208927ff1ab13e2f6` | `7494317cdd004279c557b5cce4d9ffa5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 17:13:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626181320` | `64a55284c3d580b038ee12c064272ecc32bbf0c84849a8ebcbcf4c9efafe9e0d` | `bec49f40dcb514ae10ded6f3d6ddad1f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:13:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626181457` | `128debe8994fb505e0fbcf5f0b03c75ec90ca1765f0efbebe8840ef79c9dbaff` | `2aee0a1de9880b0ac2baae5e6b6aaa8b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:14:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626181632` | `22c081663d114a2111bf1869f8fc83d29900650277dc7aa5084f21e8705d93de` | `743e856099aa9a5cd6385900ccad0c4d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:16:32 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626181726` | `9c0089608ccd8ef6d3272634b83a813811c24001e9f83c22f5e1e49a46c1f8fb` | `85d15ef124d0b608959ad759b715db74` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:17:26 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626181932` | `9f10d16949f052970ec2c52b9131b182735f302d727557ff8dd51431af0cc6d9` | `a1197b88c21451d6c6477a677fa04e97` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:19:32 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626182002` | `0b9a4dcd0e46d0ce0859fc6ada81e9de480938d75954c8f55972fdf843319f4b` | `127e62bc416832cf756649f497a5eaa9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:20:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626182116` | `ac667daf8cc36ea4ee0de711021839e355a535dd970222adc0356cddcc7a793b` | `0fd92c5a9e8467b164a8aeeeb455edfd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:21:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626182213` | `3db07a6224e29adb21b0e985e378233824435b8e44b216c4ec5a3f9d4c15d227` | `6f64acc5346966e3d53ea77022590ff5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:22:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626182352` | `1ce1327802c64b992ad2471490f928dc8076c5f42620d402b86771b4d688979b` | `80150adfd9e255081899d6a19b71e003` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:23:52 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626182411` | `d6ec00391d22dbb79b54268087dc1c23c5a626d3e0a0c1a6875ba0c01592f61a` | `3891d1f4fa8bbe0c714ff8c6fecb493f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:24:11 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626182418` | `f998d39b54efb191393a956abaa5e3966c76f1a1ffe9cc62ab6d12e0106a499b` | `a6b6dc3f9c6405239a11ff4533003dd8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:24:18 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626183215` | `440c6f6599667154123be52f55cf5dc1596d139909db16472fed415f6bbaddd8` | `17e06565f5b1b2bc9dfb081301d41c02` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:32:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626183355` | `f6fc9fad564f13efb1f1b79cbe323ee8048887f5d29b92767a413e391f247585` | `107953c168b725a0d1f04b0d109e410a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:33:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626183609` | `7612874272834e3e75371b17c8ae70e26b9507e15f1700c3b73ab2a754a94e9f` | `94daeb6a4786f3068cf822e1beefb406` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:36:09 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626183832` | `a7329627256ba5baa886a3463aef445c4b4c416b903fec92d9f35bd5453112d2` | `e83b47cdf429139be0064a4bc68c8ad2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:38:32 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626184039` | `88040dde88eae579ade0c980eea37f730f65318c283b1e5a468c905db9aaec4f` | `c3dedb10473699c17da3befaec927313` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 18:40:39 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626190428` | `017288fe5d8fd5225527140a16a37f3edfc5cca8accad9d9ec3aa95eae6eb6c1` | `c91b887ef875e90e434259bd89d74cab` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:04:28 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626190543` | `91a7d32976b91beb2efd198624967384d53d6cb0111d490e06fa7ba6e0cd8509` | `048dbcfc52dba4e5c9295ea0f7021ab4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:05:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626190708` | `a207157cf5f647377c983b3a7ecc0d7dc9d94acd87005c06cd234555b0b191da` | `6e7db93cdc3ca5b78cd588af830dbcac` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:07:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626190738` | `bed45851fe8201eb1ae1f13544520c9a107047be75d681212304593dcf08d5a6` | `8f2e584a0a7100b70a5c992fd9b346ef` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:07:38 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626190800` | `817103ff058499ab2ff2c6658cadc7ec4917bf1d5b3b96cd39de8b2e4c83b647` | `97810f8b6c3112a6e24151f21d70c3a9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:08:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626190845` | `31220db5b889e851cf1a485f3579a3b7f79ec7376736eba96b3e0de2ddd46f4a` | `607a26f7837cfc0d854ee2182fd6de1b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:08:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626190952` | `6ece50446cd6d4f4471f8eb46a6fec9b7bd2dbe6d0edd60777d9533afac29195` | `8899f92ee8ce83f9b05def5f6c0e7aff` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:09:52 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626191306` | `37550e532d6e66ca8cb187aab3d612e4be9e229e2b5edbb604d53d37cc99c1c4` | `b3a7ef0cb8f59508ac3144d13f9938a9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:13:06 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626191357` | `dd7c81a400f9dc4d3d07860a9e4dea473d3476d7f75a8f7083340a8cc47f6b0f` | `b8e29427aa2ec9450611db9c08c3c668` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:13:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626191455` | `48ded37bc8feec181cd6dd4ab42c68c3238ee554d4a5f02af04362fe0a055ff6` | `d188b320a9e0303b47f7f36916253a25` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:14:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626191915` | `7e31163bbfed7ad4b1425d5361805c9b8d200977ccc3a9627c6eefca7cbc35de` | `708e779d1b7a7eaa88ecc002736eb551` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:19:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626192059` | `743c4f1a67a63e10aef69d0c37d078ab3a5f019496f64990134704d85596be08` | `1461b5ed390a4a2e42c57a0d7b32e071` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:20:59 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626193153` | `aa04db76a0da80da03af774ad8ab6e20998307069f0d2ae897882b1ad5dbbb3f` | `585cf0e1254379221c93bcd90addedb4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:31:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626193341` | `06b835fc7a0a069c563202f11b6e4bea81461f72c54d3d5dfab7f251835813fb` | `2581cd69e0ee9ac473594c589265c1d1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:33:41 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626194259` | `b4a78b2880f9bf1a4361f8e5f737b0d56eceb9e52d0450c9ffa0c56fce156eb2` | `0b5430607ba1834b3ed6113e15a1b352` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:42:59 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626194642` | `e262d0d8fcf22dd22a88254d65245ef982d0940f7e5943fbc2a8bd98a9b73210` | `08809bf08108fb74311b51a077a6f62d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:46:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626194955` | `899b66be084a69513c0f010539c474b4c91034bc86844ca2d3b1f61df2ce62be` | `8592f9ce4e69341afcce6e9d475dbb48` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:49:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626195347` | `ec70e132cecad95273e8ff368098089e6deb46da5b66d86482da1c635c195afe` | `a95d959a6c316964e2f3deed49b92e3c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 19:53:47 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626201424` | `dc075dd2bca4f1a6e469c578e34790b148d2b79c9643c271b573cfbea8ed657f` | `0cc95f1f5a00dab26cb57236bf0bc81b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:14:24 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626201525` | `98127b8b39af3b77c49c5663941d316826abf92eb4504079fdfb22ce2204bcad` | `809b85f70cd94b7fcb7983d0c0b2c4a4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:15:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626201854` | `ed14240be287916da3ae9791ae8535570c9bf0dbdb7d6a0b728f803d5f0a55da` | `570afdbac65e797d42f94ad3d156b1c6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:18:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626202220` | `c44e5dc548d0b3da318c4cea622ae6b62d85e046896043d2446ad6b2c7f52409` | `a642f3f902252e6306319f046996d7de` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:22:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626202240` | `0d454c501e2bd2661de8bd7ea1cf38c459c76d295cd3451f6ef9320e98c0d25e` | `0e91362860f706b5105a484a5a0bfc96` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:22:40 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626202310` | `39128e08117d861432eaeaa07e40667730f3c63d5a75b44148a53c13c2a1239e` | `9934d976d66e89e2dab864ada34db359` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:23:10 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626202323` | `e8c4a91e892c702599cf05615a4ebbbe7df644e33829f4c445e79bfad1085da3` | `a37149692a775e745d5f4a725fc3eb88` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:23:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626202412` | `ac5b10ed2166e85bf776fe47628edfb855d6f71c192d5a5a02131f4b7c57bf13` | `f3659c55396ab46802820e19177f9d04` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:24:12 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626202416` | `42ae2a2f9dd9e6e0be77cba3ee6889158771bf13a4d3fbfe3b5c8d0ab82b91c8` | `6b2a16715be4c30738e0ef7d9aaf6dea` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:24:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626202503` | `120c1c6739ada11b523f7100d9e65dbeebc4926936fc2428045bd0d0a9f4b0db` | `1865c3e13fcb9bdb3fc1b3ae32f1cc2e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:25:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626202945` | `378d0706874630c2e14e9c64734a94a98e26d80ee8c530b60bbf167ef22e9bc9` | `36340c1da335881d5478674def02e1f0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:29:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626203128` | `591d9bcff5add17de8447fc6b5762be9fbfec37e4f321caa3b0a8fc250e7d880` | `b39da57dc9dd3d0516ee09636a433656` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:31:28 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626203142` | `b2a85961276927745511c039db907271f8a1d2d8780104abe913554eba678be0` | `cc2a070c87838b5c4d091e04239043a9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:31:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626203246` | `52fe662c5aa2dcd6dcb7f5710e0b3e1c29b0f9ccac582c48506e31b9cf07294f` | `e29eaf5ccfb080f28798f0f4bedf24a2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:32:46 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626203405` | `fd2e87c05da66465746b59428502940fc1e82adeb26d6883898322ec11953f22` | `43aadc10a96cd88972146064880b7aea` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:34:05 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260626203929` | `28b2ffc3ea015377f81e59a58fd499e70077c064ef26bc99c1e277357372733b` | `895da78da4c27fa4244a64de57a2d3a0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-26 20:39:29 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627111109` | `0469516089453b5bfd3c7f8415634afcd9c98e3df93d765b93e91f4eed8f103f` | `ea323e62742dd8299731fdd5a3d5ce4d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:11:09 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627111118` | `543264adec282dcc668afa46f36d43e2f2de2fadcb95ae0e375639cfe7730afa` | `132ed75323997939a70d73a924c17189` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:11:18 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627111134` | `ac10198e72043184a6695bd7c0849f6b0b3aa3a03973d0bf254373175cab8411` | `d00e91e4bb6def5ac6c8f809c297aedf` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:11:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627111347` | `5c56d66f075174547e99039a1e565891ba8738ccd4bac9189fe1f399b6cf6edd` | `6ad49bcf098af5af5e5dd14ffed0eab5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:13:47 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627111707` | `d116c1a1c9386ee053b493f959309204cb8a5dfaee93a8320850644c603a6bfc` | `c692cbd8c7de7933f1af7ac0a2c1c8bc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:17:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627111905` | `1451886ecae5ede0241c2614ab21cb2415d26a98e2653017e4158e853615c285` | `d553e68b547860bace3e3f71af4903c6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:19:05 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627111927` | `0598ecf8953aaddcb69a22e14babe3cae7d9e8c3e6904cd8825af5b78eead37e` | `b4f32313a54c17b90c689ad9b7774405` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:19:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112025` | `90492310db9b0b82e2f7156dbd1aa7171c315a76125a703a86fbb2bd72b70e25` | `0f3833ae4de2c95ca8a1e64eacfdd9c1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:20:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112048` | `5a66bc49bfd2ed9016e36f8ff191b3a85e15e3a1207154126ab3c28a951ae7bb` | `c352e288a8e5d21ab9dc7f074c0a53de` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:20:48 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112133` | `2f875ec84a4b141829f7c84e5df4734ab4af8bdd0a2cfffbdd3dbcd1db9694e2` | `135364dd8e5b56b5df4c5e1a105aa861` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:21:33 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112143` | `9771660f90fd282b3663ead985e7a382c3d00a1f497923fbfb4285af9fe2bedb` | `11adfe645f99019a93ef322106936521` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:21:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112217` | `a6eb22b8b8985f5dd2790d37537822a2b37197447453cdad5de5e3ca5c3dbded` | `d305607d7787c6d14c3c3375eec76905` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:22:17 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112324` | `d6cd9781668e4c8756693513ad20d44b6c9ec1306d0a14010e34da080a85dd23` | `aff44a9cee1a2b172c25a312f28cb168` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:23:24 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112329` | `770ce41a37b8f9d2d84d2aaf21a4595b8b30e132a6a1ab2462650a23bba37f0a` | `69a19bf5159304b52bee878c4043e658` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:23:29 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112350` | `4f5ec7954c0e5e25ee33bedab68ca2e7dedd8e67f203b4d6965ccd623e5523ee` | `58bd0fc45c8edeb72e95e49de4e1c51e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:23:50 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112401` | `118c9ba9cc4461fd0bb61286b834e9a5321e24500c83610dc385277ea55cd67f` | `63524a58c80bbd34b00ccd9b053b48c2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:24:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112435` | `041a7873de6b63b9d15ec7be3e11fb9643dc32ef969fdec2ca218e595b6aa45f` | `f2aa24110b7cbf2e4c8f98564f3603da` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:24:35 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112457` | `c3fd9700fe1fd1484e23c3ee9cd0ae8d1fb801cf58970585d5d3c80983d72692` | `a56c666a296717602bf737ab02a3817d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:24:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112458` | `116d0208379924c05066a2ffc53b99dba8d13c293a7b7860f96b38a095bc1e90` | `081613c2b81b179055a88cc3b0b51ce2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:24:58 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112522` | `3fdff58f14303e013f35c784f958c2fbafbde1f105b05c349e3292d49b623945` | `a8d3a2cbae15c721d04b1547a69ef7fd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:25:22 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112657` | `19363d8314c508b1a1073d02857d1c19661d109d6a2ebc28631ab93bdf354cf1` | `170f077055a59dfd16542ecf79e75185` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:26:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627112814` | `633d8313d0356af9a08a25c0178834970bd581304c205355686688ab34d3d5e9` | `f4035e9a5d363f2ea05d3571dd82ea0f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:28:14 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627113120` | `94ef8ccc1cd09a5d76d64a4d6b8ca2201f4287fa1582846fe78fd36fb5528770` | `34890fc1bb350ffd50b1e9c05f6dc6b9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:31:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627113307` | `34960ee51b2ef608af6333276dacf35f251610a92a9f655ee89f45f3359c5168` | `06bf8ae4a4e1fe359857db342a0547ab` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:33:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627113734` | `79aa55ea0566e7b8eda5843361a2b584030f0a9cbaa269b6639a94687bccd1c3` | `f0fd1c716932d2279e62ba7e4f6e9eda` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:37:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627113920` | `d508610c26417fb4c020c9fc8140ebaf9e1d7c774e2948d9a20914c9cf928bb6` | `b1b6add071d6e9bb2cee9485d136e6df` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:39:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627114025` | `f01092f5c80e2433e71fd5d6c3ef94a309a2ec9fc846fae1178268b68273f9a8` | `70a9844285319aa3e102b12fde020aea` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:40:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627114119` | `3c4528623565bb8d06e6bfc734ee49f2a69d155c7996ffb21b3746fa3560b71b` | `32bc8df9bbec488f7bf934ce92f7ec53` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:41:19 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627114308` | `3a456061bc32c97ecca899a78a96f29692afc3190ba2d82f2d59d792b77dc45c` | `8bb2bf35dec9b5cd114c31b3bcaa38b1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:43:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627114443` | `d7cbfe8e71e5458413c14d46a51aa6e88207d9eb55aaab04b765bdd1256bac1c` | `a40c0b9ced89ec980e4900f535c5d34c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:44:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627114602` | `9a388a8ad4b950d1d8a3cae477a80174c705790a286180ac56c6a4fea154d3ef` | `f3e19e4cafaa1b28c1ab0e5110aae896` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:46:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627115855` | `9b14bf144917ae9f4bda3cc22db4356558d5c1440cc8c3846334d767824979e0` | `dc7085c138acef6b79455904ff134cac` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 11:58:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627130450` | `d43212d0070dfc3b1db28d2691d932b4a2f1ce57a289fa21a142dac43640e620` | `7fc6ae4dbc45077b027d718e8c485091` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 13:04:50 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627140025` | `5ef7c4bf0749e48bafdbe665594aa35590e82bfef5172ae3747e19161013476e` | `4daeea00a47507b97474928e34815cb7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 14:00:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627140133` | `702ffcf873c2b2d181969ecbcc08f29b2dd80c86e8389605c4efb46b4967bbe7` | `a69d5a562f29aa70a4a333cda70b3462` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 14:01:33 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627150023` | `8865a0c5199bba48f8106381517446c25883e7b621624264e33fc55bf872734d` | `8c2364c44f4844a6a159c95020f2cb91` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 15:00:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627150057` | `55dcf02fe492542a4713a3c7ec528ba18713b6e4c00b7029710528c0673e3625` | `b9b8d6233339b8fdd440de3f6800abf7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 15:00:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627153820` | `e516773f2c59a923715b216ba92415c397f5f574b3fd1ca892a8b126ad47ad15` | `7c1817b3c676166b1b4b86d26f1adc68` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 15:38:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627154718` | `5375c33056bbb7e2733897c0ae907a284cab815900cc9d31bdd05211e9640ec8` | `134189f4f1e9c0811de2a937dfa6eeb8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 15:47:18 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627155804` | `dada87d217a127aed4834d9587e275a360d25136636f30aafe5ec4874ab431d0` | `7f7a255577158fbb3a86f68d8f128af4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 15:58:04 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627155957` | `05b6749b973f8657ed83c1ac95f999ded536b8abf077917ac2e18d7473f27804` | `b78fe11d9ace6467c687a0557b774537` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 15:59:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627175355` | `03a5e475d09d29d7b35c790c219119dbb25937438414b42ea1957814f1097604` | `877194034d7435af5aae02e1fba990f7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 17:53:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627175453` | `f949eb8e1e5e2255b75d1f71c7b42cccbbeb17d11534697f537ce2334ecf7f6d` | `9f985864664fee6c29b198c5739af543` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 17:54:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627191600` | `59dcdf8806443770eb870d943e0de7c53614b89859b8311529986f6ee4a5800c` | `23658bf41362109ff3f04cad86ed42c0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 19:16:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627191603` | `9c1259229008d646bc1e7b396a597c30605c3181af92449dbc30e5da90a147c9` | `849ecda8e8ea155f22549859a19d6081` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 19:16:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627191644` | `8e49a2dfba813119bc33515d217c430a74cd8e220d7cb211c4ed0ecf8f2acd70` | `f59e11c9cdf113ec36bc2dec03c0b7b5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 19:16:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627191755` | `0b6fa53e8b255d587d3e3bff5983f789ccb49816a12df9a90769cd19066635aa` | `fb0d3ca4e3d98ed9f3df0e536a014278` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 19:17:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627191759` | `93d4643713eb2db967ee45596f32233c23f0e3cbfa1aaeeb7648b7d1fbd0c3f2` | `fd25e6383574992afd9afb376c38bc43` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 19:17:59 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627191805` | `d7454c88f66435616754ac6d14c4c0ade657ade591e1185b74e794aa9448a6aa` | `e87847c867870b9f6571b77ab4dcbbfb` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 19:18:05 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260627193546` | `58cd98b685f143fd7f7b018893a13d0c2f0ed0cef90864bde17eca604afc463f` | `11cdc893b71076d294d242d19fd4cacd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-27 19:35:46 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260628192131` | `1574355ba2b55258f593237f90690e0edf0e3cd6bfa862154f8eb044e698b888` | `a4d7cb4050457872cce09de16e9130a7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-28 19:21:31 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260629102207` | `df672a3535acc03a68b4bb7e72d23b8eb271c377b147142cea88045802064eb7` | `c448642c23520acf2c3cc7e6441af625` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-06-29 10:22:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260702163543` | `5b41027be01c4efb6134f28d8183c3eeb3d7bccd002277920f3daa9471fb0f19` | `f5aa0b2e976b57a14675ebf79210f3b2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-02 16:35:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260702171630` | `04cf5c130efb1e001548aaf0a550ab83a8c57d51a020a1e97bfd5746101a44ee` | `8b81a6dff8fa8ce682648551735e3ce7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-02 17:16:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260702171647` | `5d24421defd6bd76f5b9055cee6a6ebd729db9bee11f8fad02a7622c8b4735f1` | `55e229433c9621c51e76ce7de807db18` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-02 17:16:47 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260702171701` | `d98722c3a715405b23b2db258ce89125dac6a6c2110ac90618face89540d939f` | `8c1aeb191ae114ea99fb3154231093da` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-02 17:17:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260703151305` | `d159d7991ea583fb0a1ecd03e9d9bf92b5f52d36904eafd08056544fab85d2c2` | `e1abeebc5f9f5ef0b73c53392944e491` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-03 15:13:05 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260703155715` | `4cdc461aed10d874aa95d817c4ebb911457b8e0f3c95f677ff4fadf7dd6d3099` | `62218c5a9792a3a24d832e82ebca4548` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-03 15:57:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260703161544` | `aa5823860f00be948755eb7f73113f579b430fba00a5d186b72d8d42f93437b9` | `29b197f8a53275941c7f5c49c8b99961` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-03 16:15:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260703163913` | `396fea2a931de7c1364488f10905a5631e9750c7335a3161dbb59e0886d16faf` | `f24e6445468f0fff29e668a9da54a6ec` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-03 16:39:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260703164047` | `ad1d59f070b28344a7144ec9d1c26d9f2e7a67a891c85c3181b8ec47d3c1d1cc` | `25b587da6bbfd53e7dde32beadefe245` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-03 16:40:47 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260703164349` | `3097f653985f4686ee473f0716dca79c6dc74d2f56cb56079ef4a9f5ebbc4a4b` | `6a39879962af28deea7ec8070f8f8d19` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-03 16:43:49 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260703171129` | `a7d4ba656abda69ef3dd62869cdc105a69fc377c31ce669bc666fee20fc1d1a3` | `1f6290daff55710b1d0f816039d29927` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-03 17:11:29 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260703212625` | `967cc0125efb2f4975ef229e44c4af75f1a4178b37b42582bb9336f7dd0d7615` | `7dfc50871b9820848f8381136643fd5e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-03 21:26:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260703214322` | `146ae7d113e7a0296f9281e01f5ad6ae04bd8d48f3d74b25a37d18b69780c8f4` | `41c5c8646d54f662a5b38574966a5865` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-03 21:43:22 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260704103706` | `ee47dfb0f2e4da05a3abdfd034200ecd698ebb05da94f663c0f58a7d09b01212` | `0cec2b2e44485d8b79715a76a59171bc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-04 10:37:06 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260706181356` | `8b71a0f52069900f5eaa85c83dccfc64144c88b9c81fc552ecb21ae41a016cb1` | `42ddfb4e5b3011b2d1bb0e687c399b52` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-06 18:13:56 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709120959` | `29e6405729e5ca02aa9b8faa1fe87b5e5452da0e803b04a13455c60fd13c50a1` | `33049a0e22e29a178e1ce18f76d17eee` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 12:09:59 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709160000` | `03b8840f6171c114b7d06e958aea79220495563c779b0c84e278195fe4296b07` | `dc035320fa1fa1fea5d67aae3748df65` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 16:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709160100` | `a657f73162118a66aa241399bb6b9064f9d54e62682576db7fec8448c16c275b` | `83595ef0099280ca0c20397598755c79` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 16:01:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709160200` | `84fde2f340466a3d9984a52795e3062cb12d415dfe0aef567052e40cc91b3f79` | `ca217557686bb7423d1a25f3012fc292` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 16:02:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709160300` | `b42646260312cd22c69822e5a8c1821cad51d50e93f012ba4893999cdd8d087d` | `4176b31533b8faf4740897fbb9c16505` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 16:03:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709160400` | `625989dce3856e82e108ede035da2c20d902b13a3bafa85e4c78816a7d8f7803` | `15fe93607c6adfc19e267cdef398b418` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 16:04:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709160500` | `c00bedde9fc8c657136826a96000f46601e46672f008bac33b07d3e4964e5ad2` | `ca17471f84cd76156c43e55d2013204d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 16:05:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709160916` | `2e061ea8e995745c964ebe857eac53f8e63f77686ae0c8fec4b2877447ebc381` | `3d51ba0ca6da3ead69d6ab6c8eacfdda` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 16:09:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709162627` | `f2e9103b66388c0052a21377452672a49dda5be69a3adacdccd8db91b0916b79` | `73a8d452ec7740a28c037ff6e94cde13` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 16:26:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709164214` | `8b125a0ad99ae6b16b226e950682c087d7cd7f4f2e79be94667109d605ea69c0` | `0c0313de514f2b53d403b588b0091336` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 16:42:14 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709171925` | `ba50d37cd900cb893339f6c443bd31be8650cce228a803a7d8940819f23a22f0` | `a5e8b79c92a9933b916c2cd2bc8f4d8c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 17:19:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260709211813` | `1200249255b5d576b18ed4a72336ba1eceb5eedd48c2f19528719e929a6583fc` | `2a635860f801c8b2533e2768c7e7d3d3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-09 21:18:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710042220` | `8ab9d0023e57cc8f1c60418a6b8a8798d90da1af69f3c956c6816468039c0d93` | `cbc78d6fca2299b6144fb07e04cf96cf` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 04:22:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710042430` | `8abd9a891f3a1cc18c3cb170d9007f543e623f338cffc8430e49a6851e1c4a7b` | `9ec2373fa0b690547febfb48c4d719d0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 04:24:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710042640` | `a1927dae8e0ab451c6b9f4ac8df745ed1aef75753c27eb8bd92ffe083a8c4199` | `8149fe038a650629aa2b5de7072e9259` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 04:26:40 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710101513` | `23d7c1762ea749b352005888048c4a05464b8bff547916a68096c6572046d5b6` | `32929a43ff8b3260324d107c8a83f1e2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 10:15:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710104139` | `295cc6f65d8dd9e9822dec2216a019815d0084f30c9920ef1eb834261c3dcb26` | `a3cf601188a0e55be494c550867e8859` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 10:41:39 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710111116` | `27393c337b2f247bd84b5f1a6cbe20606774854863e5ffb87454606b364614d5` | `5d5965e19e8cec678cda7d2d52ff6097` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 11:11:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710111155` | `9d04060da87e8b882e7e5964c817585b2459c50d46df8ea516ae9028b73697b8` | `e0c20e0a04e05a7c4d80708c36c0c7cb` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 11:11:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710111227` | `60dba796bf0b9495c0d5dffbb793bb13a113de9a0d635f96466c6d8c7368f467` | `f2bec0c8ce27f24c64d6c93f6f90e7a8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 11:12:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710113150` | `71dfda30916ebeafd3e6c1ed7978af4c273200814d3f9a011c2d2dfe38686147` | `80021bf9549bf87760d73489a8d9f32f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 11:31:50 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710114625` | `122635ebaa5372bbb96fe902e06e7a3675fb5c7894367fc6a96c3cc38bfe168a` | `7c9c8861c9857cf210b4a9a83e8f0d42` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 11:46:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710115100` | `bab699decc0407e59a439a1c2909317e7320c7257e1c430aa5132c48aaaa2bcd` | `38cdca6c963f2a26a7a6c2435cbf7574` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 11:51:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710120310` | `27b731ebdb961cd02991f57c66320d173556774a6555ee67aa81a358e2c7735a` | `4f3e605bea4bf51103d0e1a8c4d88865` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 12:03:10 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260710160600` | `7971eb4dd1fa2d2257bb2dc4d2a64af0bee16c6cb9080f66f9fb4f4892190303` | `0874fa7190ed9b20fa370eea8f0aea1f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-10 16:06:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260712231443` | `ad0ae4723bd91256c2ef0b7f49654185b17a0a8825989d72e69df42383a47208` | `0e124f6c2849762f215489ebaa7462ca` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-12 23:14:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260712231511` | `25349d26991fc1d01205bd8be5fee9b75ece11bb65336bb7a34f18ddad31aaab` | `b2adcec2516350edb71709a34a619bd2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-12 23:15:11 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260712231546` | `3c9feeb91828440664a1075233141e0f640295cf471a1a95268322249885e4cc` | `08eecd91b8e51c61e471ee720025ecba` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-12 23:15:46 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260713154845` | `e309dabf808cc6630a6f431ae9b38081ae9a1498e840ac0a58de0481dd41f626` | `d640676116d4f251a9f67aac30ab05c3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-13 15:48:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260714112457` | `473b98fcaf1127345bfa40384c5f7bb521307a70e785704ecaed752f94a7b61d` | `5b810b35a86349f347b928c749c609e0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-14 11:24:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260714112808` | `bba3c1ed980b1cb396c4e1937c0d9d2657656668c03adf218361b4db5b7b125b` | `4de2f37b7d354ede2465b9875a6b165a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-14 11:28:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260714120601` | `d7ed1900974f90f3887c12e0502d6fb3edf5cae128a2de4b57dbd4e0724eeefa` | `1ba3cd5a401e1628dd67af89e375d051` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-14 12:06:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260714121200` | `60ad137e3a8b4294977f41ec145c08145de338b194edd8dd696aeb1e8b34762a` | `55932da2f17428a947a33554f5ec9012` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-14 12:12:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260714121410` | `a6b939a03d5056153a58d8dd8c4947c2b0c23350696e4228956a08603c32a0b3` | `4ce9d42b61e914ca636f30b726b1421b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-14 12:14:10 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260714123908` | `b2c645d7b4d92296ee5b92989cbf081732c387c2f4148f963714ef2ec18459f2` | `64171069d6e471f1c8b2c82af85caf60` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-14 12:39:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260714130438` | `b29f873dc399737992afb7161310ed4326963bd299c7d0a195cb8fda8d739fa0` | `1c1b5205c33bd00e50d5c80979d02f1e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-14 13:04:38 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260714130503` | `7b1cb71a305d4400df70ba3578f63f7e3e36536304c8c0284741e0cf82133e80` | `3ef4f1eea63df54a60e7b658fe559c90` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-14 13:05:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260714151156` | `b5f5d8e93f2e5d881aee6451cc4d18811e99fdb5597bd0535f0199db3809a734` | `32185b3577a697fe28ed7194fc245ff6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-14 15:11:56 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716000033` | `bdb3208f4e2d0ef7d5c8a882947958c25f6bf61c31056c1924b8f89031bdc122` | `1d6982853d635d3d3059eec3aaa3d229` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 00:00:33 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716125144` | `0d2cf3fd7f2078fae797f8e36054a37ce2c687837edbd3b85f031bbbf5000459` | `df457480a6b859c136244ff14670996e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 12:51:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716130057` | `eb2aeaca36f7d22915770518192ddcf8347f173f99c58fa3609c0d48b49189b9` | `29c278c8e4bde6a60adee05166863a33` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:00:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716130352` | `4a05fb9cd14975807d92ed2667c6c817c02166f67d0d0190e11784b873a9f53c` | `73d004333db830dd7ab1ce401a3a13dc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:03:52 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716130445` | `3825aa9217c4df03bc2349c3b2aa16d8a588e95b8396defe6a8a9ba03ad51a33` | `5ad7ff123ce504f9e240cafd7f91aee4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:04:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716131209` | `9ed736324dce459ff261ccb89bb7716fe69fbf9cae980594181365493575a719` | `a24fcbccbfacedfc68a479b59f5bdbd6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:12:09 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716131517` | `159dead99e48cfaea4974a41f55c8d20642da1c1b86d0c39ad25bed34b54cbbb` | `9be98fb220335e42eaae6a705364c131` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:15:17 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716131751` | `d167cb7436c1a9907a8dab90c39b592a929b18e723433ee7eb6ff93fa9c9185a` | `e7b99fb7335e9082b0834446ad3c4faf` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:17:51 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716132718` | `9165f926b9aab7ae23691874c43859f40d639ba1ad0b1595847fd9cddea2dcfb` | `0329b12e75882f1c978101fe4cf5e6de` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:27:18 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716133622` | `d11e64322ab177037763d7a5ecb6ea8ef8f2db9e0f55c9ff54f4fa12c54eced0` | `2e564a69dd707ecb1b1ff2f08c98cfd3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:36:22 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716133708` | `e17373b5e71830880b8efac2ccebdc8cd7655c892e6dff7f6406db8b6df055c8` | `bc8c4fae7fad4a30e82550b9ea3ea565` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:37:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716133953` | `821be5e98d5deeae513300a5082187a6955f08b881ac37e4425be489fce1a16c` | `59399aef4fa4f0c224d0f1af89d6caa2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 13:39:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716140313` | `4195e90959983adabc4b7a3cd582d3ef59ab9ed4e90a0f14e982be3bd9e029dc` | `b2670203734cdd4b007b58439f805594` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 14:03:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716140340` | `0940d1cb611c2b6ad28a0cc97fa52110c1546430e1703f9d2e57f8b13f4b9f7e` | `5f85fc77a64d1a825bec3116ea470e8b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 14:03:40 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716141038` | `46b063c31d5fe760ea21dadbfe6b768731cd982d557e88ca503d2ab0744af11b` | `cab74c9a246011662c51a54bc890e06b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 14:10:38 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716154200` | `8249ff7e5cc54ed6bb9d24461ceddcf7107a073f6834545e6d9b3e487b0ed545` | `0732663dbea6f7936e85b6cdcf685ebd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 15:42:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716155206` | `2ca3fde1d987fb012fe48785a3b9567d729a1205823bc440104b9486b91cfe3a` | `07607c164dd04925283996692ed2924e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 15:52:06 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716155533` | `e28fb8eb44fa5b9176475a5f491d63c04684754d464a7fc955a0ce0e7bddaac4` | `931216676881a2512a5d8f482966f3b3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 15:55:33 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716161757` | `e72af0ed1cb6685fe4fd69bcf5d7035c5203877ee2f16b2bcba5a7319f4e3be7` | `ffa96e0ebd9e280e680ae2ef5577bde6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 16:17:57 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716163734` | `5d668fb231cd1339db81af196efd262fece47447265624e82c8b271838ccae14` | `f837e029bf88944644e5b74e7b538139` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 16:37:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716164056` | `e05b67eaa6be6ff30075bea052d305c72d5989f0b47b3cd130ac5134ab691bb7` | `2a44ab921c76818ef06256bd941e430f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 16:40:56 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716165103` | `24df1da0c10e2f1fec538fadff0f5b1981f11236987841080a644668d4bc37f8` | `7f849aebe31d9ac5ae1c1f68329d0b2e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 16:51:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716170151` | `50da89394462a43bca27907435ade31ac25b97c70ba39786da143b9c0e4d45d5` | `55ab22186e22c95e11965ac522fa13f9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 17:01:51 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716170538` | `fb100012417694346a4e895d30b24a89d69f4a355dab1576ad39d4d987ac8635` | `19562cc2d708ad34f45a4ea3f11e8241` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 17:05:38 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716173616` | `bba2893f05103c13f49ebb31b16fb8202181893dffec9410125310af5e8d9120` | `4e71fb9bfcd2389682ef15b37854d4da` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 17:36:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716174337` | `78f1fa38866a27de235441578e48eb7bf959beaddd43dd77de1280f3e1a87273` | `9ea65d36c2b776979526bc28ab784105` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 17:43:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716180616` | `04a5a379d6fe34685ce7871581978e13846df291a756cf3cd334fa65d950b285` | `552b796ffa31a5e575b427753a15e99c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 18:06:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716181436` | `22f9a172f21ab620e8b6beeda641ab935a8cacf62a0bc440c764768de028e2a1` | `ea6ca0ff2cefb1217f219fb8877be356` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 18:14:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716185751` | `f666749e2f25c1f457700f0786723f633087ef9d9548146ab34dd4b8ac0906ce` | `a48b021fe1347f770e5c7933f70a3a94` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 18:57:51 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716191641` | `1d2b9d403b50d4a3a285b54c48bab4374937a30d4720797f4660a4e9b34d88bf` | `cf1fea3579257e255829f953b1752be7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 19:16:41 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716192234` | `fb874a92ba892e7321053b8605900482c24ed20f5b942a37da17c24aafee2eb5` | `4eef47d92dc0f0a94f4bc2b1ac80ae78` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 19:22:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716192920` | `99daca68aca1204a1f3a78884dcbafe6a0d5064f1cae84fbdb45d57baae21238` | `f6cb2e2a536102fc357a4024330d1c6e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 19:29:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716193808` | `80a8876911a50e6cbc203e13c4d177c71399956f59b7fd143e89ca3eb85b1b37` | `e7fa5764301a0ff81306ad0fbc19370f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 19:38:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716194902` | `340e0d78ed921971287837ac5a734c2a94862fd0a6684fe6408312841781d047` | `d7e1308cc981b03118733461d0ad505f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 19:49:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716195008` | `10c9843e03b3e6bb2f84936138be4eadfda37ce90f9d6563fdbaa847cb9d93a7` | `1df0420d226d78e7584dc838a3adea19` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 19:50:08 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716195353` | `4c85a3005b6fd36342bad062c865e8c69d88af0040aa0357836a647793ab0c69` | `0b05ac876304021410254d7db1341830` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 19:53:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716200244` | `76adb8067e38a27f62f23c7f5c5a13bcbd7c51adbef994b48dcf5dc6477203a4` | `86a6a5aaa0307db998c0c83225fb73a0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 20:02:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716202321` | `ab5e61884eca8c0af50992fdfa4c3197314a641661b54765976701aa45cac46d` | `65a48e972ffcafb506fc278492a7f7cb` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 20:23:21 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716203920` | `0d11fda504dac4a8786f15020e9136616417c54c8143e26fb24c6847390ad549` | `a65107f99ca0c21857770a1afc7185db` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 20:39:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716204944` | `ef7566fa4f253ba91ed7029584a54cb0f8034d1fd0ecede23f582649a0e1a6fb` | `84b8445e53aa4e00b387f3a693526178` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 20:49:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716210637` | `dc737e31231bfc2a479eaff9f3e222fb68bffa92b058d0ac7dd592a97f615646` | `a975fd7d06cca518522789e8ca148a91` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 21:06:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716213415` | `af7d5c9c86e010ee3dd65e11239bcc0842796b32b9802479907425f779073db1` | `fe7564743518096c37f46eadae95d969` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 21:34:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260716214659` | `8cf7d9408861958a3a3b06e02fbca5aeb0c82cf3eff108b58c4d06881cefc890` | `fc3c3b0bb2cfbc84ff973791748c2327` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-16 21:46:59 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717000068` | `99ec2b9e8773cf0cd97b715cffcda7b87aa5e6b71e7e4a8da05b2c5b4ca02531` | `9b0bf71aab61f365fd37999a274d2d30` | n/d | n/d (pré-E48; ledger não registra por linha) | n/d | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717114423` | `e3741ab2e327438598750473b05a4b746bf542b05af2d40f7a9381f895bac5f0` | `e9d34472431e0b2e81dfc5267fa38d7f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 11:44:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717115130` | `430da81937746044c9f32fe00da4739bdf36e078d0f0883a3ef54ab77391fbc8` | `47ede0f3d07362e04e561812d11b32c8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 11:51:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717115253` | `da7fd7be3a85b3cf390f9acd475f8861f74f9f42af1db8e0dbb8fe20a1fcc9c9` | `dc816cb126d5df59c8bc119c2e1b77ec` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 11:52:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717115358` | `fe263f7382c3c74510eeda2e7a7d2ff034422c386dc1870c1f668218bf19bf59` | `58ee58deae2db86813b31de782b6de3c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 11:53:58 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717115437` | `3170794fd4d089dfc719156539cbcc7905d0d3c343c8b8993e7fa1811ba14ba5` | `feff8c7cf5bcd9ccc3fb647314fe0c7b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 11:54:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717115513` | `3fa749b43a18e6b66faeb6df5e618668bc340553780e36515c5742c940fcbef5` | `6b148795bb21361b875aecdc66f44251` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 11:55:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717115536` | `1cb458173a71dba8a054a0555ca5912fdc4e866552c899f79e9ff989ece1b66d` | `8523cee9398ef08bbda7cec7d93eb18f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 11:55:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717115930` | `0923ba5e8feca41f737cdb024039ed7d6dc908e92458c9754ebebe64d777b674` | `508849127a37c5ffab42701e3ff20c6a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 11:59:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120020` | `e83cf35c156598d5d917be71f54bbd354a2f3a6f7213f9fdd04d764eee8c582f` | `aa6dcbb0e5d5ac4b5fb31e02a0086fde` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:00:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120058` | `ce17a2e56bad5986affcd1c8b623dd9f0faf932467d570ef992eb94c1599d850` | `d9fb385d5bcbef824ac35f1247414a7b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:00:58 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120121` | `d2fcb8816eea54aa7cda499403d27e09d14890f90abaf1ecb6e9657401c9e403` | `9648e93b6c37a3b43f00b083c68e0e84` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:01:21 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120142` | `c138b9a015d01c41c61768748df9b426e14e5c520c2d0b2b6a06f4acc2e04bcd` | `091255cc3ac762d1d12b61dfc6db699c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:01:42 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120223` | `5d9d4d58584f9ef94bd60e0438c2a4a9988a5c8036873e1c5fe62f640593be94` | `fa5874d7704808ec9fe5b1945890ae23` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:02:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120527` | `13ca8b216ba362bd11a72d2b06cd69baf48b1506c4ee286749f8eaf3b430891b` | `b1856fdb2e1fe59fc29d0edb88ab7d34` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:05:27 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120556` | `fd0bd7b77f1cccdca09484a1ff0c4ef415acc1537f27b42539f7c6e095fcf533` | `102d283e541c8316636d93efccda88ec` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:05:56 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120634` | `e7133c8d347a177dbac04ee9510f816c9029463a6ad35b6c53e8385dc380c435` | `bc214af336492c46e29700133f061759` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:06:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120702` | `790481ca80f609dca21120064a924263c4096728fcf2f3db99416f5fb64d8c3c` | `a790f41614203fe4aada44d641562b7c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:07:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120723` | `8d02faa3cf007173b1d1ec58818227049189b18a559efdc482e3b55806bdbbc4` | `d8f2e111c81148e2609999e6c3e0025e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:07:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120745` | `fa52561cfef7d22de5cc05105d30d223c73483403c02e45ffaf36b87f78bfc99` | `70edc01cff9fc0364d3c5ccbea438fb7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:07:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120914` | `170dfebbe07f68df5033df97632b4757ebdfd53bf7e9b0a727e7375f13c20945` | `f9d04d8996e9d0cfd84615cd6bb0cae4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:09:14 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717120937` | `6fc5c5eac844ca1b4578284141dfe46dbec667d61e840daa2270a330b0982466` | `96a91718b0f7110acf6695c269d13a59` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:09:37 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717121531` | `a39bd81abc04a8a0093184238ae268a20ec28e70f877319708c8b7a6bc3d0794` | `f82682427700b2fce6af73c7e9ceca1e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:15:31 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717121707` | `ec38b18021e1acbf45b536fd9638197c78872266b1ddf736ffde0773ba6f9809` | `1df41704098aa39f7b120cb6cb52af8a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:17:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717123014` | `255a127fb83a626d8fac93c5c7521d8db0054d41714acab3ac02df1a840a8d5d` | `6c5a81e8407a70a762a07ba3cee2c4d9` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:30:14 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717123553` | `485f45036dbb6b055f96e897f75fff9fe63d3061dbb7449259b0edca43897f4a` | `6c8ba5b7dd624c247440355c249fb41b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:35:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717124313` | `7144ba45c9dcaaa7d673b46562a3de930d0c8d02282bf62bb8cb68810a845154` | `7b740a3eaa90fe9dc834adc9dbb69d98` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:43:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717124411` | `72bff945308795bb948d220d93c48226b4c82c282bb8048c66f10a4f0feffdfd` | `3f8d1508f37fc69774d569418666d8af` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:44:11 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717125807` | `ba6c7534932a68325dcd3672f75b0448e7a1a0019f346731de043a4eb3dbc20a` | `f8b2a7e60353d8ac71282fecf515ea63` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 12:58:07 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717130602` | `d9096d7e0c369f0663363140eed37ff10391f3f0850f824afc3e1bdfb3b7eac2` | `60bf76518f25c78d0e2878dfdbdbac06` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 13:06:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717132619` | `e64d9f391e6ae9b20de68cc31ad993f32dd6029c54bcc2087c14ff52a7041411` | `4020797712ba10c8c7a45dee7e54ce3f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 13:26:19 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717133334` | `d871bc8894740a69c75adb7250538af30172910b8c31af1a42db1fdc22fd09aa` | `61fe5e46019e7e2b32f66736a57615c5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 13:33:34 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717133700` | `333785868c639b04fbbadece78eb9ed3c9e7ad45ed47cc4447a7d44faed4a5c6` | `267f17750f10157ad9d1d16a50865c2f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 13:37:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717133915` | `7964334a593fee6957e39118aa80a31f531d251c98f601b2e5f27569176ad50d` | `d6272326cfe4b5a08cc03cee4171d6c5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 13:39:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717134415` | `780097761436bbde24b244886fca487d1d2cbc5786f46db7aa55f999021a085c` | `fdbcbee11bd6590139c70b5c06c97e5d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 13:44:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717134612` | `97f883191e6626b396912738d554bc8967d8c1433499da87dbb2eae1fc7604fe` | `133562c5ca5a7aea24d6c0bfe27b6e4b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 13:46:12 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717135935` | `785cfa975de26cb7369d1f496f3a8b7c0e8882d5a57eb21a6ff44b3a1c03ea31` | `c2a750dab1468ae815639c44a2e4bfd2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 13:59:35 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717141215` | `887252ba2282579e70c32a6c80216125f44837cd6c33721d8de7f54ddf232038` | `5e2c9babf99cf836f8453b55dba37641` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 14:12:15 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717141454` | `ccf01b02241a1c0f37681f9d655dd52633bdc7cbc16582a240d56661ac9df33d` | `66df0fa90ffcc47b549794062328bf2e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 14:14:54 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717142728` | `dbfb2040c2b0466fe91777bb4f6933236d54e5048b6341806147a311f07102f8` | `1025ea6dce049e28c418249538dfbe53` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 14:27:28 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717143414` | `ccac83df2ad780621d801f6bab5d763c7d1df9b758bb5ab5183e9a8b2c6101a3` | `2b7093ed5a3fc101da9286bf18e5fc5a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 14:34:14 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717144046` | `22788b73130f1eef7f45e485cf8dca9abb0853ef062ed30e008d8eb9cd32ee5a` | `497f0a961d1d617afdf95105c68e4d37` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 14:40:46 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717144444` | `90ff64145029fb411bb6f654e0dbf7310340a8e4b796fdc366d1cbefa979303d` | `b60b34c1e15ace4d2f07fafa9cc5b894` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 14:44:44 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717144724` | `14f3bb8d322d7b2347acfed7d81ebd224b0339d3de97497b7afa31330bb36d3d` | `54bd9092fe0f386a834944566cf50909` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 14:47:24 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717144811` | `c98adf232b68c79ce506eef3c05cd9ee880663947d3bf4e34e172ac2a079b004` | `da58ef542010bb0e8533bec4fd0d1384` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 14:48:11 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717145632` | `e5f84699550d92a05ff922ad8347a96d6ac4686a8c8d87d62051c8aa8f07d7bb` | `e22ac68fef128f03e3ceb79bf8bfc929` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 14:56:32 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717151138` | `b3d3465c68835326371feb27728b3b40673ce9a8ef863a9259c2e980f626e4fc` | `47dea19e9b2a5e5b356b42660ddb0c8e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 15:11:38 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717151231` | `ad7adc02cc01f2367dfcfa74e6d3ba2e5faf066662c1633454b758002446300b` | `33dc1967bb1615442dfc7db65f2c474a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 15:12:31 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717161443` | `05b9b5a3367c887a8f20bbdf8c1c5050c003817e056237c90c4244c5c3e182d9` | `d317cd7b9a3b8ee6997c2140133d26cd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 16:14:43 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717161653` | `0994fd7a410fb90281b1a44e34b227bfe9c783a60ea9f076645a5c41319790fb` | `3ccd1a1f15c18ea5ce128236bd14000e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 16:16:53 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717161748` | `180267dd928a2f79410c4137ba2389f4a36239842c736d1064582ea29c202e3f` | `45934d5b18790128c2222974ef0e2a31` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 16:17:48 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717172936` | `4a5182f6d36cc9a8834e070a45a2d17f5adb69e4c78a02e902e78ed3bfd2b198` | `12b536b529ea7dded90020fc2a57408d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 17:29:36 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717173228` | `183d8959571cb82139c466e231e6af69533bd27874055920e5ada2587a99a61f` | `202db884d02091e9dbbed2942cb22397` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 17:32:28 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717173348` | `e8b79e22f2e4425b4c0ec1ae24836f3571a60a2e23017bd98c12badc6f6744cc` | `a8cf2e61ce19c6544596e4e7194ec68f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 17:33:48 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717173416` | `6853eba2988a7490906a1841bb665b0d6d0b441e27162cbe2c2c1823d3b91cec` | `192fd5327effe73950ae2bf77a09fd78` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 17:34:16 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717173510` | `58761333494795251225411d7a0946bdb83dbdba9a3177cff9e4dda432de8da7` | `428926735ae35d914c3ab3eb06054f46` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 17:35:10 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717181201` | `fa935e46cdf95c95213ff5518f006708721a1c5cc9564660a4e78595cd56bb17` | `45bc426cd3d9b070cde369ff6027e268` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 18:12:01 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717185945` | `81c4c27fada037b1ffe0b1237ae1d5d395bf0f6b9cfa2ab677755a6e4e5b94ec` | `ea82cb8e63c66e9cb913897f60d22564` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 18:59:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260717235313` | `c24bbfb0b16487cdc3b072cb74226832182b9ba13cecc45e5ca16745616cb397` | `33e883a03f76677eba53781109948166` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-17 23:53:13 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260718135800` | `feea569f6b3d9ae1ac335d52c357ff4c312dff3ae60465eedba43b310e325fb1` | `7288348784aa0ca9ec8a9f938051ec42` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-07-18 13:58:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260828141000` | `0a8c6597d1e39214a6b61b5a82495e9fa886c99beb0cb99ab1022f8702640702` | `8a8aa8098357208e5aadbc3b0957481e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-28 14:10:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260828141100` | `28c3de121b7f494b1d0b77c91ef98cb108fba7cd501ad78d035bef523d333f09` | `42e93ae82d91ee18f2dcd9484008c68a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-28 14:11:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260828141200` | `dfd8084f883f2394f3be7caa087bf5239c47b0664a8297b37336e291fec95bf0` | `f5e9f9e5014298f28016ac66d77433d3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-28 14:12:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829110000` | `3cdeea73d9501809a43cfdc5592216a1535f027f7ccaed1a9e2a392a3da8cc00` | `096ca22f7e611e73045fdffd3a72d36a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 11:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829111000` | `9e88ba97e987b064642f5dc36529e852bb1b7d8e7282404cc30a573b4a4f17da` | `096ca22f7e611e73045fdffd3a72d36a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 11:10:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829112000` | `e2229dd50fd5c0c850ec56cd7821c368155f6b5ed51667bbcd978c89933efbaa` | `b632b05d5b8d7ef9ae68ef71d5ff6739` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 11:20:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829113000` | `dbeb319ae32f1de857493ed326a79bf95a0750fc8bbd23522b7286b84f2adb29` | `cd301f8e73d44ed0bf2b98d91fa3e5a5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 11:30:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829114000` | `ea0a942c88764d68dad3ae91a89a4c5d8f4cb14ff6ed810608e80d9865c41467` | `60cc345a7bbee254dc65f44dd60fcde2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 11:40:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829115000` | `baac95f7c5247ce421ad766c4e4f801805ed9da107ecdb1c200bab35be850f71` | `60cc345a7bbee254dc65f44dd60fcde2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 11:50:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829120000` | `ff89af6ce7382903d42d3ea73d68e682def1af1f9f9ec38bb3daeab326987843` | `c049fb4c15f1127963f033204f0f0f80` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 12:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829121000` | `e5c7030cf0c9889d1c6cac336a9414397ea5108cda43c49f65ba37a54405df1d` | `510cb16c510b9735d249bcc000740f37` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 12:10:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829122000` | `23effb1d033eb560ef00a1d74941f86b96272455e421d9a90d5647489dc4c173` | `02f63b020b26156527a22297d98178b5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 12:20:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260829123000` | `1576b03a985893d180f58cc9d3f05873b32441151b10c7d1390bbe9494815505` | `c12dae51a097cfe11460ec50503d8350` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-08-29 12:30:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260902220900` | `331c5aef2704dab17c1cb153afac93cd2810a535a59250908b3b5fb482d76f39` | `854829a8676f2aef1023cd614169c8c5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-02 22:09:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260902221020` | `bbe3dd774fdb8907164b8ef5b75c41529aa2a30d622c6a2cf12a4577e67385d0` | `c4d5d1fee6024244a004eb0f5fd888b0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-02 22:10:20 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260902221030` | `600c89fc77902737785aebd1b308a35ebc5c5847bcf366baf83bcd31697903b8` | `ba720f7db92a807b86dc3b26fcf8b234` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-02 22:10:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260902221455` | `072e109abc9f8e7b05c00bfc0744005bc2a70813571004f9584b47d85c5fe5fa` | `5d24212350671f0aaa66fda3d4b45d0b` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-02 22:14:55 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260903091723` | `ccd77ddea0ce7803b2c4bcb7e691c0060d12f4cf1db04b10ca98e4ee7c79f7b3` | `7bd80cd7495f1d830ee280b5be581ebd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-03 09:17:23 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260903092000` | `6cf306d13791fdbe8484ac7ab1cba5451f363d4d9cf35ab20e749c4f8bd06881` | `eed658d7e341fc094d4322a0481c96f1` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-03 09:20:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260903093431` | `62cfe947da24fda33e18f098bd51ac48eabfbeb56c0da05fb75414bbbb2ad0fc` | `67a2ab867fd1b0dd378852fb99326b02` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-03 09:34:31 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260903095500` | `8917788790e7a3411609a673ace3261b3923aa4137b635bcd340f73662ca053d` | `5157506dda76799acd2722a80584ba8c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-03 09:55:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260903095502` | `6d5cdb84935de4403cdc536a1850ab913b8f3296cb8871274ea525aae0fd7453` | `30dccc2a974810dc379d1d80fb4b9f7d` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-03 09:55:02 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260903100000` | `12666de43c2855795d9d7872d6bf9ef92b163b25d8b744a9062fcee1a5ce9aad` | `5fc71f6496bc0e6fd41208adc87d3a16` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-03 10:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260903110000` | `95ab4b85c941fa817d7f8d08b2407da1832b4b72239b2a950c18717b71a4eb6e` | `aa12f7881891ce8ea91b7265e9b7a7f7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-03 11:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260903130000` | `d51a0bc8cc9cd664c0fdb360f1bcf65bf0fc69277fd2e687e498dc48d35b32b2` | `5a3606b9b279cf0b1698319c6bbe2248` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-03 13:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260903181803` | `08c51cad2a322b15252215de4d44111b6c9ff5623163a84d59b880385df40115` | `2240dd9d5fc9cb110ae94f5802fd8274` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-03 18:18:03 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904100000` | `6a00e01332ee6e1c7415081f9562af9923a87395673db1853607ad3945b981ef` | `4981d00a967a3a3d891bb6f47be763bd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 10:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904101500` | `718a2c578fa6cf1183dad8313f7c7555b118fa78f753144a3239e7f5b4f85601` | `8453836d541291320757e4026c80d2c0` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 10:15:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904102000` | `775b9156b1790aed65b52edef757e58594ddd2909bb9cb38266f9227cff0a0cb` | `d3589c66df20eb915fbab456f5a7407c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 10:20:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904103000` | `9c3d3a705443f167fa7aebd2c964c742e45c039320b1ce61732454c8e622b7e8` | `3036183e836f8a0ffe17b78842215526` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 10:30:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904105000` | `a2ab4b6c9b5211c2c2f5e05c53ccb93535513e2fb0adc525babc927276e3b499` | `c3004ee71376c667feeabf1130022be6` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 10:50:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904110000` | `36a11e8dba6fc5064fb988645bd6e43c0d4f4bbb872d2e9a31956c80dfc95fc6` | `a3c9fe54b86a5fdda1021aa9a5a9fcdc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 11:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904111000` | `0da7a47549d77071444f073b9ff695e94982f9a0ce03dbc432571fba9766a689` | `d4873fae6a8e6cd4f37a868e6ab07f45` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 11:10:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904120000` | `819e9145a167430411ad6ce97635d751c25515622e6f27c07175d35b37fd2d3e` | `857ce3ae0724aa2b0ddc8daaeb734939` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 12:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904130000` | `89fb445a2c061d760943f161bb79743e52ad2e180536b8e98e8e260e85c5d88d` | `637621d31293cb50dd57bf4f572b08e5` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 13:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260904140000` | `aebb64e85d68e377e19d907abe0f4ad100c345586f74a25fcd8394b0d5433a5e` | `05d037b7c1beeb069b8211f11d271760` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-04 14:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260905033000` | `262a6eb200bc79467657052d7873780074e1a3c6487b58914bb43db461f221c7` | `36fa1482900f477d661e9be33670c68c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-05 03:30:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260905033652` | `71191f92ba4c59fb72c16c12d5022e6fd83dcce0e4a720270c530387a1703a17` | `a35cecf29c29b5032fbde81e5e19615c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-05 03:36:52 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260905033718` | `350efc387a58dd29408bde12c87bb3d0807a27fdd26c9bbc3316690d74787ce2` | `464db30e85154629c3e0995d05f25aa3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-05 03:37:18 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260905034045` | `dfda3b19ae464464aa4d2ec44c96162ed869ae1987baa88c558ba52fe2e19d9d` | `d659e0a55bdd03b59b4eb81da48d24fd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-05 03:40:45 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260905040000` | `32313fb8cab57f67baf8f54399c59535013ed9b10b304b6ec33995a00b199e0c` | `56c87a68082a8dc35df39bcf061d1dd7` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-05 04:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260908191530` | `e201ec2ed902b3da421fa59cfe1c5c2730f987d9eabb11106d3c5a6e828b418c` | `83232ca78bca848cc4f35b062567eb81` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-08 19:15:30 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909181000` | `032bc700e50028fb7cf3c90a45fd959b3ab1f201fb8ba551a6934c958c18d34a` | `d71e89bfe661fa87e4f3b91579366a0e` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 18:10:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909181100` | `3fc04a9a1a406edecfdb55ea37302c89455c2e764491a34affbd1ced1bb00d3a` | `14e92a1053ad08c60e00ff0a6b5a1cc8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 18:11:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909181200` | `dc77004a9047e77d8b414b2e0bf7bc3458c8baf52cf202bc71645e99f823a1bb` | `6cb24d4b5d3a343dbb3f4a72cf4b31b8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 18:12:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909181300` | `409203fbce0576b63f8aab60d3baf7da067fcd99ed7d5b33ace2ebe6e512b115` | `845b681d48fb449875977f04fe4fa48a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 18:13:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909181400` | `73e9ad0ea67d2a6b2e9de5697216669c01121c7050db41d063937cbc15c31765` | `26cb18e2fac6ebd1fd255013f0feb3dc` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 18:14:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909190000` | `bf63cfd8c85d517a5402eac88f6509394e697a807da3d91f6354c9756ef5a393` | `bab2b615feaae7df173d1235613d038c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 19:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909190100` | `408b0df86f945b51ee63048ac498b3c02b431682e21502b53924b0a243375872` | `be094531db30e8dee30ddb86a7193422` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 19:01:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909190200` | `e375bea1de0ac159bab7857b29f5bee0187bb09365789b48f13a19998894df87` | `8aaff63d307195e3969df6b503c1758c` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 19:02:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909190300` | `1e61c4d4d697569282829848b6322c8067d844e501d9eabdcb4736c1cf51cb1b` | `19d96598be5305e5ea2552e82017242f` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 19:03:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909190400` | `726ed2e2151b9c67177d7224355417fc0fe7203ad49719d08ed4e8541760cb24` | `5b8da5221f742336b2783e658e391cef` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 19:04:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909200000` | `7bac7db06b9c9db2a6f2c6deabff60a763f9dfa45f60cf9125c441febda42175` | `658174985c2fa6cc54bf15a841f0bb4a` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 20:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909201000` | `e6c8a3fc9dc356fa4c877bb937b6569e553e6e969233c71cd4598982c47b6770` | `9f99b7288de441d012bee12434d5b5b4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 20:10:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909210000` | `61dd0f3ca570dc275cb6d42147c3ef2582d12bb7b901ce8a4df5227161b73a08` | `531973392296de40c15ac5b6490e63f8` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 21:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909220000` | `9e17dad83fef512fbe85b54cc544e04188e7402884415ce6f24b39acf88ebbed` | `54db263caa0f08cbda17cc81233bc5e2` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 22:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260909221000` | `fab1ed0304129c0235ffc56b2e45a933bdd510edf76fbf03e5e7297fd51a7a23` | `2c3dc61fbd22c5b91a2a8895589639dd` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-09 22:10:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260911130357` | `82e3b880bea0d967fed2bcd710a0d4f6ef00199bde0e3e0a027d6224231315fa` | `d5d7f8c27480eb006970bcc59e979e04` | MCP oficial Supabase (apply_migration) | MCP-ticket (Kit Maker, PR revisado) | 2026-09-11 13:03:57 UTC | RLS + 2 policies + RPC SECURITY INVOKER confirmados; anon sem EXECUTE, authenticated com EXECUTE; rollback transacional testado (idempotência 1/1/1, SQLSTATE 40001 em conflito otimista) — ver seção legado 2026-09-11 abaixo |
| `20260911172000` | `bbe3fc4926ec0fde6e00ce6e0f4c5518f8ad85dc1f0182f59dc4f40ce957f4cb` | `a33d808812f2d12926dc6139c6e70dc4` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-11 17:20:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260912150000` | `35652b939e1736e8d12fe5eeefc15df9ce7310f34016725fe9a36ea22825a2d4` | `dc5e4a69b6433d23cca78cdeb2f333ce` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-12 15:00:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260912151000` | `0119bee05805389337e409126ff7465965f75dd0923b4229337937b5aab13ea6` | `39827116aa5ef103ac8b4c0dc90d78eb` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-12 15:10:00 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260912205759` | `2ed94364aef678b413f1ace537eb42c694c5195b2c57bec34e50da4207631b3d` | `41b09b7f210698dab88c7d5a9b277583` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-12 20:57:59 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |
| `20260916155725` | `SEM_ARQUIVO_LOCAL` | `f078d1d8a52658adb5d48b148798d1f3` | n/d | n/d (pré-E48; ledger não registra por linha) | 2026-09-16 15:57:25 UTC | n/d (não capturado retroativamente; ver E07 — verificação por objeto) |


</details>

## Recibos agregados — lotes e reparos (E08) `[REQUER-PO onde marcado]`

Estas linhas não seguem o grão "1 linha = 1 migration com hash de `statements`"
porque são operações de `migration repair` (metadata-only — **nunca executa
SQL**, só insere/remove a linha do ledger) sobre migrations **anteriores** ao
cutoff da E11, portanto sem `statements` capturável. Registradas aqui por
exigência do checklist da E48 ("Entradas de E08/E09 registradas neste
formato"), não como recibos individuais fabricados.

| lote | versões | sha256 arquivo | md5 statements | executor | método | data UTC | pós-check | status |
|---|---|---|---|---|---|---|---|---|
| E08 Lote 1 | 90 versões (ex.: `20260618000001`…`20260712`; lista completa no blockquote de E08 no plano) | `—` (90 arquivos distintos; repair não usa 1 arquivo) | `—` (repair não popula `statements`) | Claude Code (CLI `supabase migration repair`, aprovado pelo PO — "aprovado") | `repair` | `2026-09-16` (execução do repair; **não** as datas originais implícitas nas 90 versões) | 90/90 confirmadas no ledger via SQL direto; `postgres_logs` do intervalo mostra só bootstrap idempotente do próprio ledger (zero DDL de aplicação); 83/90 casam `local==remote` no CLI, 7/90 com discrepância de exibição por colisão de prefixo pré-existente (E10), não por falha do repair | **aplicada** (2026-09-16) |
| E08 Lote 2 | 179 versões (lista completa, versão + arquivo + tipo, em `docs/E08_LOTE2_CANDIDATOS_2026-09-16.md`) | ver doc de origem | ver doc de origem (maioria sem `statements` — pré-cutoff) | — | `repair` (proposto) | — | 179/179 confirmadas `aplicada`/`aplicada-sem-ledger` no `pg_catalog` ao vivo, `already_in_ledger = 0` (zero risco de repair duplicado); 30 arquivos adicionais (10 grupos de versão colidente) ficam fora, aguardam E10 | **proposto, aguardando aprovação PO** (pacote em `docs/PACOTE_APROVACAO_1_2026-09-16.md`, ação 2 — "Nenhuma ação abaixo foi executada" confirmado nesta sessão) |

## Recibos individuais — E09 (4 IDs não-canônicos do ledger) `[REQUER-PO]`

Investigação completa em `docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md`. Nenhuma
das 3 ações abaixo foi aplicada — confirmado nesta sessão pelo texto do
próprio pacote de aprovação ("Nenhuma ação abaixo foi executada").

| versão | sha256 arquivo | md5 statements | executor | método | data UTC | pós-check | status |
|---|---|---|---|---|---|---|---|
| `20260623_bugalert1` | `—` (arquivo nunca existiu — stub) | `—` | — | `repair --status reverted` (proposto) | — | Stub com reticências literais em `VIEW ... AS ...` — nunca executável; objeto real já vive sob `20260623182623` (canônica, aplicada, arquivo presente) | **proposto, aguardando aprovação PO** |
| `20260623_create_process_notifications_queue_rpcs` | `—` (arquivo nunca existiu — stub) | `—` | — | `repair --status reverted` (proposto) | — | Stub com reticências literais em `RETURNS TABLE(...)` — nunca executável; objeto real já vive sob `20260623201801` (canônica, aplicada, arquivo presente) | **proposto, aguardando aprovação PO** |
| `20260623_fix_google_provider_secret_name` | `—` (sem arquivo local; UPDATE real, sem migration commitada) | `—` | — | backfill de arquivo canônico (`20260916181609_backfill_fix_google_provider_secret_name_20260623.sql`, ainda **não criado**) + `repair --status applied` (proposto) | — | `UPDATE ai_providers SET secret_name='GEMINI_API_KEY' WHERE slug='google' AND secret_name='GOOGLE_API_KEY'` já está de fato aplicado em produção (confirmado ao vivo: `secret_name` já é `GEMINI_API_KEY`); a entrada original permanece no ledger sem alteração; o backfill seria idempotente/no-op | **proposto, aguardando aprovação PO** |
| `2026062311292414001` | `c03d47ba1092d52f69f53f24c0fd4a4bda564df820c78a5bf3d36c8f349cab1d` (`2026062311292414001_add_full_path_readable_propagation_triggers.sql`) | `295937419d88bdce784aba42f37ef5e4` (confirmado ao vivo nesta sessão, fora do filtro do backfill em massa por ter 19 dígitos em vez de 14 — consultado à parte) | — | nenhuma ação proposta (`não mexer` — decisão explícita da E09) | `2026-06-23 11:29:24` (lido do prefixo válido dos 14 primeiros dígitos; sufixo `14001` é o defeito de formato) | Malformado (19 dígitos em vez de 14) mas internamente consistente: arquivo, ledger e objetos vivos batem entre si; `migration repair` para corrigir o formato é risco desnecessário para um ID já consistente | **documentado — sem remediação proposta** |

## Recibos — E15 (workflow de aplicação controlada)

Etapa E15 (`.github/workflows/db-apply-migration.yml`) é o único caminho
autorizado por `CLAUDE.md` REGRA #8 para aplicar uma migration nova no projeto
canônico fora de MCP-ticket. Cada disparo bem-sucedido (`workflow_dispatch` →
`preflight` → `apply`, gated por `environment: production` → `migration
repair --status applied` → `post-check`) abre um PR que adiciona uma linha
abaixo via `scripts/append-migration-receipt.mjs`, gerado pelo job `receipt`
do próprio workflow. Se a publicação automática falhar depois da aplicação,
o recibo pode ser recuperado em PR documental autorizada pelo PO, com evidências
da execução e consulta read-only ao catálogo/ledger, sem reaplicar SQL.

| versão | sha256 arquivo | md5 statements | executor | método | data UTC | pós-check | status |
|---|---|---|---|---|---|---|---|
| `20260922170000` | `266f0963a9e7b1d30e8594d7c6218747b6a79baf16aa272249e864f55a64b29b` | `badcb6626e975ee80bab7d562a6c12cc` | GitHub Actions, disparado por `adm01-debug` | E15 | 2026-09-22 18:34:03 UTC (fim do passo psql) | [Run 35760867980, tentativa 1](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/35760867980/attempts/1): apply, repair e post-check aprovados; recoleta read-only em 22/09 19:27 UTC confirmou ledger, corpo e ACL | aplicada; recibo recuperado documentalmente pelo Codex, a pedido do PO |
| `20260923114500` | `18663b52473fa9fd0edb031495ebe1ed8fc8c0ea0c262631a3b3bf035d8d91b7` | — | GitHub Actions (db-apply-migration.yml, disparado por adm01-debug) | E15 | 2026-09-23 11:56:55 UTC | job post-check da run 35857184284 confirmou a version no ledger | aplicada |

### Evidências do recibo `20260922170000`

- Projeto canônico: `doufsxqlfjyuvxuezpln`; arquivo `supabase/migrations/20260922170000_signup_identity_safe_default.sql`, no SHA executado `e30dfa6487eb1b1131b698cb9d1c6b2a7c261ea4`.
- Job `apply` da tentativa 1: psql transacional concluído às **18:34:03 UTC**, `migration repair --status applied` concluído às **18:34:14 UTC**. Job `post-check` concluído com sucesso às **18:35:20 UTC**. A data da tabela é o fim do passo psql, não um timestamp de commit extraído do PostgreSQL.
- Consulta pela Management API **read-only**: linha `version=20260922170000`, `name=signup_identity_safe_default`, três statements; `md5(array_to_string(statements, chr(10)))` calculado pelo PostgreSQL e registrado acima. Nenhum reparo de ledger foi repetido nesta recuperação.
- `pg_catalog`: MD5 de `replace(prosrc, chr(13), '')` de `public.handle_new_user()` = `459d43ef1414883128e7127812a39dc3`, igual ao corpo aprovado; proprietário `postgres`, `SECURITY DEFINER`, `search_path=public`, ACL `{postgres=X/postgres,service_role=X/postgres}`. Os 13 profiles existentes mantêm `user_id=id`, sem divergências na recoleta.
- O job `receipt` falhou **somente no push**: GitHub recusou a criação da branch pelo GitHub App sem permissão `workflows`. O status global vermelho dessa tentativa não significa falha de DDL. Este recibo é uma recuperação documental posterior, não sucesso retroativo do job.
- Limites: não certifica cadastro pela UI/GoTrue, promoção administrativa E2E nem conclusão do plano inteiro. Não reaplicar a migration para corrigir documentação. Nenhuma permissão, credencial, workflow, dado de negócio ou SQL foi alterado nesta recuperação.

## Gate de CI (E48)

`scripts/check-migrations-sync-log-gate.mjs` (padrão de graceful-degradation de
`scripts/check-result-contract.mjs`, mesma família de
`scripts/check-migration-filename-contract.mjs`): compara
`git diff --name-only <base>...HEAD -- supabase/migrations` (arquivos `.sql`
novos/modificados) contra as versões já presentes na tabela "Recibos" deste
arquivo (`versão` das linhas markdown, mais as versões citadas nas seções de
lote/E09 acima). Falha se algum arquivo de migration do diff não tiver
`version` correspondente registrada em nenhuma das tabelas. É 100% local/git —
não depende de credencial Supabase, roda sempre (`static-pass` não se aplica
aqui; ou passa ou falha).

**Wiring em CI: adicionado nesta sessão.** Novo workflow dedicado
`.github/workflows/migrations-sync-log-gate.yml` (`pull_request` filtrado por
`paths: ["supabase/migrations/**"]`, então só dispara quando o PR de fato toca
migrations — advisory-safe para qualquer outro PR, não pode quebrá-lo). Optei
por workflow dedicado em vez de mais um step em `quality-gate.yml` porque
`quality-gate.yml` roda em **todo** PR (`branches: [main]`, sem filtro de
`paths`) — adicionar um step ali executaria em 100% dos PRs só para, na
prática, fazer early-return em quase todos (só ~poucos tocam
`supabase/migrations/**`); um workflow com `paths` filter é mais barato e mais
simples de auditar isoladamente. Mesma decisão de design já usada por
`schema-snapshot-export.yml` (E46) e `ddl-out-of-band-detector.yml` (E12) —
workflows dedicados por domínio, não um monólito.

**Nota sobre o gap de wiring da E11 (`ledger:verify-statements`):** avaliado
nesta sessão se fazia sentido resolver os dois wirings juntos (E48 depende de
E11 no plano). Decisão: **não** — são gates com fontes de dados e falhas
diferentes (E48 é git-diff local, síncrono, sem credencial; E11 precisa de
`SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF` via Management API e já tem
comportamento `inconclusive` documentado para quando a credencial falta).
Empacotar os dois no mesmo workflow acoplaria uma falha de credencial ao gate
puramente estrutural do E48, tornando o novo workflow menos previsível sem
necessidade real. **Ficou como pendência documentada** (igual ao padrão que a
sessão de E11 já usou): plugar `ledger:verify-statements` em
`quality-gate.yml` (ou em um workflow próprio com credencial) é trabalho
independente, fora do escopo desta etapa — não mexi em `quality-gate.yml`
nesta sessão para não arriscar um workflow que já roda em todo PR sem entender
o impacto completo de adicionar uma chamada de Management API nele.

## Legado — não verificado

> Todo o conteúdo abaixo desta linha **existia neste arquivo antes da Etapa
> E48** (2026-09-16) e é preservado **sem alteração** — narrativa histórica,
> sem hash por linha, incluindo as seções de E11 (isenção retroativa das 483
> linhas sem `statements`) e E46 (formato do drift semanal), que a Etapa E48
> foi instruída explicitamente a manter aqui. Nada foi reescrito, resumido ou
> deletado. As ~1.906 linhas do ledger com `version <= 20260623111612` (ou não
> canônicas) — o histórico que a E11 já classificou como "não verificável por
> hash, verificado por objeto (E07)" — permanecem cobertas por essa
> classificação; não foram individualmente tabuladas na seção "Recibos" acima
> pelas razões explicadas lá.

# Migration Sync Log

## 2026-09-16 — Etapa E11: 483 linhas sem `statements` — não verificáveis por hash, verificadas por objeto (E07)

Registro formal da isenção retroativa exigida pela Etapa E11
(`docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`, linhas
379-386): **483 de 2.504 linhas** (19,3 %) de
`supabase_migrations.schema_migrations` têm `statements IS NULL` (428) ou
`statements = '{}'` (55), o que torna comparação por hash contra o arquivo
local (`supabase/migrations/<version>_*.sql`) impossível para essas linhas —
não há como reconstruir retroativamente o SQL original que não foi capturado
no momento do registro.

- **Reconfirmado ao vivo em 2026-09-16** (`mcp__supabase__execute_sql`,
  somente leitura, sessão E11 — segunda reconfirmação, nova sessão após a que
  produziu os artefatos): os mesmos 483 batem exatamente com o número já
  citado no texto da E11 do plano (428 `NULL` + 55 `'{}'`). Distribuição
  temporal completa (todas as linhas com `version` canônico de 14 dígitos;
  total/faltando por mês): 2024-12 (2/2), 2025-01 (24/23), 2025-12 (54/54),
  2026-01 (15/15), 2026-02 (22/22), 2026-03 (165/65), 2026-04 (246/176),
  2026-05 (368/94), 2026-06 (1.379/27), 2026-07 (156/0), 2026-08 (13/0),
  2026-09 (50/0) — soma 478 faltando nas linhas canônicas, + as 5 não-canônicas
  `00N` do achado abaixo = 483. (Nota de correção desta reconfirmação: a
  redação original desta seção citava só "2025-12 e 2026-01 a 2026-05" com 6
  números para 5 meses, sem rótulo — o primeiro número, 23, era na verdade de
  2025-01, e 2024-12 tinha ficado de fora da lista; a soma batia, então o erro
  era só de rotulagem, não de contagem. Corrigido aqui.) Ou seja: a lacuna é
  um problema puramente histórico, já sanado organicamente pelo processo de
  aplicação desde 2026-06-23 em diante.
- **Cutoff formal adotado:** `version = "20260623111612"` — o maior `version`
  observado ao vivo entre as linhas sem `statements`. Toda linha canônica com
  `version` maior que esse corte já tem `statements` (598/598 confirmado ao
  vivo). Ver `docs/E11_LEDGER_STATEMENTS_ALLOWLIST.json` para a definição
  formal usada pelo gate de CI, e `docs/E11_LEDGER_STATEMENTS_2026-09-16.md`
  para a evidência completa.
- **Estas 483 linhas são tratadas como verificadas por objeto, não por
  hash** — a mesma metodologia já usada na E07/E09
  (`docs/CLASSIFICACAO_MIGRATIONS_SEM_LEDGER_2026-09-16.json`,
  `docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md`): cada migration nesse
  período já foi auditada por presença do OBJETO correspondente no
  `pg_catalog`, não por comparação textual do SQL. Nenhuma ação de reparo
  adicional é aberta aqui — isto é um registro de isenção, não uma
  remediação.
- **Achado adicional (fora do escopo de remediação desta etapa):** além dos
  483, há **10 versões não-canônicas** (fora do padrão de 14 dígitos) no
  ledger vivo, das quais **5 têm `statements` NULL**: `"001"`, `"002"`,
  `"003"`, `"004"`, `"005"` — todas com `name` também NULL, parecem markers de
  bootstrap muito antigos, anteriores à convenção de nomes atual. Essas 5 NÃO
  fazem parte dos "4 IDs inválidos" já documentados pela E09 — são um achado
  novo desta etapa. As outras 5 versões não-canônicas conhecidas pela E09
  (`20260623_bugalert1`, `20260623_create_process_notifications_queue_rpcs`,
  `20260623_fix_google_provider_secret_name`, `2026062311292414001`,
  `20260712`) já têm `statements` preenchido, confirmado ao vivo — não
  precisam de isenção. Ver `docs/E11_LEDGER_STATEMENTS_2026-09-16.md` §achados
  para detalhes; nenhuma ação de remediação foi tomada sobre as 5 versões
  `00N` nesta etapa (fora de escopo `[GIT]`, requer decisão do PO sobre se são
  lixo de bootstrap seguro para limpar ou histórico a preservar).
- **Gate implementado, wiring em CI pendente:** `scripts/check-ledger-statements-gate.mjs`
  (`npm run ledger:verify-statements`) já exige `statements` não vazio para
  toda linha nova com `version` canônico maior que o cutoff acima (ou
  não-canônica fora da allowlist), e passa em 32/32 testes
  (`tests/scripts/check-ledger-statements-gate.test.mjs`). Comparação de hash
  contra o arquivo local é best-effort/advisory (não bloqueia por padrão — ver
  `docs/E11_LEDGER_STATEMENTS_2026-09-16.md` para o porquê). **Correção desta
  reconfirmação:** o gate ainda **não está plugado em nenhum workflow do
  CI** — nenhum `.github/workflows/*.yml` referencia
  `check-ledger-statements-gate.mjs` nem `ledger:verify-statements` (confirmado
  por grep nesta sessão). Roda hoje só sob demanda
  (`npm run ledger:verify-statements`). Falta adicionar um step ao
  `quality-gate.yml` (mesmo padrão de `check-migration-filename-contract.mjs`)
  ou a um workflow dedicado — fora do escopo desta auditoria (não é um dos
  arquivos herdados desta etapa). Ver `docs/E11_LEDGER_STATEMENTS_2026-09-16.md`
  §6.

## 2026-09-16 — Etapa E46: checagem semanal ledger vivo × manifesto E06 (CI)

Não é uma sincronização manual — é o registro do **formato de saída** do novo
mecanismo automatizado criado na Etapa E46
(`docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`,
`docs/E46_DRIFT_SEMANAL_LEDGER_CI_2026-09-16.md`), para que as próximas
entradas produzidas pelo job `weekly-live-drift`
(`.github/workflows/schema-snapshot-export.yml`) tenham um padrão a seguir.

- **Mecanismo:** `scripts/check-ledger-manifest-drift.mjs`, rodado toda
  segunda 06:00 UTC (03:00 BRT) pelo job `weekly-live-drift`, compara
  `SELECT version, name FROM supabase_migrations.schema_migrations` (live, via
  Management API read-only) contra os arquivos em `supabase/migrations/**` e
  contra o baseline reconciliado da E06
  (`docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json`, 486 versões
  locais sem ledger + 3 versões de ledger sem arquivo, já conhecidas). Só
  reporta versões **novas**, fora dessas duas listas — como candidatas a
  `aplicada-sem-ledger` / `registrada-sem-arquivo`, nunca como classificação
  final (essa é a metodologia E07, por objeto no `pg_catalog`).
- **Onde o resultado aparece:** artifact `ledger-manifest-drift-<run_id>.json`
  (retenção 90 dias) em toda execução do job; issue `ledger-manifest-drift`
  (aberta ou atualizada, dedup por label) só quando há candidato novo ou a
  checagem fica inconclusiva.
- **Formato do relatório** (`ledger-manifest-drift-<run_id>.json`):
  ```json
  {
    "checkedAt": "<ISO 8601>",
    "baselinePath": "docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json",
    "baselineCapturedAt": "<data de captura do baseline E06>",
    "liveLedgerVersionCount": <n>,
    "localFileVersionCount": <n>,
    "baselineKnownLocalWithoutLedgerCount": 486,
    "baselineKnownLedgerWithoutLocalCount": 3,
    "newAplicadaSemLedgerCandidates": ["<versão>", ...],
    "newRegistradaSemArquivoCandidates": ["<versão>", ...]
  }
  ```
- **Entrada real desta seção fica pendente:** esta etapa (E46) só implementou
  e validou o mecanismo localmente sem credenciais de produção (resultado
  `static-pass`/`inconclusive`, conforme esperado — ver
  `docs/E46_DRIFT_SEMANAL_LEDGER_CI_2026-09-16.md`). **Não houve execução real
  do job `weekly-live-drift` em CI ainda** — a primeira janela do cron é
  segunda 2026-09-21 (se mergeado antes). Quando essa execução acontecer, a
  entrada real (contagens, candidatos encontrados ou "sem drift novo") deve
  ser adicionada como uma nova subseção aqui, não substituindo este registro
  de formato.

## 2026-09-11 — Kit Maker: aplicação atômica e fechamento do topo do ledger

- O MCP oficial confirmou o projeto `doufsxqlfjyuvxuezpln`.
- A comparação por versão encontrou 2.408 registros remotos únicos e nenhuma
  versão numérica remota sem representação local.
- O CLI apontou somente `20260910150000` depois da última migration remota, mas
  recusou a aplicação por causa de três IDs históricos fora do formato. Nenhum
  `migration repair` foi executado.
- O mesmo SQL foi aplicado uma única vez pela API oficial de migrations e ficou
  registrado como `20260911130357_kit_maker_optimistic_persistence`.
- O arquivo local recebeu o timestamp do ledger remoto. A conferência final do
  CLI retornou zero versões remotas ausentes; as 543 versões locais históricas
  anteriores continuam deliberadamente não aplicadas.
- Validação pós-DDL: coluna `custom_kits.revision`, constraint não negativa,
  tabela `kit_save_requests`, RLS, duas policies e RPC `SECURITY INVOKER`
  presentes; `anon` sem `EXECUTE`, `authenticated` com `EXECUTE`.
- Simulações transacionais com rollback confirmaram idempotência da request e
  conflito otimista com SQLSTATE `40001`; os três kits preexistentes terminaram
  com revisão zero e nenhuma request de teste persistiu.

## 2026-09-11 — Reconciliação do ledger canônico (fase 1: snapshots remotos)

### Escopo e fonte

O projeto canônico `doufsxqlfjyuvxuezpln` foi consultado por
`supabase migration fetch --linked` em uma cópia temporária isolada. A fonte
dos arquivos desta fase é exclusivamente o histórico remoto retornado pelo
Supabase; nenhum arquivo existente foi sobrescrito e nenhum DDL foi aplicado.

Foram acrescentados **1.255 snapshots SQL remotos**, todos com versão numérica
única, conteúdo não vazio e hash conferido depois da cópia (4.230.220 bytes no
total). A comparação por versão, não por nome de arquivo, é indispensável:
o banco guarda diversos nomes históricos distintos para uma mesma versão.

### Resultado verificável

- Antes: 1.255 versões do remoto não tinham arquivo local correspondente.
- Depois, na worktree de reconciliação: `supabase migration list --linked`
  relata **zero** versões remotas numéricas ausentes.
- Não foi usado `supabase db push`, `migration repair`, `db pull` nem
  `db reset`.
- Dois snapshots recuperados têm nomes não canônicos no próprio ledger remoto:
  `20260618101311_estoque_reconcile_add_vss_F_coherence_20260618.sql` e
  `2026062311292414001_add_full_path_readable_propagation_triggers.sql`.
  Eles não foram renomeados. O manifesto suplementar
  `docs/MANIFESTO_MIGRATIONS_RECONCILIADAS_2026-09-11.json` fixa os paths e
  hashes aceitos pelo gate, sem liberar novos nomes fora do padrão.

### Itens deliberadamente não alterados nesta fase

1. Existem **544 versões locais sem registro remoto**. Elas não foram aplicadas,
   removidas, renomeadas nem marcadas como aplicadas; precisam de classificação
   individual antes de qualquer promoção.
2. O ledger remoto tem três IDs inválidos para o formato `timestamp_nome.sql`:
   `20260623_bugalert1`,
   `20260623_create_process_notifications_queue_rpcs` e
   `20260623_fix_google_provider_secret_name`. Eles não podem ser corrigidos
   com arquivos locais válidos. Qualquer `migration repair --status reverted`
   nesses IDs altera o histórico do canônico e exige pré-condição, confirmação
   de que os objetos físicos permanecem presentes e recibo pós-operação.
3. A migration do Kit Maker foi posteriormente aplicada pelo MCP oficial do
   Supabase e registrada pelo ledger canônico como
   `20260911130357_kit_maker_optimistic_persistence.sql`. O arquivo local foi
   renomeado para refletir exatamente a versão remota; o identificador preparado
   `20260910150000` não chegou a ser registrado nem executado pelo CLI.

Esta fase recupera rastreabilidade do repositório; ela não transforma o
histórico em um replay limpo e não é autorização para promover as migrations
locais pendentes.

## 2026-05-24 â€” Fix definitivo sort-order 20250103

### Estado final

| Banco | `20250103` | `20250103000000` |
|---|---|---|
| `doufsxqlfjyuvxuezpln` | removido (repair reverted) | presente |
| Repo | arquivo deletado | `20250103000000_placeholder.sql` |

### Root cause

Arquivo `20250103_placeholder.sql` extraia versao `20250103` que no DB ordena
ANTES de `20250103010000`, mas na filesystem ordena DEPOIS (underscore ASCII 95 > digit ASCII 48).
O CLI via como remote-only e disparava o erro ciclico.

### Fix aplicado (2026-05-24)

1. Arquivo `20250103_placeholder.sql` DELETADO do repo
2. Arquivo `20250103000000_placeholder.sql` CRIADO (ordena corretamente)
3. Row `20250103` removida do DB via `migration repair --status reverted`
4. Row `20250103000000` inserida pelo workflow na run de 11:25

### Estado banco de producao

- `doufsxqlfjyuvxuezpln`: sem orphans. `20250103000000` registrado corretamente.

## 2026-05-25 - Preview markers para PR #314

O check `Supabase Preview` do projeto `jbmxvuccekcxtrdnbwtf` falhou com
`Remote migration versions not found in local migrations directory` apos renames
de migrations ja aplicadas em previews anteriores do PR.

Markers no-op adicionados para preservar as versoes remotas antigas sem
reaplicar DDL duplicada:

- `20260524120000`
- `20260524120100`
- `20260524120200`
- `20260524120300`
- `20260524120400`
- `20260524130000`

O marker `20250103` nao foi reintroduzido: esse prefixo curto ja causou drift
de ordenacao no Supabase CLI. Se ele aparecer novamente como remoto-only, a
correcao deve ser `migration repair --status reverted` no projeto afetado, nao
um arquivo local com esse prefixo.

## 2026-06-04 - Reconciliacao motor_v2 / paridade Spot (doufsxqlfjyuvxuezpln)

17 migrations estavam aplicadas no banco (registradas em
`supabase_migrations.schema_migrations`) mas faltavam como arquivo no repo,
gerando drift desde `20260604170220`. Os arquivos foram restaurados
**byte-a-byte** a partir da coluna `statements` do banco e conferidos por `md5`
(DB == arquivo, 17/17 OK). Nenhuma DDL foi reaplicada.

Conjunto reconciliado (em ordem):

- `20260604171726` motor_v2_config_foundation
- `20260604171814` motor_v2_create_fn_process_raw_v2
- `20260604172240` motor_v2_parity_harness
- `20260604173140` motor_v2_variant_identity_supplier_sku
- `20260604173153` spot_activate_variant_mappings_and_template
- `20260604173213` motor_v2_parity_harness_v2
- `20260604174303` motor_v2_respect_locks_and_write_source
- `20260604174339` motor_v2_parity_harness_v3
- `20260604174413` motor_v2_parity_harness_v3b
- `20260604174444` motor_v2_drop_old_2arg_overload
- `20260604184447` spot_v2_fix_products_depara_and_cost          (M1)
- `20260604184459` spot_v2_align_sku_prefix_to_catalog           (M2)
- `20260604184644` fn_process_raw_v2_parity_upgrade              (M3)
- `20260604185153` fix_search_path_unaccent_functions            (M4)
- `20260604185419` fn_process_raw_v2_fix_batch_fk_order          (M5, fn canonica)
- `20260604185737` spot_v2_map_products_cost_price               (M6)
- `20260604210435` add_catalog_sort_indexes

Contexto da paridade Spot (G1-G4 / M1-M6) em
`docs/AUDITORIA_PARIDADE_SPOT_FN_PROCESS_RAW_V2_2026-06-04.md`.

## 2026-06-04 - Re-auditoria pos-cutover: 2 migrations out-of-band + correcoes (doufsxqlfjyuvxuezpln)

Re-auditoria ao vivo encontrou DUAS migrations aplicadas DIRETO no banco e AUSENTES
do repo, ambas REGRESSOES pos-cutover `processed -> status`:

- `20260604232837` upgrade_fn_apply_transform_add_missing_transforms
  -> removeu o branch custom `fn_clean_spot_name` (nomes deixaram de ser limpos).
- `20260604232944` upgrade_fn_process_raw_v2_fix_race_condition_and_counters
  -> recriou `fn_process_raw_v2` referenciando a coluna REMOVIDA `processed`
     => funcao quebrada; cron `process-pending-products` falhando a cada 5 min
     desde 23:30; pipeline SPOT parado. Tambem deixou `{size_code}` literal no nome.

Acoes:
1. Correcoes versionadas E aplicadas no banco (apply_migration):
   - `20260604234507` fix_fn_process_raw_v2_status_column        (DEFEITO-2/4)
   - `20260604234647` restore_fn_clean_spot_name_branch_in_apply_transform (DEFEITO-3)
2. As duas migrations out-of-band foram preservadas no repo como MARCADORES NO-OP
   (`20260604232837_*.sql`, `20260604232944_*.sql`) para manter a paridade DB<->repo
   no CLI sem reaplicar DDL quebrada/superada (a DDL correta vive nas 234507/234647).

Validacao: no-op idempotente OK; `process_pending_batches()` -> SUCCESS; E2E (rollback)
cria produto+variante+VSS com nome limpo (`Caneca de porcelana branca | Vermelho | M`),
`sale_price` 26.53 (markup 115%), `locked_fields` respeitado, idempotencia 1/1/1.
Detalhes: `docs/AUDITORIA_PARIDADE_SPOT_FN_PROCESS_RAW_V2_2026-06-04.md` (§7).

## 2026-06-05 - Reconciliacao pos-cutover SPR / motor_v2 (doufsxqlfjyuvxuezpln)

28 migrations aplicadas em producao entre 2026-06-04T21:41 e 2026-06-05T00:49
nao estavam no repo. Restauradas byte-a-byte (md5 DB==arquivo, 28/28 OK).

Descoberta durante auditoria de teste exhaustivo: o arquivo reconciliado M5
(`20260604185419`) continha `processed = false` (coluna inexistente), corrigida
sequencialmente pelas migrations abaixo via `fix_fn_process_raw_v2_status_column`
e `fix_fn_process_raw_v2_integer_cast_and_failed_status`. O estado final do banco
esta correto; os arquivos agora refletem cada passo evolutivo.

Conjunto reconciliado (em ordem):

- `20260604214100` fix_spot_name_cleaning
- `20260604214243` fix_raw_v2_race_and_batch_spam
- `20260604231622` spr_drop_redundant_index
- `20260604231629` spr_drop_bkp_table
- `20260604231631` spr_harden_grants_rls
- `20260604231642` spr_maintenance_and_history_retention
- `20260604231826` spr_cutover_status_part1
- `20260604232403` spr_cutover_status_part2
- `20260604232535` spr_before_write_search_path
- `20260604232837` upgrade_fn_apply_transform_add_missing_transforms
- `20260604232944` upgrade_fn_process_raw_v2_fix_race_condition_and_counters
- `20260604234507` fix_fn_process_raw_v2_status_column        (status enum fix)
- `20260604234647` restore_fn_clean_spot_name_branch_in_apply_transform
- `20260604235853` spr_drop_unused_partial_indexes
- `20260605000239` fix_raw_v2_product_type_mapping_parity
- `20260605000347` raw_v2_transform_maxlength_and_spot_overflow_caps
- `20260605001811` spr2_state_integrity_and_wiring
- `20260605001830` spr2_images_generated_drop_claimed
- `20260605001850` spr2_motor_quarantine_terminal
- `20260605001911` spr2_history_old_version_and_index_cleanup
- `20260605001917` spr2_autovacuum_tuning
- `20260605002044` harden_fn_clean_spot_name_unicode_spaces
- `20260605002243` fix_fn_process_raw_v2_use_status_enum      (status enum fix 2)
- `20260605002302` fix_process_supplier_products_batch_use_status_enum
- `20260605002334` fix_fn_process_raw_v2_integer_cast_and_failed_status  (BUG-1/3)
- `20260605002346` fix_trigger_limpar_nome_capitalize_after_strip
- `20260605002357` backfill_locked_fields_brand_manual_edits
- `20260605004956` harden_raw_sibling_tables_rls_grants

### Resultado do teste exhaustivo de paridade (2026-06-05)

Dry-run transacional (BEGIN → fn_process_raw_v2 → captura → ROLLBACK automatico)
com produto inedito `DRYRUN-PARITY-999` / variante `DRYRUN-PARITY-999-BLK`:

| Verificacao | Esperado | Observado | Status |
|---|---|---|---|
| G1: mapeamento produtos | source_path=NULL, campos preenchidos | name, brand, description OK | OK |
| G2: VSS cost_price | Price1 -> vss.cost_price | 25.50 | OK |
| G3: sale_price | cost * 2.15 | 54.83 (ratio=2.1502) | OK |
| M2: sku_prefix | sku = ProdReference sem prefixo | "DRYRUN-PARITY-999" | OK |
| G4: unaccent | sem crash no INSERT | nenhum erro | OK |
| M5: batch telemetria | parents=1, variants=1, errors=[] | 100% | OK |
| raw.status apos run | "processed" | "processed" | OK |
| Rollback | sem dados gravados em prod | confirmado | OK |

Estado producao: 1200 produtos / 3612 VSS todos com cost_price e sale_price.
Markup observado: 2.1500 (115%) em 100% dos produtos amostrados.

## 2026-06-05 - Reconciliacao TOTAL de junho + hardening (PR #659 review)

A revisao automatizada do PR #659 (Codex + cubic, 3 ferramentas) apontou P1s de
"replay falha em ambiente limpo" (enum `supplier_raw_status` e tabela
`supplier_products_raw_history` referenciados mas nunca criados no repo). A
investigacao contra o banco revelou que a deriva de junho era MUITO maior que os
intervalos ja reconciliados: **72 migrations aplicadas em producao entre
2026-06-01T18:00 e 2026-06-05T01:28 faltavam no repo** (faixas
`20260601180000`-`20260604165156` e `20260605010642`-`20260605012842`).

Restauradas byte-a-byte de `array_to_string(statements,E'\n')` (md5 DB==arquivo,
**74/74 OK** incluindo os 2 forward abaixo). Apos isso, o slice de junho tem
diff vazio: **repo contem banco** para todas as 119 versoes de junho. Um
`db reset` limpo agora cria o enum
(`20260603215516 raw_landing_phase1_status_provenance`) e a tabela history
(`20260604120414 spr_p3_history_versionamento`) ANTES de serem usados,
eliminando os P1 de replay.

Descoberta-chave: quase todos os P1 dos revisores ja estavam corrigidos em
producao por migrations orfas que faltavam no repo — os revisores so viam os
snapshots intermediarios:

| Achado (Codex/cubic) | Resolucao |
|---|---|
| enum/history criados depois do uso | migrations criadoras agora no repo (replay OK) |
| quarantined re-enfileirado (`status<>'processed'`) | ja corrigido por `20260605011404` (BUG-3b: `status=ANY('{pending,processing}')`) |
| `fn_purge_spr_history` sem REVOKE | ja corrigido por `20260605011613` (ACL: so postgres+service_role) |
| `process_supplier_products_batch` sem REVOKE | ja com ACL so postgres+service_role |
| VSS UPDATE sem `source='raw_v2'` | funcao final ja tem `source='raw_v2'` |
| `fn_process_raw_v2` exec. por anon/authenticated | **forward fix** `20260605014545` (REVOKE) |
| cron `VACUUM` multi-statement em txn block | **forward fix** `20260605014600` (ANALYZE-only) |

### Forward fixes aplicados em producao (aprovados pelo usuario)

- `20260605014545 revoke_fn_process_raw_v2_execute_from_anon_authenticated`
  fecha escalacao: `fn_process_raw_v2` e SECURITY DEFINER e o guard de admin tem
  bypass quando `auth.uid() IS NULL` (chamada anonima via PostgREST /rpc).
  ACL final: `postgres=X | service_role=X` (anon/authenticated removidos).
- `20260605014600 fix_vacuum_analyze_weekly_cron_no_vacuum_in_txn`
  reverte a regressao de `20260604231642`: `VACUUM` nao roda em transaction
  block via pg_cron (mesma licao de `20260602_002_fix_cron_jobs_never_ran`).
  Job recriado com ANALYZE-only; VACUUM fica a cargo do autovacuum tuning.

Itens deixados como nota (nao acionados): `ON CONFLICT (sku)` global em
`20260604173140` (risco de colisao cross-produto, baixo na pratica — o motor
busca variante por (product_id, supplier_sku) antes do insert); `DROP COLUMN
claimed_at` sem tabela de backup em `20260605001830` (coluna ja removida, sem
recuperacao retroativa possivel).

### Forward fix adicional (regressao Spot detectada na 2a rodada de review)

- `20260605020240 restore_spot_name_clean_and_maxlength_in_fn_apply_transform`
  A migration `20260605011952` (guard multiply/divide NULL) fez CREATE OR REPLACE
  de `fn_apply_transform` e PERDEU dois branches que `20260604234647` /
  `20260605000347` haviam adicionado: o `custom -> fn_clean_spot_name` e o cap de
  `max_length`. Efeito vivo no pipeline SPOT: `products.name` deixou de ser limpo
  (caia no ELSE -> valor cru) e `ncm_code`(10)/`short_description`(500) podiam
  estourar. O fix parte do corpo atual (preserva os guards de multiply/divide/
  regex null) e readiciona ambos os branches. Verificado: max_length corta para
  10; branch fn_clean_spot_name presente.

### Hardening abrangente pos-review (CodeRabbit/Codex/cubic) — aprovado pelo usuario

A 2a/3a rodada de review (CodeRabbit 19+ comentarios, Codex, cubic) cobriu o
conjunto reconciliado completo. Cada achado foi verificado contra o estado ATUAL
de producao; muitos ja estavam superados pelo estado final (os revisores viam
snapshots intermediarios). Os fixes ainda vivos foram aplicados como migrations
forward (nao se editou nenhum arquivo historico byte-exato):

- `20260605100708 harden_rls_mcp_sessions_silver_pricetiers_physical_and_dryrun_acl`
  - **P0** `mcp_sessions`: removida policy `FOR ALL TO anon` + REVOKE anon/
    authenticated; acesso so via service_role (guarda `cookie`).
  - `produtos_padronizacao`: policy de escrita ampla de authenticated -> SELECT.
  - `product_physical` / `supplier_price_tiers`: removida escrita de authenticated
    + REVOKE anon (cost_price sensivel); service_role mantem tudo (BYPASSRLS).
  - `fn_dryrun_raw_v2` (SECURITY DEFINER): REVOKE EXECUTE de PUBLIC/anon/authenticated.
- `20260605101258 fix_silver_promotion_cost_isactive_locks_and_races`
  - `fn_standardize_variant`: restaura custo XBZ (`PrecoVenda`) e ASIA (`preco`)
    que a `silver_08g` regrediu; inclui `is_active` no ON CONFLICT.
  - `fn_promote_variants_of_parent`: VSS vira upsert (custo nao fica stale);
    INSERT da variante race-safe via `ON CONFLICT (sku)`.
  - `fn_promote_padronizacao`: `FOR UPDATE` (lock pessimista anti-promocao dupla).
  - `+ SET search_path` nas funcoes do pipeline que estavam sem.
- `20260605101342 fix_silver_safebool_purge_colormatch_dryrun_lockedfields`
  - `fn_safe_bool`: fallback passa a aceitar `active/inactive`.
  - `fn_spr_history_purge`: guard `p_keep_months >= 1`.
  - `fn_match_canonical_color`: normaliza nome/hex (NULLIF) anti-match de string vazia.
  - `fn_dryrun_standardize_supplier`: ignora parent nulo, conta so sucessos reais.
  - `fn_products_capture_manual_edits`: `v_campos` completado (box_*, repacking_type,
    capacities, capacity_ml, colors) p/ proteger edicoes manuais.
- `20260605101432 add_supplier_price_tiers_check_constraints`
  - CHECKs `tier_order>0`, `min_qty>0`, `cost_price>=0`, janela valid_from/to
    (17.722 linhas, 0 violacoes).

Falsos-positivos / ja superados (verificados, sem acao): `fn_apply_transform`
multiply NULL ja tem guard e `replace` com find vazio e no-op nativo do PG;
`fn_spr_before_write` ja tem search_path e nao escreve `images_processed`;
`content_hash` virou coluna normal com DEFAULT (nao GENERATED); `fn_process_raw_v2`
ja usa `status=ANY('{pending,processing}')` e ja teve REVOKE; `process_supplier_
products_batch` ja e so postgres+service_role; `CREATE POLICY IF NOT EXISTS`
(20260601180000) foi aceito e a policy existe; `set_image_url` existe em products.
Issues so-de-replay em migrations historicas ja aplicadas nao foram "corrigidas"
editando os arquivos byte-exatos (quebraria a invariante DB==repo; workflow e
forward-only contra o banco vivo).

### Caveat de replay byte-exato (decisao: manter byte-exato + documentar)

Os arquivos historicos deste conjunto sao **snapshots fieis de producao**, nao
scripts idempotentes de `db reset`/replay from-scratch. Producao esta correta e o
check `Supabase Preview` esta desabilitado para este repo, entao estes achados so
afetariam um replay limpo (que nao usamos: o workflow e forward-only contra o
banco vivo). Por decisao explicita, os arquivos byte-exatos **nao** sao alterados
(manter a invariante DB==repo). Os achados do Codex abaixo ficam **by-design**:

- **P1** `20260605004956_harden_raw_sibling_tables_rls_grants.sql:26` — `REVOKE`
  em `_asia_api_staging` sem guarda `to_regclass`. A tabela e production-only
  (criada fora do repo); em DB fresh sem ela o REVOKE abortaria. Em producao
  existe e o REVOKE e correto.
- **P1** `20260604141743_add_updated_at_triggers_physical_pricetiers.sql:3` —
  usa `moddatetime` (contrib) sem `CREATE EXTENSION` previo. Em producao a
  extensao ja esta instalada; num replay sem ela o trigger abortaria.
- **P2** `20260604141720_create_supplier_price_tiers.sql:19` — RLS sem `GRANT`
  de privilegios de tabela no mesmo arquivo. Em producao os grants vivos cobrem
  o caminho de leitura autenticado; num DB fresh faltaria privilegio.
- **P1** `20260605012421_spr_p1_security_close_bronze_to_anon.sql:2` — `ALTER VIEW`
  em `somarcas_catalogo_publico` antes do `CREATE` (que mora numa migration
  posterior). Em producao a view ja existe; num replay ordenado o ALTER viria
  antes do CREATE.

Se algum dia precisarmos de replay from-scratch confiavel (ex.: reabilitar o
Preview), o caminho e UMA migration forward no tip que torne estes objetos
idempotentes — nunca editar os snapshots historicos.

## 2026-06-10 — Execução das correções da auditoria medallion (11 migrações via MCP)

Aplicadas diretamente no banco `doufsxqlfjyuvxuezpln` via MCP `apply_migration` e
espelhadas 1:1 neste repo (mesmos version/nome):

- `20260610120511_p0_carrossel_01_hash_canonico_e_enrich_tipado`
- `20260610120708_p0_carrossel_02_fix_digest_schema`
- `20260610121302_p0_carrossel_03_content_hash_drop_expression`
- `20260610121713_p0_quarentena_01_promote_failures_marcam_bronze`
- `20260610122207_p0_seguranca_01_fecha_anon_bronze_custos_e_fns`
- `20260610122350_p0_seguranca_02_products_grants_por_coluna_anon`
- `20260610122504_p0_estoque_01_fn_reconcile_stock_gold`
- `20260610122909_p1_historico_01_particionamento_mensal`
- `20260610123120_p1_gold_01_invariantes_indices_e_equivalencias_mortas`
- `20260610123210_p1_health_01_fn_pipeline_health_v2`
- `20260610123510_p1_ingest_01_fn_ingest_supplier_raw_reset_condicional`

ATENÇÃO: as migrações `20260610120000..120500_silver_depara_*` (PR #693) existem
no repo mas NÃO estão aplicadas no banco — decisão registrada no ADR 0009
(aplicá-las regrediria a fn_standardize_variant viva). Reconciliar antes de
qualquer `supabase db push`.

Detalhes, métricas antes/depois e one-shots: docs/EXECUCAO_CORRECOES_MEDALLION_2026-06-10.md
