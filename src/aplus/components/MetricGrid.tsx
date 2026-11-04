import { useAplusContext } from '../context'

export default function MetricGrid() {
  const { store, activeFilter, setActiveFilter } = useAplusContext()
  const filter = activeFilter.value

  const cards = [
    {
      key: '待分诊' as const,
      label: '待分诊记录',
      value: store.triageCases.value.length,
      foot: '收件或初筛后待分流 · 点击筛选',
      alert: false,
    },
    {
      key: '初筛中' as const,
      label: '常规初筛中',
      value: store.screeningCases.value.length,
      foot: '高风险记录停止普通初筛 · 点击筛选',
      alert: false,
    },
    {
      key: '演练逾期' as const,
      label: '逾期演练待办',
      value: store.overdueCases.value.length,
      foot: '仅提醒人工跟进，不自动外联 · 点击筛选',
      alert: store.overdueCases.value.length > 0,
    },
    {
      key: '高风险' as const,
      label: '高风险停止标记',
      value: store.highRiskCases.value.length,
      foot: '按机构已批准的外部流程人工处理 · 点击筛选',
      alert: store.highRiskCases.value.length > 0,
    },
  ]

  return (
    <section className="metric-grid" aria-label="演练统计">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          className={[
            'metric-card',
            card.alert ? 'alert' : '',
            filter === card.key ? 'selected' : '',
          ].filter(Boolean).join(' ')}
          aria-pressed={filter === card.key}
          onClick={() => setActiveFilter(card.key)}
        >
          <div className="metric-label">{card.label}</div>
          <div className="metric-value">{card.value}<small>条</small></div>
          <div className="metric-foot">{card.foot}</div>
        </button>
      ))}
    </section>
  )
}
