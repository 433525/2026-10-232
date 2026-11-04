#!/usr/bin/env bash
# /opt/linli-monitor/check.sh — 暖阳邻里站点健康检查（零依赖，仅用 curl/openssl/systemctl）
#
# 设计要点：
#   1. 不用 `set -e`：单点失败必须继续检查其余项，否则一次异常会掩盖其他问题。
#   2. 探针走真实公网域名，不用 127.0.0.1 + Host 头。
#      原因（2026-11-01 实测）：nginx 只有一个 443 server 块，对任意 Host 都返回 200，
#      用 -H "Host: xxx" 打回环时，即使域名解析坏掉、云防火墙丢了 443，探针依旧全绿——
#      缺陷注入测试只报出「证书路径不存在」一项，其余全部误判为正常。
#      改走域名后可覆盖 DNS → 公网 IP → 防火墙 → nginx → 证书 全链路，代价约 80 ms。
#      同时不传 -k，让 curl 校验证书链：证书过期或域名不匹配会直接暴露。
#      仍需知晓的盲区：本脚本跑在宿主机上，整机宕机时它不会运行，
#      该场景由外部探针负责（见 deploy/monitor/README.md）。
#   3. 只在「问题集合发生变化」时推送，避免每 5 分钟重复轰炸同一条告警。
#      恢复正常同样推送一次，否则你不知道它什么时候好的。
#   4. 未配置 WEBHOOK_URL 时不报错、只写 journal，便于先部署后接线。
#
# 配置：/etc/linli-monitor.env
# 手动执行：/opt/linli-monitor/check.sh; echo "exit=$?"
# 查看日志：journalctl -t linli-monitor -n 50 --no-pager

set -uo pipefail

ENV_FILE="${ENV_FILE:-/etc/linli-monitor.env}"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

WEBHOOK_URL="${WEBHOOK_URL:-}"
WEBHOOK_TYPE="${WEBHOOK_TYPE:-wecom}"      # wecom | dingtalk | feishu
SITE_HOST="${SITE_HOST:-linli.lzbdcxm.cn}"
STATE_DIR="${STATE_DIR:-/var/lib/linli-monitor}"
STATE_FILE="$STATE_DIR/last-problems"
DISK_MAX="${DISK_MAX:-85}"                 # 根分区使用率告警阈值（百分比）
CERT_MIN_DAYS="${CERT_MIN_DAYS:-14}"       # 证书剩余天数告警阈值
API_EXPECT="${API_EXPECT:-/api/health}"

mkdir -p "$STATE_DIR"

problems=()
add() { problems+=("$1"); }

# ---------------------------------------------------------------- 站点探针
BASE="https://${SITE_HOST}"

code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$BASE/" 2>/dev/null) || code=000
[ "$code" = "200" ] || add "首页 HTTPS 返回 ${code}（期望 200）"

code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$BASE/aplus.html" 2>/dev/null) || code=000
[ "$code" = "200" ] || add "A+ 入口返回 ${code}（期望 200）"

body=$(curl -s -m 10 "${BASE}${API_EXPECT}" 2>/dev/null || echo "")
case "$body" in
  *'"status":"ok"'*) : ;;
  *) add "API 探针异常：${body:-无响应}" ;;
esac

code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://${SITE_HOST}/" 2>/dev/null) || code=000
[ "$code" = "301" ] || add "HTTP 未按预期跳转（返回 ${code}，期望 301）"

# ---------------------------------------------------------------- 服务与资源
systemctl is-active --quiet nginx || add "nginx 未运行"
systemctl is-active --quiet linli-api || add "linli-api 未运行"

use=$(df --output=pcent / 2>/dev/null | tail -1 | tr -dc '0-9')
if [ -z "$use" ]; then
  add "无法读取根分区使用率"
elif [ "$use" -ge "$DISK_MAX" ]; then
  add "根分区使用率 ${use}%（阈值 ${DISK_MAX}%）"
fi

cert="/etc/letsencrypt/live/${SITE_HOST}/fullchain.pem"
if [ -r "$cert" ]; then
  end=$(openssl x509 -in "$cert" -noout -enddate 2>/dev/null | cut -d= -f2)
  end_ts=$(date -d "$end" +%s 2>/dev/null || echo 0)
  if [ "$end_ts" -gt 0 ]; then
    days=$(( (end_ts - $(date +%s)) / 86400 ))
    [ "$days" -ge "$CERT_MIN_DAYS" ] || add "证书剩余 ${days} 天（阈值 ${CERT_MIN_DAYS} 天）"
  else
    add "无法解析证书到期时间"
  fi
else
  add "证书文件不可读：${cert}"
fi

# ---------------------------------------------------------------- 告警发送
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  printf '"%s"' "$s"
}

send() {
  local text="$1" payload
  echo "$text" | logger -t linli-monitor

  if [ -z "$WEBHOOK_URL" ]; then
    echo "[warn] 未配置 WEBHOOK_URL，仅写 journal"
    return 0
  fi

  case "$WEBHOOK_TYPE" in
    feishu) payload=$(printf '{"msg_type":"text","content":{"text":%s}}' "$(json_escape "$text")") ;;
    *)      payload=$(printf '{"msgtype":"text","text":{"content":%s}}' "$(json_escape "$text")") ;;
  esac

  if ! curl -sS -m 10 -X POST -H 'Content-Type: application/json' \
        -d "$payload" "$WEBHOOK_URL" >/dev/null 2>&1; then
    echo "[error] webhook 发送失败（网络或 URL 无效）" | logger -t linli-monitor
    return 1
  fi
}

# ---------------------------------------------------------------- 状态比对
current=$(printf '%s\n' "${problems[@]+"${problems[@]}"}" | sed '/^$/d' | sort)
prev=$(cat "$STATE_FILE" 2>/dev/null || true)

if [ "$current" != "$prev" ]; then
  if [ -n "$current" ]; then
    msg="【暖阳邻里】异常告警 $(date '+%F %T')
$current"
  else
    msg="【暖阳邻里】已恢复正常 $(date '+%F %T')"
  fi
  send "$msg"
  printf '%s\n' "$current" > "$STATE_FILE"
fi

if [ -n "$current" ]; then
  echo "[FAIL]"
  printf '%s\n' "$current"
  exit 1
fi

echo "[OK] 全部检查通过"
exit 0
