import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('migrate-helper permanece inerte e não lê credenciais privilegiadas', async () => {
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url));

  assert(/requireRole:\s*['"]dev['"]/.test(source));
  assert(source.includes('status: 410'));
  assert(source.includes('migration_helper_disabled'));
  assertEquals(source.includes('SUPABASE_SERVICE_ROLE_KEY'), false);
  assertEquals(source.includes('SUPABASE_DB_URL'), false);
  assertEquals(source.includes('ACCESS_KEY'), false);
  assertEquals(source.includes('credentials'), false);
});
