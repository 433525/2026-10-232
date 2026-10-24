/**
 * 本机文件下载的唯一实现（两个入口共用）。
 *
 * 约束：只做「把已经在本机内存里的文本交给浏览器下载」，不上传、不请求网络。
 * A+ 用它导出备份与坏档原文，B 用它导出演练存档与坏档原文。
 */
export function downloadTextFile(
  filename: string,
  content: string,
  type = 'application/json;charset=utf-8',
): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** 统一日期后缀，避免同一天多次导出互相覆盖时难以区分。 */
export function dateStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}
