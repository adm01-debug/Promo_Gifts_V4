# Confirmação A+B+F (44 branches) — revalidada em 2026-11-01

Base: main `5ae127e`. Prova por branch (REST compare + PRs + presença de linhas no main + ledger de produção). **Só 14 linhas exigem atenção: 10 recibos E15 (achado real) e 4 RESSALVAS.**

| Branch | Cat | Prova |
|---|---|---|
| `adm01-debug-patch-1` | F | Só adiciona template de workflow `webpack.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-1` | F | Só adiciona template de workflow `deno.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-10` | F | Só adiciona template de workflow `greetings.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-11` | F | Só adiciona template de workflow `static.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-12` | F | Só adiciona template de workflow `nextjs.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-2` | F | Só adiciona template de workflow `jekyll-docker.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-3` | F | Só adiciona template de workflow `npm-publish.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-4` | F | Só adiciona template de workflow `npm-publish-github-packages.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-5` | F | Só adiciona template de workflow `codacy.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-6` | F | Só adiciona template de workflow `dependency-review.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-7` | F | Só adiciona template de workflow `python-publish.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-8` | F | Só adiciona template de workflow `node.js.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-1-9` | F | Só adiciona template de workflow `manual.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-2` | F | Só adiciona template de workflow `main.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-3` | F | Só adiciona template de workflow `main.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `adm01-debug-patch-4` | F | Só adiciona template de workflow `deno.yml` (ausente no main, 656 commits atrás); PR fechada sem merge — template genérico do GitHub, sem relação com o produto. |
| `claude/batch-e14-e19-e22-e23-e26-e87-261019-1800` | F | PR #2312 fechada sem merge; mexe só em deploy-gates.yml (dorny/paths-filter já está no main: 1 ocorrência; 15/39 linhas coincidem; arquivo evoluiu 660 commits). |
| `claude/ci-e19-e22-e23-batch2-261019-1930` | F | PR #2314 fechada; só sobe .as-assertions-baseline.json (2164) — main já está em 2146; mergear afrouxaria o baseline. |
| `claude/feat-e33-e58-credentials-docs-261019-2000` | F | PR #2315 fechada. E33 já aplicado em main: grep E2E_USER nos 8 arquivos e2e-update-*-snapshots.yml retorna 0 linhas (verificado 2026-11-01). Shellcheck (2 arquivos) e gh-pages/happy-faraday: ressalvas menores. DESCARTAR. |
| `claude/fix-husky-dialog-snapshots-261023` | B | 0 commits à frente (427 atrás); PR #2381 fechada — nada a preservar. |
| `claude/fix-shellcheck-261019-1820` | F | RESSALVA: PR #2310 fechada; 2 correções de aspas (db-apply-migration.yml L190, update-snapshots.yml L110) ainda ausentes no main; workflows proibidos — baixo valor, decisão humana. |
| `claude/happy-faraday-0vgza3` | F | RESSALVA: PR #2352 mergeada; 3 arquivos (RELATORIO_FINAL_2026-10-22.md, 2 roteiros SQL SELECT-only) não estão no main — snapshot histórico de 22/10 superado por RELATORIO_AUDITORIA_SUPABASE.md; resgate opcional. |
| `claude/quirky-keller-owezvt` | F | Branch já deletada; PRs #2755 (mergeada 2026-10-30), #2675 e #2653 (fechadas) — conteúdo é docs de análise de PRs, já no main (analise-prs/). |
| `claude_05/friendly-keller-3mgkhz` | F | Branch deletada; PR #2403 mergeada 2026-10-24T20:15Z. |
| `claude_05/youthful-goodall-kihjbv` | F | Branch deletada; PR #2408 mergeada 2026-10-24T17:44Z (é o inventário em inventario/). |
| `copilot/corrigir-peer-dependencies-eslint` | F | PR #2320 fechada; só ranges de package.json/lock; main segue em @eslint/js ^9.39.5 — sem causa raiz para mexer. |
| `dependabot/npm_and_yarn/eslint/js-10.0.1` | F | PR #2290 fechada; bump MAJOR @eslint/js 9→10 (main: ^9.39.5) — upgrade major sem causa raiz é vedado. |
| `dependabot/npm_and_yarn/fast-uri-3.1.9` | F | Branch deletada; PR #2400 mergeada 2026-10-24T20:13Z. |
| `dependabot/npm_and_yarn/zod-4.6.6` | F | Branch deletada; PR #2401 mergeada 2026-10-24T20:14Z. |
| `e15-receipt-20261015150000-39287638783` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261015150000 de 'pendente' para 'aplicada'; produção TEM 20261015150000 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261018000041-39289741142` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261018000041 de 'pendente' para 'aplicada'; produção TEM 20261018000041 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261018000042-39290856470` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261018000042 de 'pendente' para 'aplicada'; produção TEM 20261018000042 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261018000043-39291965061` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261018000043 de 'pendente' para 'aplicada'; produção TEM 20261018000043 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261018000047-39293083717` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261018000047 de 'pendente' para 'aplicada'; produção TEM 20261018000047 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261018000048-39294729572` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261018000048 de 'pendente' para 'aplicada'; produção TEM 20261018000048 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261018160000-39295289411` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261018160000 de 'pendente' para 'aplicada'; produção TEM 20261018160000 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261018160100-39295521973` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261018160100 de 'pendente' para 'aplicada'; produção TEM 20261018160100 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261018170000-39295941511` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261018170000 de 'pendente' para 'aplicada'; produção TEM 20261018170000 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261018170100-39296356344` | F | ACHADO (não descartar sem aplicar): troca a linha de 20261018170100 de 'pendente' para 'aplicada'; produção TEM 20261018170100 no ledger e o main ainda diz 'pendente — não aplicada'. Docs-only, ver PR #2888. |
| `e15-receipt-20261019000000-39297487656` | F | Recibo duplicado: main já tem a linha de 20261019000000 em MIGRATIONS_SYNC_LOG.md (L790) e o ledger de produção tem a versão. |
| `e15-receipt-20261022194200-39922326892` | A | Branch deletada; ledger de produção e main já cobrem 20261022194200 (PR #2416 mergeada). |
| `fix/npm-peer-deps` | B | 0 commits à frente (658 atrás); sem PR — nada a preservar. |
| `gh-pages` | B | Existe; branch de relatórios E2E (último commit 2026-10-02 "prune e2e-report"), 3073 commits só de artefatos; nenhum workflow atual a referencia. Sem código a preservar; NÃO apagar sem decisão (histórico de relatórios). |
| `jules-11745886140891876680-0b67004e` | A | Branch deletada; PR #2319 fechada sem merge, sem commits à frente a preservar. |
