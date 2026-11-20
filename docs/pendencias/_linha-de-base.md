# Linha de base técnica — main (2026-11-20)

- **Typecheck**: `tsc` exit 0.
- **Lint**: exit 0 (sem regressão; ratchets de `as` e file-size verdes).
- **Testes**: 1726 arquivos passam / 1 falha isolada (identificando — ver _achados.md). 32835 testes passam.
- **CI main**: Gate Final - Deploy Ready vermelho por usuário E2E inválido (A08 10.0) — herdado, não desta sessão.
- **Policies baseline**: 1030 policies conferem (sha256 6363a6598c1a) — seed 2026-11-20 inclui as 4 de quote_comments.
- **DDL aplicado**: migration 20261120180000 (quote_comments) em produção, recibo #3946.
