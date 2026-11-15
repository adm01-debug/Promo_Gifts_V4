// O drift-check (.github/workflows/edge-functions-drift-check.yml) marca DRIFT
// quando supabase/functions/<slug>/ tem arquivo não-teste que não está no pacote
// publicado. O pacote só leva o grafo de import de index.ts (+ deno.json), então
// módulo usado só por teste fica em supabase/functions/tests/.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

const FUNCTIONS_DIR = path.resolve(process.cwd(), 'supabase/functions');
const IMPORT_RE =
  /(?:import|export)\s[^'"]*?from\s*["'](\.[^"']+)["']|import\s*\(?\s*["'](\.[^"']+)["']/g;
const TEST_FILE_RE = /(\.test\.ts|_test\.ts)$/;
const CONFIG_FILES = new Set(['deno.json', 'deno.jsonc', 'import_map.json']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function importGraph(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop();
    if (!file || seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(IMPORT_RE)) {
      stack.push(path.resolve(path.dirname(file), m[1] ?? m[2]));
    }
  }
  return seen;
}

it('toda edge function só tem arquivos não-teste alcançáveis a partir de index.ts', () => {
  const repoOnly: string[] = [];
  for (const slug of readdirSync(FUNCTIONS_DIR)) {
    const dir = path.join(FUNCTIONS_DIR, slug);
    const entry = path.join(dir, 'index.ts');
    if (!existsSync(entry)) continue;
    const graph = importGraph(entry);
    for (const file of walk(dir)) {
      if (TEST_FILE_RE.test(file) || CONFIG_FILES.has(path.basename(file))) continue;
      if (!graph.has(file)) repoOnly.push(path.relative(FUNCTIONS_DIR, file));
    }
  }
  expect(repoOnly).toEqual([]);
});
