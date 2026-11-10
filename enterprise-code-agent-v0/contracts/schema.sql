-- 统一 Code Agent 的初始 SQLite 草案；由系统固定配置，不在数据表存三种 Agent。
-- Initial SQLite schema for one fixed Code Agent; no three-agent catalog.
-- 注意：仍需 API 授权、迁移与恢复集成测试。
-- API authorization and integration tests remain required.
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE runtimes (
  runtime_id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(user_id),
  policy_id TEXT NOT NULL CHECK(policy_id = 'scoped-user-workspace'),
  UNIQUE(runtime_id, owner_user_id)
);
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(user_id),
  runtime_id TEXT NOT NULL,
  client_request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  config_json TEXT NOT NULL CHECK(json_valid(config_json)),
  config_hash TEXT NOT NULL,
  codex_thread_id TEXT,
  state TEXT NOT NULL DEFAULT 'provisioning' CHECK(state IN ('provisioning','ready','recovering','blocked','archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(owner_user_id, client_request_id),
  UNIQUE(session_id, owner_user_id, runtime_id),
  UNIQUE(runtime_id, codex_thread_id),
  FOREIGN KEY(runtime_id, owner_user_id) REFERENCES runtimes(runtime_id, owner_user_id)
);
CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  runtime_id TEXT NOT NULL,
  generation_id TEXT,
  codex_turn_id TEXT,
  client_request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('created','dispatching','running','awaiting_approval','cancelling','succeeded','failed','interrupted','uncertain')),
  safe_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(session_id, client_request_id),
  UNIQUE(run_id, session_id, owner_user_id, runtime_id),
  FOREIGN KEY(session_id, owner_user_id, runtime_id) REFERENCES sessions(session_id, owner_user_id, runtime_id)
);
-- uncertain 也占用运行槽，防止结果未核对就重复执行。
-- Uncertain runs retain the slot until reconciliation.
CREATE UNIQUE INDEX one_active_run_per_user ON runs(owner_user_id)
WHERE state IN ('created','dispatching','running','awaiting_approval','cancelling','uncertain');
CREATE TABLE events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  run_id TEXT,
  runtime_id TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  source_seq INTEGER NOT NULL CHECK(source_seq >= 1),
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(runtime_id, generation_id, source_seq),
  FOREIGN KEY(session_id, owner_user_id, runtime_id) REFERENCES sessions(session_id, owner_user_id, runtime_id),
  FOREIGN KEY(run_id, session_id, owner_user_id, runtime_id) REFERENCES runs(run_id, session_id, owner_user_id, runtime_id)
);
CREATE INDEX events_by_session ON events(session_id, seq);
CREATE TABLE approvals (
  approval_id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  runtime_id TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  rpc_id_json TEXT NOT NULL CHECK(json_valid(rpc_id_json) AND json_type(rpc_id_json) IN ('integer','text')),
  method TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  safe_summary_json TEXT NOT NULL CHECK(json_valid(safe_summary_json)),
  state TEXT NOT NULL CHECK(state IN ('pending','deciding','allowed','denied','expired','uncertain')),
  decision TEXT CHECK(decision IS NULL OR decision IN ('allow_once','deny')),
  expires_at TEXT NOT NULL,
  UNIQUE(runtime_id, generation_id, rpc_id_json),
  FOREIGN KEY(run_id, session_id, owner_user_id, runtime_id) REFERENCES runs(run_id, session_id, owner_user_id, runtime_id)
);
CREATE TABLE artifacts (
  artifact_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  runtime_id TEXT NOT NULL,
  relative_path TEXT NOT NULL CHECK(relative_path NOT LIKE '/%' AND instr(relative_path,char(0))=0),
  size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
  sha256 TEXT NOT NULL,
  media_type TEXT NOT NULL,
  FOREIGN KEY(session_id, owner_user_id, runtime_id) REFERENCES sessions(session_id, owner_user_id, runtime_id)
);
CREATE TABLE audit (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT REFERENCES users(user_id),
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  safe_metadata_json TEXT NOT NULL CHECK(json_valid(safe_metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
PRAGMA user_version = 1;
