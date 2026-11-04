import type { DemoRole } from '../../data/intake/intake'
import { useAplusContext } from '../context'

export default function AppTopBar() {
  const { store, roles, openHelp } = useAplusContext()

  return (
    <header className="topbar">
      <div className="topbar-identity" aria-hidden="true"><span className="topbar-logo">邻</span><span className="topbar-name">邻里服务台</span></div>
      <div className="crumb">社区服务 <span aria-hidden="true">/</span> A+ 登记队列</div>
      <div className="top-actions">
        <span className="demo-pill"><i className="demo-dot"></i><span className="demo-pill-text">合成数据演练</span></span>
        <label className="role-select"><span>角色</span>
          <select
            value={store.currentDemoRole.value}
            aria-label="切换演示角色"
            onChange={(event) => { store.currentDemoRole.value = event.target.value as DemoRole }}
          >
            {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        </label>
        <button className="icon-button" type="button" title="打开使用说明" aria-label="打开使用说明" onClick={openHelp}>i</button>
      </div>
    </header>
  )
}
