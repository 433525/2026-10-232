import { useAplusContext } from '../context'

export default function PageHeading() {
  const { store, jumpToComplaints, openCommunityBridge, openCreate } = useAplusContext()
  const pendingComplaints = store.pendingComplaints.value.length

  return (
    <section className="page-heading">
      <div>
        <div className="eyebrow">A+ · INTERNAL INTAKE</div>
        <h1>受控登记队列</h1>
        <p className="page-subtitle">登记、分诊与人工跟进演练。服务类型暂记为「待判定 / 未分类」。</p>
      </div>
      <div className="heading-actions">
        <button className="button" type="button" aria-label={`跳转到投诉复核队列，${pendingComplaints} 条待复核`} onClick={jumpToComplaints}>投诉复核 <span className="action-count">{pendingComplaints}</span></button>
        <button className="button" type="button" onClick={openCommunityBridge}>社区求助（本机演练）</button>
        <button className="button primary" type="button" disabled={store.intakePaused.value} title={store.intakePaused.value ? '本机合成演练已暂停新登记' : ''} onClick={openCreate}><span>＋</span> 新建演练记录</button>
      </div>
    </section>
  )
}
