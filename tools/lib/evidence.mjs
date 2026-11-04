/**
 * evidence.mjs — 证据分片的内容指纹（I-20）。
 *
 * 为什么在 源码指纹（I-12）与产物指纹（I-17）之外还需要第三个指纹：
 * 前两者分别回答「代码变没变」「门禁跑的 bundle 是不是当前这份」，都是**输入端**的证明；
 * 没有任何一项证明「八份 `report.json` 出自同一次门禁、同一次构建」。实际漏洞：
 *   1. 全量门禁记录 248/248 之后，单跑 `node tools/check-p0-gaps.mjs` 会用另一时刻
 *      （可能已是另一份 bundle）的结果覆盖该段证据，而断言总数与通过数多半不变，
 *      采集器第 1、2 条校验照样全绿——**证据被换，基线不变**；
 *   2. 人工改一行 `report.json`（如把 `ok:false` 改回 `true`）同理无人可察；
 *   3. 分片间时间不一致（有的 04:07、有的 04:13）只被当作「正常抖动」打印，未被判定。
 * 故本指纹按**文件字节**取摘要，由门禁在落盘时写入 `gate-timing.json`，采集器逐段重算比对。
 *
 * 与 I-17 的分工：I-17 绑「一次构建 ↔ 一份耗时记录」，I-20 绑「一次门禁 ↔ 八份证据」。
 * 两者都成立，「248 条全绿」才对应到具体的源码、具体的产物、具体的一次执行。
 *
 * 注意：`docs/evidence/**` 入库，指纹会随提交变化；比对只在「同一工作树内」成立。
 * 检出历史版本后重跑采集器必然不符——这是正确行为（该基线不属于这个工作树）。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

/**
 * 证据文件内容指纹：`sha256:<32 位>`；文件不存在时返回 `null`。
 * 按内容取摘要（不解析 JSON）：判据是「这份文件有没有被换/被改」，
 * 而不是「语义是否等价」，格式化差异同样应判红。
 *
 * **换行先归一**：本机 `core.autocrlf=true`，同一份 `report.json` 在工作树是 LF、
 * 新克隆检出后变 CRLF；若按原始字节取摘要，换一台机器跑 `--strict` 会把八份分片
 * 全判成「被替换」——这是**假红**，比漏判更快摧毁门禁的可信度。故先把 CRLF 折成 LF
 * 再取摘要：内容改动（改一个字、加一个空格）仍然判红，只有行尾风格不参与判定。
 */
export function evidenceHash(absPath) {
  if (!existsSync(absPath)) return null
  const text = readFileSync(absPath, 'utf8').replace(/\r\n/g, '\n')
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 32)}`
}
