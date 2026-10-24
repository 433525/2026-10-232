import { useAplusContext } from '../context'

export default function AppSideRail() {
  const { anyDialogOpen, currentDemoRoleLabel } = useAplusContext()

  return (
    <aside className="side-rail" aria-label="主导航" inert={anyDialogOpen.value}>
      <div className="brand">
        <div className="brand-mark">邻</div>
        <div className="brand-name">邻里服务台<small>COMMUNITY OPERATIONS</small></div>
      </div>
      <div className="nav-label">A+ 内部演练原型</div>
      <nav className="nav-list">
        <button className="nav-item active" type="button" aria-current="page"><span className="nav-icon" aria-hidden="true">▦</span><span>登记队列</span></button>
      </nav>
      <div className="nav-label nav-label-secondary">相关入口</div>
      <nav className="nav-list" aria-label="相关入口">
        <a className="nav-item nav-link" href="/">
          <span className="nav-icon" aria-hidden="true">◎</span><span className="nav-label">社区演练</span><span className="nav-arrow" aria-hidden="true">↗</span>
        </a>
      </nav>
      <div className="rail-spacer"></div>
      <div className="pilot-card">
        <strong>受控演练空间</strong>
        <p>所有记录均为虚构场景。此页面不接收居民申请，也不发送联系或服务通知。</p>
      </div>
      <div className="user-chip">
        <div className="avatar">演</div>
        <div><strong>{currentDemoRoleLabel.value}</strong><small>仅供流程演练</small></div>
      </div>
    </aside>
  )
}
