const deliveryUnit = 'src/pages/__tests__/QuoteBuilderDeliveryTooltip.test.tsx';

export function isE2ERuntimeFile(file) {
  if (file === deliveryUnit) return true;

  const workflowInputs = new Set([
    '.github/scripts/e2e-relevance.mjs',
    '.github/workflows/_e2e-relevance.yml',
    '.github/workflows/delivery-quality.yml',
    '.github/workflows/deploy-gates.yml',
    '.github/workflows/e2e-flows.yml',
    '.github/workflows/e2e-focused.yml',
    '.github/workflows/e2e-personalization.yml',
    '.github/workflows/e2e-swatch-quickview.yml',
    '.github/workflows/e2e.yml',
    '.github/workflows/visual-tests.yml',
    'scripts/run-smoke-filtered.mjs',
    'scripts/check-smoke-tags.mjs',
    'scripts/e2e-smoke-coverage-doc.mjs',
  ]);
  if (workflowInputs.has(file)) return true;

  const isSrcUnit =
    file.startsWith('src/') &&
    (file.includes('/__tests__/') || /\.(?:test|spec)\.[^/]+$/.test(file));
  if (isSrcUnit) return false;

  return (
    file.startsWith('src/') ||
    file.startsWith('e2e/') ||
    file.startsWith('tests/') ||
    file.startsWith('public/') ||
    file.startsWith('.github/actions/e2e-setup/') ||
    ['package.json', 'package-lock.json', '.nvmrc', 'index.html'].includes(file) ||
    /^(?:playwright|vite|tailwind|postcss)\.config\./.test(file)
  );
}

export function hasE2ERuntimeChanges(files) {
  return files.some(isE2ERuntimeFile);
}

const files = JSON.parse(process.env.CHANGED_FILES || '[]');
process.stdout.write(`relevant=${hasE2ERuntimeChanges(files)}\n`);
