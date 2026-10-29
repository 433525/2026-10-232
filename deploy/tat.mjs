// deploy/tat.mjs — 通过腾讯云自动化助手(TAT)在轻量实例上执行 shell 脚本，无需 SSH。
// 用法: node deploy/tat.mjs <脚本文件> [超时秒]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TCCLI = "C:/Users/10974/.workbuddy/binaries/python/versions/3.13.12/Scripts/tccli.exe";
const REGION = process.env.LH_REGION || "ap-beijing";
const INSTANCE = process.env.LH_INSTANCE || "lhins-ol4yz1eo";

function call(args) {
  const out = execFileSync(TCCLI, [...args, "--region", REGION], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  return JSON.parse(out);
}

const scriptPath = process.argv[2];
const timeout = Number(process.argv[3] || 300);
const content = Buffer.from(fs.readFileSync(scriptPath, "utf8"), "utf8").toString("base64");

const reqPath = path.join(os.tmpdir(), `tat-req-${Date.now()}.json`);
fs.writeFileSync(
  reqPath,
  JSON.stringify({
    InstanceIds: [INSTANCE],
    CommandType: "SHELL",
    Content: content,
    Timeout: timeout,
  }),
  "utf8",
);

const run = call(["tat", "RunCommand", "--cli-input-json", `file://${reqPath.replace(/\\/g, "/")}`]);
const invId = run.InvocationId;
if (!invId) {
  console.error(JSON.stringify(run));
  process.exit(1);
}

const deadline = Date.now() + (timeout + 60) * 1000;
let task = null;
while (Date.now() < deadline) {
  const res = call([
    "tat",
    "DescribeInvocationTasks",
    "--Filters",
    JSON.stringify([{ Name: "invocation-id", Values: [invId] }]),
    "--HideOutput",
    "false",
  ]);
  task = (res.InvocationTaskSet || [])[0];
  if (task && ["SUCCESS", "FAILED", "TIMEOUT", "PARTIAL_FAILED"].includes(task.TaskStatus)) break;
  await new Promise((r) => setTimeout(r, 2500));
}

if (!task) {
  console.error("no task result");
  process.exit(1);
}

const out = task.TaskResult?.Output ? Buffer.from(task.TaskResult.Output, "base64").toString("utf8") : "";
process.stdout.write(`[state] ${task.TaskStatus}  [exit] ${task.TaskResult?.ExitCode}\n`);
process.stdout.write(out);
process.exit(task.TaskStatus === "SUCCESS" ? 0 : 1);
