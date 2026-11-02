#!/bin/bash
# Monta o grafo do código (graphify) nas sessões do Claude Code na nuvem, em segundo plano.
# - Só roda quando CLAUDE_CODE_REMOTE=true.
# - Instala graphifyy na mesma versão do `npm run graphify:refresh` (package.json).
# - Pula se graphify-out/graph.json já foi gerado no commit atual.
# - Não suja o git: GRAPH_REPORT.md/manifest.json versionados voltam ao estado anterior;
#   o commit do grafo local fica em graphify-out/.session-built-commit (ignorado pelo .gitignore).
# Log: graphify-out/.session-start.log
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Assíncrono: a sessão começa sem esperar os ~3 min do grafo.
echo '{"async": true, "asyncTimeout": 900000}'

cd "${CLAUDE_PROJECT_DIR:-.}"
GRAPHIFY_VERSION="0.9.91"
export PATH="$HOME/.local/bin:$PATH"
mkdir -p graphify-out
LOG=graphify-out/.session-start.log
MARCA=graphify-out/.session-built-commit
exec >>"$LOG" 2>&1
echo "== $(date -u +%FT%TZ) session-start (graphify $GRAPHIFY_VERSION)"

HEAD_SHA="$(git rev-parse HEAD)"
if [ -f graphify-out/graph.json ] && [ "$(cat "$MARCA" 2>/dev/null)" = "$HEAD_SHA" ]; then
  echo "grafo já está no commit $HEAD_SHA — nada a fazer"
  exit 0
fi

if ! graphify --version 2>/dev/null | grep -qx "graphify $GRAPHIFY_VERSION"; then
  if command -v uv >/dev/null 2>&1; then
    uv tool install --force "graphifyy==$GRAPHIFY_VERSION"
  else
    python3 -m pip install --user --quiet "graphifyy==$GRAPHIFY_VERSION"
  fi
fi
graphify --version

VERSIONADOS="graphify-out/GRAPH_REPORT.md graphify-out/manifest.json"
LIMPOS=0
# shellcheck disable=SC2086
git diff --quiet -- $VERSIONADOS && LIMPOS=1

PYTHONHASHSEED=0 graphify update .

if [ "$LIMPOS" = 1 ]; then
  # shellcheck disable=SC2086
  git checkout -- $VERSIONADOS
fi
echo "$HEAD_SHA" > "$MARCA"
echo "grafo pronto no commit $HEAD_SHA"
