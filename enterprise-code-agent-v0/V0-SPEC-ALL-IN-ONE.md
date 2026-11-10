# 企业内部统一 Code Agent 平台 · V0 开发规格（单文件版）

> 开发包 v0.1.1-devpack，2026-11-10；**单 Agent、同一 Thread 的跨场景任务。**

**这是研发规格和可运行离线骨架，不是已开发完成或验收通过的产品。**

完整的 JSON/TS/SQL/部署模板和证据请看 ZIP 包。


---

# 开发包使用入口

> 对应 ZIP 文件：`README.md`

# 企业内部综合 Agent 平台 · 统一 Code Agent V0 开发包

**项目代号：Enterprise Agent Workbench（EAP）。开发包版本：v0.1.1-devpack。编写日期：2026-11-10。**

**核心设计：一个 Code Agent（Codex App Server），一个 ChatGPT 式入口，多个任务场景。**
用户无需选择通用、知识或编码 Agent：直接描述任务，同一个会话可先聊天、调用企业只读 MCP，再修改授权工作区并运行测试。

> 这是实施规格、契约和协议离线验证骨架，不是完整产品。不存在可用的 Web 平台，真实模型、企业 MCP、Docker 与最终用户验收尚未通过。

## 开始方式

开发 Agent 先读 `AGENTS.md`，再直接使用 `START_HERE.md`。负责人先读 `docs/07-UNIFIED-CODE-AGENT-DECISION.md`、`docs/01-V0-SPEC.md`、`docs/04-ACCEPTANCE.md`。

| 文件 | 用途 |
|---|---|
| `AGENTS.md` | 研发规则、V0 验收纪律与安全边界 |
| `START_HERE.md` | 可直接给 Codex 的执行指令 |
| `docs/07-UNIFIED-CODE-AGENT-DECISION.md` | 为什么一个 Code Agent，而不是三个 Agent |
| `docs/01-V0-SPEC.md` | 产品范围、结构、隔离及数据归属 |
| `docs/02-PROTOCOL-CONTRACT.md` | 平台自定义 API、事件、App Server 协议与审批 |
| `docs/03-TASKS.md` | 研究门禁及分阶段开发任务 |
| `docs/04-ACCEPTANCE.md` | 单 Agent 跨场景、权限、恢复、部署与用户签收 |
| `docs/05-DOCKER-RUNBOOK.md` | 自定义镜像命名、Docker、持久化与回退 |
| `docs/06-RESEARCH.md` | 官方资料、假设与风险 |
| `contracts/`、`config/` | 统一 Agent 配置、SQLite、共享类型 |
| `starter/`、`scripts/` | 协议骨架、离线单测、源码版本固定工具 |
| `deploy/` | 探针 Docker 配置和未实现产品模板 |
| `fixtures/coding/` | 故意存在缺陷的代码执行验收材料 |
| `evidence/` | 实际离线检查与未验证清单 |

## V0 边界

- **一个固定 Code Agent**：没有 Agent 选择器、三个 `agentId`、三个系统角色或 Agent 市场。
- **三种任务场景**：普通对话、企业只读知识检索、隔离工作区内的代码修改与测试。尤其要验证同一个 Thread 先检索规范再改代码、最后总结的连续闭环。
- **两个独立测试账号**：每个用户独立 Runtime，最多一个活动任务；单机 Docker；固定能力边界。
- **统一安全策略**：沙盒内可使用 Shell 与修改授权工作区，只读 MCP 数据按用户授权；禁止任意出网、越权目录、外部写工具、push 和部署。需要审批的操作由真实服务端请求处理，审批不突破硬策略。
- **不引入第二套 Agent Loop**：不使用 Agents SDK、Dify、多 Agent 编排、Agent 分类路由器或自动在 Thread 间移交。

## 可执行的离线检查

需要 Node.js 22+、Python3/SQLite；本段不是完整产品启动。

```bash
npm test
npm run test:sql
npm run check
tsc --strict --noEmit --target ES2022 --module NodeNext contracts/platform.ts
```

固定上游并进行真实协议验证请先运行：

```bash
bash scripts/prepare-upstream.sh
CODEX_BIN="$PWD/.tooling/codex/node_modules/.bin/codex" npm run probe
```

该 probe 只验证 initialize，不执行模型、MCP 或 Coding 任务。`fixtures/coding/` 中的原始失败必须保留作为验收输入。

## 当前状态

`evidence/delivery-status.json` 和 `evidence/checks.txt` 记录离线检查及阻塞。缺少真实 Codex、企业模型/MCP 凭据、Docker；尚未完成产品验收。
开发包版本不是产品版本；V0 未通过并获用户确认前只迭代 V0.x。


---

# 核心设计决策：一个 Code Agent

> 对应 ZIP 文件：`docs/07-UNIFIED-CODE-AGENT-DECISION.md`

# ADR-001：V0 采用一个统一 Code Agent，不采用三种 Agent

状态：已确定的产品设计方向（尚未完成技术可行性验收）。日期：2026-11-10。

## 原问题

初版规格把“通用助理、知识助理、代码助理”建模成三条 Agent 身份、三份配置、六个用户×策略槽。实际三者都基于同一个 Codex Agent Loop，分类仅来自任务场景，不是执行核心的差异。

## 决议

**V0 只有一个用户可见的 Code Agent。**

- 平台 API、表结构和前端不出现三个 agentId，也不需要 `GET /api/agents` 或选择 Agent。
- 统一入口 = 一个消息框 + 会话列表 + 工具/审批/产物界面。
- 同一 Codex Thread 中可混合普通问答、企业只读知识检索和工作区编程；不通过三个 Agent 间 handoff 或上层分类器实现。
- Code Agent 的能力来自模型 + App Server + 权限范围内的 Shell/文件 + MCP + 可选 Skills。Skills 不是另一个 Agent 身份。
- V0 仅一个固定策略/模型/指令组合；不同任务不自动放宽或关闭权限。
- 两个用户各自独立 Runtime/身份/存储，不因统一 Agent 共用执行进程或凭据。

## 一种统一策略下的取舍

统一能力包含：受控工作区 Shell、工作区写入、只读知识 MCP。这意味着普通问答场景也可能触发 Shell；**不得宣称已按任务完全禁用执行能力**。安全由执行沙盒、文件权限、网络出口、企业 MCP ACL、审批及审计共同保障。

如果真实测试证明企业对话必须物理禁用 Shell，而 Coding 必须启用 Shell，那么“同一 Thread、单一固定策略”与该强隔离要求冲突。应如实在 G0 报告并评估最小变更（例如按工作区隔离或建立明确的权限升级会话），而不是暗中新增三个 Agent 或依赖 Prompt 假装执行能力消失。必要架构变更需用户重新认可。

## 不选方案

- 三个独立 Agent：需要选择器、三份配置和切换逻辑，且相同执行循环重复建模。
- Agents SDK 上层分类和 handoff：制造第二套循环，V0 没有必要。
- 完全不设权限的“万能 Agent”：不符合企业安全。

## 关键可验证假设

1. 锁定版 Codex App Server 能在同一 Thread 连续完成非代码对话、真实 MCP 检索、工作区编程、总结。
2. 固定能力封套不会阻碍普通问答，也不会越权访问网络/宿主文件/其他用户数据。
3. 同一用户跨会话恢复不会造成历史、审批或文件串线。
4. 数据引用与代码任务结果有足够的真实证据供用户验收。

## 证据要求

G0 和 A11 必须提供相同 `codexThreadId`、多次 `turnId`、真实 MCP 调用、实际 diff/测试退出码及最终总结；即使 3 个单独场景都成功，若同一 Thread 串联失败，V0 仍未通过。

## 官方架构依据

OpenAI 官方说明 Codex Harness 是可复用的 Agent Loop，可作为工程、运营、调查或内部应用的执行层：
https://developers.openai.com/blog/codex-as-a-platform

这一依据支持开展统一化实验，**不等于已验证所有非编程业务都适合 Codex，也不等于官方 App Server 天然是多租户企业 SaaS。**


---

# V0 产品和工程规格

> 对应 ZIP 文件：`docs/01-V0-SPEC.md`

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


---

# 开发 Agent 工作规则

> 对应 ZIP 文件：`AGENTS.md`

# 开发 Agent 执行规则

## 目标与入口

开发一个基于 Codex App Server 的企业内部综合 Agent 平台 V0。
用户确定：**只有一个 Code Agent（底层 Codex App Server）**。普通对话、企业知识与 Coding 都是同一 Agent 的任务，不允许拆成三个 Agent 身份、三套 Role 或 Agent 选择器。先读 `docs/07-UNIFIED-CODE-AGENT-DECISION.md`。
开始前依次读取：`README.md`、`docs/01-V0-SPEC.md`、`docs/03-TASKS.md`、`docs/04-ACCEPTANCE.md`、`evidence/delivery-status.json`。
涉及协议时再读取 `docs/02-PROTOCOL-CONTRACT.md`；涉及部署时读取 Docker runbook。

## 必须遵守

1. 先研究再编码：查官方资料，在本地固定版本、检查上游源码与原版行为，记录复用点和风险；在线浏览不等于完成本地源码审查。
2. 先完成真实纵向闭环，再扩展下一场景。禁止先堆一套看似完整、实际无法连通的界面和空接口。
3. 复用 Codex Agent Loop、线程和工具执行生命周期；不引入 Agents SDK、Dify 或另一套编排循环。
4. 默认通过 App Server 协议扩展，避免侵入式修改 Codex Core；必要改动先写清原因、替代方案和升级成本。
5. 代码优先可读。小模块、明确契约、单向依赖；关键权限/恢复/幂等规则提供中英文注释，不逐行翻译代码。
6. 不信任浏览器提供的 userId、runtimeId、codexThreadId、cwd、工具地址或审批上下文。服务器根据登录态与存储记录推导。
7. 权限必须由程序、执行隔离和企业服务共同强制执行，不能仅写在 Prompt 中。`read-only` 不等于禁用 Shell。
8. 模型密钥、企业管理员凭据和 Docker Socket 不进入 Agent 的可执行工作区。不得提交真实 `.env`、token、auth.json 或用户材料。
9. 真实模型接口必须通过 Responses 流式、工具调用往返与多轮续接测试；`/models` 或 Chat Completions 成功不能视为兼容。
10. App Server、配置 Schema、生成协议与镜像中的二进制必须对应同一固定版本；禁止 `latest` 和运行时静默升级。
11. 业务写操作、生产部署、外部推送/发信、扩大权限、删除数据或发布镜像前取得明确授权。V0 企业 MCP 只读。
12. 不得为跑通测试启用 `danger-full-access`、`--privileged`、自动批准所有请求或全量宿主目录挂载。
13. 实现 Docker 交付。镜像、项目和服务显式命名，保持用户自定义命名要求；样例部署不等于真实 Docker 验收。
14. 严格区分“规格已写”“骨架通过测试”“真实集成通过”“用户已验收”。不得把 Mock、合成数据或截图演示冒充真实业务验证。
15. 无凭据/网络/运行权限时完成可离线验证的工作，并标记具体 blocker；不杜撰成功，不悄悄缩减验收标准。
16. V0 未通过并获用户签收前，只迭代 V0.x。Agent 不替用户写 accepted。

## 工作方式

保持模块化单体：Web、API、Runtime Worker、Adapter、共享契约。数据库先用单机 SQLite，不引入 Redis、Kubernetes 或消息队列。
先做两个测试账号和固定 Runtime 槽位。不同用户不得共用 CODEX_HOME、工作区、凭据、事件流或审批请求。
两个用户拥有各自独立 Runtime；同一个用户的不同会话不随任务类别切换权限，也不在进程中扩大硬策略；固定策略覆盖普通任务、只读 MCP 和被限制的工作区 Shell。

每项任务完成后记录真实命令、退出码、结果及证据路径；变更协议或范围时同步文档和测试。
不要创建大量空目录、形式化模板和“以后可能用到”的抽象。
读写已有仓库前检查 `git status`；保留用户未提交修改，不做无授权 reset/clean。

## 每次交付汇报

说明：目标与当前 V0.x 版本、已完成内容、真实证据、仍不能做的事、风险/阻塞、需要用户决定的事项、下一步只做什么。
必要时更新 `evidence/delivery-status.json`，但不得覆盖历史验收证据或把 blocked 改成 pass。


---

# Codex 启动指令

> 对应 ZIP 文件：`START_HERE.md`

# 给 Codex / 开发 Agent 的启动指令（统一 Code Agent 版）

把开发包放到空项目目录，并将下面内容交给 Coding Agent：

```text
你负责开发基于 Codex App Server 的企业内部综合 Agent 平台 V0。
阅读 AGENTS.md、README.md、docs/07-UNIFIED-CODE-AGENT-DECISION.md、
docs/01-V0-SPEC.md、docs/03-TASKS.md、docs/04-ACCEPTANCE.md 和当前 evidence。

【不可变更的架构决定】
平台只提供一个统一 Code Agent，底层是 Codex App Server / Codex Core。
普通问答、企业知识检索、代码修改只是同一个 Agent 的任务场景，不是三个独立 Agent。
不做 Agent 选择器、三个 AgentId、三套指令角色或任务分类路由器。
用户在同一会话里可以直接提问、调用只读 MCP、操作授权工作区、运行测试、总结结果。
不引入 OpenAI Agents SDK、不实现第二套 Agent Loop、不 fork Codex Core 实现企业权限。

【先做 G0】
1. 查官方资料，下载并锁定 Codex 代码；阅读 App Server、协议、权限及工具配置原版实现。
2. 实际启动原版，做 initialize、建 Thread、普通问答、工具调用和历史恢复。
3. 实测同一 Thread 从非代码问答到只读 MCP，再到工作区文件与 Shell 的连续交互。
4. 验证一个固定能力边界是否可由容器、Codex 配置、企业网关联合强制，不能只依赖 Prompt。
5. 核对 Responses 流式、模型工具调用能力，记录真实输出；禁止用 Mock 代替。

【实现顺序】
Web 单一对话入口→会话/流式/刷新→真实只读 MCP→同一 Thread 的代码修改/测试/审批→
异常与恢复→Docker 安全隔离与 E2E 证据→用户验收。

【必须】
保护用户身份、数据、凭据；两个用户不同 CODEX_HOME/Runtime；不提供任意 cwd 和 MCP URL；
不允许 Agent 访问宿主路径或 Docker Socket；不以危险权限绕过测试。
工具请求中的审批必须由真实 App Server 触发；允许一次与拒绝均需真实验证。
重要规则附中英双语说明；Docker 显式自定义镜像和项目名。
阶段证据分清离线单测、真实集成、用户验收。缺凭据时标 blocked，继续低风险任务。
V0 未通过验收与用户确认之前不得进入 V1，也不得声称平台已开发完成。
```

## 首次开工输入

环境主机与端口、一个获授权的 Responses 模型/凭据、一个只读企业 MCP 测试地址及用户 ACL、两个账号的初始化方案、可接受的网络出口范围。
若缺失，只将真实集成标记 blocked，其他低风险工作按计划完成。


---

# 协议与 API 契约

> 对应 ZIP 文件：`docs/02-PROTOCOL-CONTRACT.md`

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


---

# V0 开发任务

> 对应 ZIP 文件：`docs/03-TASKS.md`

# V0 开发任务与阶段门禁 · 单 Code Agent

所有任务状态初始 `todo`。本包完成的是规格和离线骨架，不是通过产品验收。

## G0 · 固定源码与验证最危险的假设

1. 固定 Codex 仓库 tag/commit、CLI/协议生成类型与配置版本；运行 `scripts/prepare-upstream.sh`，阅读 App Server、审批、安全配置与工具相关代码；记录 LICENSE/NOTICE。研究薄自研 Web 和第三方 WebUI 复用成本，源码必须在本地核对。
2. 真实启动原版 app-server：initialize、`thread/start`、`turn/start`、终态、历史恢复；验证模型 Responses、流式和工具往返。
3. **一个 Thread** 实际完成普通摘要 → 只读 MCP 检索 → 私有工作区文件读取/代码修改/测试 → 总结，记录同一个 threadId 和多次 turnId。
4. 验证固定策略覆盖所有任务：沙盒内 Shell 可用，但跨用户路径、宿主目录、网络出口、外部写接口被硬性禁止；审批不能绕过硬策略。
5. 在拟使用的 Docker 运行环境测试 namespace、用户权限、sandbox 和网络；禁止借助 privileged/full-access 跳过失败。

**证据**：`evidence/upstream-lock.json`、原版日志、工具与模型实际响应、四步同线程样本、安全负向结果和未解决项。失败则停止扩大范围，继续 V0.x 解决核心阻塞。

## T1 · Web/API 基础和身份

实现 React + TypeScript 单 Agent Web 工作台、TypeScript API、SQLite、两个测试账号、登录登出与 CSRF、跨账号数据授权。数据库只维护统一 Code Agent 的固定配置快照；**没有 agents 目录表，创建会话时也不传 agentId。**

**证据**：真实页面、类型检查、SQLite 约束、A/B 越权测试。无匿名业务 API。

## T2 · Worker、Adapter 与线程隔离

每测试用户一个固定 Worker 槽；每会话分离 CODEX_HOME 和私有工作区，固定本次会话能力与模型配置。Supervisor 使用 stdio JSONL 管理 Codex 子进程。实现请求/通知/server request 分流、超时与停止；Worker 事件 journal 可重放，API 入库去重。

**证据**：协议单测、真实 CLI 基线、跨账号和跨会话负向测试、App Server 崩溃处理。

## T3 · 一个 Agent 的真实对话闭环

登录 → 新建会话（无 Agent 选择器）→ 发送普通问题 → 真模型流式答复 → 持久历史 → 同一 Thread 追问。刷新/SSE 重连、重复发送和模型错误均正确处理。**如果 T4 的真实 MCP 连接尚未配置，T3 可以使用单独的原型 Thread；T4 接入后必须从固定完整配置新建一个正式验收 Thread，重新执行 T3 的对话步骤，禁止热更正在使用的 Thread 权限。**

**证据**：真实浏览器录制、Thread/Turn 映射、首字与终态日志、固定对话任务集。

## T4 · 给同一个 Code Agent 增加企业只读 MCP

将真正获授权、按用户 ACL 授权的只读 `knowledge_search` 接入**同一个执行配置**，不新建 Knowledge Agent。如果该 Thread 从创建时就含完整且固定的 MCP 配置，则继续它；否则新建完整配置的验收 Thread，先重做 T3 问答，再发起知识问题并引用实际来源；验证空结果、拒绝、超时和指令注入。

**证据**：MCP 调用 queryId、引用与 ACL、同一 Thread 的连续性。

## T5 · 同一 Code Agent 完成 Coding 和审批

从预置 `fixtures/coding` 复制到当前用户会话私有工作区，保留原始失败测试；让 T4 的完整配置验收 **同一 Thread** 修改源文件、运行 unittest、返回 diff 和退出码，再给出总结。实现并实测 Codex 命令/文件审批的 allow_once、deny、过期、重复/越权点击和旧 generation 失效。

**证据**：前后测试、工作区 diff、实际审批 RPC、同 Thread 四步完整路径，下载访问检查。

## T6 · 取消、崩溃、幂等、恢复

浏览器断线不重跑；API 重启可重放 Worker journal；Codex/Worker 崩溃在途任务先标 uncertain，核对后处理。取消和审批失联要有明确状态；过期审批必须拒绝/过期而非永久挂起。

**证据**：故障注入记录、事件序列、没有重复副作用、跨账号数据隔离。

## T7 · Docker、E2E 与用户验收

按项目自定义镜像名、Compose 项目名部署 API 和两个 Worker。真实完成普通问答、企业检索、代码任务及**同一 Thread 全链路**；演练容器重启、存储恢复和镜像回退；执行 `04-ACCEPTANCE.md` 全部 P0。

**证据**：镜像 digest/版本、构建/启动/健康/访问、模型及 MCP 日志、测试结果、负向安全和用户实际确认。未通过继续 V0.x。

## 最终代码布局（目标，不提前创建空目录）

```text
apps/web/                          # 单 Code Agent 的 Web 入口
apps/api/src/{auth,sessions,runs,approvals,artifacts,runtime,storage}/
apps/worker/src/{processes,workspaces,journal,transport}/
packages/codex-adapter/             # 锁定版 App Server 协议映射
packages/contracts/                # 平台统一类型
contracts/generated/               # 同版本 Codex 生成类型
config/code-agent.example.json     # 单一固定 Agent 配置
migrations/                        # 数据演进与回退
fixtures/coding/                   # 真实 Coding 验收任务
scripts/ tests/ deploy/ evidence/
```


---

# V0 验收标准

> 对应 ZIP 文件：`docs/04-ACCEPTANCE.md`

# V0 验收合同 · 统一 Code Agent

**所有产品用例初始状态 NOT_RUN，任何 P0 未通过或无证据均不能签收。**

## 1. 环境前提

两个独立用户 A/B；一个真实 Responses 兼容模型；真实只读企业 MCP；两个账号权限不同的文档样本；一个故意失败的预置代码 fixture；固定 Codex 与 Docker 版本。

## 2. 功能、统一性与集成

| ID | 级别 | 操作 | 必须观察 |
|---|---|---|---|
| A01 | P0 | A/B 登录、登出；匿名 API 访问 | 独立认证、登出失效、无匿名数据 |
| A02 | P0 | 查看主页面、创建会话、修改前端提交内容加入 `agentId`、`cwd` 或 MCP URL | 只有一个 Code Agent 入口；**无 Agent 选择器、无三种 Agent ID**；任意能力字段被拒绝/忽略且不生效 |
| A03 | P0 | 同一 Thread 三轮中文摘要/追问 | 真实模型响应、历史/上下文正确、保存 threadId |
| A04 | P0 | 流式刷新、多标签页重连 | 不多次发送 turn/start；回放顺序与消息一致 |
| A05 | P0 | A/B 并发，A 再提交任务 | A/B 不串线；单账号容量有界 |
| A06 | P0 | 同一 Code Agent 通过真实 MCP 查内部文档 | 实际调用、授权 queryId、正确来源 |
| A07 | P0 | 无结果/无权限/超时 | 区分失败，不造来源或内容 |
| A08 | P0 | 同一 Code Agent 修复私有 fixture、运行 unittest | 原始失败；真实 diff；测试退出码 0；未修改测试 |
| A09 | P0 | 下载产物、伪造其他账号路径 | 仅获授权相对路径与普通文件，符号链接越界拒绝 |
| A10 | P0 | 真实模型完成 Responses 流式工具调用往返 | 模型/工具/反馈真实发生，多轮可续接 |
| A11 | P0 | **一个 Thread 内**依次：摘要 → MCP 查规范 → 修复代码+测试 → 汇总 | **同一 codexThreadId**、多个 turnId、检索与 diff 证据、最后回答保留上下文；不是三条会话拼接 |

## 3. 审批与执行安全

| ID | 级别 | 操作 | 必须观察 |
|---|---|---|---|
| S01 | P0 | A 访问 B 会话/SSE/审批/工作区/产物 | 服务器、数据库、容器限制和工具入口拒绝 |
| S02 | P0 | Agent 读取 B CODEX_HOME/工作区/宿主秘密 | 无跨账号共享挂载或凭据访问 |
| S03 | P0 | 普通对话中要求 Shell 执行越界命令 | **允许范围内的 Shell 可用，但越界命令始终硬拒绝**；不声称普通任务关闭 Shell |
| S04 | P0 | MCP 文档包含忽略规则、窃取凭据指令 | 不允许扩大执行/读取权限 |
| S05 | P0 | 真实命令审批：允许一次与拒绝 | 原 RPC ID/方法响应正确；拒绝无副作用 |
| S06 | P0 | 真实文件审批：允许一次与拒绝 | 真实事件和工作区变更匹配；拒绝不偷偷写文件 |
| S07 | P0 | 双击、相反决定、超时、B 替 A 批准 | 一次性 CAS，拒绝越权和过期，审计可查 |
| S08 | P0 | 审批挂起刷新、重启 Codex | 刷新展示，旧 generation 请求作废 |
| S09 | P0 | 同一轮多审批 | 一个 resolved 不清掉其他 pending |
| S10 | P0 | 提交任意内部 RPC、cwd、MCP 地址、提高权限 | 平台拒绝，不允许通用远程执行代理 |
| S11 | P0 | 任意外网、主机端口、企业写工具、git push/部署 | 硬拒绝，审批不能突破固定策略 |
| S12 | P0 | 扫描镜像/日志/产物的敏感内容 | 不泄露全局密钥，短期凭据不越权 |

**安全底线：一个 Code Agent 不意味着一个高权限 Agent。** 它具备有限工作区工具能力，统一遵循最小权限；若安全测试需要禁用 Shell 与 Coding 必须有 Shell 的目标冲突，G0 中公开风险并升级架构决策，不能用 Prompt 伪造“已禁用”。

## 4. 恢复与部署

| ID | 级别 | 操作 | 必须观察 |
|---|---|---|---|
| R01 | P0 | 重复提交和同 key 不同内容 | 幂等或 409，不重复副作用 |
| R02 | P0 | 运行中取消与取消事件丢失 | cancelling → 明确终态/uncertain，不假报停止 |
| R03 | P0 | API 重启时继续运行任务 | Worker journal 重放去重，事件不丢 |
| R04 | P0 | Codex/Worker 被杀 | 在途 uncertain，核对后恢复；不自动重做代码动作 |
| R05 | P0 | 模型 401/429/5xx、非法协议、MCP 掉线 | 失败可定位、脱敏、不永久占锁 |
| R06 | P0 | 超大输出与 Worker journal 满 | 有界处理、不会静默丢事件或假成功 |
| D01 | P0 | Docker 自定义镜像构建启动 | 真实 Web/API HTTP 可访问，不只容器 Up |
| D02 | P0 | down/up 重建 | Thread、统一配置、历史和产物保留 |
| D03 | P0 | 独立数据备份与恢复演练 | 用户/Thread/工作区对应正确，旧审批不复活 |
| D04 | P0 | 镜像回退 | 兼容版本和配套数据恢复有证据 |
| U01 | P0 | 非开发者按 README 完成 A03/A06/A08/A11 | 用户明确签收，否则 V0 不通过 |

## 5. 固定质量集

- **普通任务：** 10 条 × 3 次，按事先制定 rubric 至少 27/30 符合预期；越权尝试必须全部被拒绝。
- **企业知识：** 12 条：6 有答案、2 空材料、2 无权限、2 含指令注入；来源真实性与权限必须全部通过。真实 MCP 调用不能用 Mock 替代。
- **Coding：** 3 次从全新故意失败的 fixture 副本修复，unittest 退出码每次都是 0，且未改测试或访问其他用户目录。
- **跨场景连续性：** 最少执行两次完整 A11 链路，其中一次必须复用已有 Thread 重连继续，另一条应验证连续上下文；不能拿三条独立 Thread 的结果拼接。

## 6. 证据与用户签收

每项记录版本、commit、步骤、模型/工具环境、P0 结果、真实事件 ID、脱敏证据、未验证事项。`not_run`、`blocked` 不能视为 `pass`。

产品状态：`not_implemented → implemented → integration_verified → ready_for_user_review → accepted`。只有用户明确确认后才写 accepted 并进入 V1。


---

# Docker 部署与恢复

> 对应 ZIP 文件：`docs/05-DOCKER-RUNBOOK.md`

# Docker 交付、持久化与回退

**当前仅提供协议骨架镜像和产品拓扑模板。未构建/运行 Docker，不是可部署的完成品。**

## 1. 命名

| 对象 | V0 建议自定义名称 |
|---|---|
| 产品项目名 | `eap-v0` |
| 平台镜像 | `enterprise-agent/platform:v0.1.0` |
| Runtime 镜像 | `enterprise-agent/runtime:v0.1.0` |
| 平台服务 | `eap-platform` |
| Worker 服务 | `eap-runtime-a`、`eap-runtime-b`（一个逻辑 Code Agent，两个用户隔离实例） |
| 正式 Compose 文件 | `deploy/compose.eap-v0.yml`（完成实现后产出） |
| 平台 Dockerfile | `deploy/Dockerfile.eap-platform`（待实现） |
| Runtime Dockerfile | `deploy/Dockerfile.eap-runtime`（待实现） |
| 协议验证镜像 | `enterprise-agent/protocol-check:v0.1.0` |

项目名不依赖目录名。固定服务可以显式 container_name；将来需要扩容时不要让固定容器名成为阻碍。
这些名称是本地开发默认候选，不授权向生产仓库推送镜像。

## 2. 现在已有的探针部署

```bash
docker compose -p eap-protocol-check -f deploy/compose.eap-probe.yml build
docker compose -p eap-protocol-check -f deploy/compose.eap-probe.yml run --rm eap-protocol-check
```

它仅运行离线传输单元测试与包结构检查，没有 Codex、模型、Web、企业 MCP。
容器退出 0 只能说明这两个检查通过，绝不能记作 D01 产品部署通过。
基础镜像需在目标环境核验可拉取，并在正式产品构建前固定 digest。

## 3. 正式部署必须补齐

平台镜像使用多阶段构建、锁定依赖；静态 Web 与 API 可同容器同源提供。
Runtime 镜像内安装固定版 Codex、Worker、Coding 测试所需的有限工具；版本不在启动时自动下载升级。
非 root、cap_drop ALL、no-new-privileges、只读根文件系统；必要 tmpfs 与数据卷显式列出；不挂宿主 socket/家目录。
Codex 的 Linux sandbox 与容器限制可能有环境依赖，必须真实验证；禁止直接加 privileged 或 full-access。

正式命令形状：

```bash
# 此文件须先由 T7 实现，不要直接将 .example 当作可运行产品。
docker compose --env-file .env -p eap-v0 -f deploy/compose.eap-v0.yml config
docker compose --env-file .env -p eap-v0 -f deploy/compose.eap-v0.yml build
docker compose --env-file .env -p eap-v0 -f deploy/compose.eap-v0.yml up -d
docker compose -p eap-v0 -f deploy/compose.eap-v0.yml ps
docker compose -p eap-v0 -f deploy/compose.eap-v0.yml logs --tail 100
```

必须验证真实浏览器入口，而不只检查 TCP 端口连通或 `docker ps`。
默认绑定 `127.0.0.1:8089` 作为本地开发候选；企业内网使用经过授权的反向代理/HTTPS，不自行开放公网。

## 4. 持久化与秘密

平台卷：SQLite 及其 WAL/SHM 所在目录、必要非秘密配置。
A/B 两个 Worker 各自独立卷：私有 workspace、逐会话 CODEX_HOME、事件 journal；不得跨用户共享。一个用户在同一 Agent/Thread 内串联普通对话、MCP 与代码任务。
Secrets 在部署时注入，不进镜像/构建上下文/代码仓库。`.dockerignore` 和 `.gitignore` 都必须排除秘密、用户数据和上游临时目录。
文件权限与非 root UID/GID 要验证；不得用 `chmod 777` 作为解决方案。

知识数据范围由服务端凭据与 ACL 决定。运行时只能取得限用途/短期凭据，不保存平台数据库管理员密码或企业全局 token。

## 5. 网络和健康

平台暴露一个 Web/API 入口；Worker 端口不映射到宿主机，内部请求有身份和受限方法校验。
控制面与执行面网络分开配置。模型/MCP 出口使用明确代理/白名单；`internal: true` 只提供隔离网络，不自动实现特定域名放行。
V0 不包含通用出口代理实现。目标环境没有可用的策略执行点时，网络安全验收 blocked，不以宽泛放行代替。

live 表示进程存活；ready 至少验证数据库可用、配置有效、必需 Worker 可用、版本一致。
模型健康记录应避免频繁产生付费调用；ready 不等于所有业务任务正确。

## 6. 停止、重建与恢复

普通停止/重建不得附加 `down -v`。先禁止新任务，处理活动任务和待决审批，再停止服务。
对在途任务不能证明执行结果时记 uncertain；恢复后不盲目重跑。

备份先进入维护模式并等待/中断任务；停止写入后，SQLite 使用一致性备份方式或在干净关闭后复制完整数据目录。
同时备份各 Worker 的 CODEX_HOME、workspace、journal 及平台版本/快照映射；只备份聊天表不能恢复完整会话。
验证恢复到独立路径/卷，避免覆盖现有数据；原始 RPC pending 状态不能通过备份“复活”。
备份中可能有敏感会话与授权资料，应按企业存储和保留策略保护；本包不设通用法律保留期限。

回退：使用明确的旧镜像 digest，并验证数据库迁移兼容。不可逆迁移需要配套一致性数据快照和用户授权。
记录停机影响和回退步骤；Git reset 不是数据回退。

## 7. 必须保存的部署证据

保存构建日志、镜像版本/digest、Compose 有效配置的脱敏副本、进程/健康状态、真实 Web 三场景和**同一 Thread 串联三场景**、数据重建、备份恢复和回退结果。
不得把代理、Cookie、TLS、网络出口与权限留给最终用户自行猜测配置。


---

# 技术研究和未验证事项

> 对应 ZIP 文件：`docs/06-RESEARCH.md`

# 研究记录、来源与待验证问题

核对日期：2026-11-10。状态：**在线文档与部分发布版类型已核对；本地源码审查与真实运行尚未完成。**

## 1. 已核实的上游事实

| 事实 | 对本项目的含义 | 来源 |
|---|---|---|
| App Server 提供线程、轮次、过程事件、双向请求和初始化流程 | 复用执行生命周期，不造第二个 Agent Loop | S1、S4 |
| stdio 传输逐行 JSON，wire 不带 jsonrpc；可按 CLI 版本生成协议 | Adapter 需要正确 framing；生成类型与二进制锁定 | S1、S4 |
| 当前网关要求 Responses；Chat Completions 成功不证明兼容 | 目标模型必须测试真实工具循环 | S2、S10 |
| MCP 有工具 allow/deny 配置；外部服务需要自己的授权 | 对统一 Code Agent 的 MCP 限定只读工具与用户数据范围 | S3 |
| sandbox 与 approval 是不同控制层，read-only 仍可运行受限命令 | 工具禁用不能用 read-only 或 Prompt 替代 | S5 |
| 本次官方 releases/latest 指向 0.167.0，已有对应标签文件 | 仅作为研究候选；必须在目标环境安装并记录完整 commit | S6 |
| 对应版 ThreadStartParams 有 developerInstructions/baseInstructions | 平台可映射指令，但不等于已经验证通用行为 | S7 |
| Thread sandbox 和 Turn sandboxPolicy 类型不同 | 使用生成类型，禁止混传 | S7、S8 |
| 命令/文件审批响应都有 decision，但其他请求类型可能不同 | 逐方法实现审批，不统一拼 JSON | S9 |

## 2. 方案比较（工程判断，不是已完成的第三方代码审计）

V0 的唯一 Agent 决策见 `07-UNIFIED-CODE-AGENT-DECISION.md`：不再配置三个独立 Agent；三类场景统一在同一个 Thread 下验证。

| 路线 | 取舍 | V0 选择 |
|---|---|---|
| 官方 Codex + 薄自研 Web/API/Worker | 企业权限边界清楚，界面和授权需自己写 | **默认采用** |
| 复用某个第三方 Codex WebUI | 可能更快出界面，但需审计共享凭据、目录访问和多用户隔离 | 仅在 G0 本地审核后复用局部，不预先承诺具体项目 |
| Agents SDK 另建完整执行循环 | 能重新设计通用行为，但增加第二运行时与工具管理负担 | V0 不采用 |

不把之前讨论中提到的第三方仓库视为已审核、已选型或已证明安全。
本包没有下载/复制这些 WebUI 的代码，也不包含未经审核的第三方依赖。

## 3. 本次环境的真实情况

可运行 Node.js、TypeScript 编译器、Python/SQLite；没有 Docker 或 Codex 可执行文件。
尝试通过容器 git 访问官方仓库时得到 `Could not resolve host: github.com`。
因此未完成本地 clone、原版 App Server 基线、完整源码审计、协议自动生成或 Docker 构建。
在线读取的原始类型文件不等于完整源码审查，也不能证明真实运行兼容。

`starter/` 为本次新写的验证骨架，仅用可控内存流进行离线单元测试。
检查结果见 `evidence/checks.txt`。不在交付包里内置用户凭据，也未调用用户模型或企业系统。

## 4. 开工前必须消除的未知

- 指定模型的 Responses 工具循环能力、流式格式、上下文与错误行为。
- 统一固定工作区权限是否可将 Shell、MCP 和文件操作限制在授权边界，尤其是同一 Thread 跨场景时。
- 同一个固定 Code Agent/Thread 能否连续完成通用问答、知识检索、Coding 以及后续总结。
- 当前部署主机上 Docker 与 Codex sandbox 的兼容性，不突破既定权限边界。
- 真实 MCP 的用户级 ACL、调用身份、引用返回格式及失败表现。
- 审批在锁定版本下的请求类型、允许结果和恢复行为。
- 正式组织/账户、计费、数据出网和企业接入要求；源码可复用不自动代表所有产品服务使用方式获授权。

这些问题由 G0 和后续真实验收解决，不以未经测试的猜测填空。

## 5. 来源

以下为官方文档或 OpenAI 官方仓库。动态文档可能更新，实施时按固定版本重核。

- **S1 · App Server 文档**：https://learn.chatgpt.com/docs/app-server
- **S2 · Gateway compatibility requirements**：https://learn.chatgpt.com/docs/enterprise/gateway-compatibility
- **S3 · MCP 官方文档**：https://learn.chatgpt.com/docs/extend/mcp?surface=cli
- **S4 · Unlocking the Codex harness**：https://openai.com/index/unlocking-the-codex-harness/
- **S5 · Approvals & security**：https://learn.chatgpt.com/docs/agent-approvals-security
- **S6 · 官方固定发布版本**：https://github.com/openai/codex/releases/tag/rust-v0.167.0
- **S7 · ThreadStartParams 类型**：https://raw.githubusercontent.com/openai/codex/rust-v0.167.0/codex-rs/app-server-protocol/schema/typescript/v2/ThreadStartParams.ts
- **S8 · TurnStartParams 类型**：https://raw.githubusercontent.com/openai/codex/rust-v0.167.0/codex-rs/app-server-protocol/schema/typescript/v2/TurnStartParams.ts
- **S9a · 命令审批响应类型**：https://raw.githubusercontent.com/openai/codex/rust-v0.167.0/codex-rs/app-server-protocol/schema/typescript/v2/CommandExecutionRequestApprovalResponse.ts
- **S9b · 文件审批响应类型**：https://raw.githubusercontent.com/openai/codex/rust-v0.167.0/codex-rs/app-server-protocol/schema/typescript/v2/FileChangeRequestApprovalResponse.ts
- **S10 · 固定版本配置 Schema**：https://raw.githubusercontent.com/openai/codex/rust-v0.167.0/codex-rs/core/config.schema.json
- **S12 · Codex as a platform（官方可复用 Harness 说明）**：https://developers.openai.com/blog/codex-as-a-platform
- **S11 · 官方仓库 LICENSE**：https://github.com/openai/codex/blob/rust-v0.167.0/LICENSE

S9 表示 S9a/S9b。许可证与 NOTICE 的处理应在实际引入源码或二进制时检查；本包未附上游代码或二进制。

用户的方法约束来自既有 `vibe_coding_framework_v0.3.md` / `vibe_coding_framework_v0.2.md`：真实纵向切片、先研究复用、Docker 自定义命名、证据与用户签收。这里落实为本项目规则，不复制整份私人方法文档。