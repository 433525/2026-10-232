import { HIGH_RISK_HANDOFF_OUTCOMES, type HighRiskHandoffOutcome, type IntakeAction, type IntakeReasonCode } from '../../../data/intake/intake'
import { useAplusContext } from '../../context'

export default function TransitionDialog() {
  const {
    showTransition,
    selectedCase,
    actionOptions,
    actionLabels,
    forms,
    setForm,
    setTransitionAction,
    transitionReasonOptions,
    reasonLabels,
    needsReason,
    transitionNoteRequired,
    transitionActionBlockedReason,
    transitionTargetIsOpen,
    transitionErrors,
    transitionSubmitDisabled,
    syntheticConfirmed,
    applyTransition,
    closeAllDialogs,
  } = useAplusContext()

  if (!showTransition.value) return null

  const form = forms.transition.value
  const isHandoff = form.action === 'RECORD_HIGH_RISK_HANDOFF'
  const noteLabel = form.action === 'CONFIRM_REFERRAL'
    ? '虚构演练确认依据'
    : form.action === 'REFER'
      ? '虚构转介依据'
      : isHandoff
        ? '交接说明'
        : '处理说明'

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeAllDialogs() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="transition-title" aria-describedby="transition-title-desc">
        <header className="modal-header">
          <div>
            <h2 id="transition-title">{isHandoff ? '记录演练人工交接' : '更新登记状态'}</h2>
            <p id="transition-title-desc">{selectedCase.value?.id} · 所有变化将加入时间线。</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={closeAllDialogs}>×</button>
        </header>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="action-select">登记动作 <span aria-hidden="true">*</span></label>
            <select id="action-select" value={form.action ?? ''} onChange={(event) => setTransitionAction((event.target.value || null) as IntakeAction | null)}>
              <option value="">请选择登记动作</option>
              {actionOptions.value.map((action) => <option key={action} value={action}>{actionLabels[action]}</option>)}
            </select>
          </div>
          {isHandoff ? (
            <div className="field">
              <label htmlFor="handoff-outcome">交接结果 <span aria-hidden="true">*</span></label>
              <select id="handoff-outcome" value={form.handoffOutcome} onChange={(event) => setForm('transition', { handoffOutcome: event.target.value as HighRiskHandoffOutcome | '' })}>
                <option value="">请选择交接结果</option>
                {HIGH_RISK_HANDOFF_OUTCOMES.map((outcome) => <option key={outcome.value} value={outcome.value}>{outcome.label}</option>)}
              </select>
            </div>
          ) : null}
          {isHandoff && form.handoffOutcome === 'accepted' ? (
            <div className="field">
              <label htmlFor="handoff-owner">虚构接手人 <span aria-hidden="true">*</span></label>
              <input id="handoff-owner" maxLength={40} placeholder="例如：演练-复核席-02" value={form.handoffOwner} onChange={(event) => setForm('transition', { handoffOwner: event.target.value })} />
            </div>
          ) : null}
          {needsReason.value ? (
            <div className="field">
              <label htmlFor="reason-select">原因 <span aria-hidden="true">*</span></label>
              <select id="reason-select" value={form.reasonCode} onChange={(event) => setForm('transition', { reasonCode: event.target.value as IntakeReasonCode | '' })}>
                <option value="">请选择原因</option>
                {transitionReasonOptions.value.map((reason) => <option key={reason} value={reason}>{reasonLabels[reason]}</option>)}
              </select>
            </div>
          ) : null}
          {transitionActionBlockedReason.value ? <div className="notice-inline" role="alert">{transitionActionBlockedReason.value} 请先在详情面板更新登记检查点。</div> : null}
          {form.action === 'REFER' ? <div className="notice-inline">转介对象只填虚构演练名称；本原型不会发送转介，也不代表外部机构已收到。</div> : null}
          {form.action === 'CONFIRM_REFERRAL' ? <div className="notice-inline">此项只录入虚构演练确认依据，不会发送转介，也不代表外部机构真实接收。</div> : null}
          {form.action === 'REFERRAL_FAILED' ? <div className="notice-inline">只把记录退回待分诊并保留人工跟进；不会联系外部机构或发送通知。请填写虚构的责任人、下一步和截止时间。</div> : null}
          {isHandoff ? <div className="notice-inline" role="alert">每次保存只追加本地演练交接记录，可反复登记，状态保持开放；保存后会更新负责人、下一步和演练截止时间。选择“有人接手”时必须填写虚构接手人；选择“暂无人接手”时不得填写接手人。不会实际联系、通知或派单，风险标记不会解除，也不代表真实升级完成、风险已解除或服务已完成。真实高风险情形必须按运营方批准的流程处理。</div> : null}
          {form.action === 'CLOSE_FOLLOW_UP' ? <div className="notice-inline">结束的是本原型中的人工跟进记录，不代表服务已提供、完成或核实；请在说明中记录虚构的结束依据。</div> : null}
          {form.action === 'REFER' ? (
            <div className="field">
              <label htmlFor="referral-target">虚构演练转介对象 <span aria-hidden="true">*</span></label>
              <input id="referral-target" maxLength={80} placeholder="例如：演练-社区支持点 A" value={form.referralTarget} onChange={(event) => setForm('transition', { referralTarget: event.target.value })} />
            </div>
          ) : null}
          <div className="hint">自由文本无法技术性识别或阻止真实个人信息。这里只能填写虚构演练内容。</div>
          <div className="field">
            <label htmlFor="transition-note">{noteLabel}{transitionNoteRequired.value ? <span aria-hidden="true"> *</span> : null}</label>
            <textarea
              id="transition-note"
              maxLength={240}
              placeholder={transitionNoteRequired.value ? '请填写虚构演练说明，不要输入真实个人信息' : '只记录演练过程；不要输入真实个人信息'}
              value={form.note}
              onChange={(event) => setForm('transition', { note: event.target.value })}
            ></textarea>
          </div>
          {transitionTargetIsOpen.value ? (
            <div className="form-row">
              <div className="field"><label htmlFor="transition-owner">负责人 <span aria-hidden="true">*</span></label><input id="transition-owner" maxLength={40} value={form.owner} onChange={(event) => setForm('transition', { owner: event.target.value })} /></div>
              <div className="field"><label htmlFor="transition-due">演练跟进截止 <span aria-hidden="true">*</span></label><input id="transition-due" type="datetime-local" value={form.dueAt} onChange={(event) => setForm('transition', { dueAt: event.target.value })} /></div>
            </div>
          ) : null}
          {transitionTargetIsOpen.value ? (
            <div className="field">
              <label htmlFor="transition-next">下一步 <span aria-hidden="true">*</span></label>
              <input id="transition-next" maxLength={120} value={form.nextStep} onChange={(event) => setForm('transition', { nextStep: event.target.value })} />
            </div>
          ) : null}
          {transitionTargetIsOpen.value ? <div className="hint">{isHandoff ? '两种交接结果都必须填写负责人、下一步和演练截止时间；截止时间仅用于演练，不构成运营 SLA。' : '默认截止时间仅为演练值，不构成运营 SLA。'}</div> : null}
          <label className="synthetic-confirm">
            <input type="checkbox" checked={syntheticConfirmed.value} onChange={(event) => { syntheticConfirmed.value = event.target.checked }} />
            <span><strong>我确认本次填写内容均为虚构演练数据</strong><small>此确认仅代表操作人确认使用虚构内容；本原型无法识别或拦截真实姓名、电话、地址、健康或儿童信息。</small></span>
          </label>
          {transitionErrors.value.length ? <div className="form-error" role="alert">{transitionErrors.value.map((error) => <span key={error}>{error}</span>)}</div> : null}
        </div>
        <footer className="modal-footer">
          <button className="button" type="button" onClick={closeAllDialogs}>取消</button>
          <button className="button primary" type="button" disabled={transitionSubmitDisabled.value} onClick={applyTransition}>{isHandoff ? '保存交接记录' : '确认更新'}</button>
        </footer>
      </section>
    </div>
  )
}
