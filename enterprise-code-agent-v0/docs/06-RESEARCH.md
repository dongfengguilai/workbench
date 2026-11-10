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
