#!/usr/bin/env node
/**
 * Verifica o contrato local de runtime sem exigir uma versão exata do Node
 * fora do CI. O CI usa a versão pinada em .nvmrc; desenvolvedores podem usar
 * uma versão mais nova desde que respeitem `engines`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PACKAGE_JSON_PATH = resolve(ROOT, 'package.json');
const NVMRC_PATH = resolve(ROOT, '.nvmrc');

export function parseVersion(value) {
  const match = String(value)
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  if (!parts.every(Number.isSafeInteger)) return null;
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function npmVersionFromUserAgent(userAgent) {
  const match = String(userAgent).match(/(?:^|\s)npm\/(\S*)/);
  return match?.[1] ?? null;
}

function compareVersions(left, right) {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

function parseEngineRange(value) {
  const match = value.trim().match(/^>=(\d+\.\d+\.\d+)(?:\s+<(\d+(?:\.\d+){0,2}))?$/);
  if (!match) return null;
  const minimum = parseVersion(match[1]);
  const maximum = match[2]
    ? parseVersion([...match[2].split('.'), '0', '0'].slice(0, 3).join('.'))
    : null;
  if (!minimum || (match[2] && !maximum)) return null;
  if (maximum && compareVersions(minimum, maximum) >= 0) return null;
  return { minimum, maximum };
}

function satisfiesEngine(version, range) {
  return (
    compareVersions(version, range.minimum) >= 0 &&
    (!range.maximum || compareVersions(version, range.maximum) < 0)
  );
}

export function evaluateRuntimeContract({
  packageJsonPath = PACKAGE_JSON_PATH,
  nvmrcPath = NVMRC_PATH,
  nodeVersion = process.version,
  npmUserAgent = process.env.npm_config_user_agent ?? '',
} = {}) {
  const errors = [];
  const warnings = [];

  if (!existsSync(packageJsonPath)) {
    return {
      ok: false,
      errors: [`package.json ausente: ${packageJsonPath}`],
      warnings: [],
      details: {},
    };
  }
  if (!existsSync(nvmrcPath)) {
    return { ok: false, errors: [`.nvmrc ausente: ${nvmrcPath}`], warnings: [], details: {} };
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const expectedNode = parseVersion(readFileSync(nvmrcPath, 'utf8'));
  const actualNode = parseVersion(nodeVersion);
  const packageManager = String(packageJson.packageManager ?? '');
  const packageManagerMatch = packageManager.match(/^npm@(\d+\.\d+\.\d+)$/);
  const expectedNpm = packageManagerMatch ? parseVersion(packageManagerMatch[1]) : null;

  if (!expectedNode) errors.push('.nvmrc deve conter uma versão Node sem prefixo ou intervalo.');
  if (!actualNode) errors.push(`Versão Node inválida: ${nodeVersion}`);
  if (!expectedNpm) errors.push('packageManager deve fixar npm em versão exata (ex.: npm@10.9.7).');

  const nodeEngine = String(packageJson.engines?.node ?? '');
  const npmEngine = String(packageJson.engines?.npm ?? '');
  const nodeRange = parseEngineRange(nodeEngine);
  const npmRange = parseEngineRange(npmEngine);
  for (const [name, value, range] of [
    ['node', nodeEngine, nodeRange],
    ['npm', npmEngine, npmRange],
  ]) {
    if (!value) errors.push(`engines.${name} não está definido.`);
    else if (!range)
      errors.push(
        `engines.${name} (${value}) inválido ou não suportado; use >=X.Y.Z ou >=X.Y.Z <M[.m[.p]].`,
      );
  }
  if (expectedNode && nodeRange && !satisfiesEngine(expectedNode, nodeRange)) {
    errors.push(`A versão canônica do .nvmrc não satisfaz engines.node (${nodeEngine}).`);
  }
  if (actualNode && expectedNode && compareVersions(actualNode, expectedNode) < 0) {
    errors.push(
      `Node ${nodeVersion} é anterior ao baseline ${expectedNode.major}.${expectedNode.minor}.${expectedNode.patch}.`,
    );
  }
  if (actualNode && nodeRange && !satisfiesEngine(actualNode, nodeRange)) {
    errors.push(`Node ${nodeVersion} não satisfaz engines.node (${nodeEngine}).`);
  }
  if (expectedNpm && npmRange && !satisfiesEngine(expectedNpm, npmRange)) {
    errors.push(`packageManager (${packageManager}) não satisfaz engines.npm (${npmEngine}).`);
  }

  const actualNpm = npmVersionFromUserAgent(npmUserAgent);
  const actualNpmVersion = /^\d+\.\d+\.\d+$/.test(actualNpm ?? '') ? parseVersion(actualNpm) : null;
  if (actualNpm === null) {
    warnings.push(
      'Versão npm não disponível fora de um processo iniciado por npm; contrato estático foi validado.',
    );
  } else if (!actualNpmVersion) {
    errors.push(`Versão npm inválida: ${actualNpm}`);
  } else if (npmRange && !satisfiesEngine(actualNpmVersion, npmRange)) {
    errors.push(`npm ${actualNpm} não satisfaz engines.npm (${npmEngine}).`);
  }

  const hasBunScript = Object.values(packageJson.scripts ?? {}).some((command) =>
    /\bbun\b/.test(String(command)),
  );
  if (hasBunScript) {
    errors.push('Há scripts de produção invocando bun apesar de packageManager fixar npm.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    details: {
      expectedNode: expectedNode
        ? `${expectedNode.major}.${expectedNode.minor}.${expectedNode.patch}`
        : null,
      actualNode: actualNode ? `${actualNode.major}.${actualNode.minor}.${actualNode.patch}` : null,
      packageManager,
      actualNpm,
      nodeEngine,
      npmEngine,
    },
  };
}

export function runCli() {
  const result = evaluateRuntimeContract();
  const { details } = result;
  console.log(
    `Runtime contract — Node CI: ${details.expectedNode ?? 'inválido'} · Node atual: ${details.actualNode ?? 'inválido'}`,
  );
  console.log(
    `Package manager: ${details.packageManager || 'ausente'} · npm atual: ${details.actualNpm ?? 'não detectado'}`,
  );

  for (const warning of result.warnings) console.warn(`⚠️ ${warning}`);
  for (const error of result.errors) console.error(`❌ ${error}`);

  if (!result.ok) process.exitCode = 1;
  else console.log('✅ Contrato de runtime aprovado.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
