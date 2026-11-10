import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonlPeer } from './jsonl-peer.mjs';

// 仅握手；不创建 Thread，不触发模型调用。隔离 HOME，避免读取个人配置。
// Handshake only: no thread/model calls; use a fresh home, not personal credentials.
const home = await mkdtemp(join(tmpdir(), 'eap-probe-'));
const codexHome = join(home, '.codex');
await mkdir(codexHome);
const binary = process.env.CODEX_BIN || 'codex';
const child = spawn(binary, ['app-server'], {
  shell: false,
  cwd: home,
  env: { PATH: process.env.PATH || '', HOME: home, CODEX_HOME: codexHome, LANG: 'C.UTF-8' },
  stdio: ['pipe', 'pipe', 'pipe'],
});
let stderrBytes = 0;
child.stderr.on('data', (chunk) => { stderrBytes += chunk.length; });
const peer = new JsonlPeer(child.stdout, child.stdin, { timeoutMs: 15_000 });
const finished = new Promise((resolve) => {
  child.once('error', (error) => { peer.close(error); resolve(); });
  child.once('close', (code, signal) => {
    peer.close(new Error(`Codex exited: ${code ?? signal}`));
    resolve();
  });
});
try {
  const result = await peer.request('initialize', {
    clientInfo: { name: 'enterprise_agent_workbench', title: 'Enterprise Agent Workbench', version: '0.1.0' },
  });
  peer.notify('initialized');
  console.log(JSON.stringify({
    scope: 'handshake_only', status: 'pass',
    resultKeys: result && typeof result === 'object' ? Object.keys(result) : [],
    modelInvoked: false, dockerValidated: false,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ scope: 'handshake_only', status: 'failed', message: error.message, stderrBytes }));
  process.exitCode = 1;
} finally {
  peer.close();
  child.stdin.end();
  child.kill('SIGTERM');
  const hardStop = setTimeout(() => child.kill('SIGKILL'), 2_000);
  await finished;
  clearTimeout(hardStop);
  await rm(home, { recursive: true, force: true });
}
