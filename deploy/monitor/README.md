# 站点监控

服务器端健康检查，systemd timer 每 5 分钟执行一次。

## 组成

| 文件 | 落盘位置 | 作用 |
|---|---|---|
| `check.sh` | `/opt/linli-monitor/check.sh` | 探针本体，权限 755 |
| `linli-monitor.service` | `/etc/systemd/system/` | oneshot 执行单元 |
| `linli-monitor.timer` | `/etc/systemd/system/` | 5 分钟周期 |
| `linli-monitor.env.example` | `/etc/linli-monitor.env` | 配置（权限 600） |

## 检查项（7 项）

1. `https://<域名>/` 返回 200
2. `https://<域名>/aplus.html` 返回 200
3. `https://<域名>/api/health` 返回 `{"status":"ok"}`
4. `http://<域名>/` 返回 301（跳转本身是功能，不是异常）
5. `nginx` 服务 active
6. `linli-api` 服务 active
7. 根分区使用率 < 85%
8. 证书剩余天数 ≥ 14 天

探针**走真实公网域名**，不传 `-k`，因此会校验证书链。这是刻意的：回环 + `-H "Host:"` 的写法在 nginx 单 server 块下对任意 Host 都返回 200，域名解析或防火墙一旦出问题，探针依旧全绿（实测缺陷注入只报出证书路径一项，其余全部误判正常）。

## 告警行为

- 只在**问题集合发生变化**时推送，同一条故障不会每 5 分钟重复轰炸。
- 恢复正常时推送一次「已恢复正常」。
- 未配置 `WEBHOOK_URL` 时不报错，只写 journal。

配置方式：编辑 `/etc/linli-monitor.env`，填入：

```bash
WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxx
WEBHOOK_TYPE=wecom   # wecom | dingtalk | feishu
```

改完无需重启 timer，下次执行即生效。钉钉若启用「自定义关键词」，关键词填「暖阳邻里」——本脚本消息固定以此开头。

## 常用命令

```bash
systemctl list-timers linli-monitor.timer      # 下次执行时间
systemctl start linli-monitor.service          # 立即跑一次
/opt/linli-monitor/check.sh; echo "exit=$?"    # 前台执行看输出
journalctl -t linli-monitor -n 50 --no-pager   # 告警日志
journalctl -u linli-monitor.service -n 20      # 执行日志
cat /var/lib/linli-monitor/last-problems       # 当前未恢复的问题
```

## 如何验证告警真的能响

改配置指向一个不存在的域名，跑一次，应输出多项 FAIL 并推送：

```bash
printf 'SITE_HOST=nonexistent.invalid\nWEBHOOK_URL=<真实URL>\nSTATE_DIR=/tmp/mon-test\n' > /tmp/mon.env
ENV_FILE=/tmp/mon.env /opt/linli-monitor/check.sh; echo "exit=$?"
rm -rf /tmp/mon-test /tmp/mon.env
```

「不存在的域名」会同时触发首页、A+、API、跳转、证书五项失败，是最接近真实的注入方式。

## 已知盲区：整机宕机不会被发现

脚本跑在宿主机上。**服务器关机、内核崩溃、云主机被回收时，它没有机会运行**，你收不到任何告警——而这恰恰是最需要通知的场景。

要覆盖该场景，必须有**外部探针**（在另一台机器上判断本站是否可达）。可选：

| 方案 | 成本 | 说明 |
|---|---|---|
| UptimeRobot 等免费服务 | 免费 | 5 分钟间隔、HTTP(s) 关键字校验，直接指向 `https://linli.lzbdcxm.cn/api/health` |
| 腾讯云云拨测 | 按次计费 | 云原生，可告警到短信/微信 |
| 本机计划任务 | 免费 | 仅在本机常开时有效，不适合无人值守 |

外部探针只做一件事：判断 `https://linli.lzbdcxm.cn/api/health` 是否返回 200。它与本脚本互补——本脚本管「机器活着但服务坏了」，外部探针管「机器整个没了」。

## 注意

- 监控本身也需要被监控：连续多天没有告警不代表一切正常，也可能是 timer 死了。建议每周看一眼 `systemctl list-timers`。
- 本脚本不检查业务数据是否正确（如审核队列数量），只检查链路是否活着。
