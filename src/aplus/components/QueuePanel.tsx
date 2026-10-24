import { getSyntheticSourceChannelLabel, isCaseCheckpointReady, isOpenIntakeStatus } from '../../data/intake/intake'
import { useAplusContext } from '../context'
import { useTablist } from '../tablist'

export default function QueuePanel() {
  const {
    store,
    search,
    filters,
    activeFilter,
    filteredCases,
    setActiveFilter,
    setSearch,
    selectCase,
    resetQueueFilters,
    caseHasHighRisk,
    isCaseOverdue,
    formatDate,
  } = useAplusContext()
  const { rootRef, onKeyDown } = useTablist()
  const items = filteredCases.value

  return (
    <section className="panel queue-panel" aria-label="登记记录列表">
      <div className="queue-sticky">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">登记队列 <small role="status" aria-live="polite">{items.length} 条演练记录</small></h2>
            <p className="panel-subtitle">只用于演练内部收件和跟进路径</p>
          </div>
          <label className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              type="search"
              aria-label="搜索演练记录"
              placeholder="搜索演练内容"
              value={search.value}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="filters" ref={rootRef} role="tablist" aria-label="筛选记录" onKeyDown={onKeyDown}>
          {filters.map((filter) => (
            <button
              key={filter}
              className={`filter${activeFilter.value === filter ? ' active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeFilter.value === filter}
              onClick={() => setActiveFilter(filter)}
            >{filter}</button>
          ))}
        </div>
      </div>
      {items.length ? (
        <div className="queue-list">
          {items.map((item) => {
            const risk = caseHasHighRisk(item)
            const overdue = isCaseOverdue(item)
            return (
              <button
                key={item.id}
                className={`queue-item${store.selectedId.value === item.id ? ' selected' : ''}`}
                aria-current={store.selectedId.value === item.id ? 'true' : undefined}
                type="button"
                onClick={() => selectCase(item.id)}
              >
                <span className={`queue-marker${risk ? ' risk' : ''}${overdue ? ' warning' : ''}`}></span>
                <span className="queue-body">
                  <span className="queue-top"><span className="queue-id">{item.label} <small>· {item.id}</small></span><span className="queue-time">{formatDate(item.updatedAt)}</span></span>
                  <span className="queue-summary">{item.summary}</span>
                  <span className="queue-meta">
                    <span className={`tag ${risk ? 'risk' : (overdue ? 'warning' : 'status')}`}>{risk ? '停止初筛' : item.status}</span>
                    <span className="tag">{item.serviceType}</span>
                    <span className="tag">来源：{getSyntheticSourceChannelLabel(item.sourceChannel)}</span>
                    {isOpenIntakeStatus(item.status) && !isCaseCheckpointReady(item) ? <span className="tag warning">登记检查点未完成</span> : null}
                    {overdue && !risk ? <span className="tag warning">演练已逾期</span> : null}
                    <span className="queue-owner"><span className="mini-avatar">{item.owner?.slice(-1) || '—'}</span>{item.owner || '未指派'}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <p>没有匹配的演练记录。<br />更换筛选条件或新建合成案例。</p>
          <button className="button" type="button" onClick={resetQueueFilters}>清除筛选</button>
        </div>
      )}
    </section>
  )
}
