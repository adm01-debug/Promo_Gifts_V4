# Auditoria das branches — 2026-11-15

Para que ninguém perca trabalho de outro agente de IA. Tudo aqui tem prova: ou
`arquivo:linha` da `main`, ou hash de blob, ou saída de consulta no banco.

## O que foi verificado

| Conjunto | Verificadas | Com linhas fora da `main` | Tocam produção | Só relatório/gerado |
|---|---|---|---|---|
| Branches que existem no GitHub | 165 | 149 | 112 | 37 |
| Branches já apagadas (commits ainda neste clone) | 363 | 254 | 148 | 106 |

Método: para cada branch, `merge-base` real contra `origin/main` (histórico
aprofundado para 2251 commits), diff `-U0`, e cada linha adicionada procurada no
mesmo arquivo em `origin/main`. "Linha fora da `main`" é indicador cru, não
veredito: linha reescrita ou reformatada também aparece lá. O veredito de cada
branch saiu de leitura do diff real.

## Arquivos

- `VEREDITOS_165_BRANCHES.md` — o que resgatar, o que já está na `main`, o que
  descartar e o que depende de decisão do dono.
- `veredito_lote00..05.md` — dossiê por lote, com as provas.
- `linha-a-linha-165-existentes.psv` — a medição crua das 165.
- `linha-a-linha-363-apagadas.psv` — a medição crua das 363 apagadas.
- `363-apagadas-sha-para-restaurar.psv` — nome e SHA de ponta de cada branch
  apagada. **Qualquer uma volta com um push**, enquanto os commits existirem em
  algum clone. Nada foi perdido.

## As 11 branches 100% dentro da `main`

Nenhuma linha adicionada por elas está fora da `main`. São as únicas candidatas
seguras a exclusão, e mesmo assim nada foi apagado sem o dono dizer:

```
claude/fix-e2e-kit-builder-etapas-261114-0735
claude/fix-links-publicos-mortos-261101-2156
claude/fix-logo-cores-tecnica-261114-2300
claude/verify-logo-cores-261114-2359
computador_local
importado/vps-fabrica/v2/s47-generatebutton-2610081950
importado/vps-fabrica/v2/s47-savetemplatedialog-2610081950
importado/vps-fabrica/v2/s74-2610081948
integra/vps-testes-docs
```
Mais `contexto` e `gh-pages`, que são branches geradas e não têm base comum.

## Três branches que NÃO devem ser mergeadas, apesar de incorporadas

- `claude/infra-workflows-supersede-3525-261114-1740` — reverteria a remoção do
  gate `environment: production` decidida pelo dono em 2026-11-14.
- `fix/gate-e40-cron-seed-261028` — corrompe 4 expressões do parser de
  dollar-quote em `scripts/drift-baseline.mjs`.
- `claude/fix-pr3305-duplicate-ref-261109-0623` — tira os acentos das mensagens
  que o vendedor lê.
