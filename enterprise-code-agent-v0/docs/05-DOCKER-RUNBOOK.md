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
