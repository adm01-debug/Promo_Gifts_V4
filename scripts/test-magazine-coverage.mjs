#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const summaryPath = path.resolve('coverage/magazine/coverage-summary.json');
if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found: ${summaryPath}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const critical = {
  'src/pages/magazine/editorPersistence.ts': { lines: 95, statements: 95, functions: 95, branches: 85 },
  'src/pages/magazine/pagination.ts': { lines: 90, statements: 90, functions: 95, branches: 75 },
  'src/pages/magazine/useMagazineEditor.ts': { lines: 82, statements: 78, functions: 65, branches: 60 },
  'src/pages/magazine/useMagazinePublish.ts': { lines: 90, statements: 90, functions: 70, branches: 65 },
  'src/pages/magazine/components/MagazinePageRenderer.tsx': { lines: 90, statements: 90, functions: 80, branches: 60 },
  'src/services/magazineService.ts': { lines: 68, statements: 67, functions: 80, branches: 64 },
};

let failed = false;
for (const [relative, floors] of Object.entries(critical)) {
  const key = Object.keys(summary).find((candidate) => candidate.endsWith(relative));
  if (!key) {
    console.error(`::error title=Magazine coverage::critical file absent: ${relative}`);
    failed = true;
    continue;
  }
  for (const [metric, floor] of Object.entries(floors)) {
    const actual = Number(summary[key]?.[metric]?.pct);
    if (!Number.isFinite(actual) || actual < floor) {
      console.error(`::error title=Magazine coverage::${relative} ${metric} ${actual}% < ${floor}%`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`MAGAZINE_CRITICAL_COVERAGE_OK (${Object.keys(critical).length} files)`);
