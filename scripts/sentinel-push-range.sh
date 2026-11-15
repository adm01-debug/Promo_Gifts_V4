#!/usr/bin/env bash
# Print the commits that the Branch Protection Sentinel must audit for a push.
# First-parent traversal preserves every commit added to the target branch while
# avoiding commits from a PR's side branch, which were reviewed before merge.

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "ERRO: uso: $0 <PUSH_BEFORE_SHA> <PUSH_AFTER_SHA>" >&2
  exit 2
fi

PUSH_BEFORE="$1"
PUSH_AFTER="$2"

for SHA in "$PUSH_BEFORE" "$PUSH_AFTER"; do
  if [[ ! "$SHA" =~ ^[[:xdigit:]]{40}$ ]]; then
    echo "ERRO: SHA inválido: $SHA" >&2
    exit 2
  fi
  if ! git cat-file -e "${SHA}^{commit}" 2>/dev/null; then
    echo "ERRO: commit não encontrado: $SHA" >&2
    exit 2
  fi
done

if ! git rev-list --first-parent "$PUSH_AFTER" | grep -Fx -- "$PUSH_BEFORE" >/dev/null; then
  echo "ERRO: PUSH_BEFORE não está na cadeia first-parent de PUSH_AFTER; auditoria interrompida." >&2
  exit 3
fi

COMMITS=$(git rev-list --first-parent --reverse "${PUSH_BEFORE}..${PUSH_AFTER}")
if [[ -z "$COMMITS" ]]; then
  echo "ERRO: o intervalo do push não contém commits para auditar." >&2
  exit 3
fi

printf '%s\n' "$COMMITS"
