import { useAplusContext } from '../context'

export default function BackupTextPanel() {
  const { backupText } = useAplusContext()
  const text = backupText.value

  if (!text) return null

  return (
    <section className="panel" aria-label="合成备份文本">
      <div className="panel-head">
        <h2 className="panel-title">合成备份文本</h2>
        <button className="button small" type="button" onClick={() => { backupText.value = '' }}>关闭备份文本</button>
      </div>
      <div className="field">
        <label htmlFor="backup-text">打开时生成的完整 JSON 快照（只读）</label>
        <textarea
          id="backup-text"
          value={text}
          readOnly
          spellCheck={false}
          rows={8}
          onFocus={(event) => event.currentTarget.select()}
        />
        <p className="notice-inline">点击文本框全选后复制，粘贴到记事本，以 UTF-8 保存为 .json 文件。请保留完整内容，之后可使用“导入备份”恢复；保存后关闭此区域。若记录有更新，请重新点击“查看备份文本”。</p>
      </div>
    </section>
  )
}
