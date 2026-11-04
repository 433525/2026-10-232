import { INTAKE_PAUSED_NOTICE } from '../../../data/intake/store'
import { useAplusContext } from '../../context'

export default function ReopenDialog() {
  const {
    showReopen,
    selectedCase,
    store,
    forms,
    setForm,
    syntheticConfirmed,
    reopenError,
    createReopenedRecord,
    closeAllDialogs,
  } = useAplusContext()

  if (!showReopen.value) return null
  const form = forms.reopen.value

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeAllDialogs() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="reopen-title" aria-describedby="reopen-title-desc">
        <header className="modal-header">
          <div>
            <h2 id="reopen-title">建立关联重开演练记录</h2>
            <p id="reopen-title-desc">{selectedCase.value?.id} · 新建开放记录并关联原记录。</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={closeAllDialogs}>×</button>
        </header>
        <div className="modal-body">
          {store.intakePaused.value ? <div className="notice-inline" role="alert">{INTAKE_PAUSED_NOTICE} 请先恢复新登记再建立关联记录。</div> : null}
          <div className="notice-inline">重开会创建一条新的合成演练记录，原记录及时间线保留不变。自由文本无法技术性识别或拦截真实个人信息，只能填写虚构内容。</div>
          <div className="form-row">
            <div className="field"><label htmlFor="reopen-owner">负责人 <span aria-hidden="true">*</span></label><input id="reopen-owner" maxLength={40} value={form.owner} onChange={(event) => setForm('reopen', { owner: event.target.value })} /></div>
            <div className="field"><label htmlFor="reopen-due">演练跟进截止 <span aria-hidden="true">*</span></label><input id="reopen-due" type="datetime-local" value={form.dueAt} onChange={(event) => setForm('reopen', { dueAt: event.target.value })} /><div className="hint">默认值仅用于演练，不构成运营 SLA。</div></div>
          </div>
          <div className="field">
            <label htmlFor="reopen-next">下一步 <span aria-hidden="true">*</span></label>
            <input id="reopen-next" maxLength={120} value={form.nextStep} onChange={(event) => setForm('reopen', { nextStep: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="reopen-note">重开原因 <span aria-hidden="true">*</span></label>
            <textarea id="reopen-note" maxLength={160} placeholder="填写虚构演练原因" value={form.note} onChange={(event) => setForm('reopen', { note: event.target.value })}></textarea>
          </div>
          <label className="synthetic-confirm">
            <input type="checkbox" checked={syntheticConfirmed.value} onChange={(event) => { syntheticConfirmed.value = event.target.checked }} />
            <span><strong>我确认本次填写内容均为虚构演练数据</strong><small>此确认仅代表操作人确认使用虚构内容；本原型无法识别或拦截真实姓名、电话、地址、健康或儿童信息。</small></span>
          </label>
          {reopenError.value ? <div className="form-error" role="alert">{reopenError.value}</div> : null}
        </div>
        <footer className="modal-footer">
          <button className="button" type="button" onClick={closeAllDialogs}>取消</button>
          <button className="button primary" type="button" disabled={!syntheticConfirmed.value || store.intakePaused.value} onClick={createReopenedRecord}>创建关联记录</button>
        </footer>
      </section>
    </div>
  )
}
