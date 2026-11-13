#!/usr/bin/env python3
"""Read-only activation preconditions for the fixed public production sitemap.

Only GET/HEAD are issued. No credentials, cookies, bypass link or environment pull
is used. Exit 0 means activation preconditions passed, not that a recognized legacy
static sitemap is healthy. Raw bodies and unapproved headers are never persisted.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit

ORIGIN = 'https://www.promogifts.com.br'
PROJECT_ID = 'prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ'
TEAM_ID = 'team_QyN41X0q8hrqhW80AwokbFLv'
LEGACY_SHA256 = '699714ba93573f888e5393c346a97a16e6ca1f124f5ac68e1b6b8a9779d55345'
LEGACY_BYTES = 1718
MAX_BYTES = 8 * 1024 * 1024
MAX_SITEMAP_COUNT = 15001
SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
REQUESTS = (('GET', '/api/sitemap'), ('HEAD', '/api/sitemap'),
            ('GET', '/sitemap.xml'), ('HEAD', '/sitemap.xml'), ('GET', '/api/health'))
SAFE_HEADERS = frozenset({
    'content-type', 'content-length', 'cache-control', 'cdn-cache-control',
    'vercel-cdn-cache-control', 'x-sitemap-count', 'x-request-id', 'x-vercel-id',
    'x-vercel-cache', 'age', 'etag', 'last-modified', 'vary', 'server',
    'content-encoding', 'x-matched-path', 'x-vercel-matched-path',
})


def parse_headers(text: str) -> dict[str, str]:
    """Keep the last response block, excluding proxy CONNECT and private headers."""
    headers: dict[str, str] = {}
    for line in text.splitlines():
        if re.match(r'^HTTP/\S+\s+[0-9]{3}(?:\s|$)', line):
            headers = {}
        elif ':' in line:
            key, value = line.split(':', 1)
            key = key.strip().lower()
            if key in SAFE_HEADERS or key == 'location':
                headers[key] = (headers[key] + ', ' if key in headers else '') + value.strip()
    return headers


def _int(value: object) -> int | None:
    text = str(value)
    return int(text) if re.fullmatch(r'[0-9]{1,6}', text) else None


def probe(method: str, endpoint: str) -> dict:
    if (method, endpoint) not in REQUESTS:
        raise ValueError('Only the five fixed read-only requests are permitted')
    with tempfile.TemporaryDirectory(prefix='sitemap-public-probe-') as temporary:
        headers_path = Path(temporary) / 'headers'
        body_path = Path(temporary) / 'body'
        command = ['curl', '--disable', '--silent', '--show-error', '--proto', '=https',
                   '--max-redirs', '0', '--max-time', '20', '--max-filesize', str(MAX_BYTES),
                   '--header', 'Accept-Encoding: identity', '--header', 'Accept: application/xml, application/json',
                   '--user-agent', 'PromoGifts-Sitemap-ReadOnly-Probe/1',
                   '--dump-header', str(headers_path), '--output', os.devnull if method == 'HEAD' else str(body_path),
                   '--write-out', '{"status":"%{http_code}","connect":"%{http_connect}","seconds":"%{time_total}"}']
        command += ['--head'] if method == 'HEAD' else ['--request', 'GET']
        command.append(ORIGIN + endpoint)
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=25, check=False)
            try:
                stats = json.loads(result.stdout)
            except (ValueError, TypeError):
                stats = {}
            code = result.returncode
            status = _int(stats.get('status', '000')) or None
            connect = _int(stats.get('connect', '000')) or None
            try:
                duration = float(stats.get('seconds', '0'))
                duration = duration if math.isfinite(duration) else None
            except (ValueError, TypeError):
                duration = None
            transport = ('proxy_connect_denied' if connect and connect != 200 else
                         'timeout' if code == 28 else 'response_too_large' if code == 63 else
                         'tls_error' if code == 60 else 'transport_error' if code else 'ok')
        except subprocess.TimeoutExpired:
            code, status, connect, duration, transport = 124, None, None, None, 'timeout'
        except FileNotFoundError:
            code, status, connect, duration, transport = 127, None, None, None, 'curl_unavailable'
        headers = parse_headers(headers_path.read_text(errors='replace')) if headers_path.exists() else {}
        body = b''
        if method == 'GET' and body_path.exists():
            if body_path.stat().st_size > MAX_BYTES:
                code, transport = 63, 'response_too_large'
            else:
                body = body_path.read_bytes()
        reached = status is not None and connect in (None, 200)
        return {'method': method, 'endpoint': endpoint, 'status': status, 'connect_status': connect,
                'curl_exit': code, 'transport': transport, 'origin_reached': reached,
                'seconds': duration, 'headers': headers, 'body': body,
                'head_body_not_requested': method == 'HEAD'}


def cache_is_declared(headers: dict[str, str]) -> bool:
    pieces = [part.strip().lower() for part in headers.get('cache-control', '').split(',')]
    directives = {}
    for part in pieces:
        key = part.split('=', 1)[0].strip()
        value = part.split('=', 1)[1].strip().strip('"') if '=' in part else True
        if key in directives and directives[key] != value:
            return False
        directives[key] = value
    return (directives.get('public') is True and directives.get('max-age') == '43200'
            and directives.get('stale-while-revalidate') == '86400'
            and 'private' not in directives and 'no-store' not in directives and 'no-cache' not in directives)


def xml_metadata(body: bytes) -> dict:
    metadata = {'valid_urlset': False, 'count': None, 'canonical_locations': False,
                'duplicate_count': None, 'limit_reached': False, 'error': None}
    if len(body) > MAX_BYTES:
        return {**metadata, 'error': 'xml_too_large'}
    try:
        text = body.decode('utf-8-sig')
        if re.search(r'<!\s*(?:DOCTYPE|ENTITY)\b', text, re.IGNORECASE):
            return {**metadata, 'error': 'xml_entities_or_doctype_forbidden'}
        root = ET.fromstring(text)
    except (UnicodeError, ET.ParseError):
        return {**metadata, 'error': 'invalid_xml'}
    if root.tag != '{' + SITEMAP_NS + '}urlset':
        return {**metadata, 'error': 'unexpected_xml_root'}
    url_tag = '{' + SITEMAP_NS + '}url'
    loc_tag = '{' + SITEMAP_NS + '}loc'
    standard_fields = {loc_tag, *('{' + SITEMAP_NS + '}' + name for name in ('lastmod', 'changefreq', 'priority'))}
    if ((root.text or '').strip()
            or any(child.tag != url_tag or (child.tail or '').strip() for child in root)):
        return {**metadata, 'error': 'invalid_urlset_structure'}
    urls = list(root)
    locations = []
    canonical = True
    for entry in urls:
        if (entry.text or '').strip() or any((child.tail or '').strip() for child in entry):
            return {**metadata, 'error': 'invalid_url_structure'}
        for child in entry:
            if child.tag in standard_fields:
                if len(child):
                    return {**metadata, 'error': 'nested_sitemap_field_markup'}
            elif (not child.tag.startswith('{') or child.tag.startswith('{' + SITEMAP_NS + '}')
                  or child.tag.rsplit('}', 1)[-1] in ('urlset', 'url', 'loc')):
                return {**metadata, 'error': 'unexpected_url_child'}
        locs = entry.findall(loc_tag)
        if len(locs) != 1 or not locs[0].text:
            canonical = False
            continue
        value = locs[0].text.strip()
        locations.append(value)
        try:
            parsed = urlsplit(value)
            valid = (parsed.scheme == 'https' and parsed.hostname == 'www.promogifts.com.br'
                     and parsed.port in (None, 443) and not parsed.username and not parsed.password)
        except ValueError:
            valid = False
        canonical = canonical and valid
    count = len(urls)
    return {**metadata, 'valid_urlset': True, 'count': count,
            'canonical_locations': canonical and len(locations) == count,
            'duplicate_count': len(locations) - len(set(locations)),
            'limit_reached': count == MAX_SITEMAP_COUNT}


def safe_response(response: dict) -> dict:
    body = response.get('body', b'')
    fields = ('method', 'endpoint', 'status', 'connect_status', 'curl_exit', 'transport',
              'origin_reached', 'seconds', 'head_body_not_requested')
    redirect = None
    location = response.get('headers', {}).get('location')
    if location:
        try:
            target = urlsplit(location)
            host = target.hostname
            redirect = {'host': host if host and re.fullmatch(r'[A-Za-z0-9.-]{1,253}', host) else None,
                        'same_origin': not target.netloc or (target.scheme == 'https' and host == 'www.promogifts.com.br' and target.port in (None, 443)),
                        'query_omitted': bool(target.query)}
        except ValueError:
            redirect = {'invalid_target': True}
    return {**{key: response.get(key) for key in fields},
            'headers': {key: value[:512] for key, value in response.get('headers', {}).items() if key in SAFE_HEADERS},
            'redirect': redirect,
            'body_bytes': len(body), 'body_sha256': hashlib.sha256(body).hexdigest() if body else None}


def check_xml_response(response: dict, allow_legacy: bool = False) -> dict:
    errors = []
    headers = response.get('headers', {})
    body = response.get('body', b'')
    if response.get('transport') != 'ok' or not response.get('origin_reached'):
        errors.append('origin_transport_not_verified')
    if response.get('status') != 200:
        errors.append('http_status_not_200')
    if headers.get('content-type', '').split(';', 1)[0].strip().lower() not in ('application/xml', 'text/xml'):
        errors.append('xml_content_type_missing')
    head = response['method'] == 'HEAD'
    metadata = None if head else xml_metadata(body)
    count = _int(headers.get('x-sitemap-count', ''))
    dynamic_errors = list(errors)
    if not cache_is_declared(headers):
        dynamic_errors.append('dynamic_cache_contract_missing')
    if count is None or not 1 <= count <= MAX_SITEMAP_COUNT:
        dynamic_errors.append('dynamic_count_header_invalid')
    if metadata is not None:
        if not metadata['valid_urlset']:
            dynamic_errors.append(metadata['error'])
        if not metadata['canonical_locations']:
            dynamic_errors.append('noncanonical_or_missing_locations')
        if metadata['count'] is None or not 1 <= metadata['count'] <= MAX_SITEMAP_COUNT:
            dynamic_errors.append('xml_url_count_invalid')
        if count != metadata['count']:
            dynamic_errors.append('xml_count_header_mismatch')
    legacy = (allow_legacy and not head and not errors and len(body) == LEGACY_BYTES
              and hashlib.sha256(body).hexdigest() == LEGACY_SHA256)
    return {'response': safe_response(response), 'xml': metadata,
            'dynamic_healthy': not dynamic_errors, 'known_legacy_static_shadow': legacy,
            'basic_errors': errors, 'dynamic_errors': dynamic_errors, 'count_header': count}


def check_identity(response: dict, expected_sha: str) -> dict:
    errors = []
    if response.get('transport') != 'ok' or not response.get('origin_reached'):
        errors.append('identity_transport_not_verified')
    if response.get('status') != 200:
        errors.append('identity_http_status_not_200')
    headers = response.get('headers', {})
    if headers.get('content-type', '').split(';', 1)[0].strip().lower() != 'application/json':
        errors.append('identity_json_content_type_missing')
    if 'no-store' not in {part.strip().lower() for part in headers.get('cache-control', '').split(',')}:
        errors.append('identity_response_not_no_store')
    commit = None
    try:
        data = json.loads(response.get('body', b'').decode('utf-8'))
        if not isinstance(data, dict) or data.get('status') != 'ok':
            errors.append('identity_status_not_ok')
        raw = data.get('commit') if isinstance(data, dict) else None
        if isinstance(raw, str) and re.fullmatch(r'[0-9a-fA-F]{40}', raw):
            commit = raw.lower()
        else:
            errors.append('identity_commit_missing_or_invalid')
    except (UnicodeError, ValueError):
        errors.append('identity_json_invalid')
    if commit != expected_sha:
        errors.append('served_commit_differs_from_expected_main')
    return {'response': safe_response(response), 'served_commit': commit, 'expected_commit': expected_sha,
            'verified': not errors, 'errors': errors}


def evaluate(responses: list[dict], expected_sha: str) -> dict:
    if not re.fullmatch(r'[0-9a-f]{40}', expected_sha):
        raise ValueError('Expected production SHA must be 40 lowercase hexadecimal characters')
    indexed = {(response['method'], response['endpoint']): response for response in responses}
    if len(responses) != 5 or set(indexed) != set(REQUESTS):
        raise ValueError('Exactly the five fixed read-only responses are required')
    api_get = check_xml_response(indexed[('GET', '/api/sitemap')])
    api_head = check_xml_response(indexed[('HEAD', '/api/sitemap')])
    public_get = check_xml_response(indexed[('GET', '/sitemap.xml')], allow_legacy=True)
    public_head = check_xml_response(indexed[('HEAD', '/sitemap.xml')])
    identity = check_identity(indexed[('GET', '/api/health')], expected_sha)
    api_ready = api_get['dynamic_healthy'] and api_head['dynamic_healthy']
    public_contract_valid = public_get['dynamic_healthy'] and public_head['dynamic_healthy']
    legacy_ready = public_get['known_legacy_static_shadow'] and not public_head['basic_errors']
    ready = api_ready and identity['verified'] and (public_contract_valid or legacy_ready)
    public_healthy = api_ready and identity['verified'] and public_contract_valid
    return {'origin': ORIGIN, 'intended_project_id': PROJECT_ID,
            'project_management_api_verified': False, 'requests_expected': 5,
            'activation_preconditions_ready': ready, 'production_sitemap_healthy': public_healthy,
            'public_http_contract_valid': public_contract_valid,
            'known_legacy_static_shadow': public_get['known_legacy_static_shadow'],
            'status': 'READY_CANONICAL' if ready and public_healthy else
                      'READY_KNOWN_LEGACY_SHADOW_NOT_PUBLIC_HEALTHY' if ready else 'BLOCKED',
            'api_get': api_get, 'api_head': api_head, 'public_get': public_get,
            'public_head': public_head, 'identity': identity,
            'legacy_expected_sha256': LEGACY_SHA256,
            'limits': ['HEAD headers do not prove an on-wire empty body; no HEAD body was downloaded.',
                       'Cache-Control is checked; a CDN HIT is only an observation when present in headers.',
                       'Separate responses can represent different catalog/cache snapshots; counts are not forced equal.',
                       'GitHub/base SHA plus /api/health identifies code served at the fixed origin, not project ownership.',
                       'No raw response body, cookies, authentication header or serialization exception is recorded.']}


def summary(report: dict) -> str:
    public = 'SIM' if report.get('production_sitemap_healthy') else 'NÃO'
    ready = 'SIM' if report.get('activation_preconditions_ready') else 'NÃO'
    rows = ['# Sitemap — precondições somente leitura', '',
            f'- Precondições para ativação atendidas: **{ready}**.',
            f'- Sitemap público atual saudável: **{public}**.',
            f'- Estado: `{report.get("status", "BLOCKED")}`.']
    if report.get('known_legacy_static_shadow'):
        rows += ['', '**O XML público continua sendo a sombra estática legada conhecida; não está declarado saudável.**',
                 'Apenas o hash exato revisado é diagnóstico preexistente. A API dinâmica e o SHA servido precisam passar.']
    rows += ['', 'Somente cinco GET/HEAD fixos; sem deploy, credenciais, cookies, bypass, DDL ou redirects.',
             'O relatório JSON contém os status, cabeçalhos públicos permitidos, hashes e contagens.']
    return '\n'.join(rows) + '\n'


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-sha', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--summary', type=Path, required=True)
    args = parser.parse_args()
    expected_sha = args.expected_sha.lower()
    if not re.fullmatch(r'[0-9a-f]{40}', expected_sha):
        parser.error('--expected-sha must be a full hexadecimal commit SHA')
    repo = Path(__file__).resolve().parents[1]
    try:
        anchor = json.loads((repo / '.vercel/project.json').read_text())
        valid_anchor = anchor.get('projectId') == PROJECT_ID and anchor.get('orgId') == TEAM_ID
    except (OSError, ValueError, AttributeError):
        valid_anchor = False
    if valid_anchor:
        report = evaluate([probe(method, endpoint) for method, endpoint in REQUESTS], expected_sha)
    else:
        report = {'status': 'BLOCKED_CANONICAL_ANCHOR', 'activation_preconditions_ready': False,
                  'production_sitemap_healthy': False, 'requests_issued': 0}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.summary.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    args.summary.write_text(summary(report))
    print(json.dumps({key: report[key] for key in ('status', 'activation_preconditions_ready', 'production_sitemap_healthy')}, ensure_ascii=False))
    return 0 if report['activation_preconditions_ready'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
