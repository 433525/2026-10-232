# 运维交接手册 · 暖阳邻里（linli.lzbdcxm.cn）

> 本文只讲「这台服务器怎么运维」。代码架构、门禁体系、开发进度见 `docs/HANDOVER.md`。
> 全部数据为 **2026-11-04 10:33 实测**，非文档转述。

---

## 0. 一页速览

| 项 | 值 |
|---|---|
| 站点 | https://linli.lzbdcxm.cn （B 端 `/`、A+ 端 `/aplus.html`） |
| 主机 | 腾讯云轻量 `lhins-ol4yz1eo`，Ubuntu 22.04.5 LTS，4C8G / 120G，`62.234.23.197`，ap-beijing-6 |
| 到期 | **服务器 2027-10-08**；证书 2027-02-02（90 天自动续期）；域名按 DNSPod 续费日历 |
| 备案 | 桂ICP备2026024158号（已通过，页脚已公示） |
| 仓库 | `github.com/433525/2026-10-232`，分支 `agent/workbuddy/aplus-react-port`，PR #1 |
| Web | nginx 1.18.0，配置 `/etc/nginx/conf.d/linli.conf` |
| 后端 | `linli-api.service`，Node 20，仅监听 `127.0.0.1:3000`，唯一接口 `/api/health` |
| 监控 | `linli-monitor.timer`，5 分钟一次，**告警未接通**（webhook 为空） |
| 资源 | 根分区 5%（108G 可用），内存 7.5G 用 366M |

---

## 1. 第一件事：你怎么进这台机器

这是交接中最容易被忽略、也最容易卡住后续所有工作的一项。

**当前状态**：整条链路上**没有 SSH 密钥，也没有设置过 root 密码**。所有运维动作都是通过腾讯云 TAT（自动化助手）下发的：

```
tccli tat RunCommand  →  实例上以 root 执行 shell  →  回传 stdout
```

下发通道封装在仓库的 `deploy/tat.mjs`，凭据来自操作者本机的 tccli 配置（`C:\Users\10974\.workbuddy\binaries\python\versions\3.13.12\Scripts\tccli.exe`，账号 433525）。

**这意味着**：拿到这份文档但没拿到 tccli 凭据的人，**无法操作服务器**。SSH 的 22 端口虽然开着，但没有可用凭证。

交接时必须二选一，建议都做：

| 方式 | 操作 | 适用 |
|---|---|---|
| 腾讯云子账号 | 控制台 → 访问管理 → 新建子账号，授予 `LighthouseFullAccess` + `TATFullAccess`，生成 API 密钥交给接手人 | 推荐，可审计、可回收 |
| SSH 密钥 | 接手人提供公钥 → `~/.ssh/authorized_keys` 追加 → 之后可直接 `ssh root@62.234.23.197` | 日常排障更顺手 |

**验证是否打通**（在接手人机器上）：

```bash
tccli lighthouse DescribeInstances --region ap-beijing --cli-unfold-argument
# 应返回 lhins-ol4yz1eo，InstanceState 为 RUNNING
```

---

## 2. 系统地图

### 2.1 服务器上的东西

| 路径 | 作用 | 改动方式 |
|---|---|---|
| `/var/www/linli` | **线上站点根目录**（当前生效版本） | 不要手工改，走发版脚本 |
| `/var/www/linli.prev` | 上一版，仅保留一代 | 发版时自动轮转 |
| `/etc/nginx/conf.d/linli.conf` | nginx 主配置，**唯一事实源** | 改仓库 `deploy/nginx.conf` 后上传 |
| `/etc/letsencrypt/` | 证书与续期配置 | 只由 certbot 维护，勿手改 |
| `/var/www/certbot` | ACME webroot 校验目录 | certbot 自动读写 |
| `/opt/linli-api/server.mjs` | 后端骨架源码 | 改仓库 `deploy/api/server.mjs` 后上传 |
| `/etc/systemd/system/linli-api.service` | 后端单元 | 同上 |
| `/opt/linli-monitor/check.sh` | 健康检查脚本 | 改仓库 `deploy/monitor/check.sh` 后上传 |
| `/etc/linli-monitor.env` | 监控配置（含 webhook），权限 600 | 可直接编辑 |
| `/var/lib/linli-monitor/last-problems` | 当前未恢复问题清单 | 只读观察 |

**原则**：服务器上的文件都是**产物**，源头在仓库 `deploy/`。直接改服务器等于制造漂移，下次发版就被覆盖。

### 2.2 仓库里的东西

| 文件 | 作用 |
|---|---|
| `deploy/release.mjs` | 一键发版（构建→打包→上传→原子切换→体检→冒烟） |
| `deploy/nginx.conf` | nginx 配置源文件 |
| `deploy/tat.mjs` / `deploy/upload.mjs` | TAT 执行器 / 分块上传器 |
| `deploy/api/` | 后端骨架源码与 systemd 单元 |
| `deploy/monitor/` | 监控脚本、单元、配置样例、说明 |
| `docs/HANDOVER.md` | 开发交接（架构、门禁、进度） |
| `docs/delivery/decisions.md` | **决策唯一事实源**，D-01…D-37 |

---

## 3. 日常操作

### 3.1 发版（最常用）

```bash
cd D:/网页开发/repo
node deploy/release.mjs              # 构建 + 发布，约 3 分钟
node deploy/release.mjs --skip-build # 复用现有 dist
node deploy/release.mjs --dry-run    # 只打包，不碰服务器
```

脚本做的事：构建 → bsdtar 打包 → 分块上传（sha256 校验）→ 解压到 `linli.new` → 内容校验（index/aplus/assets 数量）→ 原子切换 → `nginx -t` → reload → 冒烟四项。

**任一环失败会按原路换回**，不会留下半成品。看到 `[FAIL]` 时线上仍是旧版本。

**不要**用 FTP/手工覆盖 `/var/www/linli`——没有原子性和回滚。

### 3.2 改 nginx 配置

```bash
# 1. 改仓库里的 deploy/nginx.conf
# 2. 上传（Git Bash 下必须带 MSYS_NO_PATHCONV=1，否则远端路径会被改写成本地路径）
cd D:/网页开发/repo
MSYS_NO_PATHCONV=1 node deploy/upload.mjs deploy/nginx.conf /etc/nginx/conf.d/linli.conf

# 3. 语法检查并生效（失败则不 reload，线上仍是旧配置）
cat > /tmp/apply.sh <<'EOF'
set -eu
nginx -t || { echo "[ABORT] 语法错误，未 reload"; exit 1; }
systemctl reload nginx
echo "[ok] reloaded"
EOF
node deploy/tat.mjs /tmp/apply.sh 60
```

**改完必须验证 ACME 路径没有被 301 吞掉**（见 §7 第 1 条）。注意不要用 `certbot renew --dry-run` 判断——本机 staging 端点不可达，该命令必然失败。

### 3.3 改后端

```bash
MSYS_NO_PATHCONV=1 node deploy/upload.mjs deploy/api/server.mjs /opt/linli-api/server.mjs

cat > /tmp/restart-api.sh <<'EOF'
set -eu
chown linli:linli /opt/linli-api/server.mjs
systemctl restart linli-api
sleep 1
curl -s http://127.0.0.1:3000/api/health; echo
EOF
node deploy/tat.mjs /tmp/restart-api.sh 60
```

注意 `/opt/linli-api` 归 `linli` 用户，上传后需 `chown`，否则服务因权限拒绝启动。

### 3.4 查日志

```bash
# 访问日志（含真实访客 IP、UA）
tail -f /var/log/nginx/linli.access.log

# 错误日志
tail -f /var/log/nginx/linli.error.log

# 后端日志（stdout → journald）
journalctl -u linli-api -n 50 --no-pager

# 监控告警历史
journalctl -t linli-monitor -n 50 --no-pager

# 监控最近执行结果
journalctl -u linli-monitor.service -n 10 --no-pager
```

### 3.5 回滚

发版失败会自动回滚，无需干预。若已上线后发现版本有问题：

```bash
cat > /tmp/rollback.sh <<'EOF'
set -eu
cd /var/www
mv linli linli.bad
mv linli.prev linli
systemctl reload nginx
curl -sk -o /dev/null -w "https=%{http_code}\n" -H "Host: linli.lzbdcxm.cn" https://127.0.0.1/
EOF
node deploy/tat.mjs /tmp/rollback.sh 60
```

回滚后 `linli.bad` 占 848K，确认无误再删。

---

## 4. 故障处置

| 症状 | 先查 | 处理 |
|---|---|---|
| 站点打不开，浏览器超时 | `curl -I https://linli.lzbdcxm.cn/` 从外部；`ss -lntp \| grep -E ':(80\|443)'` 在机上 | 443 不通先查**云防火墙**（控制台 → 防火墙），历史上就漏过一次 |
| 502 Bad Gateway | `systemctl status linli-api` | 后端挂了，`systemctl restart linli-api`，再看 `journalctl -u linli-api -n 50` |
| 404 但文件在 | `nginx -T \| grep -A5 "location /"` | 多半是配置漂移，用仓库版本覆盖后 reload |
| 发版报 `[FAIL]` 且已回滚 | 看脚本输出的 `[n/6]` 阶段 | 阶段 3 失败＝产物不全；阶段 6 失败＝冒烟不过，查 nginx/后端 |
| 画面正常但页面空白 | 浏览器控制台；`curl -s https://.../ \| head` | 多半是 assets 404，检查 `/var/www/linli/assets` 数量（应为 24） |
| 证书即将过期 | `certbot certificates` 看 VALID 天数 | **不要用 `renew --dry-run` 判断**（本机 staging 不可达，必然失败）；验证方式见 §7 第 1 条 |
| 磁盘将满 | `df -h /` | 清理 `/var/log/nginx/*.log` 与旧备份；监控阈值 85% 会告警 |
| 整站连不上、TAT 也下不去 | 腾讯云控制台实例状态 | 可能实例异常或欠费，见 §6 到期日历 |

---

## 5. 监控现状

**已部署**：`linli-monitor.timer`，每 5 分钟检查 7 项——首页 200、A+ 页 200、API 探针、80→301、nginx 服务、后端服务、磁盘、证书天数。状态变化时才推送，不重复轰炸。

**未接通**：`WEBHOOK_URL` 为空，异常只写 journal，**不会有人收到通知**。这是当前最需要补的一项。

补法：编辑 `/etc/linli-monitor.env` 填入群机器人地址，无需重启，下次执行即生效。三种格式说明见 `deploy/monitor/README.md`。

**盲区（必须知道）**：脚本跑在服务器上，**整机宕机时它不会运行**。要覆盖该场景必须有外部探针（UptimeRobot 免费额度即可），监控目标 `https://linli.lzbdcxm.cn/api/health`。两者互补，缺一不可。

---

## 6. 到期日历

| 事项 | 日期 | 后果 | 提醒 |
|---|---|---|---|
| **服务器到期** | 2027-10-08 | 实例被回收，站点消失，数据不可恢复 | 最容易忘，建议现在就在日历上标 |
| 证书到期 | 2027-02-02 | 浏览器全红，站点不可用 | 每 90 天自动续期，已于 2026-11-04 实测成功；12 月底确认 `systemctl status certbot.timer` |
| 域名续费 | 按 DNSPod 日历 | 解析失效，站点不可达 | 检查 lzbdcxm.cn 的续费状态 |
| ICP 备案 | 长期有效 | 主体信息变更需更新 | 换主体/换域名需重新备案 |

---

## 7. 变更纪律（五条硬约束）

1. **改完 nginx，必须验证 ACME 路径没有被跳转吞掉，且不要用 `renew --dry-run` 判断续期是否正常。**

   certbot 默认会把 `if ($host = ...) { return 301 }` 塞进 80 的 server 块，而 server 级 `if` 处于 rewrite 阶段、**先于 location 匹配**，会让 `/.well-known/acme-challenge/` 被 301 走，续期必然失败（2026-10-30 实测报 `Unable to update challenge :: authorization must be pending`）。该故障要等 90 天后证书过期才暴露。当前配置已拆成 80/443 双 server 块并改用 webroot 认证，**不要合并回去**。

   正确的验证方式：

   ```bash
   # 1. ACME 路径应返回 404（文件不存在），绝不能是 301（被跳转吞掉）
   curl -s -o /dev/null -w '%{http_code}\n' http://linli.lzbdcxm.cn/.well-known/acme-challenge/probe

   # 2. 生产端点应返回 200
   curl -s -o /dev/null -w '%{http_code}\n' https://acme-v02.api.letsencrypt.org/directory

   # 3. 看证书剩余天数
   certbot certificates | grep -E 'Certificate Name|Expiry'
   ```

   **为什么不能用 dry-run**：dry-run 固定走 staging 端点 `acme-staging-v02.api.letsencrypt.org`，该端点从本机持续超时（2026-11-04 实测 3 次全超时），而生产端点正常（约 1.0 s）。dry-run 失败不代表续期有问题，据此判断会误判为故障。

   真实续期已于 **2026-11-04** 用 `certbot renew --force-renewal --no-random-sleep-on-renew` 验证：**7 秒完成**，证书由 2027-01-28 换发为 2027-02-02，nginx 自动 reload，线上已生效。这是目前唯一可信的续期验证结论。

   另需知道：非交互续期会插入约 **7 分钟随机延迟**（日志 `random delay of 414s`），这是 certbot 防止全网同时冲击 CA 的正常设计，不是卡死。手动验证时加 `--no-random-sleep-on-renew` 跳过。

2. **发版只用 `node deploy/release.mjs`**，不要手工覆盖站点目录。

3. **不要在服务器上直接改配置或代码。** 源头在仓库，服务器上是产物。

4. **改 `src/` 后必须重跑门禁**（`vite preview --port 5180` + `npm run gate`，约 7.3 分钟，248 项断言）。门禁会核对密度分母与产物指纹，不重跑则 `collect-baseline --strict` 判红。

5. **备案号出现在 5 处**（B 端组件 2、A+ 端组件 1、两个 `noscript` 各 1），**换号必须五处同改**，否则页脚与静态兜底不一致。

---

## 8. 待办与已知风险

| 优先级 | 事项 | 说明 |
|---|---|---|
| 高 | **接通监控告警** | webhook 为空，当前故障无人知晓 |
| 高 | **补服务器访问凭证** | 无 SSH 密钥、无子账号，接手人无法独立运维 |
| 中 | 外部探针 | 覆盖整机宕机场景 |
| 中 | 公安联网备案 | 与 ICP 是两套流程，按属地要求办理 |
| 中 | 站点备份 | 只有 `linli.prev` 一代，无异地副本 |
| 低 | 后端业务接口 | 目前只有 `/api/health` 骨架，无任何业务逻辑 |
| 低 | 日志轮转 | nginx 日志无 logrotate 策略，长期运行需补 |

**当前明确不做的**：真实用户体系、内容审核服务、支付、WebSocket。项目定位是合成数据演练原型，这些属于「真实运营」范畴，见 `docs/HANDOVER.md` §3.4。

---

## 9. 交接清单

交接完成时应逐项确认：

- [ ] 接手人能独立执行一次 `node deploy/release.mjs` 并看到四项冒烟通过
- [ ] 接手人能从外部访问 `https://linli.lzbdcxm.cn/` 与 `/aplus.html`
- [ ] 接手人已获得腾讯云访问凭证，并能跑通 `tccli lighthouse DescribeInstances`
- [ ] 接手人能读出 `/var/lib/linli-monitor/last-problems`
- [ ] 已交接腾讯云账号、DNSPod、ICP 备案的主体信息与登录方式
- [ ] 已知晓 §6 的两个到期日
- [ ] 已阅读 §7 五条硬约束
