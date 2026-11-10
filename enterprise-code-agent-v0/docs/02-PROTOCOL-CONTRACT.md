# 协议与平台契约

本文件区分“Codex 上游协议”和“本平台自定义接口”。字段以固定二进制生成的稳定 Schema 为最终依据。
当前研究候选为 Codex `0.167.0` / `rust-v0.167.0`，尚未在本环境安装验证；不可据此直接标记集成通过。[S6]

## 1. 连接方式

Worker 在自己的容器内启动 `codex app-server`，使用 stdin 写入、stdout 读取逐行 JSON。stderr 单独作为受控日志。
消息采用双向 JSON-RPC 语义，但线上 JSON 不带 `jsonrpc` 字段。[S1]
不能将 stderr 合并到 stdout，也不能假设一个 stdout chunk 对应一条 JSON。

先发送 initialize，收到成功 response 后再通知 initialized，然后调用其他方法：

```json
{"id":0,"method":"initialize","params":{"clientInfo":{"name":"enterprise_agent_workbench","title":"Enterprise Agent Workbench","version":"0.1.0"}}}
```

```json
{"method":"initialized"}
```

不默认启用 experimentalApi。企业客户端标识不得伪装成官方客户端。正式企业接入时另行确认官方文档中的客户端登记及所用账户/组织要求。[S1]

## 2. Thread 与 Turn

以下为调用形状示例，不含真实模型或密钥。`baseInstructions` / `developerInstructions` 存在于已查看的固定发布版本类型中；其实际提示语效果仍需测试。[S7]

```json
{"id":1,"method":"thread/start","params":{"model":"REPLACE_WITH_VERIFIED_MODEL","cwd":"/workspaces/SESSION_UUID","sandbox":"workspace-write","approvalPolicy":"on-request","approvalsReviewer":"user","developerInstructions":"你是统一 Code Agent。在当前授权工作区执行用户任务；按需使用只读企业 MCP。严格遵守沙盒、数据和网络边界。","ephemeral":false}}
```

上面的指令不是安全边界。统一 Code Agent 的工作区写入、Shell、只读 MCP 和网络规则必须由受控配置、容器和企业服务强制。普通问答同样处于固定能力封套内，不根据任务类别隐式切换策略。
Thread 的 `sandbox` 与 Turn 的 `sandboxPolicy` 是不同字段/类型，禁止机械互换。若本 V0 为完成 MCP 配置更新，须新建完整配置 Thread 并从头运行跨场景验收，不允许在旧 Thread 中隐式改变权限。[S7][S8]

```json
{"id":2,"method":"turn/start","params":{"threadId":"THREAD_FROM_SERVER","input":[{"type":"text","text":"请将下面的说明整理为三个要点。"}]}}
```

同版本的生成类型可能要求 input 的额外可选字段；不要从旧博客手写类型。按生成 Schema 和真实基线补齐。
`turn/start` 成功返回表示接收，不表示任务成功。等待终态事件并核对业务结果。

恢复时用 `thread/resume` 绑定原线程；读取历史走固定版本支持的 `thread/read`、turn/item 分页接口。所有请求之前做平台所有权校验。
取消使用 `turn/interrupt`，提供服务端保存的 threadId 与 turnId；收到 RPC 响应后仍须等待终态。[S1]

## 3. 双向分流

按以下次序分类，`id = 0` 也属于合法 ID：

| 消息形状 | 处理 |
|---|---|
| 含 method 和 id | 服务端请求；进入审批/询问处理器 |
| 仅含 method | 通知；规范化并写有序事件 |
| 含 id 与 result 或 error | 对应我方 pending RPC；按 ID 原始类型匹配 |
| 其他 | 协议异常；记录安全摘要并失败关闭 |

请求超时使调用进入“结果未确认”，不能自动重放有副作用的方法。
连接死亡时 reject 全部 pending Promise，清理计时器、停止接受新请求，更新 generation。
对重复/未知响应记录诊断，不把它当另一条请求的响应。未知服务端请求不能自动批准。

## 4. 审批：它是服务端发来的请求

命令/文件审批请求中有外层 RPC id，同时可有 threadId、turnId、itemId 等业务标识。必须保留外层原始 ID。
允许一次的响应形状为：

```json
{"id":"ORIGINAL_SERVER_RPC_ID","result":{"decision":"accept"}}
```

拒绝的响应形状为：

```json
{"id":"ORIGINAL_SERVER_RPC_ID","result":{"decision":"decline"}}
```

这两个 decision 必须属于当前 method 及其 availableDecisions；不同种类请求不能共享一个通用 result 对象。[S9]
命令、文件更改、权限请求、MCP elicitation 的结果 Schema 不同；按生成类型分别实现。
权限请求没有获授权的权限就返回空授权子集；MCP elicitation 没实现时明确拒绝，不替用户回答表单或打开外部登录地址。
未知请求可返回方法不支持错误并阻断相关任务，不能默认通过。

审批记录必须绑定：ownerUserId、sessionId、runId、runtimeId、generationId、rpcRequestId、method、请求内容 hash、有效期。
API 展示从后端记录取得的命令/文件摘要，绝不信任浏览器回传的审批内容。
V0 只允许一次性批准和拒绝，不支持 session/persistent 权限放大；策略以外的申请直接拒绝，即便 UI 点击同意。

数据库先以 CAS 将 pending 改为 deciding；只发送一次响应。重复点击返回同一决策；相反决策返回 409。
发送结果不明确则标为 uncertain，不声称已经执行；以服务端请求消解/Item 状态/Turn 状态核对。
前端刷新不更换 RPC id；Codex 重启则旧 generation 全部过期。批准不能跨进程复用。
审批到期且原连接仍活跃时，按该方法发送拒绝/取消并确认任务状态；连接不存在则标记失效。不能只从 UI 删除审批卡片而让上游永久等待。

**不是每次 MCP 调用都天然对应一个人工审批。** V0 只读查询由白名单与权限控制；未来写工具要在企业服务中另设强制授权/幂等。
必须真实触发并测试至少一种命令审批及文件变更审批；无法稳定触发时记录 blocker，不用前端假弹窗充数。

## 5. 自定义平台 HTTP API（不是 Codex 原生接口）

统一同源登录态。所有路径参数先验证格式与所有权，不接收 agentId / cwd / 内部 Worker 地址 / 原始 RPC；前端不能通过任务类型切换执行权限。

| 方法与路径 | 请求要点 | 结果 |
|---|---|---|
| POST `/api/auth/login` | username、password | HttpOnly Cookie；无密码回显 |
| POST `/api/auth/logout` | CSRF/Origin | 使登录态失效 |
| GET `/api/capabilities` | 登录态 | 统一 Code Agent 的安全能力摘要（只读，不含秘密） |
| POST `/api/sessions` | clientRequestId（无 agentId） | sessionId、统一配置 hash |
| GET `/api/sessions` | 游标 | 只列本人会话 |
| GET `/api/sessions/:id` | 本人会话 | 状态及事件快照 |
| POST `/api/sessions/:id/runs` | text、clientRequestId | 202 + runId |
| GET `/api/sessions/:id/events` | Last-Event-ID / afterSeq | SSE 持久回放后直播 |
| POST `/api/runs/:id/cancel` | clientRequestId | 202；不是终态承诺 |
| POST `/api/approvals/:id/decision` | allow_once / deny | 当前审批状态 |
| GET `/api/artifacts/:id/download` | 登录态 | 授权范围内的普通文件 |
| GET `/health/live` | 无敏感数据 | 进程存活 |
| GET `/health/ready` | 无敏感数据 | DB/配置/必要 Worker 可服务 |

任务和建会话接口必须有幂等键；审批接口以记录本身的一次性决策幂等。
GET 不触发新的模型任务；刷新不能发生重复执行。401 未登录、404 不可访问、409 状态冲突、429 容量、503 依赖不可用。
错误返回 `{code,message,requestId,retryable}`，不得返回 token、系统路径、另一个账号的 Thread ID 或模型完整原始响应。

## 6. 平台事件

规范化事件最少含 eventId、sessionId、runId（可空）、seq、type、time、payload。
事件先持久化，再给浏览器；终态事件不能只存在前端内存里。

| Codex 上游信号 | 平台事件 |
|---|---|
| turn/started | run.started |
| item/agentMessage/delta | message.delta |
| item/started | item.started |
| item/completed | item.completed |
| 审批 server request | approval.requested |
| serverRequest/resolved（锁定版本支持时） | approval.resolved / 进入核对 |
| turn/completed | run.completed，保留真实终态 |
| RPC error / 子进程退出 | run.failed 或 run.uncertain |

上游方法名清单以生成 Schema 和基线事件为准。[S1]
Delta 用 itemId 归属，不能把不同 Item 拼成一个字符串。最终完成快照替换该 Item 的缓存而非再次追加，避免重复答案。
未知 Item 类型显示安全的“暂不支持的过程项”并记录，不让整条会话崩溃。
不显示隐藏思维过程；工具输出须限长、转义并脱敏，禁止渲染任意 HTML 或执行下载内容。

Worker sourceSeq 与数据库 SSE seq 是两套序号。入库唯一键是 `(runtimeId,generationId,sourceSeq)`，不要拿客户端游标做 Worker 去重。
SSE 游标超出保留范围返回 resync_required，重新读取授权快照。此过程绝不重新提交用户消息。

## 7. MCP 业务契约（项目约定）

示例工具 `knowledge_search` 输入只含 query、limit；用户身份与数据范围由网关短期凭据推导，不能由模型指定。
成功输出建议：`{queryId, hits:[{sourceId,title,snippet,locator}], truncated}`。
失败输出必须区分 forbidden、unavailable、timeout；空 hits 是成功但无结果，不等于系统报错。

只展示统一 Code Agent 在本次调用返回的引用标识，并校验每条引用确实来自授权结果。模型仍可能误读片段，因此保留人工/固定集语义验收。
后端日志用 queryId 和状态追踪，不默认记录敏感全文。所有样例都是契约设计，并非 Codex 自带知识库 API。

## 8. 版本契约

运行 `scripts/prepare-upstream.sh` 后，把 commit、CLI 版本、生成 Schema hash、依赖 lockfile 和镜像 digest 纳入证据。
协议更新需重跑：初始化、对话、所有审批结果、取消、恢复、未知事件、跨用户负向测试。
不要把当前在线文档与旧镜像混用；不要手改生成文件。
