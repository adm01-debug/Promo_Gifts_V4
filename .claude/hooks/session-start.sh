#!/bin/bash
# Monta o grafo do código (graphify) nas sessões do Claude Code na nuvem, em segundo plano.
# - Só roda quando CLAUDE_CODE_REMOTE=true.
# - Instala graphifyy na mesma versão do `npm run graphify:refresh` (package.json) e roda as mesmas etapas:
#   update -> enriquecimento TypeScript -> recluster -> pós-processamento do relatório (as 3 últimas só se
#   node_modules/typescript existir; sem ele fica o grafo do `graphify update .`).
# - Pula se o grafo já foi gerado para o mesmo HEAD, o mesmo estado de arquivos não commitados e a mesma
#   disponibilidade do TypeScript (instalar node_modules depois refaz o build completo).
# - Não suja o git: cada saída versionada (GRAPH_REPORT.md, manifest.json) volta ao conteúdo de antes da
#   execução — limpa volta ao commit, editada volta à edição, apagada continua apagada — inclusive se o
#   build falhar (trap EXIT).
#   graphify-out/ é conteúdo gerado (scripts/check-generated-files-protected.mjs): não se edita à mão.
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
MARCA=graphify-out/.session-built-state
exec >>"$LOG" 2>&1
echo "== $(date -u +%FT%TZ) session-start (graphify $GRAPHIFY_VERSION)"
# Uma sessão por vez: a segunda espera a primeira e, se o grafo ficou pronto, pula na checagem abaixo.
exec 9>graphify-out/.session-start.lock
flock 9

# Estado = HEAD + CONTEÚDO das mudanças não commitadas fora de graphify-out/ (diff dos rastreados + hash dos novos).
estado() {
  {
    git rev-parse HEAD
    git diff HEAD --binary -- . ':(exclude)graphify-out'
    git ls-files -z --others --exclude-standard -- . ':(exclude)graphify-out' | xargs -0 -r sha256sum
    # build sem TypeScript (node_modules ainda sem instalar) e build completo são estados diferentes
    if [ -d node_modules/typescript ]; then echo ts=sim; else echo ts=nao; fi
  } | sha256sum | cut -d' ' -f1
}
ESTADO="$(estado)"
if [ -f graphify-out/graph.json ] && [ "$(cat "$MARCA" 2>/dev/null)" = "$ESTADO" ]; then
  echo "grafo já está no estado atual ($ESTADO) — nada a fazer"
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

# Guarda o conteúdo de cada saída versionada antes do build e devolve no fim (sucesso ou falha).
BACKUP="$(mktemp -d)"
VERSIONADOS=(graphify-out/GRAPH_REPORT.md graphify-out/manifest.json)
for f in "${VERSIONADOS[@]}"; do
  if [ -f "$f" ]; then cp -p "$f" "$BACKUP/$(basename "$f")"; else touch "$BACKUP/$(basename "$f").ausente"; fi
done
restaurar() {
  for f in "${VERSIONADOS[@]}"; do
    if [ -f "$BACKUP/$(basename "$f")" ]; then cp -p "$BACKUP/$(basename "$f")" "$f"; fi
    # não existia antes (apagado na sessão): o build não ressuscita
    if [ -f "$BACKUP/$(basename "$f").ausente" ]; then rm -f "$f"; fi
  done
  rm -rf "$BACKUP"
}
trap restaurar EXIT

# O manifest versionado volta ao commit no fim, mas o graph.json local continua: a próxima atualização
# incremental precisa do manifest que acompanha ESTE graph.json, senão não percebe arquivo apagado.
MANIFEST_SESSAO=graphify-out/.session-manifest.json
if [ -f "$MANIFEST_SESSAO" ] && [ -f graphify-out/graph.json ] && ! [ graphify-out/graph.json -nt "$MANIFEST_SESSAO" ]; then
  cp -p "$MANIFEST_SESSAO" graphify-out/manifest.json
fi

PYTHONHASHSEED=0 graphify update .
if [ -d node_modules/typescript ]; then
  node scripts/graphify/enrich-typescript-references.mjs
  graphify cluster-only . --graph graphify-out/graph.json --no-viz
  node scripts/graphify/postprocess-report.mjs
else
  echo "node_modules/typescript ausente — sem enriquecimento TS (rode npm install e a próxima sessão completa)"
fi

# cópia sem -p: data nova, depois de todas as etapas que reescrevem o graph.json
cp graphify-out/manifest.json "$MANIFEST_SESSAO"
echo "$ESTADO" > "$MARCA"
echo "grafo pronto no estado $ESTADO ($(git rev-parse --short HEAD))"
