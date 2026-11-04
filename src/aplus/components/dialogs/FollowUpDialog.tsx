import { useAplusContext } from '../../context'

export default function FollowUpDialog() {
  const { showFollowUp, selectedRiskNotice, forms, setForm, syntheticConfirmed, followUpError, saveFollowUp, closeAllDialogs } = useAplusContext()

  if (!showFollowUp.value) return null
  const form = forms.followUp.value

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeAllDialogs() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="followup-title" aria-describedby="followup-title-desc">
        <header className="modal-header">
          <div>
            <h2 id="followup-title">调整人工跟进</h2>
            <p id="followup-title-desc">变更记录会追加到时间线，不会自动联系任何人。</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={closeAllDialogs}>×</button>
        </header>
        <div className="modal-body">
          {selectedRiskNotice.value ? <div className="notice-inline">{selectedRiskNotice.value}</div> : null}
          <div className="notice-inline">自由文本无法技术性识别或阻止真实个人信息。这里只能填写虚构演练内容。</div>
          <div className="form-row">
            <div className="field"><label htmlFor="followup-owner">负责人 <span aria-hidden="true">*</span></label><input id="followup-owner" maxLength={40} value={form.owner} onChange={(event) => setForm('followUp', { owner: event.target.value })} /></div>
            <div className="field"><label htmlFor="followup-due">演练跟进截止 <span aria-hidden="true">*</span></label><input id="followup-due" type="datetime-local" value={form.dueAt} onChange={(event) => setForm('followUp', { dueAt: event.target.value })} /><div className="hint">截止时间仅用于演练，不构成运营 SLA。</div></div>
          </div>
          <div className="field">
            <label htmlFor="followup-next">下一步 <span aria-hidden="true">*</span></label>
            <input id="followup-next" maxLength={120} value={form.nextStep} onChange={(event) => setForm('followUp', { nextStep: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="followup-note">调整原因 <span aria-hidden="true">*</span></label>
            <textarea id="followup-note" maxLength={160} placeholder="说明为什么调整负责人或下一步" value={form.note} onChange={(event) => setForm('followUp', { note: event.target.value })}></textarea>
          </div>
          <label className="synthetic-confirm">
            <input type="checkbox" checked={syntheticConfirmed.value} onChange={(event) => { syntheticConfirmed.value = event.target.checked }} />
            <span><strong>我确认本次填写内容均为虚构演练数据</strong><small>此确认仅代表操作人确认使用虚构内容；本原型无法识别或拦截真实姓名、电话、地址、健康或儿童信息。</small></span>
          </label>
          {followUpError.value ? <div className="form-error" role="alert">{followUpError.value}</div> : null}
        </div>
        <footer className="modal-footer">
          <button className="button" type="button" onClick={closeAllDialogs}>取消</button>
          <button className="button primary" type="button" disabled={!syntheticConfirmed.value} onClick={saveFollowUp}>保存跟进</button>
        </footer>
      </section>
    </div>
  )
}
