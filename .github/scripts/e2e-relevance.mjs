import { pathToFileURL } from 'node:url';

const deliveryUnit = 'src/pages/__tests__/QuoteBuilderDeliveryTooltip.test.tsx';

const workflowInputs = new Set([
  '.github/scripts/e2e-relevance.mjs',
  '.github/workflows/_e2e-relevance.yml',
  '.github/workflows/_secrets-check.yml',
  '.github/workflows/delivery-quality.yml',
  '.github/workflows/deploy-gates.yml',
  '.github/workflows/e2e-flows.yml',
  '.github/workflows/e2e-focused.yml',
  '.github/workflows/e2e-personalization.yml',
  '.github/workflows/e2e-swatch-quickview.yml',
  '.github/workflows/e2e.yml',
  '.github/workflows/replenishment-quality.yml',
  '.github/workflows/visual-tests.yml',
  'scripts/check-playwright-min-executed.mjs',
  'scripts/run-smoke-filtered.mjs',
  'scripts/check-smoke-tags.mjs',
  'scripts/e2e-smoke-coverage-doc.mjs',
  'scripts/e2e-mock-auth-setup.mjs',
]);

const sharedActionPrefixes = [
  '.github/actions/e2e-setup/',
  '.github/actions/check-min-tests/',
  '.github/actions/setup-node-ci/',
];

export function isE2ERuntimeFile(file) {
  if (file === deliveryUnit) return true;
  if (workflowInputs.has(file)) return true;
  if (sharedActionPrefixes.some((prefix) => file.startsWith(prefix))) return true;

  const isSrcUnit =
    file.startsWith('src/') &&
    (file.includes('/__tests__/') || /\.(?:test|spec)\.[^/]+$/.test(file));
  if (isSrcUnit) return false;

  return (
    file.startsWith('src/') ||
    file.startsWith('e2e/') ||
    file.startsWith('tests/') ||
    file.startsWith('public/') ||
    ['package.json', 'package-lock.json', '.nvmrc', 'index.html'].includes(file) ||
    /^(?:playwright|vite|tailwind|postcss)\.config\./.test(file)
  );
}

export function hasE2ERuntimeChanges(files) {
  return files.some(isE2ERuntimeFile);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = JSON.parse(process.env.CHANGED_FILES || '[]');
  process.stdout.write(`relevant=${hasE2ERuntimeChanges(files)}\n`);
}
