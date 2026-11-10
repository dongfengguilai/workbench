# V0 产品与工程规格 · 统一 Code Agent 版

版本：v0.1.1 开发规格；状态：待实施／未验收；修订：2026-11-10。

## 1. 唯一的产品抽象

企业用户登录同一个 Web 工作台，直接给 **Code Agent** 下任务。该 Agent 底层统一由 **Codex App Server / Codex Core** 执行。

**普通问答、企业知识检索和代码执行是任务场景，不是三种 Agent。** 用户无需选择 Agent、模式、预设角色，也无需让三个 Agent 互相交接。

V0 核心成功信号：**同一个用户在同一个 Codex Thread 中，先询问企业规范 → 使用真实只读 MCP 找证据 → 在被限制的私有工作区修改预置代码并运行测试 → 解释变更与引用，形成一个可审计闭环。**

注意：Codex 的成熟执行流程主要来自编码场景，泛化能力需真实实验验证，不把统一命名误当成已证明适合任何业务。

## 2. V0 范围与不做项

| 维度 | V0 必做 | 不做 |
|---|---|---|
| 用户 | A/B 两个独立测试账号、会话归属、登录/登出、服务端授权 | SSO、组织权限后台 |
| Code Agent | 一个固定 Agent 定义、一个固定能力边界、一个模型组合 | Agent 选择器、自建 Agent、三个 agentId、任务路由器、Agent 市场 |
| 会话 | 新建/列表/历史、多轮、流式、刷新恢复、取消、审批 | 跨用户共享线程、图形化编排、多 Agent handoff |
| 企业知识 | 一个真实获授权只读 MCP、引用与无结果/超时 | 自建向量库、任意企业写接口 |
| 文件与代码 | 私有预置 fixture、读写本工作区、受限 Shell、测试与产物下载 | 任意上传仓库、在线 IDE、push/生产部署 |
| 可靠性 | 幂等、失败解释、崩溃核对、持久化审计 | 分布式执行队列、高可用、自动扩容 |
| 交付 | 单机 Docker、自定义镜像和 Compose 名、恢复演练、真实 E2E | Kubernetes、正式认证、生产托管 |

## 3. 一个 Code Agent，三种验收场景

| 验收场景 | 同一 Agent 如何完成 | 工具证据 |
|---|---|---|
| 普通对话 | 不必调用工具即可完成改写、摘要和多轮追问 | 同一 Thread 历史及真实模型响应 |
| 企业知识 | 在需要时调用 `enterprise_knowledge.knowledge_search`；引用真实授权来源 | MCP 服务端请求、queryId、引用列表 |
| 代码任务 | 在私有预置工作区使用文件/Shell，修改源代码、运行 unittest | 实际 diff、命令退出码、日志与结果 |

**重要：工具可用性≠工具必须每次调用。** 不建上层任务分类器来“先判断是哪种 Agent”。由同一个 Codex 执行循环在当前任务上下文决定何时使用工具。

V0 的固定安全能力是：“沙盒内执行与写入授权工作区 + 只读企业知识工具 + 受控审批”；绝不因为当前任务是普通问答就假装 Code Agent 不存在 Shell，亦不因用户要求而放宽到宿主机或外部写工具。要实测工具限制而不是用提示词承诺。

## 4. 用户交互

登录后只显示 **Code Agent** 的会话列表，不显示 Agent 列表或模式切换。用户直接发送自然语言，界面展示消息、工具过程、审批和产物。

支持状态：提交中、容量已满、执行中、等待审批、取消中、成功、失败、中断、待核对。用户刷新和多标签页不会造成重复 `turn/start`。

对于同一 Thread 的跨场景测试，用户可以发送：

```text
① “把下面的需求整理成 3 条。”
② “查一下企业内部的接口规范，附来源。”
③ “根据查到的规范，在当前示例项目里修复平均值计算并运行测试。”
④ “总结你改过的文件、测试退出码和依据。”
```

这是一个会话的四个 Turn，不是四个 Agent 或四条隐藏子会话。真实 MCP 结果必须有来源；实际代码修改与测试失败不能由模型口头说成功替代。

## 5. 目标架构

```text
Web: React + TypeScript ──── 同源 HTTPS：REST + SSE
         │
         ▼
Enterprise API (TypeScript 模块化单体)
  ├─ auth / sessions / runs / approvals / artifacts / storage / audit
  ├─ SQLite（单写入口；按用户维护会话与幂等）
  └─ Runtime Router（仅可信内部调用，不暴露任意 RPC）
         │
         ├─ Worker A（用户 A 独立容器，固定能力配置）
         └─ Worker B（用户 B 独立容器，固定能力配置）
                 │
                 ▼
          Codex App Server
            ├─ 一个固定 Code Agent 的指令与模型
            ├─ 本次会话的 CODEX_HOME 与私有 workspace
            ├─ 只读 MCP（由企业服务强制 ACL）
            └─ Sandbox / Shell / File Tools（工作区内）
```

**V0 两个固定用户槽，不再使用用户 × 三种 Agent 策略的六槽位设计。** 每用户最多一个运行中任务、一个 App Server 活动子进程；切换 Thread 时关闭旧进程，按新会话持久目录重建进程与配置。会话间单独保存 CODEX_HOME 与工作区；V0 不承诺恶意代码的跨会话强隔离，因单用户 Worker 容器可能访问该用户的其他本地存储，必须在 G0 明确验证并披露该边界。用户 A/B 的容器、挂载、凭据、事件和审批互不复用。

**不让浏览器直连 App Server。** Worker 内 Supervisor 通过 stdio JSONL 与 Codex 子进程通信。API ↔ Worker 的受限内部接口不是 Codex 的 stdio。Worker 无 Docker Socket、无特权容器、不挂载宿主根目录。

平台只实现 Codex Adapter，不自己实现另一个 Agent Loop。`thread/start` 使用固定模型、指令、工作区和能力配置；`turn/start` 仅携带用户任务，不接受前端注入任意权限、cwd 或 MCP URL。

## 6. 模块职责

| 模块 | 主要职责 | 禁止 |
|---|---|---|
| `web` | 单 Agent 对话、工具事件、审批、产物 UI | 权限判断与任意命令直传 |
| `api/auth` | 登录态、CSRF/Origin、安全会话 | 信任前端传 userId |
| `api/sessions` | Thread 归属、固定配置快照、幂等 | 处理 agentId 或选择另一执行角色 |
| `api/approvals` | 原始 RPC 请求、审批归属与一次性决策 | 自动批准或让批准越过硬策略 |
| `api/runtime` | 用户 → Worker 绑定与状态检查 | 暴露 Docker 控制或任意 RPC |
| `worker` | CODEX_HOME、工作区、进程、日志与资源 | 全局企业管理员凭据 |
| `codex-adapter` | 固定上游协议与事件映射 | 另写一个 Agent 推理循环 |
| `storage` | SQLite、事件重放、恢复游标 | 凭 UI 内存作为真值 |

## 7. 数据与会话一致性

平台存储用户、Runtime 归属、会话、**统一 Code Agent 配置 hash**、任务、事件、审批、产物和审计；无 Agent 目录表、无 session.agentId、无独立通用/知识/编码线程映射。

同一 Thread 跨任务继续，不通过切换 Agent 重建历史；完整的 MCP/工作区权限应在创建 Thread 前确定，不能在开发阶段悄悄给存量 Thread 热加权限；同时要保持不变的权限配置，不能在对话中用模型话语或任务类别切换权限。配置升级只影响新会话，需要切换更高权限则不属于本 V0 范围。

保留分离标识：sessionId、runId、runtimeId、generationId、codexThreadId、codexTurnId、itemId、rpcRequestId；RPC ID 的数字/字符串类型必须保留。

任务状态：`created → dispatching → running ↔ awaiting_approval → succeeded | failed | interrupted | uncertain`，另有 `cancelling`。`uncertain` 占用活动槽，核对完成前不得自动重试带副作用任务。

## 8. 刷新、崩溃和幂等

- 刷新从已持久化事件恢复 SSE，不重新触发 `turn/start`。
- 同一 `clientRequestId` + 同请求返回旧任务；同 key 内容变化返回 409。
- App Server/Codex 进程重启后在途任务先标 `uncertain`，核对 Thread 与文件结果；`thread/resume` 不代表未完成命令会安全续跑。
- 旧 generation 的所有审批失效，不能把旧 RPC id 与新进程请求混用；即使响应发送超时也不盲目重发。
- API 重启后由 Worker journal 重放，按 `(runtimeId,generationId,sourceSeq)` 去重；审计/错误须脱敏。

## 9. 最低安全边界（同一个 Code Agent 也必须遵守）

登录 Cookie：HttpOnly、SameSite，HTTPS 时 Secure；写请求验证 Origin/CSRF，服务端校验每一个会话/审批/产物/事件的归属。拒绝未知资源不泄漏其存在性。

Shell 可在授权用户的沙盒工作区执行，所以**不是“普通问题禁用 Shell”，而是“所有任务的 Shell 永远不能越过工作区、网络和密钥边界”**。V0 不接受不可信用户上传的可执行项目或任意 Git 仓库；示例代码来自项目内 fixture。

固定禁止：访问其他用户 CODEX_HOME/工作区、宿主机密钥与 Docker Socket、非白名单网络、任意 MCP URL、企业写工具、自动 push、生产部署。真实审批仅允许当前策略内的单次操作，不能通过批准升级硬权限。

企业知识 MCP 必须由服务端使用用户范围凭据和 ACL，并校验引用。不能仅以 prompt 禁止越权。来自网页、RAG 文档、代码仓库的指令都属于不可信材料。

敏感凭据在 Worker 中仍需按可能泄漏处理：最小权限、短期、仅当前用户/数据范围；必要时通过能强制授权的受控网关。没有可验证网络边界不得开放生产试用，不能用 `--privileged` 或 `danger-full-access` 偷换安全门槛。

## 10. 模型与知识接入

一个已实测兼容的模型提供商组合，必须通过 Responses 流式、工具调用往返、跨场景连续多轮与失败测试。只支持 Chat Completions 不等于兼容当前 Codex。

`enterprise_knowledge.knowledge_search` 为项目自定义示例 MCP 工具，输入只含 query、limit，用户身份与数据范围由企业网关推导。输出来源至少 `queryId`、`sourceId`、`title`、`snippet`、`locator`。空结果与权限拒绝/超时须分清。引用只能来自本次授权工具结果。

## 11. 初始性能和容量目标（项目目标，非厂商承诺）

两个用户能同时执行且不串线；每用户最多一个活动任务；并发超额有明确 409/429。模型首字时间只记录，不预先承诺；示例总时长预算 300s、审批 120s、普通 RPC 30s，按实测修订。取消 10s 内应结束或进入待核对，不能假报已停止。

Worker 初始资源预算为 2 CPU/2GiB/PID 256（需实测），不按目录名自动生成镜像名或 Compose 项目名。

## 12. V0 完成定义

必须完成：一个 Web 单 Agent 入口、真实 Codex App Server、真实模型、真实只读 MCP、受控代码测试、**同一 Thread 的跨场景闭环**、真实审批、崩溃/刷新恢复、两个用户隔离、实际 Docker 构建与访问、备份恢复、负向安全测试。

Mock 或协议单测只是开发辅助。没有真实证据的项目仍是 `not_run/blocked`；所有 P0 通过且用户亲自确认前，继续 V0.x，不得晋升 V1。

## 13. 参考

官方来源和当前待验证假设见 `docs/06-RESEARCH.md`；核心设计决策见 `docs/07-UNIFIED-CODE-AGENT-DECISION.md`。平台中的 `Code Agent` 是我们定义的产品概念，不宣称 Codex 原生提供企业身份或多用户管理。
