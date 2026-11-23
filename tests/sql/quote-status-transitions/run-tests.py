#!/usr/bin/env python3
"""Prova que o banco aceita transicoes de status proibidas pelo mapa do frontend.

Etapa 093 de docs/qa/04-PLANO.md (achado ACH-086).

Os pares proibidos NAO sao redigitados aqui: eles sao derivados em tempo de
execucao de `QUOTE_VALID_TRANSITIONS` (src/lib/quote-status-config.ts) via
tests/sql/quote-status-transitions/extract-transitions.mts. Se o mapa mudar, o
teste acompanha.

Nunca le DATABASE_URL nem credencial Supabase; nunca conecta em PostgreSQL
externo. Todo SQL vai por docker exec para um container descartavel,
network-isolated (`--network none`) e com label de posse.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import uuid

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
FIXTURE = HERE / 'fixture.sql'
EXTRACTOR = HERE / 'extract-transitions.mts'
CONFIG_MODULE = REPO / 'src/lib/quote-status-config.ts'
IMAGE = 'postgres:17'
LABEL = 'codex.quote-status-transitions-test'
DOCKER = ['docker', '--host=unix:///var/run/docker.sock']
SELECTORS = ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH')
ENV = {key: value for key, value in os.environ.items() if key not in SELECTORS}
USER_ID = '00000000-0000-0000-0000-000000000001'


def docker(*args: str, **kwargs):
    return subprocess.run(DOCKER + list(args), env=ENV, text=True, capture_output=True, **kwargs)


def cleanup_owned_container(container_id: str, token: str) -> None:
    inspected = docker('inspect', '--format', '{{json .Config.Labels}}', container_id)
    if inspected.returncode:
        raise RuntimeError('Cannot verify disposable-container ownership; no container was removed.')
    labels = json.loads(inspected.stdout)
    if labels.get(LABEL) != token:
        raise RuntimeError('Disposable-container label mismatch; no container was removed.')
    removed = docker('rm', '--force', '--volumes', container_id)
    if removed.returncode:
        raise RuntimeError('Failed to remove the owned disposable PostgreSQL container: ' + removed.stderr)


def load_transitions() -> dict[str, list[str]]:
    result = subprocess.run(
        ['npx', 'tsx', str(EXTRACTOR)],
        cwd=REPO, env=ENV, text=True, capture_output=True,
    )
    if result.returncode:
        raise RuntimeError('Could not read QUOTE_VALID_TRANSITIONS from the FE module: ' + result.stderr)
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError('Unexpected extractor output (not JSON): ' + result.stdout[:200]) from error
    if not isinstance(data, dict) or not data:
        raise RuntimeError('QUOTE_VALID_TRANSITIONS came back empty; refusing to run a vacuous test.')
    return data


def forbidden_pairs(transitions: dict[str, list[str]]):
    """Todos os pares (de, para) que o mapa do frontend proibe."""
    statuses = sorted(transitions)
    return [
        (source, target)
        for source in statuses
        for target in statuses
        if target not in transitions[source]
    ]


def allowed_pairs(transitions: dict[str, list[str]]):
    return [(source, target) for source in sorted(transitions) for target in transitions[source]]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=Path('work/quote-status-transitions-sql'))
    args = parser.parse_args()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    for path in (FIXTURE, EXTRACTOR, CONFIG_MODULE):
        if not path.is_file():
            raise RuntimeError(f'Required reviewed file is missing: {path}')

    transitions = load_transitions()
    forbidden = forbidden_pairs(transitions)
    allowed = allowed_pairs(transitions)
    if not forbidden:
        raise RuntimeError('No forbidden pairs derived from the FE map; the test would assert nothing.')

    daemon = docker('info', '--format', '{{.ServerVersion}}')
    if daemon.returncode:
        raise RuntimeError('Local Docker daemon is unavailable: ' + daemon.stderr)

    token = uuid.uuid4().hex
    name = 'quote-status-transitions-test-' + token[:12]
    started = docker('run', '--pull=missing', '--name', name,
                     '--label', LABEL + '=' + token,
                     '--network', 'none', '--env', 'POSTGRES_HOST_AUTH_METHOD=trust',
                     '--detach', IMAGE)
    if started.returncode:
        raise RuntimeError('Could not start the disposable PostgreSQL 17 container: ' + started.stderr)
    container_id = started.stdout.strip()
    try:
        return run_cases(container_id, output, transitions, forbidden, allowed)
    finally:
        cleanup_owned_container(container_id, token)


def run_cases(container: str, output: Path, transitions, forbidden, allowed) -> int:
    def sql(body: str):
        # Sem SET ROLE: o teste roda como postgres (dono da tabela) e usa o
        # claim JWT para que auth.uid() nao seja NULL — esse e exatamente o
        # caminho que o trigger NAO bypassa. Bypass de service_role nao entra.
        prefix = ('\\set VERBOSITY verbose\n'
                  f"SELECT set_config('request.jwt.claim.sub','{USER_ID}',false);\n")
        return docker('exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-U', 'postgres',
                      '-v', 'ON_ERROR_STOP=1', input=prefix + body)

    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if docker('exec', container, 'pg_isready', '-U', 'postgres').returncode == 0:
            break
        time.sleep(0.25)
    else:
        raise RuntimeError('Disposable PostgreSQL did not become ready within 30 seconds.')

    setup = sql('BEGIN;\n' + FIXTURE.read_text() + '\nCOMMIT;')
    (output / 'fixture.sql.log').write_text(setup.stdout + setup.stderr)
    if setup.returncode:
        raise RuntimeError('fixture.sql failed: ' + setup.stderr)

    results = []

    def record(case: str, passed: bool, **extra):
        entry = {'case': case, 'passed': passed, **extra}
        results.append(entry)
        print(('PASS ' if passed else 'FAIL ') + case, flush=True)
        return entry

    # Cada par roda em sua propria transacao revertida: nenhum dado persiste.
    def transition_attempt(source: str, target: str):
        body = (
            'BEGIN;\n'
            "INSERT INTO public.quotes(id, quote_number, client_name, status) "
            f"VALUES ('40000000-0000-0000-0000-000000000001','ORC-TEST-1','Fixture','{source}');\n"
            f"UPDATE public.quotes SET status='{target}' "
            "WHERE id='40000000-0000-0000-0000-000000000001';\n"
            'ROLLBACK;\n'
        )
        return sql(body)

    accepted_forbidden = []
    rejected_allowed = []
    accepted_allowed = []

    for source, target in forbidden:
        proc = transition_attempt(source, target)
        label = f'forbidden {source} -> {target}'
        if proc.returncode == 0:
            accepted_forbidden.append({'from': source, 'to': target})
            record(label, False,
                   expectedSQLSTATE='23514',
                   actual='UPDATE aceito pelo banco',
                   detail='O banco permitiu uma transicao que o mapa do FE proibe.',
                   error='')
        elif '23514' in proc.stderr:
            record(label, True, expectedSQLSTATE='23514', actual='23514', error='')
        else:
            record(label, False,
                   expectedSQLSTATE='23514',
                   actual='outro erro',
                   detail='Falhou por motivo diferente do esperado (nao conta como aprovacao).',
                   error=proc.stderr.strip())

    for source, target in allowed:
        proc = transition_attempt(source, target)
        label = f'allowed {source} -> {target}'
        if proc.returncode == 0:
            accepted_allowed.append({'from': source, 'to': target})
            record(label, True, expected='aceita', actual='aceita', error='')
        else:
            rejected_allowed.append({'from': source, 'to': target, 'error': proc.stderr.strip()})
            record(label, False,
                   expected='aceita',
                   actual='rejeitada',
                   detail='Transicao legitima bloqueada — regressao de fluxo.',
                   error=proc.stderr.strip())

    summary = {
        'etapa': '093',
        'achado': 'ACH-086',
        'source': 'src/lib/quote-status-config.ts::QUOTE_VALID_TRANSITIONS',
        'configSha256': hashlib.sha256(CONFIG_MODULE.read_bytes()).hexdigest(),
        'fixtureSha256': hashlib.sha256(FIXTURE.read_bytes()).hexdigest(),
        'postgres': '17',
        'productionTouched': False,
        'transitionsMap': transitions,
        'forbiddenPairs': len(forbidden),
        'allowedPairs': len(allowed),
        'forbiddenAcceptedByDatabase': accepted_forbidden,
        'allowedRejectedByDatabase': rejected_allowed,
        'allowedAcceptedByDatabase': len(accepted_allowed),
        'tests': len(results),
        'passed': sum(1 for item in results if item['passed']),
        'failed': sum(1 for item in results if not item['passed']),
        'cases': results,
    }
    (output / 'sql-test-results.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps({key: value for key, value in summary.items() if key not in ('cases', 'transitionsMap')},
                     ensure_ascii=False), flush=True)
    return 1 if summary['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
