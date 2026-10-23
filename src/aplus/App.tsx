/**
 * A+ 受控登记演练入口（React 版）。
 *
 * 这里只做三件事：装配工作台、把唯一状态源下发到子树、按阅读顺序摆放版面。
 * 具体状态与动作见 `src/aplus/workbench.ts`，纯展示逻辑见 `src/aplus/presentation.ts`。
 *
 * 与 mvp `App.vue` 的差异：
 * - `provide` → `<AplusProvider>`；
 * - `onMounted` 的生命周期改由 `useEffect` 调用 `workbench.init()`；
 * - 新增 `AplusErrorBoundary`：React 没有 `app.config.errorHandler`，
 *   渲染期异常必须由错误边界接住，否则整页白屏。
 */
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { AplusProvider, useAplusContext } from './context'
import { reportAppError } from '../shared/error-reporting'
import AppSideRail from './components/AppSideRail'
import AppTopBar from './components/AppTopBar'
import PageHeading from './components/PageHeading'
import IntakeGate from './components/IntakeGate'
import SyntheticBanner from './components/SyntheticBanner'
import BackupTextPanel from './components/BackupTextPanel'
import MetricGrid from './components/MetricGrid'
import QueuePanel from './components/QueuePanel'
import CaseDetail from './components/CaseDetail'
import ComplaintPanel from './components/ComplaintPanel'
import MobileNav from './components/MobileNav'
import CommunityBridgeDialog from './components/dialogs/CommunityBridgeDialog'
import CreateCaseDialog from './components/dialogs/CreateCaseDialog'
import TransitionDialog from './components/dialogs/TransitionDialog'
import HighRiskStopDialog from './components/dialogs/HighRiskStopDialog'
import FollowUpDialog from './components/dialogs/FollowUpDialog'
import ContactSimulationDialog from './components/dialogs/ContactSimulationDialog'
import ReopenDialog from './components/dialogs/ReopenDialog'
import CheckpointDialog from './components/dialogs/CheckpointDialog'
import ComplaintDialog from './components/dialogs/ComplaintDialog'
import HelpDialog from './components/dialogs/HelpDialog'

interface BoundaryState { failed: boolean }

/** 渲染期异常的兜底：显示可读说明，同时派发全局提示事件。 */
class AplusErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportAppError('intake', `${error.message} @ ${info.componentStack ?? ''}`)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="app-shell">
          <main id="aplus-main" className="main-area">
            <div className="content">
              <section className="panel" role="alert" aria-label="界面异常">
                <div className="panel-head"><h2 className="panel-title">界面出现异常</h2></div>
                <div className="detail-content">
                  <div className="notice-inline">
                    当前本机演练数据未被修改。请刷新页面重试；若反复出现，可先导出备份再重置演练数据。
                  </div>
                  <div className="detail-actions">
                    <button className="button primary" type="button" onClick={() => window.location.reload()}>刷新页面</button>
                    <a className="button" href="/">返回社区演练</a>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      )
    }
    return this.props.children
  }
}

function AplusShell() {
  const { anyDialogOpen, importBackupFile, toastMessage, toastIsError, init } = useAplusContext()

  useEffect(() => init(), [init])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#aplus-main">跳到主内容</a>
      <AppSideRail />

      <main id="aplus-main" className="main-area" tabIndex={-1} inert={anyDialogOpen.value}>
        <input
          className="visually-hidden"
          type="file"
          tabIndex={-1}
          aria-label="选择 JSON 备份文件导入"
          accept="application/json,.json"
          data-aplus-backup-input=""
          onChange={importBackupFile}
        />
        <AppTopBar />

        <div className="content">
          <PageHeading />
          <IntakeGate />
          <SyntheticBanner />
          <BackupTextPanel />

          <div className="work-zone">
            <MetricGrid />
            <section className="work-grid">
              <QueuePanel />
              <CaseDetail />
            </section>
          </div>

          <ComplaintPanel />
          <MobileNav />
        </div>
      </main>

      <CommunityBridgeDialog />
      <CreateCaseDialog />
      <HighRiskStopDialog />
      <TransitionDialog />
      <FollowUpDialog />
      <ContactSimulationDialog />
      <ReopenDialog />
      <CheckpointDialog />
      <ComplaintDialog />
      <HelpDialog />

      {toastMessage.value ? (
        <div
          className="toast"
          role={toastIsError.value ? 'alert' : 'status'}
          aria-live={toastIsError.value ? 'assertive' : 'polite'}
        >{toastMessage.value}</div>
      ) : null}
    </div>
  )
}

export default function AplusApp() {
  return (
    <AplusErrorBoundary>
      <AplusProvider>
        <AplusShell />
      </AplusProvider>
    </AplusErrorBoundary>
  )
}
