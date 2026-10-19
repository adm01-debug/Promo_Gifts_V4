# E058 — Relatório de Duplicatas de Versão em supabase/migrations/

Data: 2026-10-18  
Total de grupos com versão duplicada: 31  
Total de arquivos que precisam ser renomeados: ~40

## Status

**Parcialmente resolvido:** o grupo `20260611120000` (3 arquivos) foi resolvido manualmente.
Os demais 30 grupos aguardam execução do rename script (requer permissão de `mv` em supabase/migrations/).

## Como resolver os restantes

```bash
# Para cada grupo de duplicatas, renomear os arquivos extra com versão +1, +2 etc.
# Exemplo para 20260618000001:
cd supabase/migrations/
ls 20260618000001*.sql
git mv 20260618000001_<segundo-arquivo>.sql 20260618000002_<segundo-arquivo>.sql
```

## Grupos duplicados restantes (30 grupos)

```
20260611120100 (2 files)
20260611120200 (2 files)
20260611120300 (2 files)
20260611120400 (2 files)
20260618000001 (2 files)
20260618160000 (2 files)
20260619000001 (4 files)
20260619000002 (2 files)
20260619000003 (2 files)
20260619100000 (2 files)
20260620000001 (2 files)
20260620150000 (2 files)
20260620160000 (4 files)
20260620170000 (3 files)
20260620190000 (4 files)
20260621000000 (2 files)
20260621100000 (2 files)
20260621120000 (2 files)
20260621210000 (2 files)
20260622130000 (2 files)
20260623000001 (2 files)
20260623120000 (2 files)
20260623130000 (2 files)
20260716000041 (2 files)
20260716000042 (2 files)
20260716000043 (2 files)
20260716000044 (2 files)
20260716000045 (2 files)
20260716000046 (2 files)
20260610120000 (2 files)
```

## Verificação após resolver

```bash
ls supabase/migrations/*.sql | grep -oE '[0-9]{14}' | sort | uniq -d | while read v; do
  count=$(ls supabase/migrations/${v}*.sql 2>/dev/null | wc -l)
  if [ "$count" -gt 1 ]; then echo "DUP: $v ($count files)"; fi
done | wc -l
# Deve retornar 0
```
