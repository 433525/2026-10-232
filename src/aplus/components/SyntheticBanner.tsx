import { useAplusContext } from '../context'

export default function SyntheticBanner() {
  const {
    store,
    storageStatusLabel,
    lastSavedLabel,
    exportBackup,
    viewBackupText,
    chooseBackup,
    reloadLatestSnapshot,
    exportUnreadableBackup,
    resetDemo,
  } = useAplusContext()
  const status = store.storageStatus.value

  return (
    <div className="synthetic-banner" role="note">
      <div className="synthetic-icon">✳</div>
      <div className="synthetic-copy">
        <strong>合成数据演练 · 不得录入真实居民信息</strong>
        <span className="synthetic-detail">表单为自由文本，无法识别或阻止真实个人信息；数据以明文保存在当前浏览器，清理后无法恢复，请定期导出备份。</span>
        <div className="storage-status" data-state={status} role="status" aria-live="polite">
          {storageStatusLabel.value}{lastSavedLabel.value ? <span> · 最近保存 {lastSavedLabel.value}</span> : null}
        </div>
      </div>
      <div className="banner-actions">
        <button className="button small" type="button" onClick={exportBackup}>导出备份</button>
        <button className="button small" type="button" onClick={viewBackupText}>查看备份文本</button>
        <button className="button small" type="button" onClick={chooseBackup}>导入备份</button>
        {status === 'conflict' ? <button className="button small" type="button" onClick={reloadLatestSnapshot}>重新载入最新存档</button> : null}
        {status === 'recovery-required' ? <button className="button small" type="button" onClick={exportUnreadableBackup}>下载无法读取的旧存档</button> : null}
        <button className="button small danger" type="button" onClick={resetDemo}>重置演练</button>
      </div>
    </div>
  )
}
