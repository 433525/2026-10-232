// deploy/api/server.mjs — 后端链路骨架（零依赖，仅用 Node 内置模块）
//
// 目的：把「域名 → nginx(TLS) → 127.0.0.1:3000 → 回源」这条链路跑通并留下探针，
//       而不是提前假设业务字段。后续真实接口直接在本文件里按 handleXxx 扩展。
//
// 边界：
//   · 只监听 127.0.0.1，不直接暴露公网；唯一入口是 nginx 的 /api/ 反代。
//   · 无数据库、无鉴权、无会话——这些都是业务决策，不应由骨架代劳。
//   · 日志写 stdout，由 systemd 交给 journald（journalctl -u linli-api）。
//
// 接口：
//   GET /api/health  → 200 { status, uptimeSec, version, ts }
//   *   /api/*       → 404 { error: "not_found", path }
//
// 运维：
//   systemctl status linli-api
//   systemctl restart linli-api
//   journalctl -u linli-api -n 50 --no-pager

import http from "node:http";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const VERSION = process.env.APP_VERSION || "0.1.0";
const STARTED_AT = Date.now();

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    // 健康检查与错误响应都不应被任何中间层缓存
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url, "http://localhost").pathname;
  } catch {
    return sendJson(res, 400, { error: "bad_request" });
  }

  // 探针：用于验收与监控抓取，必须无条件可用、不依赖任何外部资源
  if (req.method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, {
      status: "ok",
      uptimeSec: Math.round((Date.now() - STARTED_AT) / 1000),
      version: VERSION,
      ts: new Date().toISOString(),
    });
  }

  // 真实业务接口在此处按 pathname 分支扩展
  return sendJson(res, 404, { error: "not_found", path: pathname });
});

server.listen(PORT, HOST, () => {
  console.log(`[linli-api] listening on http://${HOST}:${PORT} version=${VERSION}`);
});

// 让 systemd stop/restart 走优雅关闭，避免连接被硬断
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`[linli-api] received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    // 兜底：残留长连接最多再等 5s
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
