#!/usr/bin/env python3
"""Prova que o trigger do banco viola o invariante de um campo de desconto.

Etapa 108 de docs/qa/04-PLANO.md (achado ACH-090).

O front mantem SO UM campo de desconto nao-zero em `quotes` (quoteHelpers.ts:128-144).
O trigger `fn_quotes_recalc_subtotal_from_items` (producao, SCHEMA_LIVE.sql:38853)
grava `discount_amount` derivado de `discount_percent` e NAO zera o percentual de
origem: a cotacao passa a ter os dois campos preenchidos. O alerta de
useQuoteBuilderState.helpers.ts:541-543 esta certo; quem viola o invariante e o
banco. Este teste mede o defeito; a correcao e a etapa 109 (DDL, APROVACAO).

Nunca le DATABASE_URL nem credencial Supabase; todo SQL vai por docker exec para
um container descartavel, network-isolated (--network none) e com label de posse.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import time
import uuid

HERE = Path(__file__).resolve().parent
FIXTURE = HERE / 'discount-fixture.sql'
IMAGE = 'postgres:17'
LABEL = 'codex.quote-discount-invariant-test'
DOCKER = ['docker', '--host=unix:///var/run/docker.sock']
SELECTORS = ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH')
ENV = {key: value for key, value in os.environ.items() if key not in SELECTORS}
QUOTE_ID = '40000000-0000-0000-0000-0000000000c1'


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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=Path('work/quote-discount-invariant-sql'))
    args = parser.parse_args()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    if not FIXTURE.is_file():
        raise RuntimeError('Required reviewed file is missing: ' + str(FIXTURE))

    daemon = docker('info', '--format', '{{.ServerVersion}}')
    if daemon.returncode:
        raise RuntimeError('Local Docker daemon is unavailable: ' + daemon.stderr)

    token = uuid.uuid4().hex
    name = 'quote-discount-invariant-test-' + token[:12]
    started = docker('run', '--pull=missing', '--name', name,
                     '--label', LABEL + '=' + token,
                     '--network', 'none', '--env', 'POSTGRES_HOST_AUTH_METHOD=trust',
                     '--detach', IMAGE)
    if started.returncode:
        raise RuntimeError('Could not start the disposable PostgreSQL 17 container: ' + started.stderr)
    container_id = started.stdout.strip()
    try:
        return run_cases(container_id, output)
    finally:
        cleanup_owned_container(container_id, token)


def run_cases(container: str, output: Path) -> int:
    def psql(body: str):
        return docker('exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-U', 'postgres',
                      '-v', 'ON_ERROR_STOP=1', input=body)

    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if docker('exec', container, 'pg_isready', '-U', 'postgres').returncode == 0:
            break
        time.sleep(0.25)
    else:
        raise RuntimeError('Disposable PostgreSQL did not become ready within 30 seconds.')

    # O entrypoint do postgres:17 sobe um servidor de inicializacao e o derruba
    # logo depois; pg_isready responde nesse instante e o psql pega "database
    # system is shutting down". Reaplica a fixture ate o servidor definitivo subir.
    setup = None
    for _ in range(40):
        candidate = psql('BEGIN;\n' + FIXTURE.read_text() + '\nCOMMIT;')
        write = candidate
        if candidate.returncode == 0:
            setup = candidate
            break
        if 'shutting down' not in candidate.stderr and 'starting up' not in candidate.stderr:
            setup = candidate
            break
        time.sleep(0.5)
    if setup is None:
        raise RuntimeError('discount-fixture.sql never ran: server stayed unavailable')
    (output / 'fixture.sql.log').write_text(setup.stdout + setup.stderr)
    if setup.returncode:
        raise RuntimeError('discount-fixture.sql failed: ' + setup.stderr)

    # Cenario real: vendedor digita 10% de desconto e adiciona as linhas.
    # Tudo em transacao revertida: nenhum dado persiste.
    body = (
        'BEGIN;\n'
        'INSERT INTO public.quotes(id, quote_number, client_name, status, discount_percent) '
        "VALUES ('" + QUOTE_ID + "','ORC-ACH-090','Fixture','draft',10);\n"
        'INSERT INTO public.quote_items(quote_id, product_name, quantity, unit_price) '
        "VALUES ('" + QUOTE_ID + "','Caneca',10,10);\n"
        'SELECT json_build_object('
        "'discount_percent', discount_percent, "
        "'discount_amount', discount_amount, "
        "'subtotal', subtotal, 'total', total) "
        "FROM public.quotes WHERE id='" + QUOTE_ID + "';\n"
        'ROLLBACK;\n'
    )
    proc = psql(body)
    (output / 'quote-after-recalc.log').write_text(proc.stdout + proc.stderr)
    if proc.returncode:
        raise RuntimeError('Scenario failed: ' + proc.stderr)

    row = json.loads(proc.stdout.strip().splitlines()[-1])
    pct = float(row['discount_percent'])
    amount = float(row['discount_amount'])
    both_nonzero = pct != 0 and amount != 0

    summary = {
        'etapa': '108',
        'achado': 'ACH-090',
        'fixture': FIXTURE.name,
        'postgres': '17',
        'productionTouched': False,
        'invariant': 'no maximo um de discount_percent / discount_amount diferente de zero',
        'quoteAfterRecalc': row,
        'invariantViolated': both_nonzero,
        'tests': 1,
        'passed': 0 if both_nonzero else 1,
        'failed': 1 if both_nonzero else 0,
    }
    (output / 'sql-test-results.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(('FAIL ' if both_nonzero else 'PASS ')
          + 'invariante de desconto unico em public.quotes', flush=True)
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    return 1 if both_nonzero else 0


if __name__ == '__main__':
    raise SystemExit(main())