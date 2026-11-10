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
