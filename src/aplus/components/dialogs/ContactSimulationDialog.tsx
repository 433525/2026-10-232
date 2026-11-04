import { CONTACT_SIMULATION_OUTCOMES, type ContactSimulationOutcome } from '../../../data/intake/intake'
import { useAplusContext } from '../../context'

export default function ContactSimulationDialog() {
  const {
    showContactSimulation,
    selectedCase,
    forms,
    setForm,
    syntheticConfirmed,
    contactSimulationError,
    saveContactSimulation,
    closeAllDialogs,
  } = useAplusContext()

  if (!showContactSimulation.value) return null
  const form = forms.contactSimulation.value

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeAllDialogs() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="contact-simulation-title" aria-describedby="contact-simulation-title-desc">
        <header className="modal-header">
          <div>
            <h2 id="contact-simulation-title">记录模拟联系结果</h2>
            <p id="contact-simulation-title-desc">{selectedCase.value?.id} · 保存结果会更新负责人、下一步和截止时间，并追加到时间线。</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={closeAllDialogs}>×</button>
        </header>
        <div className="modal-body">
          <div className="notice-inline" role="note">仅录入合成演练中的模拟结果，不代表真实联系。保存时还会用下方内容更新负责人、下一步和演练跟进截止时间，但不会改变登记状态。不要填写真实姓名、电话或其他个人信息；本操作不会联系任何人或发送通知。</div>
          <div className="field">
            <label htmlFor="contact-simulation-outcome">模拟结果 <span aria-hidden="true">*</span></label>
            <select id="contact-simulation-outcome" value={form.outcome} onChange={(event) => setForm('contactSimulation', { outcome: event.target.value as ContactSimulationOutcome })}>
              {CONTACT_SIMULATION_OUTCOMES.map((outcome) => <option key={outcome.value} value={outcome.value}>{outcome.label}</option>)}
            </select>
          </div>
          <div className="hint">自由文本无法技术性识别或阻止真实个人信息，只能填写虚构演练内容。</div>
          <div className="field">
            <label htmlFor="contact-simulation-note">演练说明 <span aria-hidden="true">*</span></label>
            <textarea id="contact-simulation-note" maxLength={160} placeholder="记录虚构的模拟结果和后续安排" value={form.note} onChange={(event) => setForm('contactSimulation', { note: event.target.value })}></textarea>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="contact-simulation-owner">负责人 <span aria-hidden="true">*</span></label><input id="contact-simulation-owner" maxLength={40} value={form.owner} onChange={(event) => setForm('contactSimulation', { owner: event.target.value })} /></div>
            <div className="field"><label htmlFor="contact-simulation-due">演练跟进截止 <span aria-hidden="true">*</span></label><input id="contact-simulation-due" type="datetime-local" value={form.dueAt} onChange={(event) => setForm('contactSimulation', { dueAt: event.target.value })} /><div className="hint">截止时间仅用于演练，不构成运营 SLA。</div></div>
          </div>
          <div className="field">
            <label htmlFor="contact-simulation-next">下一步 <span aria-hidden="true">*</span></label>
            <input id="contact-simulation-next" maxLength={120} value={form.nextStep} onChange={(event) => setForm('contactSimulation', { nextStep: event.target.value })} />
          </div>
          <label className="synthetic-confirm">
            <input type="checkbox" checked={syntheticConfirmed.value} onChange={(event) => { syntheticConfirmed.value = event.target.checked }} />
            <span><strong>我确认本次填写内容均为虚构演练数据</strong><small>此确认仅代表操作人确认使用虚构内容；本原型无法识别或拦截真实姓名、电话、地址、健康或儿童信息。</small></span>
          </label>
          {contactSimulationError.value ? <div className="form-error" role="alert">{contactSimulationError.value}</div> : null}
        </div>
        <footer className="modal-footer">
          <button className="button" type="button" onClick={closeAllDialogs}>取消</button>
          <button className="button primary" type="button" disabled={!syntheticConfirmed.value} onClick={saveContactSimulation}>保存模拟记录</button>
        </footer>
      </section>
    </div>
  )
}
