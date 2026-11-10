import { Buffer } from 'node:buffer';

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isId = (x) => typeof x === 'string' || Number.isSafeInteger(x);

/** 可安全发送的协议错误，不放入秘密或堆栈。
 * Explicit safe protocol error; do not include secrets or stack traces. */
export class RpcFault extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RpcFault';
    this.code = code;
  }
}

/** 仅传输骨架：无身份、持久化、审批策略或产品级执行隔离。
 * Transport skeleton only: no authorization, persistence or sandbox policy.
 * Handlers must preserve business ordering; notifications here are synchronous.
 */
export class JsonlPeer {
  constructor(input, output, {
    timeoutMs = 30_000,
    maxFrameBytes = 2 * 1024 * 1024,
    maxPending = 64,
    maxBufferedWriteBytes = 8 * 1024 * 1024,
    onNotification = () => {},
    onServerRequest = async () => { throw new RpcFault(-32601, 'Unsupported server request'); },
    onDiagnostic = () => {},
  } = {}) {
    if (![timeoutMs, maxFrameBytes, maxPending, maxBufferedWriteBytes].every(
      (x) => Number.isSafeInteger(x) && x > 0)) throw new TypeError('Limits must be positive integers');
    this.input = input;
    this.output = output;
    this.options = { timeoutMs, maxFrameBytes, maxPending, maxBufferedWriteBytes };
    this.onNotification = onNotification;
    this.onServerRequest = onServerRequest;
    this.onDiagnostic = onDiagnostic;
    this.buffer = Buffer.alloc(0);
    this.pending = new Map();
    this.serverPending = new Set();
    this.nextId = 0;
    this.closed = false;
    this.closeReason = null;
    input.on('data', (chunk) => this._receive(chunk));
    input.on('end', () => this.close(new Error(this.buffer.length ? 'Truncated JSONL frame' : 'Transport ended')));
    input.on('close', () => this.close(new Error('Transport closed')));
    input.on('error', (err) => this.close(err));
    output.on('error', (err) => this.close(err));
  }

  get pendingCount() { return this.pending.size; }

  request(method, params = {}, { timeoutMs = this.options.timeoutMs } = {}) {
    if (this.closed) return Promise.reject(this.closeReason);
    if (typeof method !== 'string' || !method || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
      return Promise.reject(new TypeError('Invalid method or timeout'));
    if (this.pending.size >= this.options.maxPending)
      return Promise.reject(new Error('Too many pending requests'));
    if (!Number.isSafeInteger(this.nextId)) return Promise.reject(new Error('RPC id exhausted'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      // 超时不自动重试：执行结果可能未知。
      // Never auto-retry a timed-out request; execution may be uncertain.
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}; result unconfirmed`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this._send({ id, method, params }); }
      catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  notify(method, params) {
    if (typeof method !== 'string' || !method) throw new TypeError('Invalid method');
    this._send(params === undefined ? { method } : { method, params });
  }

  _send(message) {
    if (this.closed) throw this.closeReason;
    const frame = Buffer.from(`${JSON.stringify(message)}\n`, 'utf8');
    if (frame.length - 1 > this.options.maxFrameBytes) throw new Error('Outgoing frame too large');
    if ((this.output.writableLength ?? 0) + frame.length > this.options.maxBufferedWriteBytes) {
      const err = new Error('Outbound backpressure limit reached');
      this.close(err);
      throw err;
    }
    // write callback catches asynchronous pipe errors; no shell is involved.
    this.output.write(frame, (err) => { if (err) this.close(err); });
  }

  _receive(chunk) {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
    while (!this.closed) {
      const newline = this.buffer.indexOf(10);
      if (newline === -1) {
        if (this.buffer.length > this.options.maxFrameBytes) this.close(new Error('Incoming frame too large'));
        return;
      }
      if (newline > this.options.maxFrameBytes) { this.close(new Error('Incoming frame too large')); return; }
      const frame = this.buffer.subarray(0, newline);
      this.buffer = this.buffer.subarray(newline + 1);
      try {
        // Decode only a complete frame: UTF-8 can span input chunks.
        const message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(frame));
        this._dispatch(message);
      } catch (err) { this.close(err instanceof Error ? err : new Error('Invalid protocol frame')); }
    }
  }

  _dispatch(msg) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) throw new Error('Expected object frame');
    if (has(msg, 'method')) {
      if (typeof msg.method !== 'string' || !msg.method || has(msg, 'result') || has(msg, 'error'))
        throw new Error('Invalid request/notification frame');
      if (has(msg, 'id')) {
        if (!isId(msg.id)) throw new Error('Invalid server request id');
        if (this.serverPending.has(msg.id)) throw new Error('Duplicate active server request id');
        if (this.serverPending.size >= this.options.maxPending) throw new Error('Too many server requests');
        this.serverPending.add(msg.id);
        // 请求 ID 保留原类型；数字 0 和字符串 "0" 不合并。
        // Preserve id type; number 0 and string "0" are different IDs.
        Promise.resolve().then(() => this.onServerRequest(msg)).then(
          (result) => this._reply(msg.id, { result: result === undefined ? null : result }),
          (err) => this._reply(msg.id, { error: {
            code: err instanceof RpcFault && Number.isSafeInteger(err.code) ? err.code : -32603,
            message: err instanceof RpcFault ? err.message : 'Server request handler failed',
          } }),
        ).catch((err) => this.close(err)).finally(() => this.serverPending.delete(msg.id));
      } else {
        // Handler must be synchronous or enqueue into an explicitly ordered journal.
        this.onNotification(msg);
      }
      return;
    }
    if (!has(msg, 'id') || !isId(msg.id) || has(msg, 'result') === has(msg, 'error'))
      throw new Error('Invalid response frame');
    if (has(msg, 'error') && (!msg.error || !Number.isSafeInteger(msg.error.code)
      || typeof msg.error.message !== 'string')) throw new Error('Invalid error response');
    const item = this.pending.get(msg.id);
    if (!item) { this.onDiagnostic({ type: 'unmatched-response', id: msg.id }); return; }
    clearTimeout(item.timer);
    this.pending.delete(msg.id);
    if (has(msg, 'error')) item.reject(new RpcFault(msg.error.code, msg.error.message));
    else item.resolve(msg.result);
  }

  _reply(id, payload) {
    if (!this.closed) this._send({ id, ...payload });
  }

  close(reason = new Error('Peer closed')) {
    if (this.closed) return;
    this.closed = true;
    this.closeReason = reason instanceof Error ? reason : new Error('Peer closed');
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(this.closeReason);
    }
    this.pending.clear();
    this.serverPending.clear();
    this.buffer = Buffer.alloc(0);
    // Caller owns stream/process shutdown; this class never kills unrelated processes.
  }
}
