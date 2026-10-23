import { COMPLAINT_SYNTHETIC_NOTICE, type DemoRole } from '../../../data/intake/intake'
import { useAplusContext } from '../../context'

export default function ComplaintDialog() {
  const {
    showComplaint,
    selectedCase,
    complaintTargetRoles,
    forms,
    setForm,
    currentDemoRoleLabel,
    complaintSyntheticConfirmed,
    complaintError,
    submitComplaint,
    closeAllDialogs,
  } = useAplusContext()

  if (!showComplaint.value) return null
  const form = forms.complaint.value

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeAllDialogs() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="complaint-title" aria-describedby="complaint-title-desc">
        <header className="modal-header">
          <div>
            <h2 id="complaint-title">提交演示投诉</h2>
            <p id="complaint-title-desc">{selectedCase.value?.id} · 独立投诉队列，不改写 case 风险时间线。</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={closeAllDialogs}>×</button>
        </header>
        <div className="modal-body">
          <div className="notice-inline" role="note">{COMPLAINT_SYNTHETIC_NOTICE} 任一演示角色可以针对其他角色提交；投诉不会改动风险标记、跟进时间线或 case 状态。</div>
          <div className="field">
            <label htmlFor="complaint-target">针对的演示角色 <span aria-hidden="true">*</span></label>
            <select id="complaint-target" value={form.targetRole} onChange={(event) => setForm('complaint', { targetRole: event.target.value as DemoRole })}>
              {complaintTargetRoles.value.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <div className="hint">提交人演示角色：{currentDemoRoleLabel.value}。不能针对提交人自己的演示角色提交。</div>
          </div>
          <div className="field">
            <label htmlFor="complaint-description">投诉说明 <span aria-hidden="true">*</span></label>
            <textarea id="complaint-description" maxLength={240} placeholder="只填写虚构演练内容，不要输入真实个人信息" value={form.description} onChange={(event) => setForm('complaint', { description: event.target.value })}></textarea>
          </div>
          <label className="synthetic-confirm">
            <input type="checkbox" checked={complaintSyntheticConfirmed.value} onChange={(event) => { complaintSyntheticConfirmed.value = event.target.checked }} />
            <span><strong>我确认本次投诉只使用演示角色和虚构内容</strong><small>这是演示角色校验，不是真实账号权限、实名举报或正式申诉流程。</small></span>
          </label>
          {complaintError.value ? <div className="form-error" role="alert">{complaintError.value}</div> : null}
        </div>
        <footer className="modal-footer">
          <button className="button" type="button" onClick={closeAllDialogs}>取消</button>
          <button className="button primary" type="button" disabled={!complaintSyntheticConfirmed.value || !form.description.trim()} onClick={submitComplaint}>提交到复核队列</button>
        </footer>
      </section>
    </div>
  )
}
