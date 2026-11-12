"""Offline contract tests: never contact production or another network host."""
from __future__ import annotations

import contextlib
import copy
import hashlib
import importlib.util
import io
import itertools
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest import mock

REPO = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('public_sitemap_probe', REPO / 'scripts/probe-production-sitemap.py')
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)
SHA = 'a' * 40
CACHE = 'public, max-age=43200, stale-while-revalidate=86400'


def xml(paths=('/', '/produto/synthetic')):
    return ('<?xml version="1.0"?><urlset xmlns="' + probe.SITEMAP_NS + '">'
            + ''.join('<url><loc>https://www.promogifts.com.br' + path + '</loc></url>' for path in paths)
            + '</urlset>').encode()


def legacy():
    for path in [REPO / 'recovery/site-artifacts/sitemap-pre-dynamic.xml', REPO / 'public/sitemap.xml']:
        if path.exists():
            body = path.read_bytes()
            if hashlib.sha256(body).hexdigest() == probe.LEGACY_SHA256:
                return body
    raise AssertionError('Exact preserved historical XML fixture is required')


def responses():
    rows = []
    for method, endpoint in probe.REQUESTS:
        health = endpoint == '/api/health'
        headers = {'content-type': 'application/json' if health else 'application/xml; charset=UTF-8',
                   'cache-control': 'no-store, max-age=0' if health else CACHE}
        if not health:
            headers['x-sitemap-count'] = '2'
        body = json.dumps({'status': 'ok', 'commit': SHA}).encode() if health else xml() if method == 'GET' else b''
        rows.append({'method': method, 'endpoint': endpoint, 'status': 200, 'connect_status': None,
                     'curl_exit': 0, 'transport': 'ok', 'origin_reached': True, 'seconds': 0.01,
                     'headers': headers, 'body': body, 'head_body_not_requested': method == 'HEAD'})
    return rows


class Contracts(unittest.TestCase):
    def test_canonical_public_health_and_api_preconditions_pass(self):
        result = probe.evaluate(responses(), SHA)
        self.assertTrue(result['activation_preconditions_ready'])
        self.assertTrue(result['production_sitemap_healthy'])
        self.assertEqual(result['identity']['served_commit'], SHA)

    def test_legacy_is_ready_only_as_an_explicit_unhealthy_public_diagnostic(self):
        rows = responses()
        rows[2]['body'] = legacy()
        rows[2]['headers'] = {'content-type': 'application/xml', 'cache-control': 'public, max-age=0'}
        rows[3]['headers'] = dict(rows[2]['headers'])
        result = probe.evaluate(rows, SHA)
        self.assertTrue(result['activation_preconditions_ready'])
        self.assertFalse(result['production_sitemap_healthy'])
        self.assertIn('NOT_PUBLIC_HEALTHY', result['status'])
        self.assertIn('NÃO', probe.summary(result))
        self.assertTrue(result['public_get']['dynamic_errors'])

    def test_modified_legacy_is_not_an_exception(self):
        rows = responses(); rows[2]['body'] = legacy() + b'\n'
        self.assertFalse(probe.evaluate(rows, SHA)['activation_preconditions_ready'])

    def test_legacy_never_excuses_the_dynamic_api(self):
        rows = responses(); rows[0]['body'] = legacy()
        self.assertFalse(probe.evaluate(rows, SHA)['activation_preconditions_ready'])

    def test_header_count_is_per_response_not_a_frozen_catalog_snapshot(self):
        rows = responses(); rows[1]['headers']['x-sitemap-count'] = '3'
        rows[2]['body'] = xml(('/',)); rows[2]['headers']['x-sitemap-count'] = '1'
        self.assertTrue(probe.evaluate(rows, SHA)['activation_preconditions_ready'])

    def test_entities_and_doctype_are_rejected_before_xml_parsing(self):
        body = b'<!DOCTYPE x [<!ENTITY ext SYSTEM "https://private.invalid/">]><x>&ext;</x>'
        with mock.patch.object(probe.ET, 'fromstring', side_effect=AssertionError('Parser must not see a DTD')):
            self.assertEqual(probe.xml_metadata(body)['error'], 'xml_entities_or_doctype_forbidden')

    def test_image_urls_do_not_count_as_sitemap_locations(self):
        body = ('<urlset xmlns="' + probe.SITEMAP_NS + '" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
                '<url><loc>https://www.promogifts.com.br/produto/a&amp;b</loc><image:image>'
                '<image:loc>https://public-cdn.invalid/image</image:loc></image:image></url></urlset>').encode()
        result = probe.xml_metadata(body)
        self.assertTrue(result['canonical_locations']); self.assertEqual(result['count'], 1)

    def test_proxy_denial_is_not_an_application_403(self):
        rows = responses(); rows[0].update(status=None, connect_status=403, curl_exit=56,
                                           transport='proxy_connect_denied', origin_reached=False)
        result = probe.evaluate(rows, SHA)
        self.assertIsNone(result['api_get']['response']['status'])
        self.assertEqual(result['api_get']['response']['connect_status'], 403)
        self.assertFalse(result['activation_preconditions_ready'])

    def test_private_bodies_headers_and_transport_details_are_not_recorded(self):
        rows = responses()
        rows[4]['body'] = json.dumps({'status': 'ok', 'commit': SHA, 'token': 'PRIVATE_BODY_MARKER'}).encode()
        rows[0]['headers'].update({'set-cookie': 'PRIVATE_COOKIE_MARKER', 'authorization': 'PRIVATE_AUTH_MARKER',
                                   'location': 'https://vercel.com/login?token=PRIVATE_QUERY_MARKER'})
        rows[0]['private_debug'] = 'PRIVATE_DEBUG_MARKER'
        encoded = json.dumps(probe.evaluate(rows, SHA))
        self.assertNotIn('PRIVATE_', encoded)
        self.assertNotIn('<urlset', encoded)
        self.assertIn('vercel.com', encoded)

    def test_proxy_connect_headers_are_not_confused_with_final_origin_headers(self):
        text = ('HTTP/1.1 200 Connection established\r\nProxy-Authorization: PRIVATE_PROXY\r\n\r\n'
                'HTTP/2 200\r\nContent-Type: application/xml\r\nX-Sitemap-Count: 2\r\nSet-Cookie: PRIVATE_COOKIE\r\n\r\n')
        result = probe.parse_headers(text)
        self.assertEqual(result, {'content-type': 'application/xml', 'x-sitemap-count': '2'})

    def test_oversized_xml_is_rejected_without_parsing(self):
        self.assertEqual(probe.xml_metadata(b'x' * (probe.MAX_BYTES + 1))['error'], 'xml_too_large')

    def test_validation_does_not_mutate_observed_responses(self):
        rows = responses(); before = copy.deepcopy(rows)
        probe.evaluate(rows, SHA)
        self.assertEqual(rows, before)

    def test_only_the_five_fixed_requests_are_permitted(self):
        with mock.patch.object(probe.subprocess, 'run') as run:
            for method, endpoint in [('POST', '/api/sitemap'), ('GET', 'https://other.invalid'), ('GET', '/admin')]:
                with self.assertRaises(ValueError): probe.probe(method, endpoint)
            run.assert_not_called()

    def test_transport_uses_no_cookies_credentials_redirect_or_proxy_override(self):
        def run(command, **kwargs):
            self.assertEqual(command[1], '--disable')
            self.assertEqual(kwargs['timeout'], 25)
            self.assertEqual(command[-1], probe.ORIGIN + '/api/sitemap')
            self.assertNotIn('--insecure', command); self.assertNotIn('--location', command)
            self.assertNotIn('--cookie', command); self.assertNotIn('--proxy', command)
            self.assertIn('--max-time', command); self.assertIn('--max-filesize', command)
            Path(command[command.index('--dump-header') + 1]).write_text('HTTP/2 200\nContent-Type: application/xml\n')
            Path(command[command.index('--output') + 1]).write_bytes(xml())
            return types.SimpleNamespace(returncode=0, stdout='{"status":"200","connect":"000","seconds":"0.01"}', stderr='PRIVATE_STDERR_MARKER')
        with mock.patch.object(probe.subprocess, 'run', side_effect=run):
            result = probe.probe('GET', '/api/sitemap')
        self.assertEqual(result['status'], 200); self.assertTrue(result['origin_reached'])
        self.assertNotIn('PRIVATE_', json.dumps(probe.safe_response(result)))

    def test_head_does_not_download_or_claim_a_response_body(self):
        def run(command, **_kwargs):
            self.assertIn('--head', command)
            self.assertEqual(command[command.index('--output') + 1], probe.os.devnull)
            return types.SimpleNamespace(returncode=0, stdout='{"status":"200","connect":"000","seconds":"0.01"}', stderr='')
        with mock.patch.object(probe.subprocess, 'run', side_effect=run): result = probe.probe('HEAD', '/api/sitemap')
        self.assertTrue(result['head_body_not_requested']); self.assertEqual(result['body'], b'')

    def test_timeout_and_missing_curl_fail_closed(self):
        for error, kind in [(subprocess.TimeoutExpired('curl', 25), 'timeout'), (FileNotFoundError(), 'curl_unavailable')]:
            with self.subTest(kind=kind), mock.patch.object(probe.subprocess, 'run', side_effect=error):
                result = probe.probe('GET', '/api/sitemap')
                self.assertEqual(result['transport'], kind); self.assertFalse(result['origin_reached'])

    def test_expected_sha_must_be_full_and_the_response_set_exact(self):
        for value in ['', 'unknown', 'a' * 39, '$(command)']:
            with self.assertRaises(ValueError): probe.evaluate(responses(), value)
        with self.assertRaises(ValueError): probe.evaluate(responses()[:-1], SHA)
        with self.assertRaises(ValueError): probe.evaluate(responses() + [responses()[0]], SHA)

    def test_cli_wrong_anchor_does_not_issue_requests(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); (root / 'scripts').mkdir(); (root / '.vercel').mkdir()
            (root / '.vercel/project.json').write_text('{"projectId":"wrong","orgId":"wrong"}')
            argv = ['probe', '--expected-sha', SHA, '--output', str(root / 'report.json'), '--summary', str(root / 'summary.md')]
            with mock.patch.object(probe, '__file__', str(root / 'scripts/probe.py')), mock.patch.object(sys, 'argv', argv), mock.patch.object(probe, 'probe') as live, contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(probe.main(), 1); live.assert_not_called()
            self.assertEqual(json.loads((root / 'report.json').read_text())['requests_issued'], 0)

    def test_cli_known_legacy_reports_false_public_health_despite_ready_exit(self):
        rows = responses(); rows[2]['body'] = legacy()
        rows[2]['headers'] = {'content-type': 'application/xml'}; rows[3]['headers'] = dict(rows[2]['headers'])
        by_key = {(r['method'], r['endpoint']): r for r in rows}
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); (root / 'scripts').mkdir(); (root / '.vercel').mkdir()
            (root / '.vercel/project.json').write_text(json.dumps({'projectId': probe.PROJECT_ID, 'orgId': probe.TEAM_ID}))
            argv = ['probe', '--expected-sha', SHA, '--output', str(root / 'report.json'), '--summary', str(root / 'summary.md')]
            with mock.patch.object(probe, '__file__', str(root / 'scripts/probe.py')), mock.patch.object(sys, 'argv', argv), mock.patch.object(probe, 'probe', side_effect=lambda method, endpoint: by_key[(method, endpoint)]) as live, contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(probe.main(), 0); self.assertEqual(live.call_count, 5)
                self.assertEqual([c.args for c in live.call_args_list], list(probe.REQUESTS))
            self.assertFalse(json.loads((root / 'report.json').read_text())['production_sitemap_healthy'])
            self.assertIn('NÃO', (root / 'summary.md').read_text())


def model_test(api, kind, head_status, identity, transport):
    def run(self):
        rows = responses()
        if not api: rows[0]['status'] = 503
        if kind != 'canonical':
            rows[2]['body'] = legacy() + (b'\n' if kind == 'unexpected' else b'')
            rows[2]['headers'] = {'content-type': 'application/xml'}; rows[3]['headers'] = dict(rows[2]['headers'])
        rows[3]['status'] = head_status
        if identity == 'wrong': rows[4]['body'] = json.dumps({'status': 'ok', 'commit': 'b' * 40}).encode()
        if transport == 'denied': rows[1].update(status=None, connect_status=403, curl_exit=56, transport='proxy_connect_denied', origin_reached=False)
        result = probe.evaluate(rows, SHA)
        expected = api and kind != 'unexpected' and head_status == 200 and identity == 'expected' and transport == 'complete'
        self.assertEqual(result['activation_preconditions_ready'], expected)
        self.assertEqual(result['production_sitemap_healthy'], expected and kind == 'canonical')
    return run


for index, values in enumerate(itertools.product([False, True], ['canonical', 'known-exact-legacy', 'unexpected'], [200, 503], ['expected', 'wrong'], ['complete', 'denied'])):
    setattr(Contracts, 'test_preplanned_state_%02d' % index, model_test(*values))


def invalid_case(mutator):
    def run(self):
        rows = responses(); mutator(rows)
        self.assertFalse(probe.evaluate(rows, SHA)['activation_preconditions_ready'])
    return run


invalid = [
    ('invalid_xml', lambda r: r[0].update(body=b'<urlset>')),
    ('wrong_namespace', lambda r: r[0].update(body=b'<urlset xmlns="https://wrong.invalid"/>')),
    ('html_content_type', lambda r: r[0]['headers'].update({'content-type': 'text/html'})),
    ('missing_count', lambda r: r[0]['headers'].pop('x-sitemap-count')),
    ('count_mismatch', lambda r: r[0]['headers'].update({'x-sitemap-count': '99'})),
    ('unicode_count', lambda r: r[0]['headers'].update({'x-sitemap-count': '２'})),
    ('count_over_bound', lambda r: r[0]['headers'].update({'x-sitemap-count': '15002'})),
    ('empty_urlset', lambda r: r[0].update(body=xml(()))),
    ('cache_missing', lambda r: r[0]['headers'].pop('cache-control')),
    ('cache_private', lambda r: r[0]['headers'].update({'cache-control': CACHE + ', private'})),
    ('cache_no_store', lambda r: r[0]['headers'].update({'cache-control': CACHE + ', no-store'})),
    ('cache_no_cache', lambda r: r[0]['headers'].update({'cache-control': CACHE + ', no-cache'})),
    ('cache_wrong_age', lambda r: r[0]['headers'].update({'cache-control': CACHE.replace('43200', '60')})),
    ('cache_conflicting_age', lambda r: r[0]['headers'].update({'cache-control': 'max-age=0, ' + CACHE})),
    ('head_count_missing', lambda r: r[1]['headers'].pop('x-sitemap-count')),
    ('head_cache_missing', lambda r: r[1]['headers'].pop('cache-control')),
    ('identity_unknown', lambda r: r[4].update(body=b'{"status":"ok","commit":"unknown"}')),
    ('identity_bad_status', lambda r: r[4].update(body=json.dumps({'status': 'error', 'commit': SHA}).encode())),
    ('identity_bad_json', lambda r: r[4].update(body=b'<html/>')),
    ('identity_bad_mime', lambda r: r[4]['headers'].update({'content-type': 'text/html'})),
    ('identity_cacheable', lambda r: r[4]['headers'].update({'cache-control': 'public, max-age=60'})),
    ('origin_redirect', lambda r: r[0].update(status=302)),
]
for name, mutator in invalid: setattr(Contracts, 'test_rejects_' + name, invalid_case(mutator))


def location_case(location):
    def run(self):
        body = ('<urlset xmlns="' + probe.SITEMAP_NS + '"><url><loc>' + location + '</loc></url></urlset>').encode()
        self.assertFalse(probe.xml_metadata(body)['canonical_locations'])
    return run


for index, value in enumerate(['http://www.promogifts.com.br/', 'https://other.invalid/', 'https://secret@www.promogifts.com.br/', 'https://www.promogifts.com.br:444/', '/relative', 'javascript:invalid']):
    setattr(Contracts, 'test_rejects_noncanonical_location_%d' % index, location_case(value))


def structure_case(root_namespace, root_text, url_text, loc_markup, url_namespace):
    def run(self):
        root_ns = probe.SITEMAP_NS if root_namespace == 'canonical' else '' if root_namespace == 'empty' else 'https://wrong.invalid'
        url_ns = '' if url_namespace == 'empty' else probe.SITEMAP_NS
        body = ('<urlset xmlns="' + root_ns + '">' + ('garbage' if root_text else '')
                + '<url xmlns="' + url_ns + '">' + ('garbage' if url_text else '')
                + '<loc>https://www.promogifts.com.br/'
                + ('<garbage>https://other.invalid/</garbage>' if loc_markup else '')
                + '</loc></url></urlset>').encode()
        expected = root_namespace == 'canonical' and not (root_text or url_text or loc_markup) and url_namespace == 'canonical'
        rows = responses()
        for index in (0, 2):
            rows[index]['body'] = body; rows[index]['headers']['x-sitemap-count'] = '1'
        report = probe.evaluate(rows, SHA)
        self.assertEqual(report['activation_preconditions_ready'], expected)
        self.assertEqual(report['production_sitemap_healthy'], expected)
    return run


for index, values in enumerate(itertools.product(('canonical', 'empty', 'wrong'), (False, True), (False, True), (False, True), ('canonical', 'empty'))):
    setattr(Contracts, 'test_xml_structure_preplanned_%02d' % index, structure_case(*values))


def structural_extra_case(fragment):
    def run(self):
        rows = responses()
        body = ('<urlset xmlns="' + probe.SITEMAP_NS + '"><url><loc>https://www.promogifts.com.br/</loc>'
                + fragment[0] + '</url>' + fragment[1] + '</urlset>').encode()
        rows[2]['body'] = body; rows[2]['headers']['x-sitemap-count'] = '1'
        self.assertFalse(probe.evaluate(rows, SHA)['activation_preconditions_ready'])
        self.assertFalse(probe.evaluate(rows, SHA)['production_sitemap_healthy'])
    return run


for index, fragment in enumerate([
    ('', '<url xmlns=""><loc>https://other.invalid/</loc></url>'),
    ('<loc xmlns="">https://other.invalid/</loc>', ''),
    ('', '<garbage>https://other.invalid/</garbage>'),
    ('<garbage>ignored</garbage>', ''),
    ('<priority><garbage>ignored</garbage></priority>', ''),
    ('', 'trailing-garbage'),
    ('trailing-garbage', ''),
]):
    setattr(Contracts, 'test_rejects_structural_extra_%d' % index, structural_extra_case(fragment))


if __name__ == '__main__': unittest.main()
