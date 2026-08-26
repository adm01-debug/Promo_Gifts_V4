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
  const match = String(value).trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function npmVersionFromUserAgent(userAgent) {
  const match = String(userAgent).match(/(?:^|\s)npm\/(\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
}

function minimumNpmMajor(engines) {
  const match = String(engines ?? '').match(/>=\s*(\d+)/);
  return match ? Number(match[1]) : null;
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
    return { ok: false, errors: [`package.json ausente: ${packageJsonPath}`], warnings: [], details: {} };
  }
  if (!existsSync(nvmrcPath)) {
    return { ok: false, errors: [`.nvmrc ausente: ${nvmrcPath}`], warnings: [], details: {} };
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const expectedNode = parseVersion(readFileSync(nvmrcPath, 'utf8'));
  const actualNode = parseVersion(nodeVersion);
  const packageManager = String(packageJson.packageManager ?? '');
  const packageManagerMatch = packageManager.match(/^npm@(\d+\.\d+\.\d+)$/);

  if (!expectedNode) errors.push('.nvmrc deve conter uma versão Node sem prefixo ou intervalo.');
  if (!actualNode) errors.push(`Versão Node inválida: ${nodeVersion}`);
  if (!packageManagerMatch) errors.push('packageManager deve fixar npm em versão exata (ex.: npm@10.9.7).');

  const nodeEngine = String(packageJson.engines?.node ?? '');
  const npmEngine = String(packageJson.engines?.npm ?? '');
  if (!nodeEngine) errors.push('engines.node não está definido.');
  if (!npmEngine) errors.push('engines.npm não está definido.');
  if (expectedNode && !nodeEngine.includes(String(expectedNode.major))) {
    errors.push(`engines.node (${nodeEngine}) não inclui a major canônica ${expectedNode.major} do .nvmrc.`);
  }
  if (actualNode && expectedNode && actualNode.major < expectedNode.major) {
    errors.push(`Node ${nodeVersion} é anterior ao baseline ${expectedNode.major}.${expectedNode.minor}.${expectedNode.patch}.`);
  }

  const actualNpm = npmVersionFromUserAgent(npmUserAgent);
  const minNpm = minimumNpmMajor(npmEngine);
  if (!actualNpm) {
    warnings.push('Versão npm não disponível fora de um processo iniciado por npm; contrato estático foi validado.');
  } else if (minNpm !== null && (parseVersion(actualNpm)?.major ?? 0) < minNpm) {
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
      expectedNode: expectedNode ? `${expectedNode.major}.${expectedNode.minor}.${expectedNode.patch}` : null,
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
  console.log(`Runtime contract — Node CI: ${details.expectedNode ?? 'inválido'} · Node atual: ${details.actualNode ?? 'inválido'}`);
  console.log(`Package manager: ${details.packageManager || 'ausente'} · npm atual: ${details.actualNpm ?? 'não detectado'}`);

  for (const warning of result.warnings) console.warn(`⚠️ ${warning}`);
  for (const error of result.errors) console.error(`❌ ${error}`);

  if (!result.ok) process.exitCode = 1;
  else console.log('✅ Contrato de runtime aprovado.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
