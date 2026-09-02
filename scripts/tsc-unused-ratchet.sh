#!/usr/bin/env sh
# scripts/tsc-unused-ratchet.sh
#
# Ratchet para noUnusedLocals: falha se a contagem de erros crescer além da baseline.
# Não exige corrigir as ~48k ocorrências existentes de uma vez — apenas impede regressão.
#
# Uso:
#   sh scripts/tsc-unused-ratchet.sh           # verifica contra .tsc-ratchet-baseline
#   sh scripts/tsc-unused-ratchet.sh --update  # atualiza baseline com o valor atual

BASELINE_FILE=".tsc-ratchet-baseline"

count=$(npx tsc --noUnusedLocals --noEmit 2>&1 | grep -c "error TS" || true)

if [ "$1" = "--update" ]; then
  echo "$count" > "$BASELINE_FILE"
  echo "Baseline atualizada: $count erros noUnusedLocals"
  exit 0
fi

if [ ! -f "$BASELINE_FILE" ]; then
  echo "ERRO: $BASELINE_FILE não encontrado. Execute com --update para criar."
  exit 1
fi

baseline=$(cat "$BASELINE_FILE")

if [ "$count" -gt "$baseline" ]; then
  echo "FALHA noUnusedLocals ratchet: $count erros (baseline: $baseline)"
  echo "Novos erros introduzidos: $((count - baseline))"
  echo "Corrija as variáveis/imports não utilizados ou atualize a baseline com --update."
  exit 1
else
  echo "OK noUnusedLocals ratchet: $count erros (baseline: $baseline)"
  if [ "$count" -lt "$baseline" ]; then
    echo "Melhoria detectada! Atualize a baseline: echo $count > $BASELINE_FILE"
  fi
  exit 0
fi
