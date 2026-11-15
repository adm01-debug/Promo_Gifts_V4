"""Offline contracts: all HTTP and authenticated artifact contents are synthetic."""
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import struct
import sys
import tempfile
import time
import types
import unittest
from unittest import mock
import urllib.error
import warnings
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('artifact_diagnostics', ROOT / 'scripts/diagnose-personalization-artifact.py')
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)
CANARY = 'SYNTHETIC_PRIVATE_CANARY'


def encode(events):
    return b''.join(json.dumps(event).encode() + b'\n' for event in events)


def network(**changes):
    row = {'type': 'resource-snapshot', 'snapshot': {
        'request': {'method': 'GET',
            'url': 'https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1/v_products_public?id=eq.' + CANARY,
            'headers': [{'name': 'Authorization', 'value': CANARY}], 'cookies': [CANARY],
            'postData': {'text': CANARY}},
        'response': {'status': 200, 'headers': [{'name': 'Set-Cookie', 'value': CANARY}],
            'content': {'text': CANARY, '_sha1': CANARY}},
        'time': 40, 'timings': {'receive': 5}, '_resourceType': 'fetch'}}
    row['snapshot'].update(changes)
    return row


def trace():
    return [
        {'type': 'context-options', 'version': 10, 'options': {'httpCredentials': CANARY}},
        {'type': 'before', 'callId': 'call@1', 'startTime': 10, 'class': 'Frame', 'method': 'expect',
         'params': {'selector': '[data-testid="product-name"]', 'expectedText': CANARY}},
        {'type': 'after', 'callId': 'call@1', 'endTime': 15010,
         'error': {'name': 'TimeoutError', 'message': CANARY, 'stack': CANARY}, 'result': CANARY},
        {'type': 'console', 'text': CANARY}, {'type': 'stdout', 'text': CANARY},
        {'type': 'frame-snapshot', 'snapshot': {'html': CANARY}},
    ]


def zipped(files, compression=zipfile.ZIP_DEFLATED):
    output = io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        with zipfile.ZipFile(output, 'w', compression=compression) as archive:
            for name, body in files:
                archive.writestr(name, body)
    return output.getvalue()


def inner(events=None, network_events=None, extras=()):
    return zipped([('trace.trace', encode(trace() if events is None else events)),
                   ('trace.network', encode([network()] if network_events is None else network_events)),
                   ('resources/ignored.txt', CANARY.encode()), *extras])


def outer(payload=None, extras=(), count=4):
    payload = inner() if payload is None else payload
    names = list(probe.TRACE_MEMBERS) + ['playwright-report/data/unapproved.zip']
    return zipped([(names[index], payload) for index in range(count)] + list(extras))


def zip64(data, sentinels=True):
    end = data.rfind(b'PK\x05\x06')
    original = struct.unpack_from('<4s4H2LH', data, end)
    count, size, offset = original[4:7]
    record = struct.pack('<4sQ2H2L4Q', b'PK\x06\x06', 44, 45, 45, 0, 0, count, count, size, offset)
    locator = struct.pack('<4sLQL', b'PK\x06\x07', 0, end, 1)
    trailer = struct.pack('<4s4H2LH', b'PK\x05\x06', 0, 0,
                          65535 if sentinels else 0, 65535 if sentinels else 0,
                          0xffffffff if sentinels else 0, 0xffffffff if sentinels else 0, 0)
    return data[:end] + record + locator + trailer


def analyze(payload):
    return probe.analyze_archive(payload, probe.Budget())


def metadata():
    return {'id': probe.ARTIFACT_ID, 'name': probe.ARTIFACT_NAME,
        'size_in_bytes': probe.EXPECTED_SIZE, 'digest': 'sha256:' + probe.EXPECTED_SHA256,
        'expired': False, 'workflow_run': {'id': probe.RUN_ID, 'repository_id': probe.REPOSITORY_ID,
        'head_repository_id': probe.REPOSITORY_ID, 'head_sha': probe.HEAD_SHA}}


class Response:
    def __init__(self, body, status=200):
        self.body, self.status = io.BytesIO(body), status
        self.closed = False
    def read(self, size):
        return self.body.read(size)
    def close(self):
        self.closed = True


class Contracts(unittest.TestCase):
    def test_valid_four_traces_collect_evidence_without_health_claim_or_private_fields(self):
        report = analyze(outer())
        encoded = json.dumps(report, allow_nan=False)
        self.assertEqual(report['status'], 'COLLECTED')
        self.assertFalse(report['e2eHealthVerified'])
        self.assertEqual(len(report['traces']), 4)
        self.assertNotIn(CANARY, encoded)
        for forbidden in ('Authorization', 'Set-Cookie', 'postData', 'expectedText', '"params"', '"result"', '"stack"'):
            self.assertNotIn(forbidden, encoded)
        action = report['traces'][0]['failedOrUnfinishedActions'][0]
        self.assertEqual(action['apiName'], 'Frame.expect')
        self.assertEqual(action['testIds'], ['product-name'])
        self.assertEqual(action['errorClass'], 'TimeoutError')
        self.assertEqual(action['durationMs'], 15000)

    def test_200_positive_duration_with_unknown_receive_is_not_complete(self):
        row = network(timings={'receive': -1})
        result = analyze(outer(inner(network_events=[row])))['traces'][0]
        self.assertEqual(result['pendingOrFailedCount'], 1)
        self.assertEqual(result['pendingOrFailed'][0]['state'], 'body-or-timing-unverified')

    def test_websocket_101_is_not_a_pending_rest_failure(self):
        row = network(_resourceType='websocket', time=30000, timings={'receive': -1})
        row['snapshot']['response']['status'] = 101
        report = analyze(outer(inner(network_events=[row])))['traces'][0]
        self.assertEqual(report['pendingOrFailedCount'], 0)
        self.assertEqual(report['topSlow'], [])

    def test_failed_websocket_is_not_hidden_as_an_ordinary_long_lived_channel(self):
        row = network(_resourceType='websocket', time=30000, timings={'receive': -1})
        row['snapshot']['response']['status'] = 503
        result = analyze(outer(inner(network_events=[row])))['traces'][0]
        self.assertEqual(result['pendingOrFailedCount'], 1)
        self.assertEqual(result['pendingOrFailed'][0]['state'], 'failed')
        self.assertEqual(result['pendingOrFailed'][0]['errorClass'], 'HTTPError')

    def test_websocket_without_confirmed_handshake_is_labelled_separately(self):
        row = network(_resourceType='websocket', time=-1, timings={'receive': -1})
        row['snapshot']['response']['status'] = -1
        result = analyze(outer(inner(network_events=[row])))['traces'][0]['pendingOrFailed'][0]
        self.assertEqual(result['state'], 'websocket-handshake-unverified')

    def test_aborted_and_fulfilled_flags_are_preserved_without_raw_failure(self):
        row = network(_wasAborted=True, _wasFulfilled=True)
        row['snapshot']['response'].update(status=-1, _failureText='net::ERR_ABORTED ' + CANARY)
        result = analyze(outer(inner(network_events=[row])))['traces'][0]['pendingOrFailed'][0]
        self.assertEqual(result['state'], 'aborted')
        self.assertEqual(result['errorClass'], 'ERR_ABORTED')
        self.assertTrue(result['fulfilledByPlaywright'])
        self.assertNotIn(CANARY, json.dumps(result))

    def test_top_slow_and_pending_outputs_are_bounded(self):
        rows = [network(time=index, timings={'receive': -1}) for index in range(150)]
        report = analyze(outer(inner(network_events=rows)))['traces'][0]
        self.assertEqual(len(report['topSlow']), 40)
        self.assertEqual(len(report['pendingOrFailed']), 100)
        self.assertEqual(report['pendingOrFailedCount'], 150)

    def test_call_ids_are_scoped_by_context_and_archive(self):
        more = [('worker.trace', encode(trace())), ('worker.network', encode([network()]))]
        report = analyze(outer(inner(extras=more)))
        self.assertEqual(report['traces'][0]['contexts'], 2)
        self.assertEqual(report['traces'][0]['actionCount'], 2)
        self.assertEqual(len(report['traces'][0]['failedOrUnfinishedActions']), 2)

    def test_unfinished_action_is_not_labelled_timeout(self):
        events = trace()[:2]
        action = analyze(outer(inner(events=events)))['traces'][0]['failedOrUnfinishedActions'][0]
        self.assertIsNone(action['durationMs'])
        self.assertIsNone(action['errorClass'])
        self.assertEqual(action['state'], 'not-finished-in-trace')

    def test_unknown_error_name_never_crosses_output_boundary(self):
        events = trace(); events[2]['error']['name'] = CANARY
        report = analyze(outer(inner(events=events)))
        self.assertEqual(report['traces'][0]['failedOrUnfinishedActions'][0]['errorClass'], 'OtherError')
        self.assertNotIn(CANARY, json.dumps(report))

    def test_crc_failure_of_selected_nested_member_is_rejected(self):
        payload = zipped([('trace.trace', encode(trace())), ('trace.network', encode([network()]))], zipfile.ZIP_STORED)
        damaged = bytearray(payload)
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            info = archive.getinfo('trace.network')
            name_size, extra_size = struct.unpack_from('<2H', payload, info.header_offset + 26)
            damaged[info.header_offset + 30 + name_size + extra_size + 20] ^= 1
        with self.assertRaises(probe.DiagnosticError):
            analyze(outer(bytes(damaged)))

    def test_unselected_resource_is_not_decompressed_for_crc(self):
        payload = zipped([('trace.trace', encode(trace())), ('trace.network', encode([network()])),
                          ('resources/ignored.txt', b'ignored-private')], zipfile.ZIP_STORED)
        damaged = bytearray(payload)
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            info = archive.getinfo('resources/ignored.txt')
            a, b = struct.unpack_from('<2H', payload, info.header_offset + 26)
            damaged[info.header_offset + 30 + a + b] ^= 1
        self.assertEqual(analyze(outer(bytes(damaged)))['status'], 'COLLECTED')

    def test_global_deadline_applies_to_zip_processing(self):
        budget = probe.Budget(); budget.end = 0
        with self.assertRaisesRegex(probe.DiagnosticError, '^DEADLINE_EXCEEDED$'):
            probe.analyze_archive(outer(), budget)

    def test_hard_deadline_interrupts_a_slow_read_and_restores_handler(self):
        previous = probe.signal.getsignal(probe.signal.SIGALRM)
        with mock.patch.object(probe, 'DEADLINE_SECONDS', 0.01):
            with self.assertRaisesRegex(probe.DiagnosticError, '^DEADLINE_EXCEEDED$'):
                with probe.Budget():
                    time.sleep(0.2)
        self.assertIs(probe.signal.getsignal(probe.signal.SIGALRM), previous)
        self.assertEqual(probe.signal.getitimer(probe.signal.ITIMER_REAL)[0], 0)

    def test_standard_bounded_zip64_is_supported(self):
        self.assertEqual(analyze(zip64(outer()))['status'], 'COLLECTED')

    def test_unsignalled_bounded_zip64_uses_the_real_directory(self):
        self.assertEqual(analyze(zip64(outer(), sentinels=False))['status'], 'COLLECTED')

    def test_unsignalled_zip64_count_is_checked_before_zipfile_allocation(self):
        payload = zip64(zipped([(f'ignored-{index}', b'') for index in range(129)]), sentinels=False)
        with mock.patch.object(probe.zipfile, 'ZipFile') as opened:
            with self.assertRaisesRegex(probe.DiagnosticError, '^ZIP_DIRECTORY_LIMIT$'):
                analyze(payload)
            opened.assert_not_called()

    def test_outer_crc_is_checked_before_nested_parsing(self):
        payload = zipped([(name, inner()) for name in probe.TRACE_MEMBERS], zipfile.ZIP_STORED)
        damaged = bytearray(payload)
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            info = archive.getinfo(probe.TRACE_MEMBERS[0])
            name, extra = struct.unpack_from('<2H', payload, info.header_offset + 26)
            damaged[info.header_offset + 30 + name + extra + 20] ^= 1
        with self.assertRaisesRegex(probe.DiagnosticError, '^ARCHIVE_FORMAT_OR_CRC_ERROR$'):
            analyze(bytes(damaged))

    def test_symlink_is_rejected_without_extraction(self):
        name = zipfile.ZipInfo('link'); name.external_attr = (stat.S_IFLNK | 0o777) << 16
        with self.assertRaisesRegex(probe.DiagnosticError, '^ZIP_ENTRY_REJECTED$'):
            analyze(outer(extras=[(name, b'target')]))

    def test_encryption_and_unknown_compression_flags_are_rejected(self):
        for field, value in ((8, 1), (10, 99)):
            with self.subTest(field=field):
                damaged = bytearray(outer())
                central = damaged.find(b'PK\x01\x02')
                struct.pack_into('<H', damaged, central + field, value)
                with self.assertRaisesRegex(probe.DiagnosticError, '^ZIP_ENTRY_REJECTED$'):
                    analyze(bytes(damaged))

    def test_non_finite_json_and_huge_timing_cannot_escape_as_nan(self):
        for constant in ('NaN', 'Infinity', '-Infinity'):
            with self.subTest(constant=constant):
                with self.assertRaisesRegex(probe.DiagnosticError, '^INVALID_JSON$'):
                    probe.strict_json('{"time":' + constant + '}')
        self.assertIsNone(probe.finite(10 ** 400))
        self.assertIsNone(probe.finite(True))
        self.assertEqual(probe.finite(0), 0)

    def test_unknown_action_method_or_class_never_leaks(self):
        action = probe.action_before({'method': CANARY, 'class': CANARY, 'params': {}}, 1)
        self.assertEqual(action['apiName'], 'other')
        self.assertNotIn(CANARY, json.dumps(action))

    def test_orphan_after_does_not_expose_result_or_call_id(self):
        events = trace() + [{'type': 'after', 'callId': CANARY, 'result': CANARY}]
        report = analyze(outer(inner(events=events)))
        self.assertNotIn(CANARY, json.dumps(report))

    def test_duplicate_after_cannot_overwrite_a_recorded_error(self):
        events = trace() + [{'type': 'after', 'callId': 'call@1', 'endTime': 16000}]
        with self.assertRaisesRegex(probe.DiagnosticError, '^DUPLICATE_ACTION_AFTER$'):
            analyze(outer(inner(events=events)))

    def test_orphan_after_preserves_error_class_without_private_call_id(self):
        events = trace()[:1] + [{'type': 'after', 'callId': CANARY, 'endTime': 100,
                               'error': {'name': 'TimeoutError', 'message': CANARY}}]
        report = analyze(outer(inner(events=events)))
        action = report['traces'][0]['failedOrUnfinishedActions'][0]
        self.assertEqual(action['state'], 'orphan-after')
        self.assertEqual(action['errorClass'], 'TimeoutError')
        self.assertEqual(action['apiName'], 'other')
        self.assertNotIn(CANARY, json.dumps(report))

    def test_empty_error_object_is_not_reported_as_success(self):
        events = trace(); events[2]['error'] = {}
        action = analyze(outer(inner(events=events)))['traces'][0]['failedOrUnfinishedActions'][0]
        self.assertEqual(action['errorClass'], 'OtherError')
        self.assertEqual(action['state'], 'failed')

    def test_browser_page_error_preserves_only_the_class(self):
        event = {'type': 'event', 'class': 'BrowserContext', 'method': 'pageError',
                 'params': {'error': {'error': {'name': 'TypeError', 'message': CANARY, 'stack': CANARY}},
                            'location': {'url': 'https://private.invalid/' + CANARY}}, 'pageId': CANARY}
        report = analyze(outer(inner(events=trace() + [event])))
        result = report['traces'][0]
        self.assertEqual(result['runtimeErrorCount'], 1)
        self.assertEqual(result['runtimeErrors'], [{'context': 1, 'errorClass': 'TypeError'}])
        self.assertNotIn(CANARY, json.dumps(report))

    def test_top_level_error_never_emits_unknown_class_or_text(self):
        event = {'type': 'error', 'error': {'name': CANARY, 'message': CANARY, 'stack': CANARY}}
        report = analyze(outer(inner(events=trace() + [event])))
        self.assertEqual(report['traces'][0]['runtimeErrors'][0]['errorClass'], 'OtherError')
        self.assertNotIn(CANARY, json.dumps(report))

    def test_trusted_redirect_never_forwards_authorization(self):
        target = 'https://synthetic.blob.core.windows.net/archive?sig=' + CANARY
        calls = []
        def opened(request, **_kwargs):
            calls.append(request)
            if request.full_url == probe.API_URL + '/zip':
                raise urllib.error.HTTPError(request.full_url, 302, CANARY, {'Location': target}, None)
            return Response(b'archive')
        with mock.patch.object(probe.urllib.request, 'build_opener', return_value=types.SimpleNamespace(open=opened)):
            location = probe.fetch_url(probe.API_URL + '/zip', probe.Budget(), 100, token='SYNTHETIC_TOKEN', allow_redirect=True)
            result = probe.fetch_url(location, probe.Budget(), 100)
        self.assertEqual(result, b'archive')
        self.assertIn('Authorization', dict(calls[0].header_items()))
        self.assertNotIn('Authorization', dict(calls[1].header_items()))
        self.assertNotIn('Cookie', dict(calls[1].header_items()))

    def test_second_redirect_is_rejected_without_following(self):
        target = 'https://synthetic.blob.core.windows.net/archive?sig=' + CANARY
        error = urllib.error.HTTPError(target, 302, CANARY, {'Location': 'https://other.invalid'}, None)
        with mock.patch.object(probe.urllib.request, 'build_opener', return_value=types.SimpleNamespace(open=mock.Mock(side_effect=error))):
            with self.assertRaisesRegex(probe.DiagnosticError, '^HTTP_302$'):
                probe.fetch_url(target, probe.Budget(), 100)

    def test_api_error_has_only_safe_numeric_code(self):
        error = urllib.error.HTTPError(probe.API_URL, 403, CANARY, {}, io.BytesIO(CANARY.encode()))
        with mock.patch.object(probe.urllib.request, 'build_opener', return_value=types.SimpleNamespace(open=mock.Mock(side_effect=error))):
            with self.assertRaisesRegex(probe.DiagnosticError, '^HTTP_403$'):
                probe.fetch_url(probe.API_URL, probe.Budget(), 100, token='SYNTHETIC_TOKEN')

    def test_missing_token_performs_no_http(self):
        with mock.patch.object(probe, 'fetch_url') as fetch:
            with self.assertRaisesRegex(probe.DiagnosticError, '^TOKEN_UNAVAILABLE$'):
                probe.download_fixed(None, probe.Budget())
            fetch.assert_not_called()

    def test_digest_is_checked_before_archive_is_parsed(self):
        with mock.patch.object(probe, 'fetch_url', side_effect=[json.dumps(metadata()).encode(), b'wrong']):
            with self.assertRaisesRegex(probe.DiagnosticError, '^ARCHIVE_IDENTITY_MISMATCH$'):
                probe.download_fixed('SYNTHETIC_TOKEN', probe.Budget())

    def test_correct_size_with_wrong_sha256_is_rejected(self):
        with mock.patch.object(probe, 'EXPECTED_SIZE', 5):
            with mock.patch.object(probe, 'fetch_url', side_effect=[json.dumps(metadata()).encode(), b'wrong']):
                with self.assertRaisesRegex(probe.DiagnosticError, '^ARCHIVE_IDENTITY_MISMATCH$'):
                    probe.download_fixed('SYNTHETIC_TOKEN', probe.Budget())

    def test_trace_without_any_network_member_is_not_complete_evidence(self):
        payload = zipped([('trace.trace', encode(trace()))])
        with self.assertRaisesRegex(probe.DiagnosticError, '^SELECTED_CONTENT_REJECTED$'):
            analyze(outer(payload))

    def test_only_the_four_authorized_report_data_members_are_accepted(self):
        payload = outer()
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            self.assertEqual(set(archive.namelist()), set(probe.TRACE_MEMBERS))
        self.assertEqual(analyze(payload)['status'], 'COLLECTED')
        with self.assertRaisesRegex(probe.DiagnosticError, '^TRACE_COUNT_MISMATCH$'):
            analyze(outer(extras=[('unrelated/trace.zip', inner())]))

    def test_generic_trace_names_cannot_replace_the_authorized_roster(self):
        payload = zipped([(f'case-{index}/trace.zip', inner()) for index in range(4)])
        with self.assertRaisesRegex(probe.DiagnosticError, '^TRACE_COUNT_MISMATCH$'):
            analyze(payload)

    def test_full_fixed_download_can_validate_synthetic_pins_with_no_cli_override(self):
        body = outer()
        with mock.patch.object(probe, 'EXPECTED_SIZE', len(body)), mock.patch.object(probe, 'EXPECTED_SHA256', hashlib.sha256(body).hexdigest()):
            with mock.patch.object(probe, 'fetch_url', side_effect=[json.dumps(metadata()).encode(), body]) as fetch:
                self.assertEqual(probe.download_fixed('SYNTHETIC_TOKEN', probe.Budget()), body)
                self.assertEqual([call.args[0] for call in fetch.call_args_list], [probe.API_URL, probe.API_URL + '/zip'])

    def test_download_size_is_stream_bounded_and_response_closed(self):
        response = Response(b'x' * 101)
        with mock.patch.object(probe.urllib.request, 'build_opener', return_value=types.SimpleNamespace(open=lambda *_a, **_kw: response)):
            with self.assertRaisesRegex(probe.DiagnosticError, '^DOWNLOAD_SIZE_LIMIT$'):
                probe.fetch_url(probe.API_URL, probe.Budget(), 100, token='SYNTHETIC_TOKEN')
        self.assertTrue(response.closed)

    def test_no_redirect_handler_does_not_build_a_forwarded_request(self):
        self.assertIsNone(probe.NoRedirect().redirect_request(None, None, None, None, None, None))

    def test_cli_collects_without_health_claim_and_only_sanitized_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            argv = ['probe', '--output', str(root / 'out.json'), '--summary', str(root / 'out.md')]
            with mock.patch.object(sys, 'argv', argv), mock.patch.object(probe, 'download_fixed', return_value=outer()), contextlib.redirect_stdout(io.StringIO()) as stdout:
                self.assertEqual(probe.main(), 0)
            self.assertNotIn(CANARY, (root / 'out.json').read_text() + (root / 'out.md').read_text() + stdout.getvalue())
            self.assertFalse(json.loads((root / 'out.json').read_text())['e2eHealthVerified'])

    def test_cli_unknown_exception_cannot_print_private_details(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            argv = ['probe', '--output', str(root / 'out.json'), '--summary', str(root / 'out.md')]
            with mock.patch.object(sys, 'argv', argv), mock.patch.object(probe, 'download_fixed', side_effect=ValueError(CANARY)), contextlib.redirect_stdout(io.StringIO()) as stdout:
                self.assertEqual(probe.main(), 1)
            report = (root / 'out.json').read_text() + (root / 'out.md').read_text() + stdout.getvalue()
            self.assertIn('INTERNAL_ERROR', report)
            self.assertNotIn(CANARY, report)


def metadata_case(group, field, value):
    def test(self):
        data = metadata()
        (data['workflow_run'] if group == 'run' else data)[field] = value
        with mock.patch.object(probe, 'fetch_url', return_value=json.dumps(data).encode()) as fetch:
            with self.assertRaisesRegex(probe.DiagnosticError, '^METADATA_MISMATCH$'):
                probe.download_fixed('SYNTHETIC_TOKEN', probe.Budget())
            self.assertEqual(fetch.call_count, 1)
    return test


for index, data in enumerate([
    ('artifact', 'id', 1), ('artifact', 'name', 'other'), ('artifact', 'size_in_bytes', 1),
    ('artifact', 'digest', 'sha256:' + '0' * 64), ('artifact', 'expired', True),
    ('run', 'id', 1), ('run', 'repository_id', 1), ('run', 'head_repository_id', 1),
    ('run', 'head_sha', '0' * 40),
]):
    setattr(Contracts, 'test_fixed_metadata_rejection_%02d' % index, metadata_case(*data))


def url_case(url, expected_host, expected_path):
    def test(self):
        self.assertEqual(probe.safe_url(url), (expected_host, expected_path))
        self.assertNotIn(CANARY, json.dumps(probe.safe_url(url)))
    return test


for index, data in enumerate([
    ('https://www.promogifts.com.br/produto/' + CANARY + '?key=' + CANARY, 'www.promogifts.com.br', '/produto/:id'),
    ('https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1/v_products_public?token=' + CANARY, 'doufsxqlfjyuvxuezpln.supabase.co', '/rest/v1/v_products_public'),
    ('https://doufsxqlfjyuvxuezpln.supabase.co/storage/v1/object/private/' + CANARY, 'doufsxqlfjyuvxuezpln.supabase.co', '/storage/v1/:redacted-object'),
    ('https://doufsxqlfjyuvxuezpln.supabase.co/auth/v1/' + CANARY, 'doufsxqlfjyuvxuezpln.supabase.co', '/auth/v1/:operation'),
    ('https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/' + CANARY, 'doufsxqlfjyuvxuezpln.supabase.co', '/functions/v1/:function'),
    ('https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1/rpc/' + CANARY, 'doufsxqlfjyuvxuezpln.supabase.co', '/rest/v1/rpc/:procedure'),
    ('https://doufsxqlfjyuvxuezpln.supabase.co/rest/v1/' + CANARY, 'doufsxqlfjyuvxuezpln.supabase.co', '/:redacted-path'),
    ('http://127.0.0.1:8080/src/pages/products/ProductDetail.tsx?t=' + CANARY, 'localhost', '/src/pages/products/ProductDetail.tsx'),
    ('http://localhost:8080/src/' + CANARY, 'localhost', '/src/:module'),
    ('https://' + CANARY + '.invalid/path', 'other-host', '/:redacted-path'),
    ('https://' + CANARY + '@www.promogifts.com.br/', 'redacted-host', '/:redacted-path'),
    ('data:text/plain,' + CANARY, 'redacted-host', '/:redacted-path'),
    ('https://[invalid', 'redacted-host', '/:redacted-path'),
]):
    setattr(Contracts, 'test_url_privacy_%02d' % index, url_case(*data))


def rejected_asset(url):
    def test(self):
        self.assertFalse(probe.trusted_asset(url))
    return test


for index, url in enumerate([
    'http://synthetic.blob.core.windows.net/a', 'https://evil.invalid/a',
    'https://blob.core.windows.net.evil.invalid/a', 'https://user@synthetic.blob.core.windows.net/a',
    'https://synthetic.blob.core.windows.net:444/a', 'https://synthetic.blob.core.windows.net/a#fragment',
    'https://synthetic.blob.core.windows.net/a\nheader',
]):
    setattr(Contracts, 'test_asset_destination_rejected_%02d' % index, rejected_asset(url))


def rejected_archive(factory):
    def test(self):
        with self.assertRaises(probe.DiagnosticError):
            analyze(factory())
    return test


def malicious_entry(name):
    return lambda: outer(extras=[(name, b'ignored')])


for index, factory in enumerate([
    lambda: b'', lambda: outer()[:-4], lambda: outer(count=0), lambda: outer(count=3), lambda: outer(count=5),
    malicious_entry('../escape'), malicious_entry('/absolute'), malicious_entry('C:/absolute'),
    malicious_entry('a\\escape'), malicious_entry('a//escape'),
    lambda: outer(extras=[('same', b'1'), ('same', b'2')]),
    lambda: outer(inner(events=[])), lambda: outer(inner(events=[{'type': 'context-options', 'version': 11}])),
    lambda: outer(zipped([('trace.trace', b'{"type":"context-options",'), ('trace.network', b'')])),
    lambda: outer(zipped([('trace.trace', b'{"type":"context-options","version":10,"version":10}\n'), ('trace.network', b'')])),
    lambda: outer(inner(events=trace() + [trace()[1]])),
    lambda: outer(inner(extras=[('orphan.network', encode([network()]))])),
    lambda: outer(inner(network_events=[{'type': 'resource-snapshot', 'snapshot': {}}])),
]):
    setattr(Contracts, 'test_archive_rejection_%02d' % index, rejected_archive(factory))


def bounded_case(constant, value, factory=outer):
    def test(self):
        with mock.patch.object(probe, constant, value):
            with self.assertRaises(probe.DiagnosticError):
                analyze(factory())
    return test


for index, values in enumerate([
    ('OUTER_LIMIT', 10), ('INNER_LIMIT', 10), ('INNER_DECLARED_LIMIT', 10),
    ('TEXT_LIMIT', 10), ('SELECTED_LIMIT', 10), ('LINE_LIMIT', 10), ('MAX_EVENTS', 1),
]):
    setattr(Contracts, 'test_size_budget_%02d' % index, bounded_case(*values))


if __name__ == '__main__':
    unittest.main()

