import { COMPLAINT_SYNTHETIC_NOTICE } from '../../data/intake/intake'
import { useAplusContext } from '../context'
import { useTablist } from '../tablist'

export default function ComplaintPanel() {
  const {
    store,
    complaintFilter,
    filteredComplaints,
    selectedComplaintId,
    selectedComplaint,
    selectedComplaintCase,
    selectedComplaintReviewBlockedReason,
    canReviewSelectedComplaint,
    currentRoleReviewLabel,
    currentDemoRoleLabel,
    complaintReviewResolution,
    complaintReviewError,
    selectComplaint,
    reviewSelectedComplaint,
    openComplaintCase,
    roleLabel,
    formatDate,
  } = useAplusContext()
  const { rootRef, onKeyDown } = useTablist()

  const complaints = filteredComplaints.value
  const selected = selectedComplaint.value

  return (
    <section className="panel complaint-panel" aria-label="独立投诉复核队列" tabIndex={-1}>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">投诉复核队列 <small>{store.pendingComplaints.value.length} 条待复核 · 独立存档</small></h2>
          <p className="panel-subtitle">{COMPLAINT_SYNTHETIC_NOTICE} 投诉不会改写 case 风险标记或跟进时间线。</p>
        </div>
        <div className="filters" ref={rootRef} role="tablist" aria-label="筛选投诉" onKeyDown={onKeyDown}>
          <button className={`filter${complaintFilter.value === '待复核' ? ' active' : ''}`} type="button" role="tab" aria-selected={complaintFilter.value === '待复核'} onClick={() => { complaintFilter.value = '待复核' }}>投诉待复核</button>
          <button className={`filter${complaintFilter.value === '全部投诉' ? ' active' : ''}`} type="button" role="tab" aria-selected={complaintFilter.value === '全部投诉'} onClick={() => { complaintFilter.value = '全部投诉' }}>全部投诉</button>
        </div>
      </div>
      <div className="complaint-grid">
        {complaints.length ? (
          <div className="queue-list" aria-label="投诉列表">
            {complaints.map((complaint) => (
              <button
                key={complaint.id}
                className={`queue-item${selectedComplaintId.value === complaint.id ? ' selected' : ''}`}
                type="button"
                onClick={() => selectComplaint(complaint.id)}
              >
                <span className={`queue-marker${complaint.status === '待复核' ? ' warning' : ''}`}></span>
                <span className="queue-body">
                  <span className="queue-top"><span className="queue-id">{complaint.id} <small>· {complaint.caseId}</small></span><span className="queue-time">{formatDate(complaint.submittedAt)}</span></span>
                  <span className="queue-summary">{complaint.description}</span>
                  <span className="queue-meta">
                    <span className={`tag ${complaint.status === '待复核' ? 'warning' : 'status'}`}>{complaint.status}</span>
                    <span className="tag">提交：{roleLabel(complaint.submittedByRole)}</span>
                    <span className="tag">被投诉：{roleLabel(complaint.targetRole)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">当前没有{complaintFilter.value === '待复核' ? '待复核' : ''}投诉记录。<br />可在上方登记详情中提交演示投诉。</div>
        )}
        <div className="complaint-detail">
          {selected ? (
            <>
              <div className="detail-head">
                <div className="detail-title-row">
                  <div>
                    <div className="detail-id">{selected.id} <span>·</span> {selected.caseId}</div>
                    <h3 className="detail-title">演示投诉复核详情</h3>
                  </div>
                  <span className={`tag ${selected.status === '待复核' ? 'warning' : 'status'}`}>{selected.status}</span>
                </div>
              </div>
              <div className="detail-content">
                <div className="notice-inline">{COMPLAINT_SYNTHETIC_NOTICE} 当前演示角色：{currentDemoRoleLabel.value}。</div>
                <div className="info-grid">
                  <div className="info-item"><span>针对的演示角色</span><strong>{roleLabel(selected.targetRole)}</strong></div>
                  <div className="info-item"><span>提交人演示角色</span><strong>{roleLabel(selected.submittedByRole)}</strong></div>
                  <div className="info-item"><span>提交时间</span><strong>{formatDate(selected.submittedAt)}</strong></div>
                  <div className="info-item"><span>复核时间</span><strong>{selected.reviewedAt ? formatDate(selected.reviewedAt) : '—'}</strong></div>
                  <div className="info-item"><span>复核人演示角色</span><strong>{selected.reviewerRole ? roleLabel(selected.reviewerRole) : '—'}</strong></div>
                  <div className="info-item"><span>关联 case</span><strong>{selected.caseId}</strong></div>
                </div>
                <div className="detail-section">
                  <div className="section-label">投诉说明</div>
                  <div className="next-step-card"><p>{selected.description}</p></div>
                </div>
                <div className="detail-section">
                  <div className="section-label">处理说明</div>
                  <div className="next-step-card"><p>{selected.resolution || '尚未填写。'}</p></div>
                </div>
                <div className="detail-actions">
                  {selectedComplaintCase.value ? <button className="button" type="button" onClick={() => openComplaintCase(selected.caseId)}>打开关联 case（不改时间线）</button> : null}
                </div>
                {selected.status === '待复核' ? (
                  <div className="detail-section">
                    <div className="section-label">完成复核</div>
                    <div className="hint">{currentRoleReviewLabel.value}</div>
                    {selectedComplaintReviewBlockedReason.value ? <div className="notice-inline" role="alert">{selectedComplaintReviewBlockedReason.value}</div> : null}
                    <div className="field">
                      <label htmlFor={`complaint-resolution-${selected.id}`}>处理说明 <span aria-hidden="true">*</span></label>
                      <textarea
                        id={`complaint-resolution-${selected.id}`}
                        maxLength={240}
                        placeholder="填写演练复核处理说明；不会改动 case 风险时间线"
                        value={complaintReviewResolution.value}
                        onChange={(event) => { complaintReviewResolution.value = event.target.value }}
                      ></textarea>
                    </div>
                    {complaintReviewError.value ? <div className="form-error" role="alert">{complaintReviewError.value}</div> : null}
                    <button className="button primary" type="button" disabled={!canReviewSelectedComplaint.value || !complaintReviewResolution.value.trim()} onClick={reviewSelectedComplaint}>确认复核</button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="detail-placeholder"><div><strong>选择一条投诉</strong><p>查看独立投诉详情并完成演示复核。</p></div></div>
          )}
        </div>
      </div>
    </section>
  )
}
