import { useAplusContext } from '../context'

export default function MobileNav() {
  const { store, openCreate, openCommunityBridge } = useAplusContext()

  return (
    <nav className="mobile-nav" aria-label="移动导航">
      <button className="active" type="button"><span>▦</span><span>登记</span></button>
      <button type="button" disabled={store.intakePaused.value} onClick={openCreate}><span>＋</span><span>新建</span></button>
      <button type="button" onClick={openCommunityBridge}><span>◎</span><span>社区求助</span></button>
      <a href="/"><span aria-hidden="true">◎</span><span>社区</span></a>
    </nav>
  )
}
