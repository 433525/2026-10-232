import {
  CHECKPOINT_SYNTHETIC_NOTICE,
  getCaseConsentStatus,
  getConsentStatusLabel,
  getContactSimulationOutcomeLabel,
  getHighRiskHandoffOutcomeLabel,
  getSyntheticSourceChannelLabel,
  isCaseRequiredInfoComplete,
  isOpenIntakeStatus,
} from '../../data/intake/intake'
import { useAplusContext } from '../context'

export default function CaseDetail() {
  const {
    store,
    roles,
    reasonLabels,
    selectedCase,
    selectedRiskNotice,
    selectedHighRiskHandoffCount,
    linkedCases,
    selectedCaseCheckpointReady,
    selectedCaseCheckpointBlockedReason,
    actionOptions,
    lifecycleText,
    backToQueue,
    selectRelatedCase,
    copySelectedCaseLink,
    openTransition,
    openCheckpoint,
    openFollowUp,
    openContactSimulation,
    openHighRiskStop,
    openReopen,
    openComplaint,
    caseHasHighRisk,
    caseStatusLabel,
    eventHeading,
    eventChangeValue,
    isCaseOverdue,
    formatDate,
  } = useAplusContext()

  const item = selectedCase.value

  return (
    <section className="panel detail-panel" aria-label="登记记录详情" tabIndex={-1}>
      {item ? (
        <>
          <header className="print-header">
            <strong>邻里服务台 · A+ 受控登记演练</strong>
            <span>合成数据 · 非真实受理记录 · {item.id}</span>
          </header>
          <div className="detail-head">
            <button className="detail-back" type="button" onClick={backToQueue}>← 返回队列</button>
            <div className="detail-title-row">
              <div>
                <div className="detail-id">{item.id} <span>·</span> {item.label}</div>
                <h2 className="detail-title">{item.summary}</h2>
              </div>
              <div className="detail-head-side">
                <span className={`tag ${caseHasHighRisk(item) ? 'risk' : (isCaseOverdue(item) ? 'warning' : 'status')}`}>{caseHasHighRisk(item) ? '停止普通初筛 · 风险未解除' : item.status}</span>
                <button className="detail-link" type="button" title="复制可分享的当前记录链接" onClick={copySelectedCaseLink}>复制链接</button>
                <button className="detail-link" type="button" title="提交演示投诉到独立复核队列" onClick={openComplaint}>提交投诉</button>
              </div>
            </div>
            <div className="detail-date">登记 {formatDate(item.createdAt)} <span>·</span> 更新 {formatDate(item.updatedAt)}</div>
          </div>
          <div className="detail-content">
            <div className="detail-actions" aria-label="记录操作">
              {actionOptions.value.length ? <button className="button primary" type="button" onClick={openTransition}>{caseHasHighRisk(item) ? '记录演练人工交接 →' : '更新登记状态 →'}</button> : null}
              {isOpenIntakeStatus(item.status) && !caseHasHighRisk(item) ? <button className="button" type="button" onClick={openCheckpoint}>更新登记检查点</button> : null}
              {isOpenIntakeStatus(item.status) && !caseHasHighRisk(item)
                ? <button className="button" type="button" disabled={!selectedCaseCheckpointReady.value} title={selectedCaseCheckpointBlockedReason.value || '调整负责人与下一步'} onClick={openFollowUp}>调整跟进</button>
                : null}
              {isOpenIntakeStatus(item.status) && !caseHasHighRisk(item)
                ? <button className="button" type="button" disabled={!selectedCaseCheckpointReady.value} title={selectedCaseCheckpointBlockedReason.value || '记录模拟联系结果'} onClick={openContactSimulation}>记录模拟联系</button>
                : null}
              {isOpenIntakeStatus(item.status) && !caseHasHighRisk(item) ? <button className="button danger" type="button" title="标记高风险并停止常规初筛" onClick={openHighRiskStop}>标记高风险</button> : null}
              {!isOpenIntakeStatus(item.status) && item.status !== '已提供信息' && !caseHasHighRisk(item)
                ? <button className="button" type="button" disabled={store.intakePaused.value} title={store.intakePaused.value ? '本机合成演练已暂停新登记' : '建立关联的重开演练记录'} onClick={openReopen}>建立关联重开</button>
                : null}
              {caseHasHighRisk(item)
                ? <span className="tag risk">已停止普通初筛；风险未解除；可反复记录演练人工交接{selectedHighRiskHandoffCount.value ? `（已记录 ${selectedHighRiskHandoffCount.value} 次）` : ''}</span>
                : null}
              {!actionOptions.value.length && !isOpenIntakeStatus(item.status) && !caseHasHighRisk(item) ? <span className="tag">当前原记录已结束并保留</span> : null}
            </div>
            <div className={`checkpoint-callout${selectedCaseCheckpointReady.value ? ' ready' : ''}`} role="note">
              <strong>登记检查点：{selectedCaseCheckpointReady.value ? '已完成' : '未完成'} · 合成演练字段</strong>
              <p>{CHECKPOINT_SYNTHETIC_NOTICE}</p>
              {!selectedCaseCheckpointReady.value
                ? <p>{selectedCaseCheckpointBlockedReason.value} 高风险停止与人工交接通道始终可用。</p>
                : null}
            </div>
            {selectedRiskNotice.value ? (
              <div className="risk-callout" role="alert">
                <span className="risk-symbol">⚠</span>
                <div><strong>高风险停止标记：请停止普通初筛（风险未解除）</strong><p>{selectedRiskNotice.value}</p></div>
              </div>
            ) : null}
            {item.riskFlags.length ? (
              <div className="risk-flag-list" aria-label="演练风险标记">
                {item.riskFlags.map((flag) => (
                  <article key={flag.code} className="risk-flag-item">
                    <strong>{flag.label} <small>· 演练标记</small></strong>
                    <p>{flag.note}</p>
                  </article>
                ))}
              </div>
            ) : null}
            {item.status.includes('转介') ? (
              <div className="notice-inline" role="note">
                本原型没有向外部机构发送转介，也没有收到真实回执。此状态仅记录虚构演练，不代表外部机构已接收或已提供服务。
              </div>
            ) : null}

            <div className="detail-section">
              <div className="section-label">记录概况</div>
              <div className="info-grid">
                <div className="info-item"><span>服务类型</span><strong>{item.serviceType}</strong></div>
                <div className="info-item"><span>来源渠道演练标记</span><strong>{getSyntheticSourceChannelLabel(item.sourceChannel)}</strong></div>
                {item.sourcePostId ? <div className="info-item"><span>社区来源帖子 ID</span><strong>{item.sourcePostId}</strong></div> : null}
                <div className="info-item"><span>演练同意检查点</span><strong>{getConsentStatusLabel(getCaseConsentStatus(item))}</strong></div>
                <div className="info-item"><span>必填信息检查点</span><strong>{isCaseRequiredInfoComplete(item) ? '已完整（演练）' : '未完整 / 未登记（演练）'}</strong></div>
                <div className="info-item"><span>登记检查点</span><strong>{selectedCaseCheckpointReady.value ? '已完成（可进行普通流程）' : '未完成（普通流程已锁定）'}</strong></div>
                <div className="info-item"><span>当前状态</span><strong>{caseStatusLabel(item)}</strong></div>
                <div className="info-item"><span>负责人</span><strong>{item.owner || '—'}</strong></div>
                <div className="info-item"><span>演练跟进截止</span><strong>{formatDate(item.dueAt)}{isCaseOverdue(item) ? ' · 演练已逾期' : ''}</strong></div>
              </div>
            </div>

            <div className="detail-section">
              <div className="section-label">下一步</div>
              <div className="next-step-card"><strong>{lifecycleText.value}</strong><p>{item.nextStep || '当前没有开放跟进动作。'}</p></div>
            </div>

            {linkedCases.value.length ? (
              <div className="detail-section">
                <div className="section-label">关联演练记录</div>
                <div className="related-case-list">
                  {linkedCases.value.map((linked) => (
                    <button key={linked.id} className="related-case" type="button" onClick={() => selectRelatedCase(linked.id)}>
                      <span><strong>{linked.id} · {linked.label}</strong><small>{linked.summary}</small></span>
                      <span className="tag">{caseStatusLabel(linked)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="detail-section">
              <div className="section-label">跟进时间线 <span className="tag">追加记录</span></div>
              <div className="timeline">
                {[...item.events].reverse().map((event) => (
                  <div key={event.id} className="timeline-item">
                    <span className="timeline-dot"></span>
                    <div className="timeline-text">
                      <strong>{eventHeading(event)}</strong>
                      {event.fromStatus && event.toStatus && event.fromStatus !== event.toStatus
                        ? <small>{event.fromStatus} → {event.toStatus}</small>
                        : null}
                      {event.reasonCode ? <small>原因：{reasonLabels[event.reasonCode]}</small> : null}
                      {event.contactOutcome ? <small>结果：{getContactSimulationOutcomeLabel(event.contactOutcome)}</small> : null}
                      {event.handoffOutcome ? <small>人工交接结果：{getHighRiskHandoffOutcomeLabel(event.handoffOutcome)}</small> : null}
                      {event.handoffOutcome === 'accepted' && event.handoffOwner ? <small>虚构接手人：{event.handoffOwner}</small> : null}
                      {event.kind === 'checkpoint-update'
                        ? <small>检查点：同意 {getConsentStatusLabel(event.consentStatus)} · 必填信息 {event.requiredInfoComplete ? '已完整' : '未完整'}</small>
                        : null}
                      {event.duplicateCandidateIds?.length ? <small>候选记录：{event.duplicateCandidateIds.join('、')}</small> : null}
                      {(event.changes ?? []).map((change) => (
                        <small key={change.field}>
                          {change.label}：{eventChangeValue(change.field, change.before)} → {eventChangeValue(change.field, change.after)}
                        </small>
                      ))}
                      <span>{event.note}</span>
                      <small>{formatDate(event.at)} · {event.actorRole ? roles.find((role) => role.value === event.actorRole)?.label : '系统标记'}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="detail-placeholder">
          <div><div className="detail-placeholder-icon">⌁</div><strong>选择一条演练记录</strong><p>查看记录状态、人工下一步和追加式跟进时间线。</p></div>
        </div>
      )}
    </section>
  )
}
