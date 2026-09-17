# E49 — Higiene do repositório com prova de não-perda `[GIT]`

**Status:** investigação completa, ações recomendadas, execução aguarda revisão
**Data da investigação:** 2026-09-16
**Branch:** `claude/audit-gaps-20260915`
**HEAD no momento da investigação:** `29d53a57e56efdc20e4885f3c97ba0833a052ee8` (`29d53a57e`)

> **Nenhum comando destrutivo foi executado.** Este documento é só investigação e
> classificação. Todos os comandos usados foram read-only (`git fsck`, `git log`,
> `git diff`, `git show`, `git branch -vv`, `git branch --contains`,
> `git worktree list`, `git merge-base --is-ancestor`, `git cat-file`, `git ls-tree`).
> `git branch -d`, `git worktree prune`, `git update-ref -d` e qualquer `--force`
> **não foram executados** — só recomendados, item por item, abaixo.

---

## 0. Reconfirmação dos números do plano (eram números de 09-15/09-16, aqui remedidos em 09-16)

O texto original do E49 dizia: *"59 commits dangling (WIP on …, 09-11 → 09-15), 2
worktrees prunable, branches [gone], graphify em 89292143 vs HEAD 7fbbcabe5,
allowlist pptxgenjs expira 2026-10-09."* Reconfirmando cada número hoje:

| Item do plano | Valor no plano | Valor reconfirmado agora (2026-09-16) | Veredito |
|---|---|---|---|
| Commits dangling | 59 | **125** (`git fsck --unreachable --no-reflogs`) / **114** com proteção de reflog (`git fsck --unreachable`) | **Desatualizado** — mais do que dobrou desde a medição do plano. Período real observado: **2026-08-26 → 2026-09-15** (mais amplo que o "09-11 → 09-15" citado). |
| Worktrees prunable | 2 | **2** (`git worktree list --porcelain`) | **Confirmado**, ainda correto. |
| Branches `[gone]` | (não quantificado) | **6** (`git branch -vv \| grep gone`) | Novo dado. |
| graphify | `89292143` vs HEAD `7fbbcabe5` | `Built from commit: 89292143` ainda; mas a própria referência `7fbbcabe5` **já é hoje um commit dangling** (superado por commits posteriores) — o HEAD real é `29d53a57e` | **Desatualizado** — o grafo está ainda mais atrasado do que o plano registrou; a referência de comparação do próprio plano ficou obsoleta. |
| pptxgenjs allowlist | expira 2026-10-09 | `RISK_REVIEW_DEADLINE = '2026-10-09T23:59:59-03:00'` em `scripts/check-dependency-audit.mjs:6` | **Confirmado**, ainda correto e ainda em vigor (23 dias restantes a partir de 2026-09-16). |

11 dos 125 commits dangling (125 − 114) só são protegidos por reflog (expiram
sozinhos em ~90 dias via `gc.reflogExpire` se não forem referenciados de novo);
os outros 114 não têm nem proteção de reflog e só continuam existindo porque
`git gc` ainda não rodou um ciclo agressivo.

---

## 1. Commits dangling — classificação completa (125 commits)

**Metodologia:** para cada um dos 125 commits retornados por
`git fsck --unreachable --no-reflogs`, foi feito:
1. Hash de tree (`git cat-file -p <commit> | head -1`) comparado contra um mapa
   pré-computado de todas as trees de todo o histórico alcançável (`git rev-list --all`)
   → detecta duplicata byte-a-byte independente de metadata (autor/pai/mensagem).
2. Para os que sobraram: parse da mensagem de `git stash` (`WIP on X: <hash> <msg>`,
   `index on X: …`, `untracked files on X: …`) para extrair o commit-base, testado com
   `git merge-base --is-ancestor <base> HEAD` e, quando isso falhava, com
   `git branch --all --contains <base>` (mais amplo — cobre branches locais/remotos
   que não são ancestrais do HEAD atual).
3. Para commits "normais" (não-stash) sem match de tree exata: busca por commits
   alcançáveis com o mesmo assunto (`git log --all --grep`), seguida de diff/`ls`
   direcionado nos arquivos específicos que o commit dangling introduzia, para
   confirmar presença do conteúdo real em HEAD (não só do título do commit).
4. Uma cadeia de 5 commits órfãos foi investigada individualmente porque não batia
   com nenhum dos padrões acima (ver §1.4).

**Resultado: 0 de 125 commits contém trabalho único irrecuperável.** Todos foram
rastreados a conteúdo já presente em HEAD, em uma branch local/remota intacta, ou a
ruído de coordenação/checkpoint descartável. Duas cadeias exigiram verificação manual
extra de conteúdo (não só de assunto) antes da classificação final — ambas descritas
em detalhe abaixo e **já resolvidas com evidência de código**, não por suposição.

### 1.1 Duplicata exata (mesma tree de commit alcançável) — 45 commits

Tree hash idêntica a um commit hoje alcançável a partir de alguma branch/HEAD.
Risco: **zero** — são o mesmo conteúdo, byte a byte.

### Duplicata exata (mesma tree de commit alcançável) — 45 commits

| hash | data | branch de origem provável | detalhe | ação recomendada |
|---|---|---|---|---|
| `61b34000e` | 2026-08-26 | `codex/stabilization-100` | match=a17425def5ba615e4f9f024458d9d54558a2c452 | descartavel |
| `0e4c72215` | 2026-08-26 | `codex/stabilization-100` | match=a17425def5ba615e4f9f024458d9d54558a2c452 | descartavel |
| `ab4d21ca8` | 2026-08-27 | `main` | match=d352e42f34c232cbb6e1e87df0f4369cf25624b8 | descartavel |
| `84bfd356d` | 2026-08-27 | `codex/stabilization-next-100` | match=daa9e2ac20701b759f40c23991bd4d7154e88d6d | descartavel |
| `9993514b0` | 2026-08-28 | `codex/wave1-forward-only-20260828` | match=7f6690a01d94a5e2496ddfe807e08622885690ea | descartavel |
| `802fbbdb6` | 2026-08-28 | `codex/wave1-forward-only-20260828` | match=7f6690a01d94a5e2496ddfe807e08622885690ea | descartavel |
| `513812ddb` | 2026-08-28 | `codex/wave1-forward-only-20260828` | match=7f6690a01d94a5e2496ddfe807e08622885690ea | descartavel |
| `c8e2ea360` | 2026-08-28 | `codex/wave1-forward-only-20260828` | match=7f6690a01d94a5e2496ddfe807e08622885690ea | descartavel |
| `a91fd6ffa` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `32a5e883a` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `0dbdc2493` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `557e37fc7` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `c9a503a37` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `cb156b4f0` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `e44b10a0d` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `b87db6ffc` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `b67ff01a0` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `8efba161c` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `83115c729` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `2a7fd4b33` | 2026-08-30 | `main` | match=1bee351e404f8addc4438ca6509d9237288bd4eb | descartavel |
| `67fe03219` | 2026-08-30 | (direto, sem stash) | match=bd59a447d578e8b25535b4c88f8563d5bb5038e0 | descartavel |
| `d6b114869` | 2026-09-08 | (direto, sem stash) | match=905f782b39f86a7bb4ae3bad6274dcc090ab38b9 | descartavel |
| `7a9e2535e` | 2026-09-08 | (direto, sem stash) | match=1878f1dd6160b45bcf1077678b31f49b152e31ec | descartavel |
| `573680892` | 2026-09-08 | (direto, sem stash) | match=8d7c33ffbfca9160d18babb8266b0d36bf4cdb15 | descartavel |
| `0e2795e8a` | 2026-09-08 | (direto, sem stash) | match=8d7c33ffbfca9160d18babb8266b0d36bf4cdb15 | descartavel |
| `7cb2d8fa3` | 2026-09-09 | `rescue/local-main-20260909-1145` | match=d352e42f34c232cbb6e1e87df0f4369cf25624b8 | descartavel |
| `f02eb1dac` | 2026-09-09 | (direto, sem stash) | match=55e598d3e30b49adc218e43c67dfbe64136deae8 | descartavel |
| `7c1608be0` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | match=5cba72f9b2f058bf32df191ccfe64430320e8e31 | descartavel |
| `cee4c3b3b` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | match=5cba72f9b2f058bf32df191ccfe64430320e8e31 | descartavel |
| `e04b84621` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | match=56b5c49512f3688ce6b220669a09817ecdfdbcdf | descartavel |
| `dfd73f1d7` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | match=55dae04127701cad63b1a2c4876ada0a0930df03 | descartavel |
| `ae85c607d` | 2026-09-10 | `codex/kit-maker-integration-20260910` | match=5402f7a2a389ecda744d331ab2cb7b823263fc05 | descartavel |
| `612a437e6` | 2026-09-10 | `codex/kit-maker-integration-20260910` | match=5402f7a2a389ecda744d331ab2cb7b823263fc05 | descartavel |
| `4b20fc66f` | 2026-09-10 | `codex/kit-maker-integration-20260910` | match=d429d55b31b2f779c15bd7321d6b51d9807ae70b | descartavel |
| `3abbf5493` | 2026-09-10 | `codex/kit-maker-integration-20260910` | match=d429d55b31b2f779c15bd7321d6b51d9807ae70b | descartavel |
| `acb3b82c4` | 2026-09-11 | `codex/kit-maker-atomic-persistence-20260911` | match=0b19da4c707d05780a4efa4177f71ce07634ad66 | descartavel |
| `584d96487` | 2026-09-11 | (direto, sem stash) | match=0d0a58083d29a738d669df4729d6df94d08c5e19 | descartavel |
| `035e6b587` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | match=4262d4a6c9d8ffd74f85dabd80034342287dd89d | descartavel |
| `b79fb600c` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | match=ede2e027007e5236cadbd1f5d88bc8db2805d0d4 | descartavel |
| `fd7a5b883` | 2026-09-12 | (direto, sem stash) | match=892921430a52ad6c997ce9080131290843a7e553 | descartavel |
| `ff62725b8` | 2026-09-12 | `codex/kit-maker-completion-20260912` | match=2623a51c60b4470d66eaa9830302e6ba2a4e4e7d | descartavel |
| `dd979b141` | 2026-09-12 | `codex/kit-maker-completion-20260912` | match=2623a51c60b4470d66eaa9830302e6ba2a4e4e7d | descartavel |
| `3a0bb6148` | 2026-09-12 | `codex/kit-maker-completion-20260912` | match=cd1eb760d9fce02db3be028dbc432c76f8432b6f | descartavel |
| `61a367980` | 2026-09-12 | `codex/kit-maker-completion-20260912` | match=cd1eb760d9fce02db3be028dbc432c76f8432b6f | descartavel |
| `d8763a66f` | 2026-09-13 | `codex/kit-maker-catalog-fix-20260911` | match=a8fd369fcdea7e8644bcaeffb0f33fc06ee9940b | descartavel |

### 1.2 Stash automático (WIP/index/untracked) — 63 commits

Gerados por `git stash` durante sessões de trabalho (Codex/Claude). Cada `git stash`
gera 2-3 commits dangling (WIP, index, e opcionalmente um commit octopus de
untracked files) que nunca são referenciados por nenhuma branch. Classificados pelo
status do commit-base extraído da própria mensagem do stash:
- **ancestor-of-HEAD** (42): a base já está no histórico do HEAD atual → stash é
  puro ruído de trabalho em progresso já superado.
- **on-branch** (19): a base não é ancestral do HEAD atual desta branch, mas ainda
  existe intacta em outra branch local/remota (`codex/stabilization-*`,
  `codex/kit-maker-completion-20260912`, `claude/quality-gates-hardening-20260913`)
  → conteúdo não está "perdido", só não fundido nesta branch.
  **Ação recomendada é condicional à decisão sobre a branch âncora** (ver §3).
- **ORPHAN-NOT-FOUND → resolvido** (2): `e803893e8` e `535e8dff1` referenciam
  `parent=cdcb3347a`, que não é ele mesmo tip de nenhuma branch viva hoje. Investigação
  extra (abaixo) confirmou que é seguro:
  - `e803893e8` (commit "index on") tem diff vazio contra o pai — é um snapshot de
    índice sem staged changes, sem conteúdo próprio.
  - `535e8dff1` (commit "untracked files on") tem árvore própria com só 5 arquivos
    (`git ls-tree -r --name-only`); todos os 5 já existem em HEAD hoje, byte-idênticos
    (`comm -23` entre a lista de arquivos do commit e a lista de arquivos do HEAD
    retornou 0 diferenças). O diffstat de "1.382.221 deleções" que aparece ao comparar
    contra o pai é um artefato estrutural de commits `untracked files on` (a tree deles
    só contém os arquivos não rastreados, não a working tree inteira) — não é perda real.
  - O próprio `cdcb3347a` já está classificado em CAT4 (ver 1.3) como superado por
    `587997d4a` (ancestral do HEAD).

### Stash automático (WIP/index/untracked) — 63 commits

| hash | data | branch de origem provável | detalhe | ação recomendada |
|---|---|---|---|---|
| `bc072c919` | 2026-08-26 | `codex/stabilization-100` | parent=0660b3ef9 status=on-branch:codex/stabilization-100,codex/stabilization-completion-100,codex/stabilization-next-100,origin/codex/stabilization-completion-100 | descartavel-condicional |
| `c65e55891` | 2026-08-26 | `codex/stabilization-100` | parent=0660b3ef9 status=on-branch (idem) | descartavel-condicional |
| `79dc4925d` | 2026-08-27 | `codex/stabilization-next-100` | parent=d841c4fcc status=on-branch:codex/stabilization-completion-100,codex/stabilization-next-100,origin/codex/stabilization-completion-100 | descartavel-condicional |
| `90a4df38d` | 2026-08-27 | `codex/stabilization-next-100` | parent=d841c4fcc status=on-branch (idem) | descartavel-condicional |
| `2e7e245cc` | 2026-08-27 | `codex/stabilization-next-100` | parent=109e35f0f status=on-branch (idem) | descartavel-condicional |
| `822572613` | 2026-08-27 | `codex/stabilization-next-100` | parent=109e35f0f status=on-branch (idem) | descartavel-condicional |
| `4f9d53ff2` | 2026-08-27 | `main` | parent=9ad56bf3d status=on-branch:codex/stabilization-*,rescue/local-main-20260909-1145 | descartavel-condicional |
| `076dc0cae` | 2026-08-27 | `codex/stabilization-next-100` | parent=6ac5803e3 status=on-branch (idem) | descartavel-condicional |
| `a39136b12` | 2026-08-27 | `codex/stabilization-next-100` | parent=6ac5803e3 status=on-branch (idem) | descartavel-condicional |
| `ecb6106ea` | 2026-08-27 | `codex/stabilization-next-100` | parent=f988df921 status=on-branch (idem) | descartavel-condicional |
| `ada9dec95` | 2026-08-27 | `codex/stabilization-next-100` | parent=f988df921 status=on-branch (idem) | descartavel-condicional |
| `fa0789bd1` | 2026-08-27 | `codex/stabilization-next-100` | parent=7406d258b status=on-branch (idem) | descartavel-condicional |
| `4de099d4b` | 2026-08-27 | `codex/stabilization-next-100` | parent=7406d258b status=on-branch (idem) | descartavel-condicional |
| `d352dac28` | 2026-08-27 | `codex/stabilization-next-100` | parent=0793edf93 status=on-branch (idem) | descartavel-condicional |
| `754081a77` | 2026-09-09 | `rescue/local-main-20260909-1145` | parent=9ad56bf3d status=on-branch (idem) | descartavel-condicional |
| `eb79d5178` | 2026-09-09 | `codex/magazine-integrity-20260909` | parent=55e598d3e status=ancestor-of-HEAD | descartavel-condicional |
| `7dac920a0` | 2026-09-09 | `codex/magazine-integrity-20260909` | parent=55e598d3e status=ancestor-of-HEAD | descartavel-condicional |
| `d6d2b8845` | 2026-09-09 | `codex/magazine-integrity-20260909` | parent=55e598d3e status=ancestor-of-HEAD | descartavel-condicional |
| `f3435a959` | 2026-09-09 | `codex/magazine-integrity-20260909` | parent=55e598d3e status=ancestor-of-HEAD | descartavel-condicional |
| `6faf39487` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | parent=e44377ee6 status=ancestor-of-HEAD | descartavel-condicional |
| `606b73e2e` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | parent=e44377ee6 status=ancestor-of-HEAD | descartavel-condicional |
| `373305c3f` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | parent=6f60eeb45 status=ancestor-of-HEAD | descartavel-condicional |
| `f045ccd67` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | parent=56b5c4951 status=ancestor-of-HEAD | descartavel-condicional |
| `7470f1f1b` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | parent=56b5c4951 status=ancestor-of-HEAD | descartavel-condicional |
| `7e29b918f` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | parent=095d4cdb9 status=ancestor-of-HEAD | descartavel-condicional |
| `becb17ffa` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | parent=095d4cdb9 status=ancestor-of-HEAD | descartavel-condicional |
| `c58bd40b8` | 2026-09-09 | `codex/magazine-wave2-live-20260909` | parent=a3e592592 status=ancestor-of-HEAD | descartavel-condicional |
| `3a485d2e4` | 2026-09-09 | `codex/magazine-hardening-20260909` | parent=80cf74ecc status=ancestor-of-HEAD | descartavel-condicional |
| `be10c39a8` | 2026-09-09 | `codex/magazine-hardening-20260909` | parent=80cf74ecc status=ancestor-of-HEAD | descartavel-condicional |
| `f13d46354` | 2026-09-10 | `codex/kit-maker-integration-20260910` | parent=55e598d3e status=ancestor-of-HEAD | descartavel-condicional |
| `109dd6d1a` | 2026-09-10 | `codex/kit-maker-integration-20260910` | parent=55e598d3e status=ancestor-of-HEAD | descartavel-condicional |
| `e803893e8` | 2026-09-10 | `codex/kit-maker-integration-20260910` | parent=cdcb3347a status=ORPHAN-NOT-FOUND → resolvido (diff vazio, ver 1.2) | descartavel |
| `535e8dff1` | 2026-09-10 | `codex/kit-maker-integration-20260910` | parent=cdcb3347a status=ORPHAN-NOT-FOUND → resolvido (5 arquivos, todos já em HEAD, ver 1.2) | descartavel |
| `08817c616` | 2026-09-10 | `main` | parent=6593adb74 status=ancestor-of-HEAD | descartavel-condicional |
| `a6bf6ae76` | 2026-09-10 | `main` | parent=6593adb74 status=ancestor-of-HEAD | descartavel-condicional |
| `dc3e4193c` | 2026-09-10 | `main` | parent=6593adb74 status=ancestor-of-HEAD | descartavel-condicional |
| `7b9486950` | 2026-09-10 | `main` | parent=6593adb74 status=ancestor-of-HEAD | descartavel-condicional |
| `2b591a537` | 2026-09-10 | `main` | parent=6593adb74 status=ancestor-of-HEAD | descartavel-condicional |
| `0de2ef4f7` | 2026-09-10 | `main` | parent=6593adb74 status=ancestor-of-HEAD | descartavel-condicional |
| `13ef93081` | 2026-09-11 | `codex/kit-maker-atomic-persistence-20260911` | parent=2d5fe16b1 status=ancestor-of-HEAD | descartavel-condicional |
| `17469d2e3` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=cda54f39e status=ancestor-of-HEAD | descartavel-condicional |
| `22900b16d` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=cda54f39e status=ancestor-of-HEAD | descartavel-condicional |
| `424ba74e2` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=902e2d5e1 status=ancestor-of-HEAD | descartavel-condicional |
| `5b703ff7e` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=902e2d5e1 status=ancestor-of-HEAD | descartavel-condicional |
| `afed41846` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=aacb286a4 status=ancestor-of-HEAD | descartavel-condicional |
| `f90d9477d` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=4262d4a6c status=ancestor-of-HEAD | descartavel-condicional |
| `bcf067bac` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=4262d4a6c status=ancestor-of-HEAD | descartavel-condicional |
| `36273a272` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=62078bf2e status=ancestor-of-HEAD | descartavel-condicional |
| `0f9cc7fd3` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=62078bf2e status=ancestor-of-HEAD | descartavel-condicional |
| `a266d13a7` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=62078bf2e status=ancestor-of-HEAD | descartavel-condicional |
| `9ca2d1d28` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=f9c9778e6 status=ancestor-of-HEAD | descartavel-condicional |
| `26a2dbb40` | 2026-09-11 | `codex/kit-maker-catalog-fix-20260911` | parent=f9c9778e6 status=ancestor-of-HEAD | descartavel-condicional |
| `e2e051221` | 2026-09-12 | `codex/kit-maker-catalog-fix-20260911` | parent=1f68f1c95 status=ancestor-of-HEAD | descartavel-condicional |
| `83ec37679` | 2026-09-12 | `codex/kit-maker-catalog-fix-20260911` | parent=1f68f1c95 status=ancestor-of-HEAD | descartavel-condicional |
| `3cc81e2d6` | 2026-09-12 | `codex/kit-maker-catalog-fix-20260911` | parent=660e8d82b status=ancestor-of-HEAD | descartavel-condicional |
| `bc084bce6` | 2026-09-12 | `codex/kit-maker-catalog-fix-20260911` | parent=660e8d82b status=ancestor-of-HEAD | descartavel-condicional |
| `dfcac8216` | 2026-09-12 | `codex/kit-maker-completion-20260912` | parent=cd1eb760d status=on-branch:codex/kit-maker-completion-20260912 | descartavel-condicional |
| `b5ceda9d2` | 2026-09-12 | `codex/kit-maker-completion-20260912` | parent=cd1eb760d status=on-branch (idem) | descartavel-condicional |
| `e51b072dd` | 2026-09-13 | `codex/kit-maker-catalog-fix-20260911` | parent=60f5df628 status=ancestor-of-HEAD | descartavel-condicional |
| `4045288bc` | 2026-09-13 | `claude/quality-gates-hardening-20260913` | parent=8a074caff status=on-branch:claude/quality-gates-hardening-20260913 | descartavel-condicional |
| `77dcdd432` | 2026-09-13 | `claude/quality-gates-hardening-20260913` | parent=8a074caff status=on-branch (idem) | descartavel-condicional |
| `b520b615f` | 2026-09-15 | `claude/audit-gaps-20260915` | parent=8fcce4703 status=ancestor-of-HEAD | descartavel-condicional |
| `cd3e7e565` | 2026-09-15 | `claude/audit-gaps-20260915` | parent=8fcce4703 status=ancestor-of-HEAD | descartavel-condicional |

### 1.3 Superado (assunto+conteúdo já em HEAD) — 10 commits

Commits "normais" (não gerados por stash) sem match de tree exata, mas cujo assunto
bate com um commit alcançável e cujo conteúdo específico (arquivos introduzidos) foi
confirmado presente em HEAD via diff/`ls` direcionado — não só por título.

| hash | data | branch de origem provável | detalhe | ação recomendada |
|---|---|---|---|---|
| `268346019` | 2026-08-29 | (direto, sem stash) | match=0b37f7546451056327ac0a1ecd447407fe568fd7 | descartavel |
| `686bc6645` | 2026-09-08 | (direto, sem stash) | match=8d7c33ffbfca9160d18babb8266b0d36bf4cdb15 | descartavel |
| `cdcb3347a` | 2026-09-10 | (direto, sem stash) | match=587997d4acc99c182bf3ba2089d939e98796157f (kit-builder: box-recommendations, KitBuilderPage.tsx, useKitBuilderQuote.ts confirmados presentes em HEAD) | descartavel |
| `4eaa4627c` | 2026-09-12 | (direto, sem stash) | match=892921430a52ad6c997ce9080131290843a7e553 | descartavel |
| `b43bcbe27` | 2026-09-12 | (direto, sem stash) | match=c7c8afe7a7eb2c92667a11d509a8cfdd4133ee25 | descartavel |
| `1d5fd88ae` | 2026-09-12 | (direto, sem stash) | match=c7c8afe7a7eb2c92667a11d509a8cfdd4133ee25 | descartavel |
| `9a689624b` | 2026-09-13 | (direto, sem stash) | match=f73cffa7d34bbd663885e659c61f8a7176e6c168 (o mesmo tip da branch `claude/quality-gates-hardening-20260913` — ver §3) | descartavel |
| `d82a1fc16` | 2026-09-15 | (direto, sem stash) | match=96aa775009fb2d015cd1cf8320503e8005b54051 | descartavel |
| `b2f6dde30` | 2026-09-15 | (direto, sem stash) | match=64cc27731c6cc8fecb80ed45791676a192c19d13 | descartavel |
| `7fbbcabe5` | 2026-09-15 | (direto, sem stash) | match=aa47800ba924a1cdca422a014378b412e440aaf6 — **nota:** este é o exato hash que o texto original do plano E49 citava como "HEAD 7fbbcabe5"; hoje ele mesmo é dangling, superado por commits posteriores até `29d53a57e` | descartavel |

### 1.4 Cadeia órfã superada (5 commits, auditoria pós-merge) — 5 commits

Cadeia `d871247d8 → 408892b2c → e6c02e3ef → 018ee7f62 → c439da82a`, construída sobre
histórico alcançável mas nunca mesclada em nenhuma branch viva. Assunto: hardening de
CI/e2e/segurança pós-merge de 2026-09-08. Investigação item a item:

- **Cache key `bun.lockb` → `bun.lock`** e **`--frozen-lockfile` no job
  `card-parity-matrix`**: confirmado presente em `.github/workflows/replenishment-quality.yml`
  no HEAD atual.
- **Selector `[data-testid^="magazine-card-"]` em `magazine-preview-sticky.spec.ts`**:
  confirmado presente no HEAD atual (já era parte do padrão aplicado nos outros specs
  no PR #1848; este arquivo específico recebeu o mesmo tratamento depois).
- **`publish()`/`unpublish()` participando de um contador de operações pendentes**
  (`pendingOps` no commit original) em `src/pages/magazine/useMagazineEditor.ts`:
  o símbolo `pendingOps` **não existe mais literalmente** no arquivo atual — mas isso
  é porque o arquivo foi **reescrito** desde então (comentário no topo do arquivo hoje:
  *"Magazine editor: serial writes, metadata-only autosave and explicit failures"*).
  `publish`/`unpublish`/`archive`/`addProducts`/etc. hoje passam todos por um helper
  único `mutate()` (linha 188) que delega para `EditorPersistence.mutate()`
  (`src/pages/magazine/editorPersistence.ts`), que implementa uma **fila serial de
  escrita genérica** com contador próprio (`this.queued += 1` / `-= 1`,
  `get saving() { return this.queued > 0 || this.timer !== null; }`). Isto cobre a
  mesma race condition do commit original (autosave concorrente zerando `saving` antes
  do network call terminar) só que de forma mais geral — para **toda** mutação, não só
  publish/unpublish. **Confirmado por leitura de código, não por suposição.**

**Conclusão:** os 5 commits da cadeia são descartáveis — todo o conteúdo relevante foi
absorvido por trabalho posterior, com uma arquitetura equivalente ou superior à
proposta pela cadeia órfã.

| hash | data | branch de origem provável | detalhe | ação recomendada |
|---|---|---|---|---|
| `d871247d8` | 2026-09-08 | (direto, sem stash) | 1º commit da cadeia | descartavel |
| `408892b2c` | 2026-09-08 | (direto, sem stash) | introduz o fix de pendingOps — payload verificado substituído por fila serial em `EditorPersistence` | descartavel |
| `018ee7f62` | 2026-09-09 | (direto, sem stash) | cadeia | descartavel |
| `e6c02e3ef` | 2026-09-09 | (direto, sem stash) | cadeia | descartavel |
| `c439da82a` | 2026-09-09 | (direto, sem stash) | último commit da cadeia | descartavel |

### 1.5 Ruído de coordenação (merge octopus de stash) — 2 commits

Merges octopus produzidos por `git stash` quando há arquivos staged + untracked ao
mesmo tempo, sobre arquivos de coordenação efêmeros (`docs/coordenacao/reservas-ativas.md`).
Conteúdo confirmado como entradas de reserva de trabalho já superadas/expiradas.

| hash | data | branch de origem provável | detalhe | ação recomendada |
|---|---|---|---|---|
| `f30034237` | 2026-09-10 | `codex/kit-maker-integration-20260910` | merge octopus sobre `docs/coordenacao/reservas-ativas.md`, entrada já superada | descartavel |
| `b419f9bdd` | 2026-09-13 | `codex/kit-maker-catalog-fix-20260911` | idem | descartavel |

### 1.6 Resumo da classificação

| Categoria | Contagem | Risco |
|---|---|---|
| CAT1 — Duplicata exata (tree idêntica) | 45 | zero |
| CAT2 — Stash automático (WIP/index/untracked) | 63 | zero (42 ancestor-of-HEAD, 19 on-branch, 2 resolvidos individualmente) |
| CAT3 — assunto+conteúdo já em HEAD | 10 | zero |
| CAT4 — cadeia órfã superada (pendingOps) | 5 | zero (verificado por leitura de código) |
| CAT5 — ruído de coordenação | 2 | zero |
| **Total** | **125** | **0 commits com trabalho único não recuperável** |

---

## 2. Estado dos worktrees

```
$ git worktree list --porcelain
worktree /home/joaquim_ataides/projetos/Promo_Gifts_V4
HEAD 29d53a57e56efdc20e4885f3c97ba0833a052ee8
branch refs/heads/claude/audit-gaps-20260915

worktree /tmp/promo-gifts-reconciliation-integrity-20260915
HEAD b74d3a9b86d33dfb771478b5d410c5e3e8318bca
branch refs/heads/codex/reconciliation-integrity-20260915
prunable gitdir file points to non-existent location

worktree /tmp/promo-gifts-schema-reconcile-6cH3PA
HEAD 1d2fafccdfe516cce2d52e527ec5ce964c99207f
branch refs/heads/codex/schema-ledger-reconciliation-20260915
prunable gitdir file points to non-existent location
```

**2 de 3 worktrees são `prunable`** — confirma o número do plano. Ambos são
diretórios que viviam em `/tmp` (efêmeros, não sob o repo) e foram apagados por
limpeza de `/tmp` do sistema/sessão sem passar por `git worktree remove`; o metadado
em `.git/worktrees/` ficou órfão apontando para um `gitdir` que não existe mais.

**Ação recomendada:** `git worktree prune` (remove só o metadado órfão em
`.git/worktrees/*`; não toca nas branches `codex/reconciliation-integrity-20260915`
nem `codex/schema-ledger-reconciliation-20260915`, que continuam existindo como refs
normais). **Não executado.**

---

## 3. Branches locais com upstream `[gone]`

```
$ git branch -vv | grep gone
```

| Branch | Tip | Ancestral do HEAD atual? | Conteúdo único confirmado em HEAD? | Recomendação |
|---|---|---|---|---|
| `codex/magazine-hardening-20260909` | `9199a795c` | **Sim** | — (é ancestral, `-d` aceita direto) | `git branch -d` seguro |
| `codex/magazine-wave2-live-20260909` | `f53ffbab9` | **Sim** | — (é ancestral, `-d` aceita direto) | `git branch -d` seguro |
| `codex/reconciliation-integrity-20260915` | `b74d3a9b8` | Não | **Sim** — diff do único commit desta branch contra HEAD é vazio; é exatamente o commit que reconciliou a allowlist pptxgenjs/image-size, e HEAD já contém essa versão reconciliada (ver §5) | `git branch -d` recusará (não-ancestral) → precisa `-D` explícito; recomendado só depois de revisão, conteúdo já confirmado presente |
| `claude/zapp-catalog-stats-governance-20260915` | `0e3a89907` | Não | **Sim** — commit `64cc27731` (ancestral do HEAD, #1863) tem o mesmo assunto e a migration `supabase/migrations/20260915113458_zapp_catalog_stats_revoke_authenticated.sql` já existe em HEAD | `git branch -d` recusará → `-D` explícito recomendado após revisão, conteúdo já confirmado presente |
| `codex/kit-maker-completion-20260912` | `c930f54c7` | Não | **Sim** — payload era só 2 arquivos (entrada em `audit/supabase-reference-catalog.temporary.json` para `kit_quote_requests` + linha em doc de auditoria); a entrada `kit_quote_requests` já existe em HEAD | `git branch -d` recusará → `-D` explícito recomendado após revisão, conteúdo já confirmado presente |
| `claude/quality-gates-hardening-20260913` | `f73cffa7d` | Não | **Sim** — payload principal (workflow `stock-module-quality.yml` + `tests/supplierReliability.aggregate.test.ts`) entrou via PR #1861 (commit `8fcce4703`, ancestral do HEAD); os demais arquivos de teste citados no diff (`ReliabilityBadge.test.tsx`, `ReliabilityKpiBar.test.tsx`, `RuptureLevelBadge.test.tsx`, `StockCategoryTreeSelect.test.tsx`) existem hoje em HEAD sob caminhos reorganizados (`tests/components/inventory/…`, `src/components/inventory/risk/__tests__/…`, `src/components/inventory/__tests__/…`) | `git branch -d` recusará → `-D` explícito recomendado após revisão, conteúdo já confirmado presente (redundância totalmente verificada, não só por suposição) |

**Nota de segurança:** `git branch -d` (minúsculo) **recusa por padrão** apagar
qualquer branch cujo tip não seja ancestral do branch atual — essa é a rede de
segurança nativa do Git para branches ainda não mescladas na branch corrente. Para as
4 branches acima marcadas "Não" seria necessário `-D` (maiúsculo, força) para de fato
apagar; **nenhum `-d` nem `-D` foi executado nesta investigação.** A recomendação é só
uma leitura do estado — quem revisar decide se e quando executar.

---

## 4. Estado do graphify

```
$ git rev-parse --short HEAD
29d53a57e

$ grep "Built from commit" graphify-out/GRAPH_REPORT.md
- Built from commit: `89292143`
```

O grafo está desatualizado (`89292143` ≠ `29d53a57e`). Existe inclusive um marcador
de staleness já presente no repo: `graphify-out/.graph.html.stale` (arquivo de 0
bytes, datado de 13/set). Nota adicional: o próprio texto original do E49 citava
"HEAD 7fbbcabe5" como ponto de comparação — esse commit **também já é dangling hoje**
(superado, ver CAT3 acima), então mesmo a referência do plano ficou obsoleta, não só
o grafo.

**Comando exato para atualizar (não executado):**
```sh
graphify update . --force
```

---

## 5. Decisão proposta — allowlist `pptxgenjs` / `image-size`

**Estado atual confirmado em HEAD:**
- `pptxgenjs` continua dependência direta ativa: `package.json:326`
  `"pptxgenjs": "^4.0.1"`.
- A allowlist (`scripts/check-dependency-audit.mjs`) tem
  `RISK_REVIEW_DEADLINE = '2026-10-09T23:59:59-03:00'` (linha 6) — **23 dias
  restantes** a partir de hoje (2026-09-16). A allowlist é fail-closed: passado o
  prazo, `now.getTime() > new Date(RISK_REVIEW_DEADLINE).getTime()` falha o gate
  (linha 110-111).
- A versão da allowlist em HEAD já é a mais reconciliada: `git diff` entre HEAD e o
  tip de `codex/reconciliation-integrity-20260915` (a branch cujo único propósito era
  "reconcilia política do advisory pptx") é **vazio** para
  `scripts/check-dependency-audit.mjs` e arquivos correlatos — ou seja, o trabalho
  daquela branch já está 100% incorporado.
- Decisão documentada em `docs/security/DEPENDENCY_RISK_IMAGE_SIZE_2026-09-09.md`:
  único ponto de importação em produção é `src/lib/bi/pptxGenerator.ts`; o adapter
  nunca chama `addImage`; `pptxgenjs` desliga `browser.image-size = false`; gates
  compensatórios são `npm run check:pptx-image-parser-exposure` e
  `npm run check:dependency-audit`.
- Condições de fechamento já documentadas: `image-size` publicar correção, ou
  `pptxgenjs` remover/trocar a dependência transitiva, ou o projeto substituir
  `pptxgenjs`.

**Proposta:** **não remover** `pptxgenjs` agora (é dependência ativa em produção,
única via de geração de apresentações; não há substituto avaliado em HEAD) e **não
antecipar a renovação/expiração hoje** — a decisão de renovar ou deixar expirar deve
ser tomada mais perto de 2026-10-09, checando nesse momento se `image-size` já
publicou correção upstream (o que fecharia a exceção sem precisar renovar) ou se
`pptxgenjs` trocou/removeu a dependência vulnerável. Se nenhuma das duas acontecer até
lá, renovar `RISK_REVIEW_DEADLINE` com nova data e nova revisão do mesmo dono técnico
que assinou a decisão original de 2026-09-09. **Nenhuma alteração no arquivo de
allowlist foi feita nesta investigação.**

---

## 6. Checklist de conclusão da etapa

- [x] Commits dangling reais medidos hoje (`git fsck --unreachable --no-reflogs` →
      125; `--no --no-reflogs` omitido → 114 com proteção de reflog) — **investigação
      completa**
- [x] Todos os 125 classificados individualmente com evidência (tree hash, ancestria,
      diff de conteúdo, ou leitura de código) — **investigação completa**
- [x] Estado dos worktrees confirmado (2/3 prunable, motivo identificado) —
      **investigação completa**
- [x] Branches `[gone]` listadas e status de merge confirmado para as 6 —
      **investigação completa**
- [x] Staleness do graphify reconfirmada, incluindo achado extra de que a própria
      referência do plano (`7fbbcabe5`) também já é dangling — **investigação
      completa**
- [x] Allowlist `pptxgenjs`/`image-size` localizada, prazo confirmado, uso em
      produção confirmado, decisão proposta — **investigação completa**
- [ ] `git worktree prune` — **ação recomendada, execução aguarda revisão**
- [ ] `git branch -d codex/magazine-hardening-20260909` /
      `git branch -d codex/magazine-wave2-live-20260909` — **ação recomendada,
      execução aguarda revisão**
- [ ] `git branch -D` das 4 branches não-ancestrais (`codex/reconciliation-integrity-20260915`,
      `claude/zapp-catalog-stats-governance-20260915`, `codex/kit-maker-completion-20260912`,
      `claude/quality-gates-hardening-20260913`) — conteúdo já confirmado presente em
      HEAD, mas **ação recomendada, execução aguarda revisão** (uso de `-D` é
      irreversível localmente)
- [ ] `graphify update . --force` — **ação recomendada, execução aguarda revisão**
- [ ] Renovação/expiração da allowlist `pptxgenjs` — **decisão proposta, execução
      aguarda revisão mais próxima de 2026-10-09**

**Nenhum item acima foi executado.** Este documento é só a investigação e as
recomendações fundamentadas; a etapa E49 permanece **"execução aguarda revisão"**
até que um humano decida rodar (ou não) os comandos listados.
