import { HIGH_RISK_STOP_NEXT_STEP, SYNTHETIC_SOURCE_CHANNELS, getSyntheticSourceChannelLabel, type SyntheticSourceChannel } from '../../../data/intake/intake'
import { INTAKE_PAUSED_NOTICE } from '../../../data/intake/store'
import { useAplusContext } from '../../context'

export default function CreateCaseDialog() {
  const {
    showCreate,
    store,
    forms,
    setForm,
    createError,
    duplicateCandidates,
    duplicateReviewRequired,
    duplicateConfirmed,
    duplicateExplanation,
    duplicateError,
    syntheticConfirmed,
    createRecord,
    cancelDuplicateReview,
    openDuplicateCandidate,
    caseStatusLabel,
    closeAllDialogs,
  } = useAplusContext()

  if (!showCreate.value) return null

  const form = forms.create.value
  const isDuplicate = duplicateReviewRequired.value

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeAllDialogs() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title" aria-describedby="create-title-desc">
        <header className="modal-header">
          <div>
            <h2 id="create-title">{isDuplicate ? '发现完全重复的登记内容' : '新建演练记录'}</h2>
            <p id="create-title-desc">{isDuplicate ? '创建已暂停；请人工核对候选记录。' : '只建立虚构案例，不连接居民入口或外部服务。'}</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={closeAllDialogs}>×</button>
        </header>
        <div className="modal-body">
          {store.intakePaused.value ? <div className="notice-inline" role="alert">{INTAKE_PAUSED_NOTICE} 请先恢复新登记再创建；已有记录仍可继续跟进。</div> : null}
          {isDuplicate ? (
            <>
              <div className="notice-inline" role="alert">发现标签或摘要完全相同的已有记录（仅比较去除首尾空白、折叠连续空白并忽略大小写后的文本，不做模糊匹配）。创建已暂停；不会合并、覆盖或删除任何记录。</div>
              <div className="hint">本次拟建记录的来源渠道演练标记：{getSyntheticSourceChannelLabel(form.sourceChannel)}。请对照下方候选记录的来源，判断是否为跨合成来源的重复登记。</div>
              <div className="related-case-list">
                {duplicateCandidates.value.map((candidate) => (
                  <button key={candidate.id} className="related-case" type="button" onClick={() => openDuplicateCandidate(candidate.id)}>
                    <span><strong>{candidate.id} · {candidate.label}</strong><small>{candidate.summary}</small><small>来源渠道：{getSyntheticSourceChannelLabel(candidate.sourceChannel)}</small></span>
                    <span className="tag">{caseStatusLabel(candidate)}</span>
                  </button>
                ))}
              </div>
              <div className="hint">打开候选记录会离开本次创建，当前填写内容不会保存。若仍需新建独立记录，请填写复核说明并再次确认。</div>
              <label className="synthetic-confirm">
                <input type="checkbox" checked={duplicateConfirmed.value} onChange={(event) => { duplicateConfirmed.value = event.target.checked }} />
                <span><strong>我已人工核对以上候选记录，确认需要另建一条独立记录</strong><small>不会合并、覆盖或删除候选记录；新记录会保留当前表单内容，关联候选记录并追加复核时间线。</small></span>
              </label>
              <div className="field">
                <label htmlFor="duplicate-explanation">人工重复复核说明 <span aria-hidden="true">*</span></label>
                <textarea id="duplicate-explanation" maxLength={160} placeholder="简要说明为何仍需另建独立记录" value={duplicateExplanation.value} onChange={(event) => { duplicateExplanation.value = event.target.value }}></textarea>
              </div>
              <label className="synthetic-confirm">
                <input type="checkbox" checked={syntheticConfirmed.value} onChange={(event) => { syntheticConfirmed.value = event.target.checked }} />
                <span><strong>我确认本次填写内容均为虚构演练数据</strong><small>此确认仅代表操作人确认使用虚构内容；本原型无法识别或拦截真实姓名、电话、地址、健康或儿童信息。</small></span>
              </label>
              {duplicateError.value ? <div className="form-error" role="alert">{duplicateError.value}</div> : null}
            </>
          ) : (
            <>
              <div className="notice-inline">本表单是自由文本，无法技术性识别或阻止真实信息。这里只能填写虚构案例；不得输入姓名、电话、精确地址、健康或儿童信息。高风险选项只演练“停止普通初筛”，不会触发通知。</div>
              <div className="field">
                <label htmlFor="record-label">演练标签</label>
                <input id="record-label" maxLength={30} placeholder="例如：演练-006" value={form.label} onChange={(event) => setForm('create', { label: event.target.value })} />
                <div className="hint">创建前会检查标签或摘要是否完全重复；发现候选时会暂停创建。</div>
              </div>
              <div className="field">
                <label htmlFor="record-summary">模拟登记摘要 <span aria-hidden="true">*</span></label>
                <textarea
                  id="record-summary"
                  maxLength={240}
                  required
                  aria-required="true"
                  aria-invalid={createError.value.includes('摘要')}
                  aria-describedby="create-record-error"
                  placeholder="只写一般性虚构演练描述"
                  value={form.summary}
                  onChange={(event) => setForm('create', { summary: event.target.value })}
                ></textarea>
                <div className="hint">自由文本字段没有真实信息检测或拦截功能。只能填写虚构内容。</div>
              </div>
              <div className="field">
                <label htmlFor="record-source">来源渠道演练标记 <span aria-hidden="true">*</span></label>
                <select id="record-source" required aria-required="true" value={form.sourceChannel} onChange={(event) => setForm('create', { sourceChannel: event.target.value as SyntheticSourceChannel })}>
                  {SYNTHETIC_SOURCE_CHANNELS.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
                </select>
                <div className="hint">仅标记本条合成演练记录的虚构来源，不会创建或连接真实居民入口、社区渠道、外部机构或受理系统。默认“人工录入演练”。</div>
              </div>
              <div className="form-row">
                <div className="field"><label htmlFor="record-owner">负责人 <span aria-hidden="true">*</span></label><input id="record-owner" maxLength={40} required aria-required="true" placeholder="演练-受理席-01" value={form.owner} onChange={(event) => setForm('create', { owner: event.target.value })} /></div>
                <div className="field"><label htmlFor="record-due">演练跟进截止 <span aria-hidden="true">*</span></label><input id="record-due" type="datetime-local" required aria-required="true" value={form.dueAt} onChange={(event) => setForm('create', { dueAt: event.target.value })} /><div className="hint">默认值仅用于演练，不构成运营 SLA。</div></div>
              </div>
              <label className="risk-choice">
                <input type="checkbox" checked={form.highRisk} onChange={(event) => setForm('create', { highRisk: event.target.checked })} />
                <span><strong>高风险停止初筛演练</strong><small>只添加模拟停止标记；不联系、不通知、不派单。</small></span>
              </label>
              {form.highRisk ? <div className="notice-inline" role="alert">{HIGH_RISK_STOP_NEXT_STEP}。本原型只记录演练标记，不会启动真实升级流程。</div> : null}
              {form.highRisk
                ? <div className="field"><label htmlFor="record-high-risk-note">停止初筛的演练依据 <span aria-hidden="true">*</span></label><textarea id="record-high-risk-note" maxLength={240} aria-required="true" placeholder="只写虚构演练依据，不要填写真实个人信息" value={form.highRiskNote} onChange={(event) => setForm('create', { highRiskNote: event.target.value })}></textarea></div>
                : <div className="field"><label htmlFor="record-next">下一步 <span aria-hidden="true">*</span></label><input id="record-next" maxLength={120} aria-required="true" value={form.nextStep} onChange={(event) => setForm('create', { nextStep: event.target.value })} /></div>}
              <label className="synthetic-confirm">
                <input type="checkbox" checked={syntheticConfirmed.value} onChange={(event) => { syntheticConfirmed.value = event.target.checked }} />
                <span><strong>我确认本次填写内容均为虚构演练数据</strong><small>此确认仅代表操作人确认使用虚构内容；本原型无法识别或拦截真实姓名、电话、地址、健康或儿童信息。</small></span>
              </label>
              {createError.value ? <div id="create-record-error" className="form-error" role="alert">{createError.value}</div> : null}
            </>
          )}
        </div>
        {isDuplicate ? (
          <footer className="modal-footer">
            <button className="button" type="button" onClick={cancelDuplicateReview}>返回修改</button>
            <button className="button primary" type="button" disabled={!syntheticConfirmed.value || !duplicateConfirmed.value || !duplicateExplanation.value.trim() || store.intakePaused.value} onClick={createRecord}>确认仍创建独立记录</button>
          </footer>
        ) : (
          <footer className="modal-footer">
            <button className="button" type="button" onClick={closeAllDialogs}>取消</button>
            <button className="button primary" type="button" disabled={!syntheticConfirmed.value || store.intakePaused.value} onClick={createRecord}>创建演练记录</button>
          </footer>
        )}
      </section>
    </div>
  )
}
