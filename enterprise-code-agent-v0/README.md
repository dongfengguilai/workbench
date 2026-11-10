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
