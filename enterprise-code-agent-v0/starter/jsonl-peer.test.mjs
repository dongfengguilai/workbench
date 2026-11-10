import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { setImmediate as tick } from 'node:timers/promises';
import { JsonlPeer, RpcFault } from './jsonl-peer.mjs';

function harness(options = {}) {
  const input = new PassThrough(), output = new PassThrough(), sent = [];
  output.on('data', (data) => {
    for (const line of data.toString().trim().split('\n')) sent.push(JSON.parse(line));
  });
  return { input, output, sent, peer: new JsonlPeer(input, output, { timeoutMs: 1000, ...options }),
    emit: (m) => input.write(JSON.stringify(m) + '\n') };
}

test('request id zero resolves; no jsonrpc header on wire', async () => {
  const h = harness(); const result = h.peer.request('initialize');
  assert.equal(h.sent[0].id, 0); assert.equal('jsonrpc' in h.sent[0], false);
  h.emit({ id: 0, result: { ok: true } });
  assert.deepEqual(await result, { ok: true }); h.peer.close();
});

test('handles split UTF-8 frame and multiple frames in one chunk', () => {
  const seen = [], h = harness({ onNotification: (m) => seen.push(m.params) });
  const b = Buffer.from(JSON.stringify({ method: 'delta', params: '中文输出' }) + '\n');
  const split = b.indexOf(Buffer.from('中')) + 1;
  h.input.write(b.subarray(0, split)); h.input.write(b.subarray(split));
  h.input.write('{"method":"delta","params":"a"}\n{"method":"delta","params":"b"}\n');
  assert.deepEqual(seen, ['中文输出', 'a', 'b']); h.peer.close();
});

test('out of order responses resolve correct request', async () => {
  const h = harness(), a = h.peer.request('a'), b = h.peer.request('b');
  h.emit({ id: 1, result: 'B' }); h.emit({ id: 0, result: 'A' });
  assert.deepEqual(await Promise.all([a, b]), ['A', 'B']); h.peer.close();
});

test('server request is not mistaken for response even with colliding id', async () => {
  const h = harness({ onServerRequest: async () => ({ decision: 'decline' }) });
  const client = h.peer.request('client');
  h.emit({ id: 0, method: 'item/commandExecution/requestApproval', params: {} });
  await tick();
  assert.deepEqual(h.sent[1], { id: 0, result: { decision: 'decline' } });
  assert.equal(h.peer.pendingCount, 1);
  h.emit({ id: 0, result: 'done' }); assert.equal(await client, 'done'); h.peer.close();
});

test('preserves string and integer IDs in server requests', async () => {
  const h = harness({ onServerRequest: async (m) => ({ same: m.id }) });
  h.emit({ id: 0, method: 'approval' }); h.emit({ id: '0', method: 'approval' });
  await tick(); assert.deepEqual(h.sent.map((m) => m.id), [0, '0']); h.peer.close();
});

test('unknown server request fails closed instead of approving', async () => {
  const h = harness(); h.emit({ id: 's1', method: 'unknown' }); await tick();
  assert.equal(h.sent[0].error.code, -32601); assert.equal('result' in h.sent[0], false); h.peer.close();
});

test('handler exception is sanitized', async () => {
  const h = harness({ onServerRequest: async () => { throw new Error('secret-token'); } });
  h.emit({ id: 5, method: 'approval' }); await tick();
  assert.equal(h.sent[0].error.code, -32603);
  assert.equal(JSON.stringify(h.sent).includes('secret-token'), false); h.peer.close();
});

test('upstream RPC errors reject the correct request', async () => {
  const h = harness(), pending = h.peer.request('bad');
  const assertion = assert.rejects(pending, (e) => e instanceof RpcFault && e.code === -32602);
  h.emit({ id: 0, error: { code: -32602, message: 'Invalid params' } });
  await assertion; h.peer.close();
});

test('timeout clears pending and never retries', async () => {
  const h = harness(); await assert.rejects(h.peer.request('slow', {}, { timeoutMs: 15 }), /unconfirmed/);
  assert.equal(h.peer.pendingCount, 0); assert.equal(h.sent.length, 1); h.peer.close();
});

test('close rejects every pending request and future requests', async () => {
  const h = harness(), a = h.peer.request('a'), b = h.peer.request('b');
  const assertions = [assert.rejects(a, /lost/), assert.rejects(b, /lost/)];
  h.peer.close(new Error('lost')); await Promise.all(assertions);
  assert.equal(h.peer.pendingCount, 0); await assert.rejects(h.peer.request('c'), /lost/);
});

test('malformed and oversized frames fail closed', () => {
  const a = harness(); a.input.write('not-json\n'); assert.equal(a.peer.closed, true);
  const b = harness({ maxFrameBytes: 10 }); b.input.write('x'.repeat(11));
  assert.equal(b.peer.closed, true);
});

test('truncated frame on EOF closes transport', async () => {
  const h = harness(); h.input.end('{"method":'); await tick();
  assert.equal(h.peer.closed, true); assert.match(h.peer.closeReason.message, /Truncated/);
});

test('duplicate active server request ID fails closed', async () => {
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  const h = harness({ onServerRequest: () => wait });
  h.emit({ id: 2, method: 'approval' }); h.emit({ id: 2, method: 'approval' });
  assert.equal(h.peer.closed, true); release({ decision: 'accept' }); await tick();
  assert.equal(h.sent.length, 0);
});

test('pending limit prevents unbounded client requests', async () => {
  const h = harness({ maxPending: 1 }), pending = h.peer.request('a');
  await assert.rejects(h.peer.request('b'), /Too many/);
  const assertion = assert.rejects(pending, /done/); h.peer.close(new Error('done')); await assertion;
});

test('late response is diagnostic, not a new request', async () => {
  const diagnostics = [], h = harness({ onDiagnostic: (m) => diagnostics.push(m) });
  await assert.rejects(h.peer.request('slow', {}, { timeoutMs: 15 }), /timeout/);
  h.emit({ id: 0, result: 'late' });
  assert.deepEqual(diagnostics, [{ type: 'unmatched-response', id: 0 }]); h.peer.close();
});

test('invalid response with both result and error is rejected', () => {
  const h = harness(); h.emit({ id: 3, result: null, error: { code: -1, message: 'x' } });
  assert.equal(h.peer.closed, true);
});

test('invalid UTF-8 fails closed rather than silently replacing text', () => {
  const h = harness();
  h.input.write(Buffer.concat([Buffer.from('{"method":"x","params":"'), Buffer.from([0xff]), Buffer.from('"}\n')]));
  assert.equal(h.peer.closed, true);
});

test('string response ID does not resolve a numeric request ID', async () => {
  const h = harness(), request = h.peer.request('a');
  h.emit({ id: '0', result: 'wrong' }); assert.equal(h.peer.pendingCount, 1);
  h.emit({ id: 0, result: 'correct' }); assert.equal(await request, 'correct'); h.peer.close();
});

test('outbound buffer budget fails closed', async () => {
  const h = harness({ maxBufferedWriteBytes: 1 });
  await assert.rejects(h.peer.request('a'), /backpressure/);
  assert.equal(h.peer.closed, true); assert.equal(h.peer.pendingCount, 0);
});

test('pipe failure rejects pending requests', async () => {
  const h = harness(), request = h.peer.request('a');
  const assertion = assert.rejects(request, /broken pipe/);
  h.output.emit('error', new Error('broken pipe')); await assertion;
  assert.equal(h.peer.pendingCount, 0);
});
