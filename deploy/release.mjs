// deploy/release.mjs — 一键发版：构建 → 打包 → 上传 → 原子切换 → reload → 冒烟，失败自动回滚。
//
// 用法:
//   node deploy/release.mjs                # 构建 + 发布
//   node deploy/release.mjs --skip-build   # 复用现有 dist 直接发布
//   node deploy/release.mjs --dry-run      # 只打包并打印，不碰服务器
//
// 设计要点:
//   1. 单文件 tar.gz 上传，27 个文件变 1 条通道，避免逐文件 base64 往返。
//   2. 切换是 mv 原子操作，不是覆盖写；任何时刻磁盘上都有一个完整可服务的目录。
//   3. 校验顺序刻意前移：解压后先验关键文件与 assets 数量，再做切换，
//      因为 nginx -t 只查配置语法、不查站点文件是否存在，不能当作内容校验。
//   4. 冒烟失败按「换回」处理，不尝试原地修补。
//
// 注意: 不要把本文件写进 package.json 的 scripts —— package.json 在门禁被测面内，
//       增加脚本会令 docs/metrics/gate-timing.json 的耗时基线作废。

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const DIST = path.join(REPO, "dist");
const REMOTE_TGZ = "/tmp/linli-release.tar.gz";

const argv = process.argv.slice(2);
const skipBuild = argv.includes("--skip-build");
const dryRun = argv.includes("--dry-run");

function step(msg) {
  process.stdout.write(`\n=== ${msg} ===\n`);
}

function fail(msg, code = 1) {
  console.error(`\n[FAIL] ${msg}`);
  process.exit(code);
}

// ---------------------------------------------------------------- 1. 构建
if (!skipBuild) {
  step("构建");
  execFileSync("npm", ["run", "build"], { cwd: REPO, stdio: "inherit", shell: true });
} else {
  step("跳过构建（--skip-build）");
  if (!fs.existsSync(DIST)) fail("dist 不存在，无法跳过构建");
}

for (const f of ["index.html", "aplus.html"]) {
  if (!fs.existsSync(path.join(DIST, f))) fail(`产物缺少 ${f}`);
}
const assetsDir = path.join(DIST, "assets");
const assetCount = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).length : 0;
if (assetCount === 0) fail("产物 assets 为空");

// ---------------------------------------------------------------- 2. 打包
step("打包");

// Windows 打包的三条路实测结论（2026-10-30，Node 22.22.2）：
//   · fs.cpSync 以中文路径为源会令进程直接崩溃（无异常、退出码 127）——不可用
//   · GNU tar 接受中文路径参数时错乱（status 2）——不可用
//   · Windows 自带 bsdtar 正确处理中文路径 —— 采用此方案
// 因此不做临时目录镜像，直接用 bsdtar 对 dist 就地打包。
const TAR = "C:/Windows/System32/tar.exe";
if (!fs.existsSync(TAR)) fail(`找不到系统 tar: ${TAR}`);

const tgz = path.join(os.tmpdir(), `linli-release-${Date.now()}.tar.gz`);
execFileSync(TAR, ["-czf", tgz, "-C", DIST, "."], { stdio: "inherit" });

const buf = fs.readFileSync(tgz);
const sha = crypto.createHash("sha256").update(buf).digest("hex");
console.log(`产物 ${assetCount} 个 assets，打包 ${(buf.length / 1024).toFixed(1)} KB`);
console.log(`sha256=${sha}`);

if (dryRun) {
  console.log(`\n[dry-run] 已完成打包，未上传。包路径: ${tgz}`);
  process.exit(0);
}

// ---------------------------------------------------------------- 3. 上传
step("上传");
execFileSync(process.execPath, [path.join(HERE, "upload.mjs"), tgz, REMOTE_TGZ], {
  cwd: REPO,
  stdio: "inherit",
});
fs.rmSync(tgz, { force: true });

// ---------------------------------------------------------------- 4. 远端切换
const remoteScript = `set -eu
TGZ=${REMOTE_TGZ}
WWW=/var/www
LIVE=$WWW/linli
NEW=$WWW/linli.new
PREV=$WWW/linli.prev
KEEP=$WWW/linli.prev.keep
EXPECTED_SHA=${sha}

echo "[1/6] sha256 校验"
ACTUAL=$(sha256sum "$TGZ" | cut -d' ' -f1)
if [ "$ACTUAL" != "$EXPECTED_SHA" ]; then
  echo "sha 不一致: $ACTUAL"; exit 10
fi

echo "[2/6] 解压到暂存目录"
rm -rf "$NEW"
mkdir -p "$NEW"
tar xzf "$TGZ" -C "$NEW"
rm -f "$TGZ"
chmod -R a+rX "$NEW"

echo "[3/6] 内容校验"
[ -f "$NEW/index.html" ] || { echo "缺少 index.html"; exit 11; }
[ -f "$NEW/aplus.html" ] || { echo "缺少 aplus.html"; exit 12; }
N=$(ls "$NEW/assets" 2>/dev/null | wc -l)
if [ "$N" -lt 1 ]; then echo "assets 为空"; exit 13; fi
echo "  assets=$N size=$(du -sh "$NEW" | cut -f1)"

echo "[4/6] 原子切换"
rm -rf "$KEEP"
if [ -d "$PREV" ]; then mv "$PREV" "$KEEP"; fi
if [ -d "$LIVE" ]; then mv "$LIVE" "$PREV"; fi
mv "$NEW" "$LIVE"
echo "  $LIVE 已更新，上一版 -> $PREV"

echo "[5/6] 配置体检与 reload"
if ! nginx -t 2>/tmp/linli-nginx-t.err; then
  echo "  nginx -t 失败，回滚"
  cat /tmp/linli-nginx-t.err
  rm -rf "$LIVE"
  mv "$PREV" "$LIVE"
  if [ -d "$KEEP" ]; then mv "$KEEP" "$PREV"; fi
  exit 20
fi
systemctl reload nginx
sleep 1

echo "[6/6] 冒烟"
# 站点已强制 80→443。冒烟必须打 443 并带真实域名 Host：
#   打 http://127.0.0.1 只会拿到 301，会把正常发布误判为失败（2026-10-31 实际踩到）。
SITE_HOST=linli.lzbdcxm.cn
B=$(curl -sk -o /dev/null -w '%{http_code}' -H "Host: $SITE_HOST" https://127.0.0.1/)
A=$(curl -sk -o /dev/null -w '%{http_code}' -H "Host: $SITE_HOST" https://127.0.0.1/aplus.html)
H=$(curl -s  -o /dev/null -w '%{http_code}' -H "Host: $SITE_HOST" http://127.0.0.1/)
P=$(curl -sk -o /dev/null -w '%{http_code}' -H "Host: $SITE_HOST" https://127.0.0.1/api/health)
echo "  https / => $B | https /aplus.html => $A | http / => $H (期望 301) | /api/health => $P"
if [ "$B" != "200" ] || [ "$A" != "200" ] || [ "$H" != "301" ]; then
  echo "  冒烟未过，回滚"
  rm -rf "$NEW"
  mv "$LIVE" "$NEW"
  mv "$PREV" "$LIVE"
  if [ -d "$KEEP" ]; then mv "$KEEP" "$PREV"; fi
  rm -rf "$NEW"
  systemctl reload nginx
  exit 21
fi
# 后端不是静态发布的前置条件：探针异常只告警，不回滚静态产物
if [ "$P" != "200" ]; then
  echo "  [WARN] 后端探针 /api/health => $P，静态发布已完成，请检查 linli-api.service"
fi

rm -rf "$KEEP"
echo "[ok] 发布完成"
`;

step("远端切换");
const remotePath = path.join(os.tmpdir(), `linli-remote-${Date.now()}.sh`);
fs.writeFileSync(remotePath, remoteScript, "utf8");

let ok = true;
try {
  execFileSync(process.execPath, [path.join(HERE, "tat.mjs"), remotePath, "300"], {
    cwd: REPO,
    stdio: "inherit",
  });
} catch (e) {
  ok = false;
} finally {
  fs.rmSync(remotePath, { force: true });
}

if (!ok) fail("远端发布失败，详见上方输出（已按需回滚）");

step("完成");
console.log(`访问: http://62.234.23.197/  |  http://62.234.23.197/aplus.html`);
