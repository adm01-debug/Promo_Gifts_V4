#!/usr/bin/env node
/**
 * check-env.mjs
 *
 * Valida as variáveis de ambiente necessárias para o app.
 * Uso:
 *   node scripts/check-env.mjs            → verifica vars obrigatórias
 *   node scripts/check-env.mjs --all      → mostra todas (obrigatórias + opcionais)
 *   node scripts/check-env.mjs --strict   → sai com erro se qualquer obrigatória faltar
 */

const REQUIRED = [
  { name: 'VITE_SUPABASE_URL',      desc: 'URL do projeto Supabase (PostgREST endpoint)' },
  { name: 'VITE_SUPABASE_ANON_KEY', desc: 'Chave anon pública do Supabase'               },
];

const OPTIONAL = [
  { name: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Chave service-role (apenas CI/migrations)' },
  { name: 'SUPABASE_ACCESS_TOKEN',     desc: 'PAT da CLI do Supabase'                     },
  { name: 'SUPABASE_PROJECT_REF',      desc: 'ID do projeto Supabase (doufsxqlfjyuvxuezpln)' },
  { name: 'SUPABASE_DB_URL',           desc: 'Connection string direta ao PG'             },
  { name: 'VITE_SENTRY_DSN',           desc: 'DSN do Sentry (opcional em dev)'            },
  { name: 'GITHUB_TOKEN',              desc: 'PAT do GitHub (CI)'                         },
  { name: 'E2E_BASE_URL',              desc: 'URL base para testes E2E'                   },
];

const args  = process.argv.slice(2);
const all    = args.includes('--all');
const strict = args.includes('--strict');

function mask(value) {
  if (!value) return '(não definida)';
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '****' + value.slice(-4);
}

let missing = 0;

console.log('=== Variáveis de ambiente ===\n');

for (const { name, desc } of REQUIRED) {
  const val = process.env[name];
  if (val) {
    console.log(`✅ ${name.padEnd(30)} ${mask(val)}  — ${desc}`);
  } else {
    console.log(`❌ ${name.padEnd(30)} (AUSENTE)  — ${desc}`);
    missing++;
  }
}

if (all) {
  console.log('\n--- Opcionais ---\n');
  for (const { name, desc } of OPTIONAL) {
    const val = process.env[name];
    const icon = val ? '✅' : '⚠️ ';
    console.log(`${icon} ${name.padEnd(30)} ${val ? mask(val) : '(não definida)'}  — ${desc}`);
  }
}

console.log('');

if (missing > 0) {
  console.log(`⚠️  ${missing} variável(eis) obrigatória(s) ausente(s).`);
  if (strict) {
    console.error('   Modo --strict: saindo com erro.');
    process.exit(1);
  }
  console.log('   Em desenvolvimento, copie .env.example → .env.local e preencha.');
  process.exit(0);
} else {
  console.log('✅ Todas as variáveis obrigatórias estão definidas.');
  process.exit(0);
}
