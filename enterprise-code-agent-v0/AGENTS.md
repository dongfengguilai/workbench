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
