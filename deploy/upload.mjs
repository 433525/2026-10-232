// deploy/upload.mjs — 通过 TAT 分块上传本地文件到实例（base64 追加），末尾校验 sha256。
// 用法: node deploy/upload.mjs <本地文件> <远端路径>
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const TCCLI = "C:/Users/10974/.workbuddy/binaries/python/versions/3.13.12/Scripts/tccli.exe";
const REGION = process.env.LH_REGION || "ap-beijing";
const INSTANCE = process.env.LH_INSTANCE || "lhins-ol4yz1eo";
const CHUNK = 34000;

// 与 tat.mjs 保持一致：本地到腾讯云 API 存在间歇性 10054 连接重置，
// 对网络类错误做指数退避重试，业务错误立即抛出。
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function call(args, retries = 4) {
  for (let attempt = 0; ; attempt++) {
    try {
      const out = execFileSync(TCCLI, [...args, "--region", REGION], {
        encoding: "utf8",
        maxBuffer: 128 * 1024 * 1024,
      });
      return JSON.parse(out);
    } catch (e) {
      const detail = String(e.stderr || e.message || "");
      const transient = /ClientNetworkError|Connection aborted|ConnectionReset|ECONNRESET|timed out/i.test(detail);
      if (!transient || attempt >= retries - 1) throw e;
      const wait = 1500 * 2 ** attempt;
      process.stderr.write(`[retry ${attempt + 1}/${retries - 1}] ${args[0]} ${args[1]} — 网络错误，${wait}ms 后重试\n`);
      sleepSync(wait);
    }
  }
}

function runScript(script, timeout = 120) {
  return (async () => {
    const reqPath = path.join(os.tmpdir(), `tat-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(
      reqPath,
      JSON.stringify({
        InstanceIds: [INSTANCE],
        CommandType: "SHELL",
        Content: Buffer.from(script, "utf8").toString("base64"),
        Timeout: timeout,
      }),
      "utf8",
    );
    const run = call(["tat", "RunCommand", "--cli-input-json", `file://${reqPath.replace(/\\/g, "/")}`]);
    const invId = run.InvocationId;
    if (!invId) throw new Error("RunCommand failed: " + JSON.stringify(run));
    const deadline = Date.now() + (timeout + 60) * 1000;
    while (Date.now() < deadline) {
      const res = call([
        "tat",
        "DescribeInvocationTasks",
        "--Filters",
        JSON.stringify([{ Name: "invocation-id", Values: [invId] }]),
        "--HideOutput",
        "false",
      ]);
      const t = (res.InvocationTaskSet || [])[0];
      if (t && ["SUCCESS", "FAILED", "TIMEOUT", "PARTIAL_FAILED"].includes(t.TaskStatus)) {
        const out = t.TaskResult?.Output ? Buffer.from(t.TaskResult.Output, "base64").toString("utf8") : "";
        if (t.TaskStatus !== "SUCCESS") throw new Error(`${t.TaskStatus}: ${out}`);
        return out;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    throw new Error("timeout waiting for invocation " + invId);
  })();
}

const src = process.argv[2];
const remote = process.argv[3];
const buf = fs.readFileSync(src);
const sha = crypto.createHash("sha256").update(buf).digest("hex");
const b64 = buf.toString("base64");

console.log(`[local] ${src}  ${buf.length} B  sha256=${sha}`);
console.log(`[remote] ${remote}  分块 ${Math.ceil(b64.length / CHUNK)} 段`);

await runScript(`rm -f ${remote}.b64 && : > ${remote}.b64 && echo READY`);

let sent = 0;
for (let i = 0; i * CHUNK < b64.length; i++) {
  const part = b64.slice(i * CHUNK, (i + 1) * CHUNK);
  await runScript(`printf '%s' '${part}' >> ${remote}.b64`);
  sent += part.length;
  process.stdout.write(`\r  已传 ${sent}/${b64.length} 字符 (${((sent / b64.length) * 100).toFixed(0)}%)`);
}
process.stdout.write("\n");

const check = await runScript(`base64 -d ${remote}.b64 > ${remote} && sha256sum ${remote} | cut -d' ' -f1 && rm -f ${remote}.b64`);
const remoteSha = check.trim().split("\n").pop().trim();
console.log(`[verify] remote sha256=${remoteSha}`);
if (remoteSha !== sha) {
  console.error("校验失败：远端 sha256 与本地不一致");
  process.exit(1);
}
console.log("[ok] 上传完成且 sha256 一致");
