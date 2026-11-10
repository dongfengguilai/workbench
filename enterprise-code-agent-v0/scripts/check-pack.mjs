import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'README.md', 'AGENTS.md', 'START_HERE.md',
  'docs/01-V0-SPEC.md', 'docs/02-PROTOCOL-CONTRACT.md', 'docs/03-TASKS.md',
  'docs/04-ACCEPTANCE.md', 'docs/05-DOCKER-RUNBOOK.md', 'docs/06-RESEARCH.md',
  'docs/07-UNIFIED-CODE-AGENT-DECISION.md',
  'contracts/platform.ts', 'contracts/schema.sql', 'config/code-agent.example.json',
  'config/codex-provider.example.toml', 'config/platform.env.example',
  'starter/jsonl-peer.mjs', 'starter/jsonl-peer.test.mjs', 'starter/handshake.mjs',
  'scripts/prepare-upstream.sh', 'scripts/check-sql.py',
  'deploy/Dockerfile.eap-probe', 'deploy/compose.eap-probe.yml',
  'deploy/compose.eap-v0.yml.example', 'fixtures/coding/average.py',
  'fixtures/coding/test_average.py', 'evidence/delivery-status.json',
];
for (const file of required) assert.ok(fs.statSync(path.join(root, file)).size > 0, file);
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/code-agent.example.json'), 'utf8'));
assert.equal(config.codeAgent.id, 'enterprise-code-agent');
assert.equal(config.codeAgent.policy.arbitraryNetworkAllowed, false);
assert.equal(config.codeAgent.policy.enterpriseWriteToolsAllowed, false);
assert.equal(config.codeAgent.policy.pushOrDeployAllowed, false);
assert.equal(config.codeAgent.policy.approvals, 'user-on-request');
assert.deepEqual(config.codeAgent.policy.mcpToolAllowlist, ['enterprise_knowledge.knowledge_search']);
assert.ok(!('agents' in config), 'Do not re-introduce three user-selectable agents.');
assert.ok(!fs.existsSync(path.join(root, 'config/agents.example.json')),
  'Old three-agent config must be removed.');
const contract = fs.readFileSync(path.join(root, 'contracts/platform.ts'), 'utf8');
assert.ok(!contract.includes('AgentId'), 'No three-agent AgentId type.');
const status = JSON.parse(fs.readFileSync(path.join(root, 'evidence/delivery-status.json'), 'utf8'));
if (status.productAccepted) {
  assert.equal(status.productImplementationComplete, true);
  for (const field of ['realCodexIntegration', 'realModelIntegration', 'enterpriseMcpIntegration', 'dockerBuildAndE2E'])
    assert.equal(status[field]?.status, 'pass', `Missing real evidence status: ${field}`);
  assert.equal(status.userAcceptance?.accepted, true);
  assert.ok(status.userAcceptance?.confirmation, 'User confirmation must be recorded');
}
assert.ok(!fs.existsSync(path.join(root, '.env')), 'Do not distribute real .env');
console.log(`PASS: ${required.length} required files, one unified Code Agent config, honest delivery status, no real .env.`);
console.log('Scope: package structure only; not Codex/model/MCP/Docker compatibility.');
