import { getSyntheticSourceChannelLabel } from '../../../data/intake/intake'
import { INTAKE_PAUSED_NOTICE } from '../../../data/intake/store'
import { useAplusContext } from '../../context'

export default function CommunityBridgeDialog() {
  const {
    showCommunityBridge,
    store,
    communityReviewRequired,
    communityPendingMapping,
    communityDuplicateCandidates,
    communityDuplicateConfirmed,
    communityDuplicateExplanation,
    communitySyntheticConfirmed,
    communityBridgeError,
    communityReadStatus,
    communityReadMessage,
    communityReadResult,
    communityReadWarnings,
    communityPostsWithStatus,
    communityOrderStatusLabel,
    caseStatusLabel,
    readCommunityArchive,
    startCommunityRegistration,
    cancelCommunityReview,
    confirmCommunityRegistration,
    closeCommunityBridge,
  } = useAplusContext()

  if (!showCommunityBridge.value) return null

  const isReview = communityReviewRequired.value
  const readResult = communityReadResult.value
  const paused = store.intakePaused.value
  const recoveryRequired = store.storageStatus.value === 'recovery-required'

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeCommunityBridge() }}>
      <section className="modal bridge-modal" role="dialog" aria-modal="true" aria-labelledby="community-bridge-title" aria-describedby="community-bridge-title-desc">
        <header className="modal-header">
          <div>
            <h2 id="community-bridge-title">{isReview ? '人工重复复核' : '社区求助（本机演练）'}</h2>
            <p id="community-bridge-title-desc">{isReview ? '创建已暂停；请先查看候选记录并完成人工复核。' : '手动、单向读取本机社区存档；列出审核通过的合成求助（含待接单、进行中、已完成或已关闭等状态，仅展示且不写回社区帖）。'}</p>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={closeCommunityBridge}>×</button>
        </header>

        <div className="modal-body">
          {paused ? <div className="notice-inline" role="alert">{INTAKE_PAUSED_NOTICE} 已有记录仍可继续跟进；请先恢复新登记再提交社区桥登记。</div> : null}
          {isReview ? (
            <>
              <div className="notice-inline" role="alert">发现标签或摘要完全相同的已有记录。创建已暂停；不会合并、覆盖或删除候选，也不会写回社区帖。请先核对候选，再填写复核说明并确认。</div>
              <div className="hint">
                拟登记标签：{communityPendingMapping.value?.label}<br />
                拟登记摘要：{communityPendingMapping.value?.summary}
                {communityPendingMapping.value?.summaryTruncated ? <><br />A+ 摘要超过显示上限时会截断；完整原文仍保留在原社区帖子中。</> : null}
              </div>
              <div className="related-case-list">
                {communityDuplicateCandidates.value.map((candidate) => (
                  <article key={candidate.id} className="related-case bridge-candidate">
                    <span>
                      <strong>{candidate.id} · {candidate.label}</strong>
                      <small>{candidate.summary}</small>
                      <small>来源渠道：{getSyntheticSourceChannelLabel(candidate.sourceChannel)}{candidate.sourcePostId ? ` · 社区帖子 ID：${candidate.sourcePostId}` : ''}</small>
                    </span>
                    <span className="tag">{caseStatusLabel(candidate)}</span>
                  </article>
                ))}
              </div>
              <div className="hint">以上候选已在本页完整展示；不会打开候选而丢失本次填写。若仍需要登记，请填写复核说明并再次确认。</div>
              <label className="synthetic-confirm">
                <input type="checkbox" checked={communityDuplicateConfirmed.value} onChange={(event) => { communityDuplicateConfirmed.value = event.target.checked }} />
                <span><strong>我已人工核对以上候选记录，确认需要另建一条独立记录</strong><small>不会合并、覆盖或删除候选记录；新记录会保留来源帖子 ID、关联候选并追加复核时间线。</small></span>
              </label>
              <div className="field">
                <label htmlFor="community-duplicate-explanation">人工重复复核说明 <span aria-hidden="true">*</span></label>
                <textarea id="community-duplicate-explanation" maxLength={160} placeholder="简要说明为何仍需登记为独立记录" value={communityDuplicateExplanation.value} onChange={(event) => { communityDuplicateExplanation.value = event.target.value }}></textarea>
              </div>
              <label className="synthetic-confirm">
                <input type="checkbox" checked={communitySyntheticConfirmed.value} onChange={(event) => { communitySyntheticConfirmed.value = event.target.checked }} />
                <span><strong>我确认本次登记只使用本机合成演练数据</strong><small>不写回社区帖状态，不生成公开订单或服务承诺；本原型无法识别或拦截真实个人信息。</small></span>
              </label>
              {communityBridgeError.value ? <div className="form-error" role="alert">{communityBridgeError.value}</div> : null}
            </>
          ) : (
            <>
              <div className="notice-inline">这里只读取社区演练存档中审核通过的合成求助（含待接单、进行中、已完成或已关闭等状态，仅展示标签，不写回社区）。发布社区求助不会自动进入 A+；读取和登记都不会写回或改变社区帖状态，也不会生成公开订单、服务承诺或外发消息。</div>
              <div className="bridge-toolbar">
                <span className="bridge-status" role="status" aria-live="polite">{communityReadStatus.value}</span>
                <button className="button small" type="button" onClick={readCommunityArchive}>重新读取</button>
              </div>
              {recoveryRequired ? <div className="notice-inline" role="alert">当前 A+ 存档无法读取，登记会被阻止。请先处理 A+ 存档；本入口不会覆盖、重置或补写任何一端存档。</div> : null}
              {communityReadMessage.value ? <div className="empty-state" role="status">{communityReadMessage.value}</div> : null}
              {!communityReadMessage.value && readResult?.status === 'ready' ? (
                <>
                  {communityReadWarnings.value.length ? (
                    <div className="notice-inline" role="alert">
                      <strong>已跳过 {communityReadWarnings.value.length} 条无法解析的社区记录</strong>
                      {communityReadWarnings.value.slice(0, 5).map((warning) => <p key={warning}>{warning}</p>)}
                      {communityReadWarnings.value.length > 5 ? <p>另有 {communityReadWarnings.value.length - 5} 条未显示。</p> : null}
                      <p>原社区存档未被修改；跳过的记录不会出现在登记列表中。请先在社区页处理该存档后再试。</p>
                    </div>
                  ) : null}
                  {!communityPostsWithStatus.value.length ? (
                    <div className="empty-state" role="status">当前没有可登记的合成求助。社区存档保持原样，A+ 也未创建记录。</div>
                  ) : (
                    <>
                      <label className="synthetic-confirm">
                        <input type="checkbox" checked={communitySyntheticConfirmed.value} onChange={(event) => { communitySyntheticConfirmed.value = event.target.checked }} />
                        <span><strong>我确认本次登记只使用本机合成演练数据</strong><small>只登记下列合成求助；不会写回社区帖状态，也不会产生公开订单、服务承诺或真实外发。</small></span>
                      </label>
                      <div className="bridge-post-list">
                        {communityPostsWithStatus.value.map((item) => (
                          <article key={item.post.id} className="bridge-post">
                            <div className="bridge-post-head">
                              <strong>{item.post.title}</strong>
                              <span className="tag">社区状态：{communityOrderStatusLabel(item.post.orderStatus)}</span>
                              <span className={`tag ${item.registered ? 'status' : (paused ? 'warning' : '')}`}>{item.registered ? '已登记' : (paused ? '登记已暂停' : '可登记')}</span>
                            </div>
                            <p className="bridge-post-content">{item.post.content}</p>
                            {item.mapping.summaryTruncated ? <p className="hint">登记到 A+ 的摘要限制为 240 字，超出部分仍保留在原社区帖子中。</p> : null}
                            <div className="queue-meta">
                              <span className="tag">{item.post.category || '待分类'}</span>
                              {item.post.timeWindow ? <span className="tag">时段：{item.post.timeWindow}</span> : null}
                              {item.post.duration ? <span className="tag">时长：{item.post.duration}</span> : null}
                              {item.post.location ? <span className="tag">{item.post.location}</span> : null}
                            </div>
                            {item.post.specialNote ? <p className="hint">{item.post.specialNote}</p> : null}
                            <div className="bridge-post-foot">
                              <small>帖子 ID：{item.post.id}</small>
                              {item.registered
                                ? <span className="tag status">已登记 · {item.registered.id} · {caseStatusLabel(item.registered)}</span>
                                : <button className="button small primary" type="button" disabled={!communitySyntheticConfirmed.value || recoveryRequired || paused} onClick={() => startCommunityRegistration(item.post)}>登记到 A+ 队列</button>}
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : null}
              {communityBridgeError.value ? <div className="form-error" role="alert">{communityBridgeError.value}</div> : null}
            </>
          )}
        </div>

        {isReview ? (
          <footer className="modal-footer">
            <button className="button" type="button" onClick={cancelCommunityReview}>返回帖子列表</button>
            <button className="button primary" type="button" disabled={!communitySyntheticConfirmed.value || !communityDuplicateConfirmed.value || !communityDuplicateExplanation.value.trim() || paused} onClick={confirmCommunityRegistration}>确认仍创建独立记录</button>
          </footer>
        ) : (
          <footer className="modal-footer">
            <button className="button" type="button" onClick={closeCommunityBridge}>关闭</button>
          </footer>
        )}
      </section>
    </div>
  )
}
