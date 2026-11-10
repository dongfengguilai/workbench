"""验证 SQL 的离线约束；不证明 Web/API 授权已实现。
Offline SQL constraints only; not evidence of implemented Web/API authorization.
"""
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]

class SchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.executescript((ROOT / 'contracts/schema.sql').read_text())
        self.db.executemany('INSERT INTO users(user_id,username,password_hash) VALUES(?,?,?)',
                            [('a','user_a','TEST_HASH'),('b','user_b','TEST_HASH')])
        self.db.executemany('INSERT INTO runtimes VALUES(?,?,?)', [
            ('ra','a','scoped-user-workspace'),
            ('rb','b','scoped-user-workspace')])
        self.session('sa','a','ra','create-a')
        self.session('sa2','a','ra','create-a2')
        self.session('sb','b','rb','create-b')
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def session(self, sid, owner, rid, key):
        self.db.execute("""INSERT INTO sessions(session_id,owner_user_id,runtime_id,
            client_request_id,request_hash,config_json,config_hash)
            VALUES(?,?,?,?,'h','{}','ch')""", (sid, owner, rid, key))

    def add_run(self, run='run-a', sid='sa', owner='a', rid='ra', state='running', key='request-1'):
        self.db.execute("""INSERT INTO runs(run_id,session_id,owner_user_id,runtime_id,
            generation_id,client_request_id,request_hash,state) VALUES(?,?,?,?,'g1',?,'h',?)""",
            (run,sid,owner,rid,key,state))

    def test_single_agent_identity_not_duplicated_in_schema(self):
        for table in ('runtimes','sessions'):
            columns={row[1] for row in self.db.execute(f'PRAGMA table_info({table})')}
            self.assertNotIn('agent_id', columns)
        self.assertEqual(self.db.execute('select count(*) from runtimes').fetchone()[0],2)

    def test_cross_user_runtime_binding_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.session('bad','a','rb','x')

    def test_create_session_idempotency_constraint(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.session('duplicate','a','ra','create-a')

    def test_cross_user_run_binding_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_run(owner='b')

    def test_one_active_run_across_same_agent_sessions(self):
        self.add_run()
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_run('run-next','sa2','a','ra',key='request-2')

    def test_uncertain_blocks_new_run(self):
        self.add_run(state='uncertain')
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_run('run-next',key='next')
        self.db.execute("UPDATE runs SET state='failed' WHERE run_id='run-a'")
        self.add_run('run-next',key='next')

    def test_two_users_can_run(self):
        self.add_run()
        self.add_run('run-b','sb','b','rb')
        self.assertEqual(self.db.execute('SELECT count(*) FROM runs').fetchone()[0],2)

    def test_run_idempotency_after_completion(self):
        self.add_run(state='succeeded')
        with self.assertRaises(sqlite3.IntegrityError):
            self.add_run('duplicate')

    def test_event_replay_is_unique(self):
        self.add_run()
        stmt="""INSERT INTO events(event_id,session_id,owner_user_id,run_id,runtime_id,
            generation_id,source_seq,type,payload_json)
            VALUES(?,'sa','a','run-a','ra','g1',1,'run.started','{}')"""
        self.db.execute(stmt,('e1',))
        with self.assertRaises(sqlite3.IntegrityError): self.db.execute(stmt,('e2',))

    def test_approval_rpc_id_type_is_preserved(self):
        self.add_run()
        stmt="""INSERT INTO approvals(approval_id,owner_user_id,session_id,run_id,runtime_id,
            generation_id,rpc_id_json,method,request_hash,safe_summary_json,state,expires_at)
            VALUES(?,'a','sa','run-a','ra','g1',?,'approval','h','{}','pending','2099-01-01')"""
        self.db.execute(stmt,('p1','0'))
        self.db.execute(stmt,('p2','"0"'))
        with self.assertRaises(sqlite3.IntegrityError): self.db.execute(stmt,('p3','0'))

    def test_artifact_cannot_bind_other_owner(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO artifacts VALUES('f1','sa','b','ra','result.txt',1,'hash','text/plain')""")

if __name__ == '__main__':
    unittest.main(verbosity=2)
