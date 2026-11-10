/** 本文件是平台自定义契约，不是手写的 Codex 上游类型。
 * Platform-owned contracts, not replacements for generated Codex types. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type RpcId = string | number;
export type RunState = 'created' | 'dispatching' | 'running' | 'awaiting_approval'
  | 'cancelling' | 'succeeded' | 'failed' | 'interrupted' | 'uncertain';

/** 统一 Code Agent：任务不同，不创建三个 Agent 身份。
 * One Code Agent identity; task examples are not independent agents. */
export interface CodeAgentPolicy {
  readonly workspaceRoot: 'per-session-isolated-path';
  readonly shellEnabledWithinSandbox: true;
  readonly workspaceWriteAllowed: true;
  readonly mcpToolAllowlist: readonly string[];
  readonly sandboxIntent: 'workspace-write';
  readonly approvals: 'user-on-request';
  readonly arbitraryNetworkAllowed: false;
  readonly enterpriseWriteToolsAllowed: false;
  readonly pushOrDeployAllowed: false;
}
export interface CodeAgentDefinition {
  readonly id: 'enterprise-code-agent';
  readonly name: 'Code Agent';
  readonly version: string;
  readonly modelRef: string;
  readonly policyId: string;
  readonly instructions: string;
  readonly policy: CodeAgentPolicy;
}
export interface SessionRecord {
  readonly id: string;
  readonly ownerUserId: string;
  readonly runtimeId: string;
  readonly codeAgentConfig: CodeAgentDefinition;
  readonly configHash: string;
  readonly codexThreadId: string | null;
}
/** 身份和路由只能由服务端推导；每个测试用户独立 Runtime。
 * Server-derived identity and routing; users never choose the runtime ID. */
export interface RuntimeBinding {
  readonly runtimeId: string;
  readonly ownerUserId: string;
  readonly policyId: 'scoped-user-workspace';
  readonly generationId: string;
}
/** 创建会话不接收 agentId、cwd、任意 MCP 地址或权限切换。
 * Session creation has no agent selector or client-controlled capabilities. */
export interface CreateSessionInput { clientRequestId: string }
export interface StartRunInput { text: string; clientRequestId: string }
export interface RunRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly ownerUserId: string;
  readonly generationId: string | null;
  readonly state: RunState;
  readonly codexTurnId: string | null;
}
export type ApprovalDecision = 'allow_once' | 'deny';
export type ApprovalState = 'pending' | 'deciding' | 'allowed' | 'denied' | 'expired' | 'uncertain';
export interface ApprovalRecord {
  readonly id: string;
  readonly ownerUserId: string;
  readonly sessionId: string;
  readonly runId: string;
  readonly runtimeId: string;
  readonly generationId: string;
  readonly rpcRequestId: RpcId;
  readonly method: string;
  readonly requestHash: string;
  readonly expiresAt: string;
  readonly state: ApprovalState;
  readonly decision: ApprovalDecision | null;
}
export type EventType = 'run.started' | 'message.delta' | 'item.started' | 'item.completed'
  | 'approval.requested' | 'approval.resolved' | 'run.completed' | 'run.failed'
  | 'run.uncertain' | 'runtime.status';
export interface PlatformEvent {
  readonly eventId: string;
  readonly sessionId: string;
  readonly runId: string | null;
  readonly seq: number;
  readonly type: EventType;
  readonly time: string;
  readonly payload: Json;
}
/** 每代进程序号单调；与面向浏览器的数据库序号不同。
 * Per-generation source cursor, separate from the browser-facing DB sequence. */
export interface WorkerEventCursor {
  readonly runtimeId: string;
  readonly generationId: string;
  readonly sourceSeq: number;
}
export interface ApiFailure {
  readonly code: string;
  readonly message: string;
  readonly requestId: string;
  readonly retryable: boolean;
}
export interface KnowledgeHit {
  readonly sourceId: string;
  readonly title: string;
  readonly snippet: string;
  readonly locator: string;
}
export interface KnowledgeResult {
  readonly queryId: string;
  readonly hits: readonly KnowledgeHit[];
  readonly truncated: boolean;
}
