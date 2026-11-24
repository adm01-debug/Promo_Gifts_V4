import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// QA Etapa 014 (ACH-011): descobre harnesses a partir de src/pages/dev/ e
// src/pages/__visual/ em vez de lista fixa. Qualquer arquivo *Harness*.tsx
// ou *Demo*.tsx nessas pastas é proibido no bundle de produção.
// FORBIDDEN_ROUTE_PREFIXES cobre rotas com prefixo /__ que nunca devem
// aparecer em dist/.
const HARNESS_SOURCE_DIRS = ['src/pages/dev', 'src/pages/__visual'];
const FORBIDDEN_ROUTE_PREFIXES = ['/__test/', '/__visual/'];

// Legado: lista fixa mantida para testes que importam forbiddenMarkers diretamente.
// Em runtime o script usa discoverForbiddenMarkers() abaixo.
export const forbiddenMarkers = [
  '/__test/',
  '/__visual/',
  'ColorSwatchesHarness',
  'ConfirmDialogHarness',
  'AlertDialogHarness',
  'DialogHarness',
  'UndoToastHarness',
  'CnpjFormHarness',
  'MagazineRingHarness',
  'TabSkipHarness',
  // __visual/ harnesses (AppRoutes.tsx — 9 componentes)
  'PreviewButtonHarness',
  'QuoteViewOrderHarness',
  'QuoteItemsListMobileHarness',
  'QuoteItemEditorSheetHarness',
  'QuoteAddProductButtonHarness',
  'CalendarHarness',
  'DatePickerFieldHarness',
  'NegotiationMarkupCardHarness',
  'QuoteFreightBlockHarness',
  'OptimizedImageDemo',
];

// Descobre harnesses dinamicamente a partir das pastas-fonte; inclui os
// FORBIDDEN_ROUTE_PREFIXES e a lista legada como floor.
async function discoverForbiddenMarkers(root = process.cwd()) {
  const markers = new Set(forbiddenMarkers);
  for (const dir of HARNESS_SOURCE_DIRS) {
    const absDir = path.join(root, dir);
    try {
      await access(absDir);
    } catch {
      continue;
    }
    const files = await walk(absDir);
    for (const f of files) {
      if (!f.endsWith('.tsx') && !f.endsWith('.ts')) continue;
      const stem = path.basename(f).replace(/\.(tsx|ts)$/, '');
      if (stem.includes('Harness') || stem.includes('Demo')) {
        markers.add(stem);
      }
    }
  }
  // Prefixos de rota: tratados como marcadores de caminho
  for (const prefix of FORBIDDEN_ROUTE_PREFIXES) markers.add(prefix);
  return [...markers];
}

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolutePath)));
    else files.push(absolutePath);
  }
  return files;
}

export async function auditProductionHarnesses(directory = 'dist') {
  const distDir = path.resolve(directory);
  // QA Etapa 014: markers descobertos dinamicamente + lista legada como floor
  const markers = await discoverForbiddenMarkers(path.dirname(path.resolve(directory)));
  const files = await walk(distDir);
  const violations = [];
  for (const file of files) {
    const relativePath = path.relative(distDir, file);
    for (const marker of markers) {
      if (relativePath.includes(marker)) {
        violations.push(`${relativePath}: filename contains ${marker}`);
      }
    }
    if (!textExtensions.has(path.extname(file))) continue;
    const contents = await readFile(file, 'utf8');
    for (const marker of markers) {
      if (contents.includes(marker)) {
        violations.push(`${relativePath}: content contains ${marker}`);
      }
    }
  }
  return violations;
}

async function main() {
  const directoryArgument = process.argv.find((argument) => argument.startsWith('--directory='));
  const directory = directoryArgument?.slice('--directory='.length) || 'dist';
  let violations;
  try {
    violations = await auditProductionHarnesses(directory);
  } catch (error) {
    console.error('[production-harnesses] dist/ is missing or unreadable.', error.message);
    process.exitCode = 1;
    return;
  }

  if (violations.length > 0) {
    console.error(
      '[production-harnesses] Dev-only test harnesses leaked into the production bundle:',
    );
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log('[production-harnesses] OK: no /__test routes or harness chunks in dist/.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
