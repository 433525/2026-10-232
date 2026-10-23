import { HIGH_RISK_STOP_NEXT_STEP } from '../../../data/intake/intake'
import { useAplusContext } from '../../context'

export default function HighRiskStopDialog() {
  const { showHighRiskStop, selectedCase, highRiskNote, syntheticConfirmed, highRiskError, saveHighRiskStop, closeAllDialogs } = useAplusContext()

  if (!showHighRiskStop.value) return null

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeAllDialogs() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="high-risk-title" aria-describedby="high-risk-title-desc">
        <header className="modal-header">
          <div>
            <h2 id="high-risk-title">停止常规初筛</h2>
            <p id="high-risk-title-desc">{selectedCase.value?.id} · 追加高风险演练标记。</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={closeAllDialogs}>×</button>
        </header>
        <div className="modal-body">
          <div className="notice-inline" role="alert">{HIGH_RISK_STOP_NEXT_STEP}。保存后将锁定常规初筛、模拟联系和普通状态更新，仅允许反复记录演练人工交接结果。不会实际联系、通知或调度；风险标记不会解除，也不代表真实升级已完成。</div>
          <div className="hint">自由文本无法技术性识别或阻止真实个人信息，只能填写虚构演练内容。</div>
          <div className="field">
            <label htmlFor="high-risk-note">停止初筛的演练依据 <span aria-hidden="true">*</span></label>
            <textarea id="high-risk-note" maxLength={240} placeholder="记录虚构演练中的标记依据" value={highRiskNote.value} onChange={(event) => { highRiskNote.value = event.target.value }}></textarea>
          </div>
          <label className="synthetic-confirm">
            <input type="checkbox" checked={syntheticConfirmed.value} onChange={(event) => { syntheticConfirmed.value = event.target.checked }} />
            <span><strong>我确认本次填写内容均为虚构演练数据</strong><small>此确认仅代表操作人确认使用虚构内容；本原型无法识别或拦截真实姓名、电话、地址、健康或儿童信息。</small></span>
          </label>
          {highRiskError.value ? <div className="form-error" role="alert">{highRiskError.value}</div> : null}
        </div>
        <footer className="modal-footer">
          <button className="button" type="button" onClick={closeAllDialogs}>取消</button>
          <button className="button danger" type="button" disabled={!syntheticConfirmed.value || !highRiskNote.value.trim()} onClick={saveHighRiskStop}>停止初筛并记录</button>
        </footer>
      </section>
    </div>
  )
}
