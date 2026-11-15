#!/usr/bin/env python3
"""Collect bounded, sanitized evidence from one immutable GitHub trace artifact."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import signal
import stat
import struct
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

REPOSITORY = 'adm01-debug/Promo_Gifts_V4'
REPOSITORY_ID = 1241858325
ARTIFACT_ID = 13761206861
RUN_ID = 42807840825
HEAD_SHA = '810d2c2e542959953b3890148b28f8ad83557c79'
ARTIFACT_NAME = 'personalization-e2e-artifacts'
EXPECTED_SIZE = 66441354
EXPECTED_SHA256 = '355979b251c12001ad77d3103f0cc3b8f0973977e8124d6a60e41cc2bb6769b6'
TRACE_MEMBERS = tuple('playwright-report/data/' + name + '.zip' for name in (
    '1cde2120e3f0b392bdf3002ecd380079e3f9c16e', '6ea22d9ce34d0077829990722c51fbd3d063c3da',
    'dc4bc2b7fc687e3e7b9b2d62c767bd524de5d27c', 'fd859cf4b24443a0285886b96eddd3d32bf3ceeb'))
API_URL = f'https://api.github.com/repos/{REPOSITORY}/actions/artifacts/{ARTIFACT_ID}'
MIB = 1024 * 1024
OUTER_LIMIT = 80 * MIB
INNER_LIMIT = 32 * MIB
INNER_DECLARED_LIMIT = 128 * MIB
TEXT_LIMIT = 16 * MIB
SELECTED_LIMIT = 64 * MIB
LINE_LIMIT = 2 * MIB
MAX_EVENTS = 200000
DEADLINE_SECONDS = 90
HTTP_METHODS = frozenset(('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT'))
REST_NAMES = frozenset(('products', 'v_products_public', 'suppliers', 'v_suppliers_public',
    'categories', 'product_images', 'product_variants', 'product_videos', 'product_materials',
    'material_types', 'color_variations', 'v_kit_component_complete', 'product_kit_components',
    'system_kill_switches', 'profiles', 'product_views'))
LOCAL_MODULES = frozenset(('/src/pages/products/ProductDetail.tsx',
    '/src/pages/products/product-detail/ProductDetailHero.tsx', '/src/hooks/products/index.ts',
    '/src/hooks/products/useProducts.ts', '/src/services/productService.ts',
    '/src/lib/external-db/products-detail.ts', '/src/integrations/supabase/client.ts',
    '/src/main.tsx', '/src/App.tsx'))
ACTION_METHODS = frozenset(('goto', 'click', 'dblclick', 'fill', 'press', 'check', 'uncheck',
    'expect', 'waitForSelector', 'waitForURL', 'waitForLoadState', 'waitForTimeout',
    'waitForFunction', 'evaluateExpression', 'selectOption', 'dispatchEvent', 'tracingGroup'))
ACTION_CLASSES = frozenset(('Frame', 'Page', 'Locator', 'ElementHandle', 'BrowserContext',
    'APIRequestContext', 'Test', 'Tracing'))
ERROR_CLASSES = frozenset(('Error', 'TimeoutError', 'AssertionError', 'TypeError',
    'AbortError', 'NetworkError', 'ProtocolError', 'TargetClosedError'))
NETWORK_ERRORS = frozenset(('ERR_ABORTED', 'ERR_TIMED_OUT', 'ERR_CONNECTION_RESET',
    'ERR_CONNECTION_REFUSED', 'ERR_CONNECTION_CLOSED', 'ERR_NAME_NOT_RESOLVED',
    'ERR_FAILED', 'ERR_INTERNET_DISCONNECTED', 'ERR_CERT_AUTHORITY_INVALID'))


class DiagnosticError(Exception):
    """Only fixed, public codes are allowed to cross the output boundary."""


class Budget:
    def __init__(self):
        self.end = time.monotonic() + DEADLINE_SECONDS

    def __enter__(self):
        self.previous_handler = signal.getsignal(signal.SIGALRM)
        self.previous_timer = signal.getitimer(signal.ITIMER_REAL)
        signal.signal(signal.SIGALRM, self.expired)
        signal.setitimer(signal.ITIMER_REAL, max(0.001, self.end - time.monotonic()))
        return self

    def expired(self, *_args):
        raise DiagnosticError('DEADLINE_EXCEEDED')

    def __exit__(self, *_args):
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, self.previous_handler)
        if self.previous_timer[0]:
            signal.setitimer(signal.ITIMER_REAL, *self.previous_timer)

    def check(self):
        remaining = self.end - time.monotonic()
        if remaining <= 0:
            raise DiagnosticError('DEADLINE_EXCEEDED')
        return min(20, remaining)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        return None


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise DiagnosticError('DUPLICATE_JSON_KEY')
        result[key] = value
    return result


def strict_json(data):
    try:
        return json.loads(data, object_pairs_hook=_pairs,
                          parse_constant=lambda _value: (_ for _ in ()).throw(ValueError()))
    except (ValueError, UnicodeError, RecursionError, TypeError):
        raise DiagnosticError('INVALID_JSON') from None


def trusted_asset(url):
    try:
        parts = urllib.parse.urlsplit(url)
        host = parts.hostname or ''
        valid_host = (host.endswith('.blob.core.windows.net')
                      or host.endswith('.actions.githubusercontent.com')
                      or host in ('objects.githubusercontent.com', 'release-assets.githubusercontent.com'))
        return (len(url) <= 8192 and not re.search(r'[\x00-\x20\x7f]', url)
                and parts.scheme == 'https' and valid_host and not parts.username
                and not parts.password and parts.port in (None, 443) and not parts.fragment)
    except (ValueError, TypeError):
        return False


def fetch_url(url, budget, limit, token=None, allow_redirect=False):
    if token and url not in (API_URL, API_URL + '/zip'):
        raise DiagnosticError('AUTHORIZATION_DESTINATION_REJECTED')
    if not token and not trusted_asset(url):
        raise DiagnosticError('ASSET_DESTINATION_REJECTED')
    headers = {'User-Agent': 'PromoGifts-Fixed-Trace-Diagnostics/1', 'Accept': 'application/vnd.github+json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
        headers['X-GitHub-Api-Version'] = '2022-11-28'
    request = urllib.request.Request(url, headers=headers, method='GET')
    opener = urllib.request.build_opener(NoRedirect())
    try:
        response = opener.open(request, timeout=budget.check())
    except urllib.error.HTTPError as error:
        code = error.code
        location = error.headers.get('Location') if allow_redirect and code == 302 else None
        error.close()
        if location is not None:
            if not trusted_asset(location):
                raise DiagnosticError('REDIRECT_DESTINATION_REJECTED')
            return location
        raise DiagnosticError('HTTP_' + str(code) if isinstance(code, int) and 100 <= code <= 599 else 'HTTP_ERROR') from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise DiagnosticError('TRANSPORT_ERROR') from None
    try:
        if response.status != 200:
            raise DiagnosticError('HTTP_STATUS_REJECTED')
        chunks, size = [], 0
        while True:
            budget.check()
            chunk = response.read(min(65536, limit + 1 - size))
            if not chunk:
                break
            size += len(chunk)
            if size > limit:
                raise DiagnosticError('DOWNLOAD_SIZE_LIMIT')
            chunks.append(chunk)
        return b''.join(chunks)
    except (TimeoutError, OSError):
        raise DiagnosticError('TRANSPORT_ERROR') from None
    finally:
        response.close()


def download_fixed(token, budget):
    if not token or re.search(r'[\r\n]', token):
        raise DiagnosticError('TOKEN_UNAVAILABLE')
    metadata = strict_json(fetch_url(API_URL, budget, MIB, token=token))
    if not isinstance(metadata, dict):
        raise DiagnosticError('METADATA_MISMATCH')
    run = metadata.get('workflow_run')
    if not isinstance(run, dict):
        raise DiagnosticError('METADATA_MISMATCH')
    expected = {'id': ARTIFACT_ID, 'name': ARTIFACT_NAME, 'size_in_bytes': EXPECTED_SIZE,
                'digest': 'sha256:' + EXPECTED_SHA256}
    run_expected = {'id': RUN_ID, 'repository_id': REPOSITORY_ID,
                    'head_repository_id': REPOSITORY_ID, 'head_sha': HEAD_SHA}
    if (metadata.get('expired') is not False
            or any(metadata.get(key) != value for key, value in expected.items())
            or any(run.get(key) != value for key, value in run_expected.items())):
        raise DiagnosticError('METADATA_MISMATCH')
    payload = fetch_url(API_URL + '/zip', budget, OUTER_LIMIT, token=token, allow_redirect=True)
    if isinstance(payload, str):
        payload = fetch_url(payload, budget, OUTER_LIMIT)
    if len(payload) != EXPECTED_SIZE or hashlib.sha256(payload).hexdigest() != EXPECTED_SHA256:
        raise DiagnosticError('ARCHIVE_IDENTITY_MISMATCH')
    return payload


def preflight_directory(data, count_limit):
    """Bound the central directory before ZipFile allocates its entry objects."""
    end = data.rfind(b'PK\x05\x06', max(0, len(data) - 65557))
    if end < 0 or end + 22 > len(data):
        raise DiagnosticError('INVALID_ZIP')
    _, disk, cd_disk, disk_count, count, size, offset, comment = struct.unpack_from('<4s4H2LH', data, end)
    if disk or cd_disk or disk_count != count or end + 22 + comment != len(data):
        raise DiagnosticError('INVALID_ZIP')
    locator = end >= 20 and data[end-20:end-16] == b'PK\x06\x07'
    if count == 65535 or size == 0xffffffff or offset == 0xffffffff or locator:
        if not locator:
            raise DiagnosticError('INVALID_ZIP64')
        _, disk, location, disks = struct.unpack_from('<4sLQL', data, end - 20)
        if disk or disks != 1 or location + 56 != end - 20 or data[location:location+4] != b'PK\x06\x06':
            raise DiagnosticError('INVALID_ZIP64')
        fields = struct.unpack_from('<4sQ2H2L4Q', data, location)
        if fields[1] != 44 or fields[4] or fields[5] or fields[6] != fields[7]:
            raise DiagnosticError('INVALID_ZIP64')
        count, size, offset = fields[7], fields[8], fields[9]
    directory_end = location if locator else end
    if count > count_limit or size > count_limit * 4096 or offset + size != directory_end:
        raise DiagnosticError('ZIP_DIRECTORY_LIMIT')
    position, observed = offset, 0
    while position < offset + size:
        if position + 46 > len(data) or data[position:position+4] != b'PK\x01\x02':
            raise DiagnosticError('INVALID_ZIP')
        filename, extra, note = struct.unpack_from('<3H', data, position + 28)
        observed += 1
        if observed > count_limit or filename > 1024 or position + 46 + filename + extra + note > offset + size:
            raise DiagnosticError('ZIP_DIRECTORY_LIMIT')
        position += 46 + filename + extra + note
    if observed != count:
        raise DiagnosticError('INVALID_ZIP')


def entries(archive, count_limit, declared_limit):
    seen, total = set(), 0
    infos = archive.infolist()
    if len(infos) > count_limit:
        raise DiagnosticError('ZIP_ENTRY_LIMIT')
    for info in infos:
        name = info.filename
        components = name.rstrip('/').split('/')
        mode = info.external_attr >> 16
        if (name != info.orig_filename or len(name) > 1024 or not name or name.startswith('/')
                or '\\' in name or re.match(r'^[A-Za-z]:', name)
                or re.search(r'[\x00-\x1f\x7f]', name)
                or any(part in ('', '.', '..') for part in components)
                or name.rstrip('/') in seen or stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)
                or info.flag_bits & 1 or info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)):
            raise DiagnosticError('ZIP_ENTRY_REJECTED')
        seen.add(name.rstrip('/'))
        total += info.file_size
        if total > declared_limit:
            raise DiagnosticError('ZIP_DECLARED_LIMIT')
    return infos, total


def finite(value):
    try:
        return value if type(value) in (int, float) and math.isfinite(value) and value >= 0 else None
    except OverflowError:
        return None


def safe_url(value):
    if not isinstance(value, str):
        return 'redacted-host', '/:redacted-path'
    try:
        parts = urllib.parse.urlsplit(value)
        if parts.scheme not in ('http', 'https', 'ws', 'wss') or parts.username or parts.password:
            return 'redacted-host', '/:redacted-path'
        host = parts.hostname
        if host in ('localhost', '127.0.0.1', '::1'):
            safe_host = 'localhost'
        elif host in ('doufsxqlfjyuvxuezpln.supabase.co', 'www.promogifts.com.br'):
            safe_host = host
        else:
            return 'other-host', '/:redacted-path'
        path = parts.path
        if path in LOCAL_MODULES or path in ('/', '/produtos', '/login', '/simulador', '/@vite/client'):
            return safe_host, path
        if path.startswith('/rest/v1/') and path[len('/rest/v1/'):] in REST_NAMES:
            return safe_host, path
        if path.startswith('/rest/v1/rpc/'):
            return safe_host, '/rest/v1/rpc/:procedure'
        for prefix, template in (('/auth/v1/', '/auth/v1/:operation'),
                ('/functions/v1/', '/functions/v1/:function'), ('/realtime/v1/', '/realtime/v1/:channel'),
                ('/storage/v1/', '/storage/v1/:redacted-object'), ('/produto/', '/produto/:id'),
                ('/assets/', '/assets/:asset'), ('/node_modules/', '/node_modules/:module'),
                ('/src/', '/src/:module')):
            if path.startswith(prefix):
                return safe_host, template
        return safe_host, '/:redacted-path'
    except (ValueError, TypeError):
        return 'redacted-host', '/:redacted-path'


def network_row(event, ordinal):
    snapshot = event.get('snapshot')
    if not isinstance(snapshot, dict):
        raise DiagnosticError('INVALID_NETWORK_SCHEMA')
    request, response = snapshot.get('request'), snapshot.get('response')
    if not isinstance(request, dict) or not isinstance(response, dict):
        raise DiagnosticError('INVALID_NETWORK_SCHEMA')
    host, path = safe_url(request.get('url'))
    method = request.get('method')
    status = response.get('status')
    status = status if type(status) is int and 100 <= status <= 599 else None
    resource = snapshot.get('_resourceType')
    resource = resource if resource in ('document', 'script', 'fetch', 'xhr', 'image', 'stylesheet', 'websocket') else 'other'
    failure = response.get('_failureText')
    error_class = None
    if isinstance(failure, str) and failure:
        match = re.search(r'(?:net::)?(ERR_[A-Z_]+)', failure)
        error_class = match[1] if match and match[1] in NETWORK_ERRORS else 'NetworkError'
    elif status is not None and status >= 400:
        error_class = 'HTTPError'
    timings = snapshot.get('timings')
    receive = finite(timings.get('receive')) if isinstance(timings, dict) else None
    state = ('aborted' if snapshot.get('_wasAborted') is True else
             'failed' if error_class else
             ('long-lived-websocket' if status == 101 else 'websocket-handshake-unverified') if resource == 'websocket' else
             'headers-unverified' if status is None else
             'body-or-timing-unverified' if receive is None else 'response-observed')
    return {'request': ordinal, 'method': method if isinstance(method, str) and method in HTTP_METHODS else 'OTHER',
            'host': host, 'path': path, 'status': status, 'durationMs': finite(snapshot.get('time')),
            'startMs': finite(snapshot.get('_monotonicTime')),
            'resource': resource, 'state': state, 'errorClass': error_class,
            'fulfilledByPlaywright': snapshot.get('_wasFulfilled') is True,
            'continuedByPlaywright': snapshot.get('_wasContinued') is True}


def action_before(event, ordinal):
    method, owner = event.get('method'), event.get('class')
    api = owner + '.' + method if isinstance(owner, str) and isinstance(method, str) and owner in ACTION_CLASSES and method in ACTION_METHODS else 'other'
    params = event.get('params')
    selector = params.get('selector') if isinstance(params, dict) else None
    labels = []
    if isinstance(selector, str):
        labels = sorted(set(re.findall(r'data-testid\s*=\s*["\x27](product-name|product-card|product-card-name)["\x27]', selector)))
    return {'action': ordinal, 'apiName': api, 'testIds': labels, 'start': finite(event.get('startTime')),
            'durationMs': None, 'errorClass': None, 'state': 'not-finished-in-trace'}


def action_error(error):
    if error is None:
        return None
    name = error.get('name') if isinstance(error, dict) else None
    return name if isinstance(name, str) and name in ERROR_CLASSES else 'OtherError'


def text_events(archive, info, budget, counters):
    if info.file_size > TEXT_LIMIT:
        raise DiagnosticError('TEXT_SIZE_LIMIT')
    with archive.open(info) as stream:
        while True:
            budget.check()
            line = stream.readline(LINE_LIMIT + 1)
            if not line:
                break
            if len(line) > LINE_LIMIT:
                raise DiagnosticError('LINE_SIZE_LIMIT')
            counters['bytes'] += len(line)
            counters['events'] += 1
            if counters['bytes'] > SELECTED_LIMIT or counters['events'] > MAX_EVENTS:
                raise DiagnosticError('SELECTED_SIZE_OR_EVENT_LIMIT')
            if not line.strip():
                continue
            event = strict_json(line)
            if not isinstance(event, dict):
                raise DiagnosticError('INVALID_EVENT')
            yield event


def analyze_inner(data, budget, counters, ordinal):
    preflight_directory(data, 4096)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        infos, declared = entries(archive, 4096, INNER_DECLARED_LIMIT)
        counters['declared'] += declared
        if counters['declared'] > INNER_DECLARED_LIMIT:
            raise DiagnosticError('INNER_DECLARED_LIMIT')
        selected = {info.filename: info for info in infos if info.filename.endswith(('.trace', '.network'))}
        counters['selectedDeclared'] += sum(info.file_size for info in selected.values())
        if (counters['selectedDeclared'] > SELECTED_LIMIT
                or not any(name.endswith('.trace') for name in selected)
                or not any(name.endswith('.network') for name in selected)):
            raise DiagnosticError('SELECTED_CONTENT_REJECTED')
        requests, actions, runtime_errors, contexts, ignored = [], [], [], 0, 0
        for name in sorted(selected):
            if not name.endswith('.trace'):
                continue
            contexts += 1
            before, version_seen = {}, False
            for event in text_events(archive, selected[name], budget, counters):
                kind = event.get('type')
                if kind == 'context-options':
                    if type(event.get('version')) is not int or event.get('version') != 10:
                        raise DiagnosticError('UNSUPPORTED_TRACE_VERSION')
                    version_seen = True
                elif kind == 'before':
                    call_id = event.get('callId')
                    if not isinstance(call_id, str) or len(call_id) > 256 or call_id in before or len(before) >= 20000:
                        raise DiagnosticError('ACTION_ID_REJECTED')
                    before[call_id] = action_before(event, len(actions) + len(before) + 1)
                elif kind == 'after':
                    call_id = event.get('callId')
                    if not isinstance(call_id, str) or len(call_id) > 256:
                        raise DiagnosticError('ACTION_ID_REJECTED')
                    action = before.get(call_id)
                    if action is None:
                        actions.append({'action': len(actions) + len(before) + 1, 'context': contexts,
                            'apiName': 'other', 'testIds': [], 'startMs': None, 'durationMs': None,
                            'errorClass': action_error(event.get('error')), 'state': 'orphan-after'})
                        continue
                    if action['state'] != 'not-finished-in-trace':
                        raise DiagnosticError('DUPLICATE_ACTION_AFTER')
                    end = finite(event.get('endTime'))
                    action['durationMs'] = end - action['start'] if end is not None and action['start'] is not None and end >= action['start'] else None
                    action['errorClass'] = action_error(event.get('error'))
                    action['state'] = 'failed' if action['errorClass'] else 'after-observed'
                elif kind == 'event' and event.get('class') == 'BrowserContext' and event.get('method') == 'pageError':
                    params = event.get('params')
                    serialized = params.get('error') if isinstance(params, dict) else None
                    error = serialized.get('error') if isinstance(serialized, dict) else serialized
                    runtime_errors.append({'context': contexts, 'errorClass': action_error(error) or 'OtherError'})
                elif kind == 'error':
                    error = event.get('error')
                    if isinstance(error, dict) and isinstance(error.get('error'), dict):
                        error = error['error']
                    runtime_errors.append({'context': contexts, 'errorClass': action_error(error) or 'OtherError'})
                else:
                    ignored += 1
            if not version_seen:
                raise DiagnosticError('TRACE_VERSION_MISSING')
            for action in before.values():
                action['startMs'] = action.pop('start')
                action['context'] = contexts
                actions.append(action)
            network = name[:-6] + '.network'
            if network in selected:
                for event in text_events(archive, selected[network], budget, counters):
                    if event.get('type') == 'resource-snapshot':
                        row = network_row(event, len(requests) + 1)
                        row['context'] = contexts
                        requests.append(row)
                    else:
                        ignored += 1
        if any(name.endswith('.network') and name[:-8] + '.trace' not in selected for name in selected):
            raise DiagnosticError('ORPHAN_NETWORK_FILE')
        slow = sorted((row for row in requests if row['durationMs'] is not None and row['resource'] != 'websocket'),
                      key=lambda row: row['durationMs'], reverse=True)[:40]
        suspect = [row for row in requests if row['state'] not in ('response-observed', 'long-lived-websocket')]
        return {'trace': ordinal, 'contexts': contexts,
                'networkFiles': sum(name.endswith('.network') for name in selected),
                'requestCount': len(requests),
                'actionCount': len(actions), 'ignoredEvents': ignored,
                'runtimeErrorCount': len(runtime_errors), 'runtimeErrors': runtime_errors[:100],
                'pendingOrFailedCount': len(suspect), 'topSlow': slow, 'pendingOrFailed': suspect[:100],
                'failedOrUnfinishedActions': [row for row in actions if row['state'] != 'after-observed'][:100],
                'limitsApplied': {'topSlow': 40, 'pendingOrFailed': 100, 'actions': 100}}


def analyze_archive(data, budget):
    if len(data) > OUTER_LIMIT:
        raise DiagnosticError('OUTER_SIZE_LIMIT')
    try:
        preflight_directory(data, 128)
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            infos, _declared = entries(archive, 128, OUTER_LIMIT)
            indexed = {info.filename: info for info in infos}
            if (not all(name in indexed for name in TRACE_MEMBERS)
                    or any(info.filename.endswith('.zip') and info.filename not in TRACE_MEMBERS for info in infos)):
                raise DiagnosticError('TRACE_COUNT_MISMATCH')
            traces = [indexed[name] for name in TRACE_MEMBERS]
            counters = {'bytes': 0, 'events': 0, 'declared': 0, 'selectedDeclared': 0}
            results = []
            for ordinal, info in enumerate(traces, 1):
                budget.check()
                if info.file_size > INNER_LIMIT:
                    raise DiagnosticError('INNER_SIZE_LIMIT')
                with archive.open(info) as stream:
                    payload = stream.read(INNER_LIMIT + 1)
                if len(payload) > INNER_LIMIT:
                    raise DiagnosticError('INNER_SIZE_LIMIT')
                results.append(analyze_inner(payload, budget, counters, ordinal))
            return {'status': 'COLLECTED', 'e2eHealthVerified': False, 'traces': results,
                    'selectedBytes': counters['bytes'], 'eventsRead': counters['events']}
    except (zipfile.BadZipFile, zipfile.LargeZipFile, EOFError, NotImplementedError, RuntimeError, struct.error):
        raise DiagnosticError('ARCHIVE_FORMAT_OR_CRC_ERROR') from None


def markdown(report):
    rows = ['# Personalização — evidência sanitizada de trace', '',
            'Estado: **' + report['status'] + '**. Esta coleta não valida a saúde do E2E.',
            f'Artifact fixo: {ARTIFACT_ID}; execução: {RUN_ID}; commit: {HEAD_SHA}.']
    if report['status'] != 'COLLECTED':
        rows.append('Falha: ' + report['errorClass'] + '. Nenhum corpo ou erro bruto foi publicado.')
    else:
        for trace in report['traces']:
            rows.append(f'- Trace {trace["trace"]}: {trace["requestCount"]} requests; {trace["pendingOrFailedCount"]} sem conclusão verificada ou com erro.')
        rows.append('200 e duração positiva não provam conclusão do corpo; WebSockets são separados. Consulte o JSON limitado.')
    return '\n'.join(rows) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--summary', type=Path, required=True)
    args = parser.parse_args()
    budget = Budget()
    try:
        with budget:
            payload = download_fixed(os.environ.get('GITHUB_TOKEN'), budget)
            report = analyze_archive(payload, budget)
    except DiagnosticError as error:
        report = {'status': 'FAILED', 'e2eHealthVerified': False, 'errorClass': error.args[0]}
    except Exception:
        report = {'status': 'FAILED', 'e2eHealthVerified': False, 'errorClass': 'INTERNAL_ERROR'}
    report['provenance'] = {'repository': REPOSITORY, 'artifactId': ARTIFACT_ID, 'runId': RUN_ID,
                            'headSha': HEAD_SHA, 'expectedSha256': EXPECTED_SHA256}
    try:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.summary.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, allow_nan=False, indent=2) + '\n')
        args.summary.write_text(markdown(report))
    except Exception:
        print('{"status":"FAILED","errorClass":"OUTPUT_ERROR"}')
        return 1
    print(json.dumps({'status': report['status'], 'e2eHealthVerified': False}))
    return 0 if report['status'] == 'COLLECTED' else 1


if __name__ == '__main__':
    raise SystemExit(main())

