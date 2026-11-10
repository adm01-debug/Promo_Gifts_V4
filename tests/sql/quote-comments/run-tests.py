#!/usr/bin/env python3
"""Run quote-comment RLS/CRUD tests in a disposable, network-isolated PostgreSQL 17.

Never reads DATABASE_URL or Supabase credentials; never connects to an external
PostgreSQL host. All SQL is sent only through docker exec to the owned container.
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
MIGRATION = REPO / 'supabase/migrations/20261110022404_restore_quote_comments_scoped_threads.sql'
ROLLBACK = REPO / 'supabase/rollbacks/20261110022404_rollback.sql'
IMAGE = 'postgres:17'
DOCKER = ['docker', '--host=unix:///var/run/docker.sock']
SELECTORS = ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH')
ENV = {key: value for key, value in os.environ.items() if key not in SELECTORS}


def docker(*args: str, **kwargs):
    return subprocess.run(DOCKER + list(args), env=ENV, text=True, capture_output=True, **kwargs)


def cleanup_owned_container(container_id: str, token: str) -> None:
    inspected = docker('inspect', '--format', '{{json .Config.Labels}}', container_id)
    if inspected.returncode:
        raise RuntimeError('Cannot verify disposable-container ownership; no container was removed.')
    labels = json.loads(inspected.stdout)
    if labels.get('codex.quote-comments-test') != token:
        raise RuntimeError('Disposable-container label mismatch; no container was removed.')
    removed = docker('rm', '--force', '--volumes', container_id)
    if removed.returncode:
        raise RuntimeError('Failed to remove the owned disposable PostgreSQL container: ' + removed.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=Path('work/quote-comments-sql'))
    args = parser.parse_args()
    global OUTPUT
    OUTPUT = args.output_dir.resolve()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for path in (MIGRATION, ROLLBACK, HERE / 'fixture.sql'):
        if not path.is_file():
            raise RuntimeError(f'Required reviewed SQL file is missing: {path}')
    daemon = docker('info', '--format', '{{.ServerVersion}}')
    if daemon.returncode:
        raise RuntimeError('Local Docker daemon is unavailable: ' + daemon.stderr)
    token = uuid.uuid4().hex
    name = 'quote-comments-test-' + token[:12]
    started = docker('run', '--pull=missing', '--name', name,
                     '--label', 'codex.quote-comments-test=' + token,
                     '--network', 'none', '--env', 'POSTGRES_HOST_AUTH_METHOD=trust',
                     '--detach', IMAGE)
    if started.returncode:
        raise RuntimeError('Could not start the disposable PostgreSQL 17 container: ' + started.stderr)
    container_id = started.stdout.strip()
    try:
        return run_cases(container_id, OUTPUT)
    finally:
        cleanup_owned_container(container_id, token)


def run_cases(name: str, output: Path) -> int:
    NAME = name
    OUTPUT = output
    def sql(body, uid=None, role=None):
        prefix='\\set VERBOSITY verbose\n'
        if role:
            prefix += f'SET ROLE {role};\n'
        if uid is not None:
            prefix += f"SELECT set_config('request.jwt.claim.sub','{uid}',false);\n"
        return docker('exec', '-i', NAME, 'psql', '-X', '-q', '-A', '-t', '-U', 'postgres',
                      '-v', 'ON_ERROR_STOP=1', input=prefix + body)
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if docker('exec', NAME, 'pg_isready', '-U', 'postgres').returncode == 0:
            break
        time.sleep(0.25)
    else:
        raise RuntimeError('Disposable PostgreSQL did not become ready within 30 seconds.')
    for path in (HERE / 'fixture.sql', MIGRATION):
        result = sql('BEGIN;\n' + path.read_text() + '\nCOMMIT;')
        (OUTPUT / (path.name + '.log')).write_text(result.stdout + result.stderr)
        if result.returncode:
            raise RuntimeError(f'{path.name} failed: {result.stderr}')
    A='00000000-0000-0000-0000-000000000001'; B='00000000-0000-0000-0000-000000000002'; C='00000000-0000-0000-0000-000000000003'; D='00000000-0000-0000-0000-000000000004'; E='00000000-0000-0000-0000-000000000005'; F='00000000-0000-0000-0000-000000000006'
    Q='20000000-0000-0000-0000-000000000001'; QB='20000000-0000-0000-0000-000000000002'; QD='20000000-0000-0000-0000-000000000003'; QC='20000000-0000-0000-0000-000000000004'
    R='30000000-0000-0000-0000-000000000001'; RB='30000000-0000-0000-0000-000000000002'; RE='30000000-0000-0000-0000-000000000005'
    results=[]
    def case(name,body,uid=A,role='authenticated',expected=None,state=None):
        p=sql(body,uid,role)
        lines=[x for x in p.stdout.strip().splitlines() if x]
        out=lines[-1] if lines else ''
        ok=(p.returncode==0 and (expected is None or out==str(expected))) if state is None else (p.returncode!=0 and f'{state}:' in p.stderr)
        r={'case':name,'passed':ok,'exitCode':p.returncode,'expected':expected,'expectedSQLSTATE':state,'output':out,'error':p.stderr.strip()}
        results.append(r)
        print(('PASS ' if ok else 'FAIL ')+name,flush=True)
        return r
    insert=lambda cid=R,quote=Q,author=A,parent='NULL',content="'root'": f"INSERT INTO public.quote_comments(id,quote_id,user_id,parent_id,content) VALUES('{cid}','{quote}','{author}',{parent},{content});"
    case('RLS enabled and forced',"SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.quote_comments'::regclass;",None,None,'t')
    case('Four scoped policies',"SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='quote_comments' AND roles='{authenticated}';",None,None,4)
    case('No security definer function',"SELECT NOT prosecdef FROM pg_proc WHERE oid='public.enforce_quote_comment_mutation()'::regprocedure;",None,None,'t')
    case('No anonymous SELECT grant',"SELECT has_table_privilege('anon','public.quote_comments','SELECT');",None,None,'f')
    case('No direct trigger RPC grant',"SELECT has_function_privilege('authenticated','public.enforce_quote_comment_mutation()','EXECUTE');",None,None,'f')
    case('Owner can create own root',insert()+f"SELECT content FROM public.quote_comments WHERE id='{R}';",expected='root')
    case('Owner reads root',"SELECT count(*) FROM public.quote_comments;",expected=1)
    case('Other seller cannot read same-org unrelated quote',"SELECT count(*) FROM public.quote_comments;",uid=B,expected=0)
    case('Assigned collaborator can read root',"SELECT count(*) FROM public.quote_comments;",uid=E,expected=1)
    case('Quote creator can read root',"SELECT count(*) FROM public.quote_comments;",uid=F,expected=1)
    case('Coordinator in organization can read root',"SELECT count(*) FROM public.quote_comments;",uid=C,expected=1)
    case('Other organization has no visibility',"SELECT count(*) FROM public.quote_comments;",uid=D,expected=0)
    case('Anonymous cannot SELECT',"SELECT count(*) FROM public.quote_comments;",uid='',role='anon',state='42501')
    case('Anonymous cannot INSERT',insert(cid='30000000-0000-0000-0000-000000000099'),uid='',role='anon',state='42501')
    case('Authenticated without uid cannot read',"SELECT count(*) FROM public.quote_comments;",uid='',expected=0)
    case('Authenticated without uid cannot INSERT',insert(cid='30000000-0000-0000-0000-000000000099'),uid='',state='42501')
    case('Forged author rejected',insert(cid=RB,author=B),state='42501')
    case('Inaccessible quote insert rejected',insert(cid=RB,quote=QB),state='42501')
    case('Assigned collaborator adds own reply',insert(cid=RE,author=E,parent=f"'{R}'",content="'reply'")+f"SELECT parent_id FROM public.quote_comments WHERE id='{RE}';",uid=E,expected=R)
    case('Read comments from other authors on visible quote',"SELECT count(*) FROM public.quote_comments;",expected=2)
    case('Cross-quote parent rejected',insert(cid=RB,quote=QB,author=B,parent=f"'{R}'"),uid=B,state='23503')
    case('Missing parent rejected',insert(cid=RB,parent="'30000000-0000-0000-0000-000000000098'"),state='23503')
    case('Self parent rejected',insert(cid=RB,parent=f"'{RB}'"),state='23503')
    case('Reply to reply rejected',insert(cid=RB,parent=f"'{RE}'"),state='23514')
    case('Cannot move comment to another quote',f"UPDATE public.quote_comments SET quote_id='{QB}' WHERE id='{R}';",state='23514')
    case('Cannot change author',f"UPDATE public.quote_comments SET user_id='{B}' WHERE id='{R}';",state='23514')
    case('Cannot change identity',f"UPDATE public.quote_comments SET id='{RB}' WHERE id='{R}';",state='23514')
    case('Cannot change parent or create cycle',f"UPDATE public.quote_comments SET parent_id='{RE}' WHERE id='{R}';",state='23514')
    case('Cannot change created_at',f"UPDATE public.quote_comments SET created_at='2000-01-01' WHERE id='{R}';",state='23514')
    case('Other author update affects zero rows',f"WITH x AS(UPDATE public.quote_comments SET content='hacked' WHERE id='{R}' RETURNING id) SELECT count(*) FROM x;",uid=E,expected=0)
    case('Other author delete affects zero rows',f"WITH x AS(DELETE FROM public.quote_comments WHERE id='{R}' RETURNING id) SELECT count(*) FROM x;",uid=E,expected=0)
    case('Coordinator cannot edit other author',f"WITH x AS(UPDATE public.quote_comments SET content='hacked' WHERE id='{R}' RETURNING id) SELECT count(*) FROM x;",uid=C,expected=0)
    case('Owner edit succeeds and edited timestamp is server-owned',f"UPDATE public.quote_comments SET content='edited',is_edited=false,updated_at='2000-01-01' WHERE id='{R}'; SELECT is_edited AND updated_at>'2020-01-01' FROM public.quote_comments WHERE id='{R}';",expected='t')
    case('Edited flag cannot be cleared',f"UPDATE public.quote_comments SET is_edited=false WHERE id='{R}'; SELECT is_edited FROM public.quote_comments WHERE id='{R}';",expected='t')
    case('Delete parent with replies rejects without removing rows',f"DELETE FROM public.quote_comments WHERE id='{R}';",state='23503')
    case('Both rows retained after rejected deletion',"SELECT count(*) FROM public.quote_comments;",expected=2)
    for suffix,body,st in [('empty',"''",'23514'),('spaces',"'   '",'23514'),('tabs-newlines',"E'\\t\\n\\r'",'23514'),('NBSP',"chr(160)",'23514'),('BOM',"chr(65279)",'23514'),('wide Unicode whitespace',"chr(12288)||chr(8199)",'23514'),('null','NULL','23502'),('overlong',"repeat('x',5001)",'23514')]:
        case('Reject '+suffix+' content',insert(cid=RB,content=body),state=st)
    case('Exactly 5000 characters accepted',insert(cid=RB,content="repeat('x',5000)")+f"SELECT char_length(content) FROM public.quote_comments WHERE id='{RB}';",expected=5000)
    case('Owner can delete leaf',f"WITH x AS(DELETE FROM public.quote_comments WHERE id='{RB}' RETURNING id) SELECT count(*) FROM x;",expected=1)
    case('Unicode limit is characters not bytes',insert(cid=RB,content="repeat('á',5000)")+f"SELECT char_length(content)=5000 AND octet_length(content)=10000 FROM public.quote_comments WHERE id='{RB}';",expected='t')
    case('Cleanup unicode leaf',f"DELETE FROM public.quote_comments WHERE id='{RB}'; SELECT count(*) FROM public.quote_comments WHERE id='{RB}';",expected=0)
    case('Server prevents insert timestamp and edited spoof',f"INSERT INTO public.quote_comments(id,quote_id,user_id,content,is_edited,created_at,updated_at) VALUES('{RB}','{Q}','{A}','  trim me  ',true,'2000-01-01','2000-01-01'); SELECT content='trim me' AND NOT is_edited AND created_at>'2020-01-01' AND created_at=updated_at FROM public.quote_comments WHERE id='{RB}';",expected='t')
    case('Same normalized body does not mark edited',f"UPDATE public.quote_comments SET content=' trim me ',is_edited=true WHERE id='{RB}'; SELECT NOT is_edited FROM public.quote_comments WHERE id='{RB}';",expected='t')
    case('Clear own leaf before membership check',f"DELETE FROM public.quote_comments WHERE id='{RB}';",expected=None)
    case('Remove membership fixture',f"DELETE FROM public.test_org_members WHERE user_id='{A}';",None,None)
    case('Former member cannot read',"SELECT count(*) FROM public.quote_comments;",expected=0)
    case('Former member edit affects zero',f"WITH x AS(UPDATE public.quote_comments SET content='hacked' WHERE id='{R}' RETURNING id) SELECT count(*) FROM x;",expected=0)
    case('Restore membership fixture',f"INSERT INTO public.test_org_members VALUES('10000000-0000-0000-0000-000000000001','{A}',false);",None,None)
    case('Child author can remove own reply',f"WITH x AS(DELETE FROM public.quote_comments WHERE id='{RE}' RETURNING id) SELECT count(*) FROM x;",uid=E,expected=1)
    case('Root owner can delete after replies removed',f"WITH x AS(DELETE FROM public.quote_comments WHERE id='{R}' RETURNING id) SELECT count(*) FROM x;",expected=1)
    case('Seed quote cascade root',insert(cid=R,quote=QC),expected=None)
    case('Seed quote cascade child',insert(cid=RE,quote=QC,author=A,parent=f"'{R}'"),expected=None)
    case('Quote deletion cascades all own comments',f"DELETE FROM public.quotes WHERE id='{QC}'; SELECT count(*) FROM public.quote_comments WHERE quote_id='{QC}';",None,None,expected=0)
    # Real concurrent sessions validate FK protection after ordinary parent SELECT.
    def async_sql(body,uid):
        p=subprocess.Popen(DOCKER+['exec','-i',NAME,'psql','-X','-q','-A','-t','-U','postgres','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=ENV)
        p.stdin.write("SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','"+uid+"',false); BEGIN;\n"+body+"\n")
        p.stdin.flush()
        return p
    case('Seed concurrent-delete root',insert(cid=R),expected=None)
    pdel=async_sql(f"DELETE FROM public.quote_comments WHERE id='{R}'; SELECT 'deleted-uncommitted'; SELECT pg_sleep(1); COMMIT;",A)
    while True:
        line=pdel.stdout.readline()
        if not line: raise RuntimeError('concurrent delete did not reach synchronization marker')
        if line.strip()=='deleted-uncommitted': break
    case('Concurrent delete wins over reply insertion',insert(cid=RE,author=E,parent=f"'{R}'"),uid=E,state='23503')
    pdel.stdin.close(); pdel.wait(timeout=10)
    if pdel.returncode: raise RuntimeError('concurrent delete failed: '+pdel.stderr.read())
    case('No orphan reply after concurrent deletion',f"SELECT count(*) FROM public.quote_comments WHERE id='{RE}';",expected=0)
    case('Seed concurrent-insert root',insert(cid=R),expected=None)
    pins=async_sql(insert(cid=RE,author=E,parent=f"'{R}'")+"SELECT 'inserted-uncommitted'; SELECT pg_sleep(1); COMMIT;",E)
    while True:
        line=pins.stdout.readline()
        if not line: raise RuntimeError('concurrent insert did not reach synchronization marker')
        if line.strip()=='inserted-uncommitted': break
    case('Concurrent reply wins and prevents parent deletion',f"DELETE FROM public.quote_comments WHERE id='{R}';",state='23503')
    pins.stdin.close(); pins.wait(timeout=10)
    if pins.returncode: raise RuntimeError('concurrent insert failed: '+pins.stderr.read())
    case('Concurrent committed parent and reply both retained',f"SELECT count(*) FROM public.quote_comments WHERE id IN('{R}','{RE}');",expected=2)
    case('Existing table migration guard', 'BEGIN;\n'+MIGRATION.read_text()+'\nCOMMIT;',None,None,state='42P07')
    # Rollback is tested only in this disposable fixture, after behavior tests.
    case('Rollback removes comments resource only', ROLLBACK.read_text()+"\nSELECT to_regclass('public.quote_comments') IS NULL AND to_regclass('public.quotes') IS NOT NULL;",None,None,expected='t')
    summary={'migration':str(MIGRATION.relative_to(REPO)), 'migrationSha256':hashlib.sha256(MIGRATION.read_bytes()).hexdigest(), 'postgres':'17','productionTouched':False,'tests':len(results),'passed':sum(x['passed'] for x in results),'failed':sum(not x['passed'] for x in results),'cases':results}
    (OUTPUT/'sql-test-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in summary.items() if k!='cases'}),flush=True)
    return 1 if summary['failed'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
