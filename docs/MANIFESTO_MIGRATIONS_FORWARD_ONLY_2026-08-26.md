# Manifesto de migrations forward-only — reconciliação local × ledger documentado

> **Data da medição:** 2026-08-26<br>
> **Projeto canônico:** `doufsxqlfjyuvxuezpln`<br>
> **Branch/worktree:** `codex/stabilization-100` em `/tmp/promo-gifts-codex-stabilization-20260826`<br>
> **Commit-base:** `0660b3ef9ee324cbcd59b327ea8d599a55d2e22c`<br>
> **Árvore Git de `supabase/migrations`:** `7e5ac5b94886a8221a5b91e1738b41d486e3b69f`<br>
> **Escopo:** etapas 81–84 do plano de 100 etapas; análise local e de evidências já versionadas<br>
> **Método:** somente leitura; nenhuma consulta remota, DDL, DML, migration, rename, delete, deploy ou alteração de arquivo SQL<br>
> **Aprovação DBA:** **PENDENTE**

## Parecer executivo

O diretório local não é uma fila replayável de migrations. Ele é um arquivo histórico heterogêneo, com 1.673 arquivos, 37 versões colidentes, 33 arquivos sem versão inicial, 13 hashes de conteúdo repetidos e pelo menos um arquivo local posterior ao último registro vivo documentado. O ledger, por sua vez, tem 2.354 versões distintas, mas a listagem completa `version/name/statements` não está versionada no repositório. Portanto, a equivalência integral pedida na etapa 81 **não pode ser concluída honestamente apenas com os documentos atuais**.

O que este manifesto fecha com evidência local é:

- fingerprint íntegro e reproduzível dos 1.673 arquivos;
- inventário completo das 37 colisões e dos 33 nomes sem versão;
- classificação completa dos 13 grupos de conteúdo duplicado;
- reconciliação conceitual das referências quebradas do gate atual;
- política de transição e de corte forward-only sem reescrever a história;
- lacunas exatas que ainda exigem export somente leitura do ledger e aprovação DBA.

O número histórico de “27 referências ausentes” está defasado. Na árvore medida, o gate encontra **36 ocorrências**, correspondentes a **32 pares únicos `arquivo-origem ↔ alvo` e 22 alvos distintos**: 22 pares já estão na baseline e dez são novos. A maioria possui destino local identificável ou foi arquivada; o gate está misturando referências realmente ausentes com abreviações, artefatos gerados e drafts movidos.

## 1. Fontes e limites probatórios

Foram reconciliadas estas fontes versionadas:

- `docs/SCHEMA_REFERENCE.md`, fotografia de 2026-07-16;
- `docs/estado/13_RUNTIME_BANCO.md`, medição viva de 2026-08-16;
- `docs/AUDITORIA_EXAUSTIVA_E_PLANO_100_ETAPAS_2026-08-26.md`;
- `docs/SIMULACAO_CENARIOS_FALHAS_GAPS_2026-08-26.md`;
- `docs/redeploy/REDEPLOY-FASE1-MIGRATION-SYNC.md`;
- `docs/redeploy/REDEPLOY-T3-MIGRATIONS-AUDIT.md`;
- `docs/adr/0006-migration-baseline.md`;
- `docs/DEPLOYMENT.md`, `CONTRIBUTING.md` e `.migration-refs-baseline.json`;
- conteúdo e histórico Git dos arquivos locais em `supabase/migrations`.

Os documentos têm datas e universos diferentes. Seus totais antigos — 209/332, aproximadamente 685/710 e 2.354/1.672 — são fotografias históricas, não valores concorrentes para o mesmo instante. A medição local deste manifesto é 2.354 versões vivas **documentadas** versus 1.673 arquivos locais **observados**. O arquivo adicional em agosto explica a passagem local de 1.672 para 1.673.

Não está versionado um dump completo do ledger com as 2.354 linhas nem seus `statements`. Por isso:

- igualdade de número não prova igualdade de SQL;
- ausência do número no nome local não prova ausência do efeito no banco;
- existência de objeto no catálogo não prova qual migration o criou;
- comentário “Applied” dentro do arquivo não prova registro no ledger;
- este manifesto não marca nenhum arquivo como seguro para aplicação ou exclusão.

## 2. Inventário local e fingerprints

| Medida | Resultado |
|---|---:|
| Arquivos `.sql` | 1.673 |
| Com prefixo numérico | 1.640 |
| Com timestamp inicial de 14 dígitos | 1.607 |
| Com prefixo numérico fora do padrão de 14 dígitos | 33 |
| Sem versão numérica inicial | 33 |
| Versões iniciais distintas | 1.581 |
| Valores de versão colidentes | 37 |
| Arquivos excedentes dentro das colisões | 59 |
| Grupos de conteúdo exatamente duplicado | 13 |
| Arquivos cobertos pelos grupos duplicados | 74 |
| Conteúdos SHA-256 distintos | 1.612 |
| Arquivos menores que 100 bytes | 31 |

### 2.1 Raiz criptográfica do inventário

Cada arquivo foi lido em bytes e hasheado com SHA-256. As linhas canônicas são ordenadas por path e têm o formato produzido por `sha256sum`: `<sha256><dois espaços><path>`. O SHA-256 da concatenação dessas 1.673 linhas é:

```text
cdb0ba68bfbf35fe6aa07792251d202e888e963fc7b61a9c16f644dd1891b7eb
```

Reprodução, a partir da raiz do repositório:

```bash
find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | sha256sum
```

Essa raiz detecta qualquer mudança de bytes, inclusão, exclusão ou rename no conjunto. Ela não afirma equivalência semântica com o ledger.

O inventário individual completo está em `docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json` (schema 2; SHA-256 do próprio JSON `e13d4655a33424d1c617296bd27d259b132ee6ac48f7808685b6b177460239cf`). Para cada arquivo ele registra hash bruto, hash lexical normalizado, versão declarada, colisão, duplicidade, sinais de efeito/precondição, schemas e objetos qualificados referenciados. Esses campos são análise lexical conservadora, não parse PostgreSQL nem autorização de execução.

### 2.2 Distribuição temporal local

| Prefixo | Arquivos |
|---|---:|
| 2024-12 | 2 |
| 2025-01 | 24 |
| 2025-12 | 54 |
| 2026-01 | 15 |
| 2026-02 | 22 |
| 2026-03 | 165 |
| 2026-04 | 246 |
| 2026-05 | 421 |
| 2026-06 | 580 |
| 2026-07 | 105 |
| 2026-08 | 1 |
| Sem `YYYYMM` inicial | 38 |

O único arquivo de agosto é `20260826000000_roboflow_credentials.sql`, SHA-256 `8c6fce74ad3088b1645ad4c3efe7c13a58cf6f0680dd4d0e78001dfda4e443bd`. Ele faz três upserts em `integration_credentials`. A evidência versionada afirma que o último ledger vivo era `20260718135800` e que não havia aplicação em agosto até 2026-08-16. Logo, este arquivo é **local-posterior / aplicação não verificada** e permanece congelado; não deve ser inferido como pendente nem aplicado.

## 3. Equivalência com o ledger: o que está provado

### 3.1 Contorno documentado

| Evidência | Resultado | Confiança |
|---|---|---|
| Ledger vivo em 2026-08-16 | 2.354 versões distintas, de `001` a `20260718135800` | Alta; medição documentada via `supabase_migrations` |
| Local neste manifesto | 1.673 arquivos e 1.581 versões iniciais distintas | Alta; leitura integral local |
| Julho/2026 | 152 versões vivas; 150 ausentes do conjunto de versões local; apenas duas interseções | Alta para IDs; não mede equivalência de conteúdo |
| Cinco amostras ledger-only | `20260703151305`, `20260710111116`, `20260716125144`, `20260717120020`, `20260718135800` não aparecem no repo | Alta para ausência do ID/conteúdo versionado conhecido |
| Migrations hardening de 16/07 | efeitos dos arquivos locais `...000001` a `...000011` foram reportados como aplicados | Média/alta para efeito; ID exato do ledger não foi versionado |
| Migration RLS de 12/07 | zero de seis policies e um de três índices nomeados existem no catálogo auditado | Alta para efeito ausente/parcial; proveniência não resolvida |

### 3.2 Casos nomeados com ledger e arquivo local

Os documentos registram estes nove IDs como entradas vivas e hoje há arquivo local com o mesmo prefixo. Isso é evidência de identidade nominal, não necessariamente de bytes idênticos:

| Versão | Arquivo local | SHA-256 | Fidelidade documentada |
|---|---|---|---|
| `20260511200038` | `20260511200038_create_painel_cotacoes_schema.sql` | `61a8fb1cd1faacc0c62979d71a7da99da93473879ecf9cd16203d6609802b9bf` | Cópia de `statements[1]` |
| `20260511200056` | `20260511200056_create_painel_users.sql` | `f32bc53cd57818a69efe0fb2459be40007735ace6d519906935a225df318880e` | Reconstrução segura; senha original não foi preservada |
| `20260512163615` | `20260512163615_onda3_tracking_e_nf.sql` | `aa82ba0375df3ca22e9fbc911f7e965470e55528c0d61a9e9e85fe930d834eec` | Cópia de `statements[1]` |
| `20260512163629` | `20260512163629_onda3_storage_recibos.sql` | `7583906028ddfcc09c66ea00fc6ddce48260ceb48dcce0a9b9f6113c87f97a06` | Cópia de `statements[1]` |
| `20260512164738` | `20260512164738_onda3_simplifica_nf_e_retry.sql` | `7cb68e995d71b6e085ff08a17e451d8895056d97582b6b1a5e72158f77c508ac` | Cópia de `statements[1]` |
| `20260512201500` | `20260512201500_t15_fix_system_health_dashboard_exposure.sql` | `651fd2d0c1f295e13c27f2883054a777eada409092f3998d74cb0f2e2a488260` | Cópia de três statements |
| `20260512201600` | `20260512201600_t16_move_backup_tables_to_schema_backup.sql` | `1aea985acc31ffd349ae8b4924333b7fbcfe3d4f5d351661952af10d6394993b` | Reconstrução a partir do efeito; ledger guardou resumo inválido |
| `20260512201700` | `20260512201700_t17_fix_function_search_path_mutable_22_funcs.sql` | `e9448e224872d75142f4be66035fd8a66dabc0e0fbe6debe8ab8f5fae6bf713c` | Stub; os 22 `ALTER FUNCTION` não foram recuperados |
| `20260620110923` | `20260620110923_security_advisors_remediation_rls_initplan.sql` | `3404efea6ef616cf9a356a89e19a6c0385e96c6bbda3a0024ba6a36ec2637897` | Documento afirma aplicação e versão exata |

Conclusão: mesmo nos casos nominalmente ligados, quatro classes coexistem — cópia, reconstrução, substituição deliberada e stub. Um comparador futuro precisa registrar `fidelidade`, não apenas `version`.

### 3.3 Estado da etapa 81

- [x] Inventário e hash de todo o lado local.
- [x] Contorno e amostras de ledger extraídos de evidência versionada.
- [x] Casos nominais conhecidos classificados por fidelidade.
- [ ] Export completo somente leitura das 2.354 linhas: `version`, `name`, ordem dos `statements` e hash por statement.
- [ ] Matching de conteúdo normalizado e matching de efeito para cada linha.
- [ ] Revisão DBA dos matches ambíguos.

**Resultado:** etapa 81 está **parcial por ausência de evidência versionada**, não por falha de análise local. Não existe base probatória para produzir 2.354 linhas de equivalência sem consultar/exportar o ledger.

### 3.4 O histórico local contém criação explícita de aliases no ledger

Dois arquivos contêm escrita direta em `supabase_migrations.schema_migrations`:

| Arquivo | SHA-256 | Efeito no ledger declarado pelo próprio SQL |
|---|---|---|
| `20260605110225_bug4_supplier_settings_and_cleanup.sql` | `defd611d4f2ab66260f2c3b53b992f2d6ddf3af0f9de38f5141e743c999c1110` | insere dois IDs locais (`20260604220000`, `20260604221000`) como aliases de efeitos que o comentário diz já aplicados sob `20260604214100` e `20260604214243` |
| `20260605150000_register_repo_versions_in_db.sql` | `88d5608132520396e5c06feeb796904ec3b711ba28c8dd1219feb15c80327669` | insere onze IDs locais adicionais para efeitos aplicados sob outros onze timestamps MCP |

O segundo arquivo documenta explicitamente os pares:

```text
20260605001811 -> 20260605120000
20260605001830 -> 20260605120100
20260605001850 -> 20260605120200
20260605001911 -> 20260605120300
20260605001917 -> 20260605120400
20260605002044 -> 20260605001000
20260605010642 -> 20260605130000
20260605010707 -> 20260605130100
20260605011613 -> 20260605140000
20260605012231 -> 20260605141000
20260605110418 -> 20260605110225
```

Essas 13 inserções propostas usam somente `version/name` e `ON CONFLICT DO NOTHING`; não preservam o SQL executado no campo `statements`. As fontes versionadas não provam quantas delas efetivamente persistiram ou já colidiram. Elas provam, porém, que o processo local foi desenhado para duplicar IDs de efeitos já aplicados. O export integral deve procurar esses 13 candidatos e marcá-los como `alias` quando presentes. Portanto, `count(ledger)` versus `count(files)` não mede drift sem agrupar aliases e hashes de efeito. Também seria perigoso “reparar” o ledger novamente: linhas confirmadas devem ser preservadas como evidência, nunca executadas como DDL nem apagadas para ajustar contagens.

## 4. Colisões de versão

Cada linha abaixo contém um hash de grupo calculado sobre as linhas completas `<sha256>  <path>\n`, em ordem de filename. Os hashes de arquivo são exibidos com 12 dígitos para leitura; a raiz integral da seção 2.1 ancora os hashes completos.

| Versão declarada | Arquivos | SHA-256 do grupo | Membros (`hash-prefix` + filename) |
|---|---:|---|---|
| `20260602` | 4 | `de780fc4341c2731ab5788bc9c8de50b7dc6432fec89e36c8ec33ff397d81cd3` | `c2170ac7fb34` 20260602_001_add_fk_indexes_critical.sql<br>`4b33fe48f4be` 20260602_002_fix_cron_jobs_never_ran.sql<br>`be9141708643` 20260602_003_log_retention_policy.sql<br>`0f70bf880026` 20260602_004_remove_unused_indexes_safe.sql |
| `20260610120000` | 2 | `a67373ef0e97ea11857cad43f214341472699dcb96f5986f6251597075bad496` | `dd0b5e3b6a73` 20260610120000_restore_generated_mockups_geometry_columns.sql<br>`110f3c7c6eb8` 20260610120000_silver_depara_01_apply_transform_color_resolver.sql |
| `20260611120000` | 3 | `fd0f70a6246b02e7c2693e7f81d67fb1d3828130afafe9cbbc3ea2b5e8aa975e` | `5edbc8e21058` 20260611120000_fase9_01_cron_promotes_orphan_standardized.sql<br>`186302d1a0d0` 20260611120000_fix_standardize_variant_fcode_fhex_swallowed_by_comment.sql<br>`c99050250f83` 20260611120000_v2_01_helpers_display_name_tokenize.sql |
| `20260611120100` | 2 | `11ae9d88b84dc491559d2ca4cad4b85dae28ab04496d1ef5f6a5a8536759f5a8` | `7b599ab98808` 20260611120100_fase9_02_fix_promote_variants_checks_and_orphans.sql<br>`4ae080eec707` 20260611120100_v2_02_fn_enrich_padronizacao.sql |
| `20260611120200` | 2 | `1d727d34d70df5b5a33bfb9d1c885095f5487195ecfa4e9fe01984137666387d` | `b08005ec9a42` 20260611120200_fase9_03_fn_apply_print_profiles.sql<br>`a20c8ca05012` 20260611120200_v2_03_fn_standardize_raw_v3.sql |
| `20260611120300` | 2 | `06197da9175e1051757732ebc4c564339d983436ecd50f96adc0537b471e1a55` | `0ae7b4570d00` 20260611120300_fase9_04_cron_print_profiles.sql<br>`b119d422bb3b` 20260611120300_v2_04_promote_display_name_category_chain.sql |
| `20260611120400` | 2 | `94a5c401014e71a1d77b32270dbab8164eaa51ff8131688544848c755347f9cf` | `7f73aa6a5243` 20260611120400_fase9_05_restore_main_ingestion_cron.sql<br>`9f4d45aa9e68` 20260611120400_v2_05_monitoring_coverage.sql |
| `20260615` | 3 | `9d92b6ec41964c1b37c0294da09487c8c4e8e43f96592e926e5e8c45686d2f84` | `e4c855a9dcf4` 20260615_001_drop_ai_provider_quotas_zombie.sql<br>`0f1b13f0346a` 20260615_002_fix_ai_quota_and_cache_bugs.sql<br>`57b5b9c705ac` 20260615_fix_asia_product_names_cleanup.sql |
| `20260618000001` | 2 | `2043ffe585b316f489838265bd3ebe0ef5b4c46e7b2d61761fafc87e592dfb31` | `e64cfebe29c2` 20260618000001_create_rpc_get_catalog_bestseller_page.sql<br>`61f1b9098b3c` 20260618000001_link_unlinked_content_hash_dupes.sql |
| `20260618160000` | 2 | `66ef30ec37e041d75bcdd9a1af8d5800845aa5fb7e6b90f826adbbb49f9ad001` | `7c21a7beb717` 20260618160000_fn_super_filtro_add_endomarketing.sql<br>`d3fabd8d0c7b` 20260618160000_revoke_all_view_write_grants_bulk.sql |
| `20260619000001` | 4 | `f840a85e828356b0357f3c4bdf0b7eba76f5fbd3259dfe29beb29f77964c5223` | `b4e21e1d00bb` 20260619000001_fix_fn_get_product_intelligence_all_gap2.sql<br>`d91f7668751d` 20260619000001_fix_is_shared_on_canonical_null.sql<br>`60ad03b5d5a0` 20260619000001_mockup_bug_fixes_logo_url_nullable_position_precision.sql<br>`f1dee2e4f7a2` 20260619000001_mv_leaf_covering_index_safe_idx.sql |
| `20260619000002` | 2 | `71d7957f609026b0eda09c411c030bbae1fd0be0508ca14bdb27624aa6c3a29e` | `c2119105602e` 20260619000002_fix_canonical_root_soft_delete.sql<br>`db1af0936f2c` 20260619000002_mockup_composite_index_user_created.sql |
| `20260619000003` | 2 | `0b7ab95e11f960631d9073788f85a5495d9f958397bf80e0691abdd23850d6ee` | `46179e0b7cec` 20260619000003_add_keyset_pagination_indexes.sql<br>`08e2e9825449` 20260619000003_close_gaps_and_harden_triggers.sql |
| `20260619100000` | 2 | `6d976954a4897ae060679e7475f109c08513da9646c43f4eeea20c9f8d8a750e` | `82ba7b1a6bb2` 20260619100000_fix_quotes_contact_id_and_index.sql<br>`d67819b000bf` 20260619100000_fix_reposicao_rpcs.sql |
| `20260620000001` | 2 | `e8b9c24abc4e0fec187ecdc784ba67cd867ff86b3393b9e2552da27e6d772999` | `4affb500bff9` 20260620000001_fix_c07_new_chain_violations.sql<br>`2215df46c0db` 20260620000001_mockup_client_logo_rotation_cols.sql |
| `20260620150000` | 2 | `ec18d97b1ab26edf0f0417ae1839a4acf67160a1dfabf0b05df64d73d494a1a9` | `e4fbc2e46264` 20260620150000_faxina_tier1_archive_orphan_tables.sql<br>`eb97f2f0985c` 20260620150000_fix_catalog_critical_bugs.sql |
| `20260620160000` | 4 | `9c9b00ca96ba47eba96e46ba5f313f0b99becd2e92cd0f044b0848106363e408` | `6b1ee0bf6272` 20260620160000_comparador_hardening.sql<br>`ca82040ec42e` 20260620160000_faxina_tier3_archive_dead_views.sql<br>`a6b26cc6e824` 20260620160000_fix_favorites_bugs_all.sql<br>`e9e07aa5a8f9` 20260620160000_fix_update_quote_client_cnpj_clearable.sql |
| `20260620170000` | 3 | `00203ca5d43044b0d825686af2ab6de8da600b5e2fad8201b8104fe13f5a2899` | `fae5acda9611` 20260620170000_faxina_tier3c_archive_safe_utility_functions.sql<br>`914ff309ad76` 20260620170000_fix_favorites_gaps_11_12.sql<br>`9d7d1d3d027a` 20260620170000_fix_update_quote_contact_fields_clearable.sql |
| `20260620190000` | 4 | `75818a7f23f11123d0627fe936fc9a8ca94de036c02f527100e663e99b14f2ef` | `8a4687952a81` 20260620190000_faxina_tier1c_archive_orphan_tables.sql<br>`9677d32b4218` 20260620190000_faxina_tier3b_b1_archive_dead_fns_views.sql<br>`14768a6a2b84` 20260620190000_heal_faxina_live_tables.sql<br>`b21da4ec756a` 20260620190000_reposicao_revoke_anon_grants.sql |
| `20260621000000` | 2 | `4e1404d548a8659a169d71a3d3c419b746b2bc7eea2e4de3016eee677d3f1ab8` | `f2f1344102d1` 20260621000000_fix_favorite_position_race.sql<br>`8ae5c4878e8d` 20260621000000_fix_favorites_security_position.sql |
| `20260621100000` | 2 | `ab1439de416d1b31ae21f06c192e0a4bdc709fd4127c35c9b7235cd9a0aad46b` | `1568a30d6c5c` 20260621100000_faxina_restore_ai_function_routing_and_view.sql<br>`76ad602b2fe9` 20260621100000_restore_broken_trigger_dependencies.sql |
| `20260621120000` | 2 | `c91f08d9c457dbeb5d74ec792cfc65fc474dc46276ae099f69686f29b413926e` | `f2c54d6f2e84` 20260621120000_fix_cron_broken_function.sql<br>`c0405893a365` 20260621120000_reconcile_unarchive_live_rpcs.sql |
| `20260621210000` | 2 | `75a41e30b287a450219fdd210443d051194785bdff2e639d56aaebbd4c680ff5` | `d4d51df917c6` 20260621210000_faxina_complete_archive_restore_11_tables_APLICADO.sql<br>`135083ff319a` 20260621210000_onboarding_auto_assign_org_canonica.sql |
| `20260621` | 5 | `a0bce85ae90eaf3ecb4754e30c5cac0b6e7c945e8aa03c8d1447c128c3c46e4b` | `3c329221131e` 20260621_fix_console_bugs_404_403.sql<br>`5e8e794892c3` 20260621_fix_create_rpc_get_favorite_list_counts.sql<br>`fdab36aaf180` 20260621_fix_create_rpc_get_promo_sales_90d_by_product.sql<br>`90e00bbfa405` 20260621_fix_product_variants_add_next_entry_alias_columns.sql<br>`40dabed1f806` 20260621_fix_rls_coverage_missing_tables.sql |
| `20260622130000` | 2 | `0b0772335ad8ca0a3abbf9e021cc176892612cd77c118b76fc409779b199fd87` | `c801099eeba0` 20260622130000_fix_color_swatches_column_and_view_plus_favorites_grant.sql<br>`f5b6b942603f` 20260622130000_smoke_tests_v30_trends_fix.sql |
| `20260622` | 9 | `8b574233cb300229597f47bb498514e7254cfd64365aa7d387190f7a61a442c8` | `dd69316bf67b` 20260622_ai_usage_logs_hardening_observability.sql<br>`03087c648b9a` 20260622_categories_active_generated_compat.sql<br>`fa011fc1d863` 20260622_color_swatches.sql<br>`5c4d7682b16c` 20260622_drop_categories_active_legacy.sql<br>`8666adc92517` 20260622_fix_categories_active_column_alias.sql<br>`ac4303aa9d3b` 20260622_fix_fn_system_health_summary_security_invoker.sql<br>`eed461688be1` 20260622_get_favorite_list_counts_user_id_overload.sql<br>`833802ca9d12` 20260622_icon_semantic_improvements.sql<br>`a20e2bf92b7f` 20260622_restore_get_favorite_list_counts_noarg.sql |
| `20260623000001` | 2 | `c3d6d33b67858ec6fb0e501f071b9599e4c9743e1c7946454eb04c63e66be805` | `c763dd5c8f62` 20260623000001_fix_gravacao_rpc_grants_and_security.sql<br>`6b2471b5a1c0` 20260623000001_products_name_m1_add_column_comment.sql |
| `20260623120000` | 2 | `28cf42cc55da4be6f3f4f899770ea162b07d171048e71a1a35c8834b46c8fb8d` | `351ed93c4e5d` 20260623120000_fix_get_top_collected_products_security_definer.sql<br>`d4471382d4d3` 20260623120000_harden_get_favorite_list_counts_revoke_anon.sql |
| `20260623130000` | 2 | `52f699757f5de417cae8c2cf0a40d5b08e80b2f399d886d5a8d3a613b90f092d` | `48b46bb9c242` 20260623130000_cart_batch_sort_order_rpc.sql<br>`1b3d4d3d12b5` 20260623130000_fix_restore_trigger_notify_discount_approval.sql |
| `20260623` | 3 | `7dde1ced98f40105ed5a98a15dd9bfc4bf2d16a6fa97253279278213904efdcd` | `287cd8de4014` 20260623_fix_generated_always_columns_batch.sql<br>`281651079504` 20260623_fix_search_analytics_add_seller_id.sql<br>`b42c0e28cdfd` 20260623_fix_search_analytics_seller_id_not_generated.sql |
| `20260712` | 2 | `ce7155b332da256e9497a8ecc561168c32a185d3529e450caae6952e110f0c22` | `fc521ebbe596` 20260712_fix_rls_policies_critical.sql<br>`56f35edd1eeb` 20260712_performance_indexes.sql |
| `20260716000041` | 2 | `b8825c35c581f4579c63e8d8d474012b2e9e0fa14cafb75a665dc61a432bc8c9` | `8081d30f24f1` 20260716000041_fix_fn_super_filtro_cost_price_exposure_and_category_breadcrumb.sql<br>`712b9a8624b9` 20260716000041_revoke_anon_b2b_catalog_secdef_functions.sql |
| `20260716000042` | 2 | `cbc065887ae0bbe90ac469900f08ab469e505e4f396a77741d00ffd60f554030` | `e9699a03fa4e` 20260716000042_dynamic_pin_all_function_search_paths.sql<br>`a528b964f38bd` 20260716000042_fix_fn_global_search_quote_data_exposure.sql |
| `20260716000043` | 2 | `3842090d955828507156482ec64b26b20f0db168ddc83da8224e9fa12fcab653` | `0259464b5dde` 20260716000043_dynamic_security_invoker_remaining_views.sql<br>`c0cd44ea4dc0` 20260716000043_fn_get_similar_products_security_invoker.sql |
| `20260716000044` | 2 | `d54e16980a09d2be05d0fa2279a5c69627f86c8fdc80305927a70bbe3cfcd728` | `bfa384c63ba0` 20260716000044_move_extensions_to_extensions_schema.sql<br>`40f0fbd68575` 20260716000044_revoke_anon_fn_log_search_analytics.sql |
| `20260716000045` | 2 | `d3f10b6f8d315068951b6dc996fd0aef40b459e722e21d9c351371f5a1d03441` | `a4d8ce95e5f4` 20260716000045_dynamic_fix_auth_rls_initplan_remaining.sql<br>`52c167edcf4b` 20260716000045_revoke_anon_catalog_authenticated_only_functions.sql |
| `20260716000046` | 2 | `653c39afc89eda3c2cde197758383480728da1bbcdbc5b2617c528f8585cb378` | `e35b96fd4d9c` 20260716000046_dynamic_enable_rls_remaining_tables.sql<br>`892697ab5343` 20260716000046_revoke_anon_all_remaining_catalog_functions.sql |

### 4.1 Resolução conceitual das colisões

Nenhuma colisão será “corrigida” por rename, exclusão ou alteração de bytes. Cada membro passa a ser identificado historicamente pela tupla imutável:

```text
legacy-artifact-id = declared_version + ':' + sha256 + ':' + filename
```

As versões colidentes deixam de ser interpretadas como uma sequência aplicável. Para reconstrução, cada artefato recebe uma classificação futura: `efeito-confirmado`, `efeito-superado`, `marker`, `ledger-id-divergente`, `conteúdo-desconhecido` ou `não-aplicar`. Somente uma baseline aprovada e migrations posteriores à baseline compõem a sequência replayável.

### 4.2 Estado da etapa 82

- [x] 37 colisões inventariadas e ancoradas por hash.
- [x] Política conceitual sem rename retroativo publicada.
- [x] Freeze preservado.
- [ ] Match de cada membro contra ledger/efeito vivo.
- [ ] Aprovação DBA.

## 5. Arquivos sem versão inicial

Nenhum dos 33 nomes pode ser mapeado a uma versão exata do ledger com a documentação disponível. Trinta e um carregam a data `20260623` apenas no sufixo; dois nem isso. Data de intenção não equivale a ID do ledger.

| Arquivo | Bytes | SHA-256 | Efeito estático principal / proveniência | Ledger |
|---|---:|---|---|---|
| `bronze_stalled_cleanup_20260623.sql` | 371 | `a69b7d636156253876f5a178a61cc1ecfcf5120ae215c61f29e21f30efbcd949` | marker `SELECT 1`; diz que DML foi executada por SQL direto | Não mapeado |
| `create_process_notifications_queue_rpcs_20260623.sql` | 1.916 | `cb782f15e5790a89af938f5aa081fbd4eb5e06da78c77eb298cdccac23bdf29f` | substitui duas funções, update, grants e comments | Não mapeado |
| `cron_p0_disable_webhook_outbox_missing_secret_20260623.sql` | 146 | `91ed7d078558e22a8cf514f63446cdac8bd00584da03be7bb3e7a386bcb077ec` | desativa job 202 via `cron.alter_job` | Não mapeado |
| `fix_rls_head_requests.sql` | 842 | `f6cf36140510e9a27c8a6f76d229e030cbcd029ff1df516bf03b1d5a982fb0c5` | duas policies RLS | Não mapeado |
| `fn_system_health_summary_bughsc1_check2_20260623.sql` | 459 | `a35970480b54c0a11dc471188c67e56978aff80173f9d275f57c53ef87c48e73` | marker `SELECT 1`; diz aplicada via MCP | Não mapeado |
| `gravacao_fix1_dtf_tiers_7_20260623.sql` | 4.013 | `ec3fa0d6bdae95664a96208090e0d90a80fd252635bec9411e7f78bcfe807ec1` | DML de faixas DTF | Não mapeado |
| `gravacao_fix3_personalization_technique_mappings_20260623.sql` | 3.111 | `c847deec23db9dd929003bf382ab8105ead3044598cb2a21eb258d81abd90f33` | função, dois índices, DML e comment | Não mapeado |
| `gravacao_fix4_drop_dead_calculate_personalization_price_20260623.sql` | 302 | `2997d97a96328002f2976e56fad2444b8cef1f4a50f4261e6dd394cb5ed89dbe` | drop de função | Não mapeado |
| `gravacao_fix5_reactivate_hot_stamping_20260623.sql` | 365 | `e8c002569a7d48614457fdaf63cd57f5f205cecb518e563e4b0ab4410138f814` | update | Não mapeado |
| `gravacao_fix6_health_check_p2_warning_20260623.sql` | 5.731 | `045232fcdc5f2c9afc6fa30946e68d7761c98146baa81077af1ee6857e7c076b` | substitui função de health-check | Não mapeado |
| `indexes_3_missing_fk_indexes_20260623.sql` | 268 | `29be663ed73e056ef5ad977c691c2e04fb0151effc9144d984d6f1b2e07a9bcd` | dois índices | Não mapeado |
| `products_1_sku_promo_backfill_and_autosync_trigger_20260623.sql` | 603 | `3f685efe94a9d403e4c87db13d697be032ae15bf71aeaf4cfbfcd605256bc991` | backfill + função/trigger | Não mapeado |
| `products_2c_quality_dashboard_fix2_20260623.sql` | 123 | `99510e5636aad3127932d7f1d179402910920d958b861e4ee599c88e8676d016` | comentário remete à definição viva; não contém efeito | Não mapeado |
| `products_3_new_check_constraints_20260623.sql` | 1.127 | `a01532357e4e5f72f0bf3e00d4b645bbf345f5bb696717f023f272e8c666dea6` | dez `ALTER TABLE` para checks | Não mapeado |
| `products_5_ai_coverage_view_20260623.sql` | 986 | `565430baa8271a1bf0fe3bcfd06f02a9f28262ac06107394c984c715ceeb0f48` | cria/recria view e grant | Não mapeado |
| `products_5_comments_high_null_cols_20260623.sql` | 650 | `e554a252d2457899bb04de766cb6804e1fe53c37639b95d4438b15b633ba78ed` | quatro comments | Não mapeado |
| `products_8_ai_columns_and_table_comment_20260623.sql` | 349 | `d5205af8cae6a543b83216af04e0cbb0b5a5092c1d0afc0887ef8e90ec910bbb` | dois comments | Não mapeado |
| `products_cleanup_7_hard_delete_xbz_manual_v2_20260623.sql` | 506 | `8cedced6d7c6d512410ba9f976c225763e9f0c14bcf90d9aeff4bfab237376ff` | três deletes | Não mapeado |
| `products_comments_core_batch1_20260623.sql` | 576 | `602e9690e8624a89e16f06e164efe12d2259736872d07db689e4f40858af84d4` | cinco comments | Não mapeado |
| `products_dimensions_5_drop_jsonb_column_20260623.sql` | 174 | `e8158e567c2ff965aed3f1ad8ac009d39ea5d4038e3d65b1dc98455f63ebf71e` | drop de coluna | Não mapeado |
| `products_dimensions_b1_backfill_scalars_from_jsonb_20260623.sql` | 1.633 | `16491f2dffbba1e79ba308a7ac16be2e10d608dd7924c60f1a676e72ca244f2f` | backfill e comment | Não mapeado |
| `products_dimensions_d1_add_dimension_source_column_20260623.sql` | 824 | `65627e6ac1e2c4b79decbc3334ee04b0386b2cf25614da558a1a93af3f999ee9` | coluna, backfill, índice e comment | Não mapeado |
| `products_flag_morta_a1_hardening_check_constants_20260623.sql` | 989 | `7f72209f378d36d147c66feb606de2c66982ac9e71f1c2291ede339cf824bd79` | quatro alterações de checks e comments | Não mapeado |
| `products_indexes_8_drop_dead_indexes_20260623.sql` | 795 | `0b38ea5e490b96dbdf1899ffc55e45396798e3cd87b7b879e0ce68f640b073f1` | drop de 12 índices | Não mapeado |
| `products_ncm_6_fix_format_and_comment_20260623.sql` | 526 | `fa7c4248e6c37e5c95db9b7d4cfb974128eeccbd07bb358d35db78131f1bf361` | dois updates e comment | Não mapeado |
| `products_quality_10_sku_promo_constraint_20260623.sql` | 445 | `a1b36ce0ea736fe4d70e743243e33696307293c3122e7936a0486e8d7bd6dd8c` | substitui check e comment | Não mapeado |
| `products_quality_9_is_deleted_hardening_20260623.sql` | 499 | `e60c929e723c0746b5aa6815b9870aa8965ee5c8aa153eb52e788acb77210ed8` | índice e comments | Não mapeado |
| `v_system_alerts_bugalert1_cron_threshold_20260623.sql` | 484 | `16e6f591b132eeebf59dffd42eb797a47431b2be191f19775110a4dbeedd9669` | marker; diz aplicada via MCP | Não mapeado |
| `v_system_alerts_bugalert2_ai_worker_detection_20260623.sql` | 334 | `16cc9077d65d525b39e7d10e6519f46f8b3d582d8c919be181f3d968c84cf7eb` | marker; diz aplicada via MCP | Não mapeado |
| `v_system_alerts_cron_threshold_fix_20260623.sql` | 5.680 | `3d247e432c9f7455910e2771f5cdb0792c643d710d4d560d5f1f7824b66ca4e9` | recria view e comment | Não mapeado |
| `verify_rls_policies.sql` | 2.089 | `e511118418aa21aea30a803ae46417056418e65acd90aa6bcb59f39cb93405a9` | script de verificação; contém rótulos `┌─ Query:` que não são SQL válido | Não é migration aplicável |
| `vpp_4c_expose_ipi_ncm_bitrix_20260623.sql` | 224 | `95ce88aa0adc940e6c923d7dfd1122c27ceccec1d02ae13e29a6e27d1954e4bd` | comentário remete à definição viva; não contém efeito | Não mapeado |
| `vss_2_comment_zero_fill_columns_v2_20260623.sql` | 544 | `2bab3f255207f2e9e7bfb6ea423b7f4ca12e31aaafaeb82a1014aa9ab7d7458c` | três comments | Não mapeado |

### 5.1 Estado da etapa 83

- [x] 33 arquivos inventariados com hash, tamanho e efeito estático.
- [x] Quatro markers que alegam aplicação e dois arquivos sem efeito foram separados de SQL executável.
- [x] O script de verificação não parseável como migration foi identificado.
- [ ] Zero de 33 possui equivalência exata `ledger-version ↔ arquivo` provada pelas fontes atuais.
- [ ] Export do ledger por `name/statements` e matching por hash/efeito.

Não se deve fabricar timestamps retroativos a partir do sufixo `20260623`.

## 6. Conteúdo exatamente duplicado

Duplicidade de bytes não significa lixo. Em 54 dos 74 arquivos, o conteúdo é um marker intencional. Nos outros 20, há dez pares de SQL real; duas versões podem registrar o mesmo efeito aplicado em ambientes ou momentos distintos.

| Grupo | SHA-256 do conteúdo | Arquivos | Classificação |
|---|---|---:|---|
| D01 | `0efd63e832f13f1a62b8d26768264e5f1bbda6a1161c4eb1a9f762ef28aa7278` | 2 | SQL real: fixa `search_path` |
| D02 | `24d14a2fc7d5adfccf30bf736baf1fbfc6f8b79e9f12666c8f1e0393b1166130` | 2 | SQL real: adiciona colunas a `visual_search_feedback` |
| D03 | `28b5f37b91221d50447bfd2715f7f89ea99ae9bda9d62018a4c1a4cf2ed21cf7` | 2 | SQL real: grants/RLS de SPR |
| D04 | `2f44123d29b0a715414ff6ba7f7906b028d8d278db04771b4c95d86bcf953fa4` | 2 | SQL real: drop de tabela backup SPR |
| D05 | `46179e0b7cec51cd877adbaa04917106f81fd4c7e112b2a6a9e4c47949c45283` | 2 | SQL real: índices de keyset |
| D06 | `53effc4d2812af1123f4cece20640d5b72af0f6c39b64817217854ac9b2a3c06` | 2 | SQL real: drop de índice redundante SPR |
| D07 | `560527a55434141f5bcc67521e153fb021f00545283388ea686163ed51aeaa20` | 2 | SQL real: cutover SPR parte 1 |
| D08 | `68d4b215e84d30ab11e4883a76e0d8efc26e412f60a227f0c7fbff8479a77a40` | 2 | SQL real: remove relação de realtime |
| D09 | `8d38ed5e73cade286f1c65c3d565d17ab91d1ad563f8b254ecaff955d980e478` | 2 | SQL real: manutenção/retenção SPR |
| D10 | `8dd7b926d981b0282bbcf528f389dea57cfcec65a9b8859a3edd7b4081eec204` | 38 | marker `SELECT 1` de versão já aplicada fora do repo |
| D11 | `9821d8874af778f63e3b27f2b00b84bfdb8526d964eda0c6641e9661e794e3fa` | 6 | marker de preview preservado |
| D12 | `ca5e87d1b9a3713fcd2f577aebd75628211831cd251e2e6f995d7a25c41fab4a` | 10 | placeholder “aplicada diretamente em produção” |
| D13 | `d274eba637fd24f9e6bcf4287b1d4a1fd05d5b0b2dd906cab1dbde41a1a68f35` | 2 | SQL real: cutover SPR parte 2 |

### 6.1 Membros dos grupos de SQL real

| Grupo | Arquivos |
|---|---|
| D01 | `20260604232535_spr_before_write_search_path.sql`; `20260604233007_spr_before_write_search_path.sql` |
| D02 | `20260526201213_6f3a12ba-7311-4329-8b7a-816cf3be15c5.sql`; `20260526201551_8040d7c1-9323-41b7-a6c8-313e6514f223.sql` |
| D03 | `20260604231631_spr_harden_grants_rls.sql`; `20260604233003_spr_harden_grants_rls.sql` |
| D04 | `20260604231629_spr_drop_bkp_table.sql`; `20260604233002_spr_drop_bkp_table.sql` |
| D05 | `20260619000003_add_keyset_pagination_indexes.sql`; `20260619200000_add_keyset_pagination_indexes.sql` |
| D06 | `20260604231622_spr_drop_redundant_index.sql`; `20260604233001_spr_drop_redundant_index.sql` |
| D07 | `20260604231826_spr_cutover_status_part1.sql`; `20260604233005_spr_cutover_status_part1.sql` |
| D08 | `20260405222509_610eaeb7-2cad-4cf8-aaf9-f4a4be5b9e55.sql`; `20260411210929_9736ba78-4ddb-466f-b54d-c1c5f9d0d35f.sql` |
| D09 | `20260604231642_spr_maintenance_and_history_retention.sql`; `20260604233004_spr_maintenance_and_history_retention.sql` |
| D13 | `20260604232403_spr_cutover_status_part2.sql`; `20260604233006_spr_cutover_status_part2.sql` |

### 6.2 Membros dos grupos marker

<details>
<summary>D10 — 38 markers de versão já aplicada</summary>

```text
20260526020754_fix_339_personalization_missing_columns.sql
20260526021103_quote_update_transactional_rpc.sql
20260526021127_quote_update_transactional_rpc_fix.sql
20260526021742_restore_smoke_test_observability_contract.sql
20260526021803_runtime_edge_function_base_url.sql
20260526021817_colapso_fase6_idle_timeouts_e_log_slow_queries.sql
20260526021833_harden_cron_runtime_secrets_and_acl.sql
20260526021937_corrections_indexes_performance.sql
20260526021947_corrections_trigger_and_rls.sql
20260526022009_corrections_kill_switches.sql
20260526022018_corrections_pg_cron_dedup.sql
20260526022028_corrections_security_definer_search_path.sql
20260526022055_corrections_token_revocation_index.sql
20260526023456_fix_update_quote_transactional_schema_alignment.sql
20260526023514_fix_integration_credentials_index.sql
20260526023523_fix_color_variations_index.sql
20260526023550_fix_user_token_revocations_add_token_columns.sql
20260526153312_webhook_inbound_idempotency_safe_20260526.sql
20260529144551_create_fn_products_enriched_catalog_rpc.sql
20260529152339_drop_fn_products_enriched_revert_pr512.sql
20260529181035_perf_drop_duplicate_indexes.sql
20260529181042_perf_add_missing_fk_indexes.sql
20260529181101_security_revoke_anon_execute_internal_secdef_fns.sql
20260530001559_rest_native_phase2_view_and_rls.sql
20260530001628_fix_v_suppliers_public_grants.sql
20260530003331_fix_anon_read_kit_components_and_material_types.sql
20260530004711_rest_native_phase3_print_areas_and_techniques.sql
20260530005835_cleanup_superseded_select_policies.sql
20260530012039_v_products_public_hide_cost_price.sql
20260530012848_fix_views_revoke_write_permissions.sql
20260530112806_fix_kill_switch_hits_postgrest_visibility.sql
20260530130242_ramo_filho_e_produto_ramo_public_read_and_admin_insert.sql
20260531105322_create_sales_goals_table.sql
20260531105326_create_personalization_simulations_table.sql
20260531105358_create_user_ip_allowlist_table.sql
20260531144122_phase5_security_views.sql
20260601105720_fix_smoke_persist_cron_auth_and_dedup_kill_switch_policies.sql
20260601110040_fix_smoke_persist_cron_auth_and_dedup_kill_switch_policies.sql
```

</details>

<details>
<summary>D11 — seis markers de preview</summary>

```text
20260524120000_preview_marker_preserve_legacy_20260524120000.sql
20260524120100_preview_marker_preserve_legacy_20260524120100.sql
20260524120200_preview_marker_preserve_legacy_20260524120200.sql
20260524120300_preview_marker_preserve_legacy_20260524120300.sql
20260524120400_preview_marker_preserve_legacy_20260524120400.sql
20260524130000_preview_marker_preserve_legacy_20260524130000.sql
```

</details>

<details>
<summary>D12 — dez placeholders de aplicação direta</summary>

```text
20260514233703_applied_to_production.sql
20260514235639_applied_to_production.sql
20260515005303_applied_to_production.sql
20260515005356_applied_to_production.sql
20260515010528_applied_to_production.sql
20260515010546_applied_to_production.sql
20260515013126_applied_to_production.sql
20260515020250_applied_to_production.sql
20260515103945_applied_to_production.sql
20260515104834_applied_to_production.sql
```

</details>

Nenhum membro desses grupos é candidato automático a exclusão. Para um marker, o filename pode ser a única pista local de uma versão viva. Para SQL real, o mesmo efeito pode ter sido executado duas vezes sob IDs diferentes.

## 7. Referências de migration ausentes

### 7.1 Medição correta do gate

| Medida | Valor |
|---|---:|
| Ocorrências em linhas | 36 |
| Pares únicos `origem ↔ alvo` | 32 |
| Alvos distintos | 22 |
| Pares já baselined | 22 |
| Pares novos | 10 |
| Entradas stale na baseline | 0 |

Para não criar novas referências quebradas no próprio manifesto, a tabela separa a raiz do path e o alvo relativo.

### 7.2 Resolução conceitual por alvo

| Raiz | Alvo relativo ausente | Pares | Evidência local | Resolução proposta, sem editar agora |
|---|---|---:|---|---|
| draft | `2026-07-12_magazine_items_unique_product.sql` | 4 | existe em `_archived/`; SHA `adf1b1d560252c85c413952e80068944c8110c99be78727472248446a0ea7e30` | corrigir referências para `_archived/`; não aplicar, pois o README diz “already applied” |
| draft | `2026-07-12_magazine_reader_state.sql` | 1 | existe em `_archived/`; SHA `ee0a58bd84df210dfa78d17f5507fea1c58a371fc90b237fd22a704c6f940d04` | corrigir para `_archived/`; não promover, incompatível com `magazine_token_hash` |
| draft | `2026-07-12_magazines.sql` | 2 | existe em `_archived/`; SHA `02ef04745ac141db80de0f8ce51ce72f1f5d462fada622f6469fec0b1f3ec2a2` | corrigir para `_archived/`; não promover, schema stale |
| draft | `2026-07-15_magazine_public_token_trigger.sql` | 2 | existe em `_archived/`; SHA `ec2abf63889cbf6bc60f589050e94e37b1965e7275ccb99242fdf137fcd35eef` | corrigir para `_archived/`; não aplicar, trigger reportado como já existente |
| draft | `PR_COMMENT.md` | 2 | artefato produzido por script/workflow | tratar como output gerado no gate ou alterar referências para “generated artifact”; não versionar output volátil |
| migration | `_recovery/` | 1 | diretório não existe; referência é histórica | apontar para o documento de recovery real ou registrar explicitamente “artefato não preservado” |
| migration | `README.md` | 5 | arquivo não existe, embora ADR, guia, sessão e teste dependam dele | criar em mudança documental futura como guarda canônica; não inventar conteúdo neste lote |
| migration | `20250103070000` | 1 | corresponde a `20250103070000_complete_catalog_structure.sql`, SHA `2911a7b51cbd267cc66dfffda09cf290bc0d3864c630495db9379edd57b49f0b` | trocar stem incompleto pelo filename real |
| migration | `20251228_audit_trail.sql` | 1 | corresponde a `20251228000001_audit_trail.sql`, SHA `b097620c52e9578841307ad63d75f6e1f17ebdd8cc8827a024eb75318e7ea1cc` | corrigir o timestamp no documento |
| migration | `20260419130037_...sql` | 1 novo | candidato único `20260419130037_5f01e5dd-e3d5-4d26-8a08-328d432a05aa.sql`, SHA `794ffe2872c14e4b84ffd2b8263452f9b0abd53c6c6da5b50a7639f8cad2b17c` | substituir abreviação pelo filename real |
| migration | `20260424154125_...sql` | 1 novo | candidato único `20260424154125_0988f1e1-658b-423c-ae58-d4166a59fc10.sql`, SHA `68084c923b492a23ac9f1e6c3595010c0254e2cccba6b8189c0df1a9a7bba21f` | substituir abreviação pelo filename real |
| migration | `20260524204148_` | 1 novo | candidato único `20260524204148_colapso_p0_kill_switch_table_20260524.sql`, SHA `e7584ea179db399ee2e6232bddafe057819b0b4ae4c6254e296161eaf3c9ef82` | completar filename |
| migration | `20260524210300_` | 1 novo | candidato único `20260524210300_kill_switches_fk_index_and_policy_consolidation.sql`, SHA `a625d793946773c6b7f654aa9880a0edb5b4928086020c0a36e93147605ebe01` | completar filename |
| migration | `20260525200103_` | 1 novo | candidato único `20260525200103_corrections_kill_switches.sql`, SHA `8fdc4f7a6e8882217919086c0ed7dd1dfb2a908aca6077197803212ba056a060` | completar filename |
| migration | `20260526141659_` | 1 novo | candidato único `20260526141659_5cd6e346-f106-4e21-b2b7-171d86b581b6.sql`, SHA `2173ba383c3ed44deed53d7a35cdd7aac1c08119788d7fdc0562450f250610c7` | completar filename |
| migration | `20260529164602_` | 1 novo | candidato único `20260529164602_d3a5916b-dbbd-4061-ac81-0fae3d436db7.sql`, SHA `d1d2b56636919e1fba78d5d8a334d211dc9f3d7f8a617760692612b4eccbdb31` | completar filename |
| migration | `20260531120000_` | 1 novo | candidato único `20260531120000_corretiva_kill_switches_reason_col.sql`, SHA `c109f8c2458f2d9b85be0fd64ab1bb2423ca492f18bc821894e6f326ab1b6d8c` | completar filename |
| migration | `20260602120000_` | 1 | candidato único `20260602120000_fix_v_products_public_active_set_image.sql`, SHA `602a9bafaa4c0f71e82b06a4c676a7433567972d9e38a5632992fc6edf9c283d` | completar filename |
| migration | `20260604T000000Z_fix_raw_v2_product_type_and_overflows.sql` | 1 | arquivo exato ausente; `20260605000239_fix_raw_v2_product_type_mapping_parity.sql`, SHA `2a2f777d19358d3b7970fb228220c739f77c8cacb61e54960ee93b310c5513ac`, cobre apenas o mapping, não prova os overflows | corrigir documento somente após reconciliar os três efeitos; não criar arquivo retroativo |
| migration | `20260616172001_` | 1 novo | candidato único `20260616172001_product_images_cf_reconciliation.sql`, SHA `48c7557d5068c9299d9f93788e1d67ac6e02c8a813ccf7ca8092133ba86469fc` | completar filename |
| migration | `20260619150603_...sql` | 1 novo | candidato único `20260619150603_24a6abed-3f0e-4f15-90da-940480a73758.sql`, SHA `2af476fe4bfba75395deeda1c536a1f2cebd4c88155aa6d2480d380164c0afd1` | substituir abreviação pelo filename real |
| migration | `20260713101342_...sql` | 1 | candidato único `20260713101342_f9c0414f-6bbb-47d2-b199-c3659dc21e10.sql`, SHA `6595a1760a95c1f3561cbd668b06822f04b06b839abb6fdc7a8de114c5a492a5` | substituir abreviação pelo filename real |

Os dez novos problemas são todos abreviações com candidato local único. São dívida documental/gate, não perda de migration. Já o arquivo `20260604T...` é uma perda documental real de conteúdo completo: há somente evidência parcial posterior.

### 7.3 Estado da etapa 84

- [x] 13 grupos duplicados classificados.
- [x] 32 pares quebrados atuais reconciliados conceitualmente.
- [x] Falsos positivos separados de perdas/artefatos realmente ausentes.
- [ ] Corrigir os 32 pares em lote documental próprio e testar o gate.
- [ ] Aprovação DBA do manifesto.
- [ ] Completar `versão ↔ arquivo ↔ hash ↔ efeito` após export integral do ledger.

## 8. Política forward-only

### 8.1 Regra de imutabilidade

1. Os 1.673 arquivos medidos são legado imutável. Não renomear, editar, excluir, squashar ou reaplicar.
2. Qualquer mudança no fingerprint da seção 2.1 exige revisão explícita de proveniência; “formatação” de SQL legado também altera evidência.
3. Colisões e nomes sem versão permanecem identificados por `legacy-artifact-id`; eles não entram na fila forward.
4. Marker, stub, comentário-only e script de verificação não são promovidos artificialmente a DDL.
5. Nenhum arquivo é lixo só por ser pequeno, duplicado, vazio de efeito ou não aparecer no ledger por ID.

### 8.2 Fase transitória, antes da baseline aprovada

1. Manter freeze de novas migrations até a etapa 87.
2. Continuar proibindo bulk `db push`, `db reset` contra produção ou replay do diretório legado.
3. Para toda exceção futura autorizada pelo PO/DBA, preparar bytes exatos, SHA-256, efeito esperado, precondições, queries `pg_catalog`, plano de compensação e janela de mudança antes da aplicação.
4. Aplicar uma migration por vez somente pelo caminho autorizado; capturar imediatamente a versão real devolvida pelo ledger, nome, statements e hash dos bytes enviados.
5. Registrar a relação explícita `repo-artifact-id ↔ ledger-version ↔ raw-sha256 ↔ effect-fingerprint`. Se o MCP atribuir uma versão diferente do filename, registrar ambos; não renomear depois.
6. Falha parcial gera migration compensatória nova, nunca edição do arquivo antigo.

### 8.3 Corte canônico

Após export completo do ledger e aprovação DBA:

1. gerar snapshot estrutural somente leitura do canônico via `pg_catalog`;
2. escolher uma baseline com ID próprio e hash, sem fingir que os 1.673 arquivos a reproduzem;
3. validar essa baseline num banco descartável;
4. iniciar um stream novo cujo primeiro timestamp seja estritamente maior que todos os IDs reservados no ledger e no repo no instante do corte;
5. aceitar somente nomes no padrão `YYYYMMDDHHMMSS_slug.sql`, com timestamp UTC de 14 dígitos e slug descritivo;
6. recusar timestamp repetido no repo, no manifesto ou no ledger;
7. nunca reutilizar um ID de migration falha;
8. guardar hash bruto e effect fingerprint em revisão e após aplicação;
9. conferir efeitos por `pg_catalog`, não por PostgREST/OpenAPI;
10. tratar rollback como restore validado ou migration compensatória de versão maior.

### 8.4 Gate mínimo para migration nova

- [ ] `[AUTORIZAÇÃO BD]` explícita e escopo aprovado.
- [ ] Owner humano e domínio declarados.
- [ ] Timestamp UTC de 14 dígitos reservado e único em repo/manifesto/ledger.
- [ ] SHA-256 antes da aplicação.
- [ ] SQL revisado; sem segredo, senha ou token.
- [ ] Precondições verificáveis e efeito esperado por objeto.
- [ ] RLS, policies, grants, `search_path`, FK e índices considerados quando aplicáveis.
- [ ] Teste em banco descartável/staging.
- [ ] Lock/timeout e volume estimados.
- [ ] Backup/restore ou compensação forward testados.
- [ ] Aplicação única; retorno do ledger capturado.
- [ ] Hash pós-aplicação ligado à versão real.
- [ ] Verificação `pg_catalog` e smoke de contrato.
- [ ] Documento/manifesto atualizado sem alterar entradas históricas.

## 9. Dependências, pré-condições e reversibilidade

### 9.1 Sinais estáticos medidos

O JSON schema 2 remove comentários SQL de forma lexical e registra sinais por arquivo. Corpos de função e strings continuam no texto; portanto as contagens abaixo são **arquivos que contêm o sinal**, não contagem de statements nem prova de execução top-level. Categorias se sobrepõem.

| Classe de sinal | Arquivos |
|---|---:|
| `CREATE TABLE` / `ALTER TABLE` | 223 / 432 |
| `DROP TABLE` / `DROP COLUMN` / `TRUNCATE` | 19 / 13 / 12 |
| criação / drop de função | 443 / 36 |
| criação / drop de view ou materialized view | 65 / 16 |
| criação / drop de índice | 294 / 44 |
| criação / alteração / drop de policy | 364 / 11 / 196 |
| mudança explícita de RLS | 236 |
| criação / drop de trigger | 153 / 146 |
| criação / alteração de type | 10 / 5 |
| `GRANT` / `REVOKE` | 256 / 253 |
| `INSERT` / `UPDATE` / `DELETE` | 242 / 459 / 78 |
| mudança de `cron` | 53 |
| mudança de extensão | 13 |
| `SECURITY DEFINER` | 315 |
| `CONCURRENTLY` / `VACUUM` após remoção lexical de comentários | 11 / 5 |

Resumo conservador de risco:

| Sinal agregado | Arquivos | Interpretação correta |
|---|---:|---|
| perda destrutiva (`DROP TABLE`, `DROP COLUMN`, `DROP TYPE` ou `TRUNCATE`) | 44 | exige before-image/restore; não é reversível por `git revert` |
| mutação de dados (`INSERT`, `UPDATE`, `DELETE` ou `TRUNCATE`) | 579 | repetição pode mudar dados mesmo com DDL idempotente |
| revisão de compensação necessária | 1.025 | inclui dados, drops, ACL/RLS, cron, extensões e objetos removidos |
| nenhum efeito reconhecido pelo scanner | 383 | inclui markers/comments, mas também pode incluir SQL dinâmico; não significa no-op |

Sinais de precondição/idempotência observados: 524 arquivos contêm `IF EXISTS`, 552 contêm `IF NOT EXISTS`, 118 contêm `ON CONFLICT`, 173 consultam catálogo/`to_regclass` e 276 contêm bloco `EXCEPTION`. Presença não prova idempotência completa; ausência não prova defeito. Em especial, uma migration pode proteger criação e ainda executar DML não idempotente depois.

### 9.2 Schemas e serviços dos quais o legado depende

| Schema qualificado | Arquivos que o referenciam | Pré-condição de reconstrução |
|---|---:|---|
| `public` | 1.149 | baseline de objetos e ordem de dependências interna |
| `auth` | 416 | stack Supabase, roles, funções `auth.*`, 69 FKs e trigger protegido de signup |
| `cron` | 59 | extensão `pg_cron`, jobs e nomes/IDs compatíveis |
| `storage` | 39 | stack/owner `supabase_storage_admin`; caminho MCP comum não possui autoridade para toda DDL de Storage |
| `net` | 23 | extensão `pg_net` e configuração de rede |
| `archive` | 21 | schema de aplicação e objetos arquivados na ordem correta |
| `cf_recon` | 20 | schema de reconciliação Cloudflare e suas funções/tabelas |
| `extensions` | 12 | schema e extensões instaladas antes dos consumidores |
| `vault` | 10 | `supabase_vault`, ACL e segredos presentes sem exportar valores |
| `analytics` | 9 | schema e views/MVs que não são cobertos de forma confiável pelo histórico local |
| `backup` | 6 | schema e tabelas movidas/reconstruídas, incluindo T16 |
| `supabase_migrations` | 2 | aliases de ledger; nunca tratar como DDL de negócio |
| `realtime`, `supplier_stricker`, `prod_audit` | 1 cada | componentes Supabase ou schemas de aplicação específicos |

Referência qualificada não é DAG completa: SQL dinâmico, `search_path`, nomes sem schema e dependências em corpos de função exigem parse e catálogo. O inventário JSON guarda todos os nomes qualificados encontrados para que o matcher futuro possa construir arestas por objeto.

### 9.3 Pré-condições que bloqueiam replay

| Classe | Pré-condição mínima | Falha simulada se ignorada |
|---|---|---|
| Ambiente | PostgreSQL/Supabase, extensões e roles nas versões aprovadas | `role/schema/function does not exist` antes de chegar ao domínio |
| Auth | preservar `on_auth_user_created`, FKs e helpers/overloads reais | signup sem perfil ou policies incapazes de avaliar papel |
| Storage | executar pelo owner/caminho suportado | `permission denied` apesar de SQL correto |
| Cron/net/vault | extensões, secrets, URLs e ACL presentes; jobs resolvidos por nome, não por suposição de ID | job criado quebrado ou alteração do job errado |
| Índice/MV concorrente e vacuum | executor compatível com comandos que não podem compartilhar certos transaction blocks | aborto no meio do lote ou statement nunca executado |
| Functions/views | assinaturas, tipos, owners, grants e objetos-base existentes | replace parcial, perda de ACL ou dependência inexistente |
| RLS/policies | tabela, colunas, helpers e policies atuais inventariados antes do drop/create | janela deny-all/allow-all ou policy com assinatura inválida |
| DML/backfill | before-image, cardinalidade esperada, filtro e constraints validados | update/delete silenciosamente amplo ou irreversível |
| Partições | pai, bounds, RLS/policies/grants e trigger de criação conferidos | partição futura fora da postura do pai |
| Ledger | aliases separados de efeitos e versão real capturada | dupla contagem, replay de efeito ou nova “reparação” destrutiva |

Dois exemplos locais concretos mostram por que precondições não podem ser inferidas do filename:

- `cron_p0_disable_webhook_outbox_missing_secret_20260623.sql` chama `cron.alter_job(202, ...)`; o ID 202 é ambiental. A precondição é provar que o job 202 ainda é `process-webhook-outbox`, ou substituir a proposta futura por lookup inequívoco por nome.
- `20260826000000_roboflow_credentials.sql` depende de `integration_credentials`, da coluna `description` e de unicidade em `secret_name`. A criação local inicial da tabela tinha `notes`, não `description`; o contrato TypeScript atual declara ambas, mas nenhuma adição de `description` a essa tabela foi localizada por busca textual nas migrations. O arquivo não pode ser aplicado até `pg_catalog` confirmar colunas/constraint. Como faz upsert, uma compensação por `DELETE` também seria incorreta se alguma chave já existia: é obrigatório capturar before-image por chave.

### 9.4 Classes de reversibilidade

| Classe | Exemplos | Estratégia permitida |
|---|---|---|
| R0 — aditiva | tabela/coluna/índice novos sem backfill | compensatória forward após provar ausência de consumidores; nunca editar história |
| R1 — definição substituída | função, view, trigger, policy, grant | capturar definição, owner e ACL anteriores; restaurar por migration de versão maior |
| R2 — mutação de dados | seed, backfill, update, delete | before-image identificada por PK e restore testado; sem before-image, restore de backup |
| R3 — perda estrutural | drop/truncate/alteração incompatível | backup/restore ou compensatória validada; rollback textual não recupera dados |
| R4 — efeito operacional | cron, vault, net, storage, extensão | snapshot de configuração/ACL e reversão pelo mesmo owner/control plane |
| R5 — bookkeeping | marker, stub e alias em `schema_migrations` | preservar como evidência; nunca apagar linha para “limpar” contagem |

O nome de 33 arquivos contém `restore`, `revert` ou `rollback`, mas isso não constitui pareamento formal de rollback. Não foi encontrada convenção que ligue cada um dos 1.673 artefatos a uma reversão testada. Portanto, até classificação individual e teste em banco descartável, a postura padrão é **forward compensation ou restore**, nunca replay reverso.

### 9.5 Condições de aceite da análise de dependências

- [x] Fingerprint bruto e normalizado por arquivo disponível no JSON.
- [x] Sinais de efeito, precondição, risco e referência qualificada por arquivo disponíveis no JSON.
- [x] Dependências de schemas/serviços e aliases do ledger explicitadas.
- [x] Classes de reversibilidade e before-image definidas.
- [ ] Parse PostgreSQL real e DAG de objetos, distinguindo top-level, function body e string dinâmica.
- [ ] Validação das arestas contra `pg_depend`, `pg_proc`, `pg_rewrite`, `pg_trigger`, `pg_constraint` e `pg_policy` vivos.
- [ ] Classificação R0–R5 por artefato aprovada por DBA.
- [ ] Teste de compensação/restore em banco descartável.

## 10. Riscos que impedem replay hoje

| Risco | Evidência | Consequência |
|---|---|---|
| Ledger completo ausente do repo | somente totais e amostras estão documentados | matching integral impossível |
| 37 versões colidentes | 96 arquivos dividem 37 IDs | ferramenta baseada só no prefixo perde efeitos |
| 33 sem versão | zero matches exatos provados | ordem lexical não corresponde à ordem de aplicação |
| 13 hashes repetidos | 74 arquivos, incluindo SQL real | deduplicar apaga possível evidência de aplicação |
| Markers/stubs | dezenas de `SELECT 1`, comment-only e stub | reconstrução local omite DDL real |
| Script inválido no diretório | `verify_rls_policies.sql` tem rótulos não SQL | replay pode abortar |
| Migration RLS parcial | seis policies ausentes, só um de três índices presente | comentário “Applied” não reflete efeito vivo |
| Log alvo inexistente | migration RLS de 12/07 escreve em `migrations_log`, não existente | arquivo falharia no final mesmo que efeitos anteriores passassem |
| Arquivo local posterior ao ledger documentado | Roboflow 26/08 versus último ledger 18/07 | não se sabe se é proposta, aplicação direta ou drift local |
| Documentação operacional divergente | ADR/guia ainda trazem contagens antigas e README ausente | novo agente pode escolher processo errado |

## 11. Próxima evidência necessária

Para fechar as etapas 81–84 e liberar a 85, o DBA deve aprovar uma extração somente leitura, ordenada e versionada, contendo:

```sql
SELECT version, name, statements
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

O artefato precisa registrar separadamente:

- SHA-256 de cada statement nos bytes exportados;
- SHA-256 da lista ordenada inteira;
- timestamp e projeto de origem;
- ausência de segredos antes de versionar;
- effect fingerprint extraído estaticamente;
- matches exatos, normalizados, parciais e sem match;
- evidência `pg_catalog` para objetos/effects de matches parciais.

Não usar `statements` como autorização de replay: o ledger pode conter summaries, SQL incompleto e material sensível, como já ocorreu nos casos T16/T17 e criação de usuários.

## 12. Critério de liberação para a etapa 85

A reconstrução descartável só pode começar quando todos forem verdadeiros:

- [ ] export integral do ledger disponível e saneado;
- [ ] manifesto de 2.354 linhas revisado;
- [ ] todas as colisões classificadas sem rename;
- [ ] todos os 33 nomes sem versão ligados a ledger/efeito ou marcados `não-replayável` com justificativa;
- [ ] todos os grupos duplicados classificados;
- [ ] referências quebradas corrigidas e gate verde;
- [ ] baseline canônica e stream forward aprovados pelo DBA;
- [ ] nenhuma migration de outro agente apareceu após o fingerprint;
- [ ] banco descartável isolado de qualquer credencial de produção;
- [ ] plano de abort/restore validado.

Até lá, o estado correto é: **manifesto local íntegro; equivalência global pendente; freeze mantido; nenhuma migration autorizada para replay ou aplicação**.

## 13. Validações desta entrega

| Validação | Resultado |
|---|---|
| Parse do JSON schema 2 | 1.673/1.673 entradas válidas |
| Hash de cada entrada contra bytes locais | zero divergências |
| Ordem determinística de paths | estritamente crescente |
| SHA-256 agregado recalculado do JSON | `cdb0ba68bfbf35fe6aa07792251d202e888e963fc7b61a9c16f644dd1891b7eb` |
| SHA-256 agregado recalculado diretamente do diretório | idêntico ao JSON |
| SHA-256 do artefato JSON | `e13d4655a33424d1c617296bd27d259b132ee6ac48f7808685b6b177460239cf` |
| Cobertura dos 33 nomes sem versão no Markdown | 33/33 |
| Cobertura dos grupos de colisão | 37/37 |
| Cobertura dos grupos duplicados | 13/13, 74 arquivos |
| Whitespace/diff check dos dois novos artefatos | limpo |
| Status Git de `supabase/migrations` | limpo; nenhum SQL alterado |
| Gate de referências | permanece vermelho nos mesmos dez pares novos já classificados; nenhum problema novo vem destes manifestos |
| Banco/deploy | nenhuma chamada ou mutação executada |

O gate de referências não foi “verdeado” nesta entrega porque o escopo proíbe editar os 32 pares de origem. O resultado vermelho é evidência preservada, não falha mascarada por atualização de baseline.

## 14. Addendum somente leitura — ledger canônico de 28/08/2026

A lacuna de evidência descrita nas seções 3.3 e 11 foi parcialmente fechada sem
mutar produção. O Supabase CLI ligado a `doufsxqlfjyuvxuezpln` exportou os dados de
`supabase_migrations` para um arquivo temporário. Esse arquivo bruto não foi
versionado, pois contém os SQLs históricos e poderia carregar material sensível.

O arquivo versionado
`docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-08-28.json` guarda somente versão,
nome, cardinalidade, SHA-256 por statement, SHA-256 da concatenação ordenada e
presença booleana de metadados. `statements`, `rollback`, `created_by` e
`idempotency_key` foram explicitamente excluídos.

| Medida viva | Resultado |
|---|---:|
| Entradas/versões distintas no ledger | 2.354 / 2.354 |
| Intervalo | `001` a `20260718135800` |
| Entradas com match local exato em bytes | 114 |
| Entradas com versão local, sem igualdade exata | 993 |
| Entradas sem versão local | 1.247 |
| Entradas com `statements IS NULL` | 428 |
| Entradas com array de statements vazio | 55 |
| Arquivos locais versionados sem versão no ledger | 531 |
| Raiz SHA-256 das entradas sanitizadas | `f656c556cf46dc0e915f4899317880f84f7d7aed11ea20ff15ba2886b71e8be2` |

A etapa 81 agora possui o inventário completo e hashes brutos por statement. Ela
ainda não está encerrada semanticamente: 993 matches nominais exigem comparação
normalizada/de efeito, 1.247 versões ledger-only precisam de proveniência e 531
arquivos local-only não podem ser chamados de pendentes sem prova. Revisão DBA e
effect fingerprint continuam obrigatórios.

Em paralelo, o dump estrutural canônico foi restaurado em PostgreSQL 17
descartável e reconstruiu 391 tabelas, 196 views/materialized views, 1.280 funções
e 15 enums. Isso valida a fotografia estrutural, não transforma o diretório legado
em uma cadeia replayável. O freeze e a proibição de `supabase db push` permanecem.
