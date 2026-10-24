import { useAplusContext } from '../context'

export default function IntakeGate() {
  const { store, toggleIntakePaused } = useAplusContext()
  const paused = store.intakePaused.value

  return (
    <section className={`intake-gate${paused ? ' paused' : ''}`} aria-label="本机合成演练受理开关">
      <div className="intake-gate-mark" aria-hidden="true">{paused ? 'Ⅱ' : '▶'}</div>
      <div className="intake-gate-copy">
        <strong role="status" aria-live="polite">{paused ? '新登记已暂停 · 仅限本机合成演练' : '新登记开放 · 仅限本机合成演练'}</strong>
        <p>{paused ? '手动新建演练记录和社区桥登记已停止；已有记录仍可继续跟进。' : '可手动新建演练记录，或从社区桥登记合成求助。'} 此开关只影响当前浏览器的演练数据，不是生产受理权限，也不代表真实服务已停开、停服或已通知任何人。</p>
      </div>
      <button className={`button ${paused ? 'primary' : 'danger'}`} type="button" aria-pressed={paused} onClick={toggleIntakePaused}>{paused ? '恢复新登记' : '暂停新登记'}</button>
    </section>
  )
}
