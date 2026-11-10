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
