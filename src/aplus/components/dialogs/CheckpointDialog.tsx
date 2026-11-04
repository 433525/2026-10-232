import { CHECKPOINT_SYNTHETIC_NOTICE, CONSENT_STATUSES, type ConsentStatus } from '../../../data/intake/intake'
import { useAplusContext } from '../../context'

export default function CheckpointDialog() {
  const { showCheckpoint, selectedCase, forms, setForm, checkpointError, saveCheckpoint, closeAllDialogs } = useAplusContext()

  if (!showCheckpoint.value) return null
  const form = forms.checkpoint.value

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeAllDialogs() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="checkpoint-title" aria-describedby="checkpoint-title-desc">
        <header className="modal-header">
          <div>
            <h2 id="checkpoint-title">更新登记检查点</h2>
            <p id="checkpoint-title-desc">{selectedCase.value?.id} · 每次更新都会追加时间线记录。</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={closeAllDialogs}>×</button>
        </header>
        <div className="modal-body">
          <div className="notice-inline" role="note">{CHECKPOINT_SYNTHETIC_NOTICE} 只有同意状态为“已确认”且必填信息已完整时，才会开放普通接单、转介、跟进和模拟联系；高风险停止与人工交接通道不受限制。</div>
          <div className="field">
            <label htmlFor="checkpoint-consent">演练同意状态 <span aria-hidden="true">*</span></label>
            <select id="checkpoint-consent" value={form.consentStatus} onChange={(event) => setForm('checkpoint', { consentStatus: event.target.value as ConsentStatus })}>
              {CONSENT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <label className="synthetic-confirm">
            <input type="checkbox" checked={form.requiredInfoComplete} onChange={(event) => setForm('checkpoint', { requiredInfoComplete: event.target.checked })} />
            <span><strong>演练必填信息已完整</strong><small>仅表示虚构案例的必填字段齐备，不代表真实身份核验、法律同意或服务资格。</small></span>
          </label>
          <div className="field">
            <label htmlFor="checkpoint-note">检查点更新说明 <span aria-hidden="true">*</span></label>
            <textarea id="checkpoint-note" maxLength={160} placeholder="只写虚构演练说明，不要输入真实个人信息" value={form.note} onChange={(event) => setForm('checkpoint', { note: event.target.value })}></textarea>
          </div>
          <div className="hint">旧记录缺少检查点字段时按“未知 / 未完整”解释。重开记录会重置为“未知 / 未完整”。</div>
          {checkpointError.value ? <div className="form-error" role="alert">{checkpointError.value}</div> : null}
        </div>
        <footer className="modal-footer">
          <button className="button" type="button" onClick={closeAllDialogs}>取消</button>
          <button className="button primary" type="button" disabled={!form.note.trim()} onClick={saveCheckpoint}>保存检查点</button>
        </footer>
      </section>
    </div>
  )
}
