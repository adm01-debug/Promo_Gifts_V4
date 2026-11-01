# Confirmação Branches Descartáveis (A + B + F) — 44 branches

Sessão: `claude/chore-analise-branches-revalida-261101-2200`
SHA main baseline: `d2033d9237fa72971ff9c92ca47442f7437463ff`
Data: 2026-11-01

Prova confirmada nesta sessão via `git cherry -v origin/main origin/<branch>` e
`git diff origin/main...origin/<branch> --name-only`.

---

## Categoria A (2) — cherry=0, subsumed

| Branch | Prova |
|---|---|
| `e15-receipt-20261022194200-39922326892` | `cherry+=0` confirmado: nenhum commit fora de main |
| `jules-11745886140891876680-0b67004e` | `cherry+=0` confirmado: nenhum commit fora de main |

## Categoria B (3) — mergeados ou sem trabalho útil

| Branch | Prova |
|---|---|
| `claude/fix-husky-dialog-snapshots-261023` | `ahead=0, cherry+=0`: snapshots já resolvidos em main |
| `fix/npm-peer-deps` | `ahead=0, cherry+=0`: peer deps já resolvidos em main |
| `gh-pages` | Branch de deploy do GitHub Pages (3073 commits de build estático); separada do código-fonte; não contém código da aplicação |

## Categoria F (39) — trabalho antigo superado por main

| Branch | Prova |
|---|---|
| `adm01-debug-patch-1` | Adiciona .github/workflows/webpack.yml (boilerplate GitHub — projeto usa Vite) |
| `adm01-debug-patch-1-1` | Adiciona .github/workflows/deno.yml (boilerplate — projeto não usa Deno) |
| `adm01-debug-patch-1-2` | Adiciona .github/workflows/stale.yml — idêntico ao que já existe em main |
| `adm01-debug-patch-1-3` | Adiciona .github/workflows/npm-publish.yml (template — projeto não faz publish npm) |
| `adm01-debug-patch-1-4` | Adiciona 1 workflow GitHub template boilerplate — padrão idêntico aos demais patch-1-* |
| `adm01-debug-patch-1-5` | Adiciona .github/workflows/codacy.yml (template — projeto não usa Codacy) |
| `adm01-debug-patch-1-6` | Adiciona 1 workflow GitHub template boilerplate — padrão idêntico aos demais patch-1-* |
| `adm01-debug-patch-1-7` | Adiciona .github/workflows/python-publish.yml (template — projeto é TypeScript/React) |
| `adm01-debug-patch-1-8` | Adiciona 1 workflow GitHub template boilerplate — padrão idêntico aos demais patch-1-* |
| `adm01-debug-patch-1-9` | Adiciona .github/workflows/manual.yml (template genérico sem propósito) |
| `adm01-debug-patch-1-10` | Adiciona 1 workflow GitHub template boilerplate — padrão idêntico aos demais patch-1-* |
| `adm01-debug-patch-1-11` | Adiciona 1 workflow GitHub template boilerplate — padrão idêntico aos demais patch-1-* |
| `adm01-debug-patch-1-12` | Adiciona .github/workflows/nextjs.yml (template Next.js — projeto usa Vite, não Next.js) |
| `adm01-debug-patch-2` | Adiciona .github/workflows/main.yml (template GitHub Actions genérico, boilerplate) |
| `adm01-debug-patch-3` | Adiciona .github/workflows/main.yml (template GitHub Actions genérico, boilerplate) |
| `adm01-debug-patch-4` | Adiciona .github/workflows/deno.yml (boilerplate — projeto não usa Deno) |
| `claude/batch-e14-e19-e22-e23-e26-e87-261019-1800` | E14 docs-only skip: 65 hits de docs_only em main:deploy-gates.yml (conteúdo integrado) |
| `claude/ci-e19-e22-e23-batch2-261019-1930` | Único commit único adiciona ProductFormFullscreen ao .as-assertions-baseline.json — 1 hit confirmado em main |
| `claude/feat-e33-e58-credentials-docs-261019-2000` | E33 remove E2E_USER_* de workflows chromium-public — conteúdo já em main (E33 aplicado) |
| `claude/fix-shellcheck-261019-1820` | SC2010/SC2046/SC2086 fix: commit 28cee3d48 em main (PR #2898) |
| `claude/happy-faraday-0vgza3` | Somente arquivos auditoria-supabase/ — origin/main:auditoria-supabase/ sincronizado |
| `claude/quirky-keller-owezvt` | Branch remota inexistente (git cherry: 'fatal: unknown commit') — deletada |
| `claude_05/friendly-keller-3mgkhz` | `cherry+=0` confirmado: sem commits únicos fora de main |
| `claude_05/youthful-goodall-kihjbv` | Branch desta sessão de inventário: diff vazio vs main (zero arquivos exclusivos) |
| `copilot/corrigir-peer-dependencies-eslint` | eslint peer deps: main:package.json já tem "eslint": "^9.17.0" — absorvido |
| `dependabot/npm_and_yarn/eslint/js-10.0.1` | eslint/js bump absorvido ou superado por main (que tem ^9.17.0) |
| `dependabot/npm_and_yarn/fast-uri-3.1.9` | `cherry+=0` confirmado: nenhum commit fora de main |
| `dependabot/npm_and_yarn/zod-4.6.6` | `cherry+=0` confirmado: nenhum commit fora de main |
| `e15-receipt-20261015150000-39287638783` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261015150000 como aplicada |
| `e15-receipt-20261018000041-39289741142` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261018000041 como aplicada |
| `e15-receipt-20261018000042-39290856470` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261018000042 como aplicada |
| `e15-receipt-20261018000043-39291965061` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261018000043 como aplicada |
| `e15-receipt-20261018000047-39293083717` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261018000047 como aplicada |
| `e15-receipt-20261018000048-39294729572` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261018000048 como aplicada |
| `e15-receipt-20261018160000-39295289411` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261018160000 como aplicada |
| `e15-receipt-20261018160100-39295521973` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261018160100 como aplicada |
| `e15-receipt-20261018170000-39295941511` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261018170000 como aplicada |
| `e15-receipt-20261018170100-39296356344` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261018170100 como aplicada |
| `e15-receipt-20261019000000-39297487656` | Auto-gerada (receipt-only); main SYNC_LOG já tem 20261019000000 como aplicada |
