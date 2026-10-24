/**
 * A+ 受控登记演练的工作台状态与动作 —— React 版。
 *
 * 这是 A+ 端唯一的状态源：在 `App.tsx` 取一次，经 `context.tsx` 下发给子树。
 * 子组件只读取绑定、调用动作，不各自持有副本，避免多份 show* 开关或表单草稿
 * 产生不一致。
 *
 * ## 与 mvp `aplus/workbench.ts` 的对应关系
 *
 * 原实现是 Vue 组合式函数（`useAplusWorkbench`），依赖 `ref / reactive / computed /
 * watch / nextTick / onMounted` 六个框架能力。移植时**不重写业务判断**，只替换这六项：
 *
 * | Vue | 本文件 |
 * |---|---|
 * | `ref` / `computed` | `src/data/reactive.ts` 的同名原语（语义等价，惰性求值） |
 * | `reactive(obj)` | `ref<Obj>` + `setForm(name, patch)` 整体替换（写回即通知订阅者） |
 * | `watch(activeFilter, write)` | 在 `setActiveFilter` 内显式写偏好 |
 * | `watch(() => transitionForm.action, ...)` | 在 `setTransitionAction` 内同步 reasonCode |
 * | `watch([filter, search, filteredCases], ...)` | `ensureSelection()`，在筛选/搜索/增删后调用 |
 * | `nextTick()` | `afterPaint()`（双 rAF，等 React 提交并绘制） |
 * | `onMounted` / `onBeforeUnmount` | `init()` 返回清理函数，由 App 的 effect 调用 |
 *
 * 约定：
 * - 动作函数保持幂等或可重复调用，失败时只写错误字段与提示，不抛异常；
 * - 不直接操作业务存储，全部经 intake store 完成，便于单测与后续替换后端。
 *
 * 结构：状态（筛选 / 对话框 / 表单 / 存档 / 社区桥）→ 派生（队列 / 详情 / 流转 / 投诉）
 * → 交互（焦点 / 滚动 / 深链 / 受理开关）→ 动作（备份 / 表单复位 / 提交 / 投诉 / 社区桥）
 * → 生命周期。
 */
import { computed, createReactiveStore, ref, type Ref } from '../data/reactive'
import {
  COMPLAINT_REVIEWER_ROLES,
  DEFAULT_SYNTHETIC_SOURCE_CHANNEL,
  getCaseCheckpointBlockedReason,
  getCaseConsentStatus,
  getHighRiskStopScreeningNotice,
  getIntakeActionBlockedReason,
  getIntakeActionTarget,
  getAllowedIntakeActions,
  getSyntheticSourceChannelLabel,
  isCaseCheckpointReady,
  isCaseRequiredInfoComplete,
  isComplaintReviewerRole,
  isIntakeOverdue,
  isOpenIntakeStatus,
  intakeActionRequiresReason,
  type ConsentStatus,
  type ContactSimulationOutcome,
  type DemoRole,
  type HighRiskHandoffOutcome,
  type IntakeAction,
  type IntakeCase,
  type IntakeReasonCode,
  type SyntheticSourceChannel,
} from '../data/intake/intake'
import { INTAKE_PAUSED_NOTICE, useIntakeStore, type NewIntakeInput } from '../data/intake/store'
import { MAX_BACKUP_BYTES } from '../data/intake/intake-backup'
import { dateStamp, downloadTextFile } from '../shared/download'
import {
  INTAKE_FILTERS,
  readIntakeFilter,
  writeIntakeFilter,
  type IntakeFilter,
} from '../data/intake/filter-preference'
import {
  mapCommunityHelpPostToIntake,
  readCommunityHelpPosts,
  type CommunityHelpPost,
  type CommunityHelpReadResult,
} from '../data/intake/community-bridge'
import { resolveIntakeSourceLink } from '../data/intake/community-intake-progress'
import { APP_ERROR_EVENT, type AppErrorDetail } from '../shared/error-reporting'
import { copyText } from '../shared/clipboard'
import { buildShareUrl, onRoutePop, readRouteParam, writeRoute } from '../shared/route-state'
import { createDialogFocus } from './dialog-focus'
import {
  ACTION_LABELS,
  DEMO_ROLES,
  REASON_LABELS,
  caseHasHighRisk,
  caseStatusLabel,
  communityOrderStatusLabel,
  defaultDueDate,
  eventChangeValue,
  eventHeading,
  formatDate,
  roleLabel,
  toLocalInput,
  transitionReasonOptions,
} from './presentation'
import { createToast } from './toast'

// ── 表单形状 ──────────────────────────────────────────────────────────
export interface CreateFormState {
  label: string
  summary: string
  sourceChannel: SyntheticSourceChannel
  owner: string
  nextStep: string
  dueAt: string
  highRisk: boolean
  highRiskNote: string
}

export interface TransitionFormState {
  action: IntakeAction | null
  reasonCode: IntakeReasonCode | ''
  referralTarget: string
  note: string
  owner: string
  nextStep: string
  dueAt: string
  handoffOutcome: HighRiskHandoffOutcome | ''
  handoffOwner: string
}

export interface FollowUpFormState {
  owner: string
  nextStep: string
  dueAt: string
  note: string
}

export interface ContactSimulationFormState {
  outcome: ContactSimulationOutcome
  owner: string
  nextStep: string
  dueAt: string
  note: string
}

export interface ReopenFormState {
  owner: string
  nextStep: string
  dueAt: string
  note: string
}

export interface CheckpointFormState {
  consentStatus: ConsentStatus
  requiredInfoComplete: boolean
  note: string
}

export interface ComplaintFormState {
  targetRole: DemoRole
  description: string
}

interface FormMap {
  create: CreateFormState
  transition: TransitionFormState
  followUp: FollowUpFormState
  contactSimulation: ContactSimulationFormState
  reopen: ReopenFormState
  checkpoint: CheckpointFormState
  complaint: ComplaintFormState
}

const CREATE_DEFAULTS: CreateFormState = {
  label: '',
  summary: '',
  sourceChannel: DEFAULT_SYNTHETIC_SOURCE_CHANNEL,
  owner: '演练-受理席-01',
  nextStep: '完成常规初筛并记录分流依据',
  dueAt: defaultDueDate(),
  highRisk: false,
  highRiskNote: '',
}

const TRANSITION_DEFAULTS: TransitionFormState = {
  action: null,
  reasonCode: '',
  referralTarget: '',
  note: '',
  owner: '',
  nextStep: '',
  dueAt: '',
  handoffOutcome: '',
  handoffOwner: '',
}

const FOLLOW_UP_DEFAULTS: FollowUpFormState = { owner: '', nextStep: '', dueAt: '', note: '' }

const CONTACT_DEFAULTS: ContactSimulationFormState = {
  outcome: 'not-reached',
  owner: '',
  nextStep: '',
  dueAt: '',
  note: '',
}

const REOPEN_DEFAULTS: ReopenFormState = {
  owner: '演练-受理席-01',
  nextStep: '重新核对演练记录并安排分诊',
  dueAt: defaultDueDate(),
  note: '',
}

const CHECKPOINT_DEFAULTS: CheckpointFormState = {
  consentStatus: 'unknown',
  requiredInfoComplete: false,
  note: '',
}

const COMPLAINT_DEFAULTS: ComplaintFormState = { targetRole: 'demo-review', description: '' }

/** 等 React 提交并完成绘制；用于“状态已变 → 需要量 DOM”的场合。 */
function afterPaint(callback: () => void): void {
  if (typeof requestAnimationFrame !== 'function') {
    window.setTimeout(callback, 0)
    return
  }
  requestAnimationFrame(() => requestAnimationFrame(callback))
}

/** 移动端断点与 mvp 的 `compactLayout()` 一致。 */
function compactLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1020px)').matches
}

export const aplusWorkbench = createReactiveStore('aplus-workbench', () => {
  // `useIntakeStore` 在 React 侧是单例对象（见 data/reactive.ts 的说明），不是函数。
  const store = useIntakeStore
  const { toastMessage, toastIsError, notify } = createToast()

  /**
   * 强制通知订阅者的计数器。intake store 的写入（选记录、切角色、改存档）
   * 只触发它自己的订阅，A+ 界面需要跟着重渲染，因此在这里转接一次。
   */
  const revision = ref(0)
  store.subscribe(() => {
    revision.value += 1
  })

  // ── 队列筛选与详情选择 ────────────────────────────────────────────────
  const search = ref('')
  const activeFilter = ref<IntakeFilter>(readIntakeFilter())
  const filters = INTAKE_FILTERS

  // ── 对话框可见性 ─────────────────────────────────────────────────────
  const showCreate = ref(false)
  const showTransition = ref(false)
  const showFollowUp = ref(false)
  const showContactSimulation = ref(false)
  const showReopen = ref(false)
  const showHighRiskStop = ref(false)
  const showCheckpoint = ref(false)
  const showHelp = ref(false)
  const showComplaint = ref(false)
  const showCommunityBridge = ref(false)

  const anyDialogOpen = computed(() => (
    showHelp.value
    || showCreate.value
    || showTransition.value
    || showFollowUp.value
    || showContactSimulation.value
    || showReopen.value
    || showHighRiskStop.value
    || showCheckpoint.value
    || showComplaint.value
    || showCommunityBridge.value
  ))

  // ── 表单与校验错误 ───────────────────────────────────────────────────
  const syntheticConfirmed = ref(false)
  const createError = ref('')
  const duplicateCandidates = ref<IntakeCase[]>([])
  const duplicateReviewRequired = ref(false)
  const duplicateConfirmed = ref(false)
  const duplicateExplanation = ref('')
  const duplicateError = ref('')
  const transitionErrors = ref<string[]>([])
  const followUpError = ref('')
  const contactSimulationError = ref('')
  const reopenError = ref('')
  const highRiskError = ref('')
  const highRiskNote = ref('')
  const checkpointError = ref('')
  const complaintError = ref('')
  const complaintSyntheticConfirmed = ref(false)
  const complaintReviewResolution = ref('')
  const complaintReviewError = ref('')

  const forms = {
    create: ref<CreateFormState>({ ...CREATE_DEFAULTS }),
    transition: ref<TransitionFormState>({ ...TRANSITION_DEFAULTS }),
    followUp: ref<FollowUpFormState>({ ...FOLLOW_UP_DEFAULTS }),
    contactSimulation: ref<ContactSimulationFormState>({ ...CONTACT_DEFAULTS }),
    reopen: ref<ReopenFormState>({ ...REOPEN_DEFAULTS }),
    checkpoint: ref<CheckpointFormState>({ ...CHECKPOINT_DEFAULTS }),
    complaint: ref<ComplaintFormState>({ ...COMPLAINT_DEFAULTS }),
  }

  /** 表单整体替换：既保证 React 侧看到新引用，也触发订阅者重渲染。 */
  function setForm<K extends keyof FormMap>(name: K, patch: Partial<FormMap[K]>): void {
    const target = forms[name] as Ref<FormMap[K]>
    target.value = { ...target.value, ...patch }
  }

  /** `transitionForm.action` 的联动：选“结束跟进”时预置原因，离开时清掉。 */
  function setTransitionAction(action: IntakeAction | null): void {
    const next: Partial<TransitionFormState> = { action }
    if (action === 'CLOSE_FOLLOW_UP') next.reasonCode = 'FOLLOW_UP_CONCLUDED'
    else if (forms.transition.value.reasonCode === 'FOLLOW_UP_CONCLUDED') next.reasonCode = ''
    setForm('transition', next)
  }

  // ── 备份与存档状态 ───────────────────────────────────────────────────
  // 注意：这里**不保存 DOM 节点引用**。mvp 用 Vue 模板 ref 拿隐藏文件输入，
  // React 的等价做法（内联 callback ref 写 store）会在每次渲染时被 React
  // 以 null→node 重新调用，写 store 又触发重渲染，形成无限更新（React #185）。
  // 改为按固定属性查询，行为等价且在弹层重挂载后依然有效。
  const backupInputSelector = 'input[type="file"][data-aplus-backup-input]'
  const backupText = ref('')
  const unreadableDownloaded = ref(false)

  const storageStatusLabel = computed(() => ({
    ready: '本机存档将在首次修改时创建',
    saved: '已保存在当前浏览器',
    'memory-only': '当前不可用本机存档',
    'save-error': '本机存档写入失败',
    'recovery-required': '发现无法读取的旧存档，尚未覆盖',
    conflict: '其他窗口已更新存档，请重新载入',
  }[store.storageStatus.value]))
  const lastSavedLabel = computed(() => store.lastSavedAt.value
    ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(store.lastSavedAt.value))
    : '')

  // ── 社区桥（单向读取本机社区存档）────────────────────────────────────
  const communityReadResult = ref<CommunityHelpReadResult | null>(null)
  const communitySyntheticConfirmed = ref(false)
  const communityPendingPost = ref<CommunityHelpPost | null>(null)
  const communityPendingInput = ref<NewIntakeInput | null>(null)
  const communityDuplicateCandidates = ref<IntakeCase[]>([])
  const communityDuplicateConfirmed = ref(false)
  const communityDuplicateExplanation = ref('')
  const communityBridgeError = ref('')

  const communityRegisteredCases = computed(() => {
    const candidates = new Map<string, { intakeCase: IntakeCase; reopenedDepth: number }>()
    for (const item of store.cases.value) {
      const sourceLink = resolveIntakeSourceLink(item, store.cases.value)
      if (!sourceLink) continue
      const previous = candidates.get(sourceLink.sourcePostId)
      if (
        !previous
        || sourceLink.reopenedDepth > previous.reopenedDepth
        || (sourceLink.reopenedDepth === previous.reopenedDepth
          && Date.parse(item.updatedAt) >= Date.parse(previous.intakeCase.updatedAt))
      ) {
        candidates.set(sourceLink.sourcePostId, { intakeCase: item, reopenedDepth: sourceLink.reopenedDepth })
      }
    }
    return new Map([...candidates].map(([sourcePostId, candidate]) => [sourcePostId, candidate.intakeCase]))
  })
  const communityReviewRequired = computed(() =>
    communityPendingInput.value !== null && communityDuplicateCandidates.value.length > 0,
  )
  const communityPendingMapping = computed(() =>
    communityPendingPost.value ? mapCommunityHelpPostToIntake(communityPendingPost.value) : null,
  )
  const communityReadStatus = computed(() => {
    const result = communityReadResult.value
    if (!result) return '尚未读取社区存档'
    if (result.status === 'missing') return '未找到社区演练存档'
    if (result.status === 'error') return '社区演练存档读取失败'
    const base = result.posts.length === 0
      ? '存档已读取，但没有可登记的合成求助'
      : `已读取 ${result.posts.length} 条合成求助 · 存档保存于 ${formatDate(result.savedAt)}`
    return result.warnings.length
      ? `${base}；跳过 ${result.warnings.length} 条无法解析的记录`
      : base
  })
  const communityReadWarnings = computed(() => (
    communityReadResult.value?.status === 'ready' ? communityReadResult.value.warnings : []
  ))
  const communityReadMessage = computed(() => {
    const result = communityReadResult.value
    return result && result.status !== 'ready' ? result.message : ''
  })
  const communityPostsWithStatus = computed(() => {
    const result = communityReadResult.value
    if (!result || result.status !== 'ready') return []
    return result.posts.map((post) => ({
      post,
      mapping: mapCommunityHelpPostToIntake(post),
      registered: communityRegisteredCases.value.get(post.id) ?? null,
    }))
  })

  // ── 角色与文案 ──────────────────────────────────────────────────────
  const roles = DEMO_ROLES
  const currentDemoRoleLabel = computed(() =>
    roles.find((role) => role.value === store.currentDemoRole.value)?.label ?? roles[0].label,
  )
  const reasonLabels = REASON_LABELS
  const actionLabels = ACTION_LABELS

  // ── 派生：队列 ──────────────────────────────────────────────────────
  const isCaseOverdue = (item: IntakeCase) => isIntakeOverdue(item, new Date(store.clockNow.value).toISOString())

  const filteredCases = computed(() => {
    const normalizedSearch = search.value.trim().toLocaleLowerCase()
    return store.cases.value.filter((item) => {
      const matchesSearch = !normalizedSearch || [
        item.id,
        item.label,
        item.summary,
        item.status,
        item.owner ?? '',
        getSyntheticSourceChannelLabel(item.sourceChannel),
        item.sourcePostId ?? '',
      ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch))
      if (!matchesSearch) return false
      if (activeFilter.value === '待处理') return isOpenIntakeStatus(item.status)
      if (activeFilter.value === '待分诊') return store.triageCases.value.some((candidate) => candidate.id === item.id)
      if (activeFilter.value === '初筛中') return store.screeningCases.value.some((candidate) => candidate.id === item.id)
      if (activeFilter.value === '演练逾期') return isCaseOverdue(item)
      if (activeFilter.value === '高风险') return caseHasHighRisk(item)
      if (activeFilter.value === '已结束') return !isOpenIntakeStatus(item.status)
      return true
    })
  })

  // ── 派生：详情 ──────────────────────────────────────────────────────
  const selectedCase = computed(() => store.selectedCase.value)
  const selectedRiskNotice = computed(() => selectedCase.value ? getHighRiskStopScreeningNotice(selectedCase.value) : null)
  const selectedHighRiskHandoffCount = computed(() => selectedCase.value?.events.filter(
    (event) => event.kind === 'risk-handoff',
  ).length ?? 0)
  const linkedCases = computed(() => {
    const item = selectedCase.value
    if (!item) return []
    const ids = [...new Set([item.reopenedFromId, ...(item.relatedCaseIds ?? [])].filter((id): id is string => !!id))]
    return ids
      .map((id) => store.cases.value.find((candidate) => candidate.id === id))
      .filter((candidate): candidate is IntakeCase => !!candidate)
  })
  const selectedCaseCheckpointReady = computed(() =>
    selectedCase.value ? isCaseCheckpointReady(selectedCase.value) : false,
  )
  const selectedCaseCheckpointBlockedReason = computed(() =>
    selectedCase.value ? getCaseCheckpointBlockedReason(selectedCase.value) : null,
  )
  const actionOptions = computed<IntakeAction[]>(() => {
    if (!selectedCase.value) return []
    const allowed = getAllowedIntakeActions(selectedCase.value.status)
    if (selectedRiskNotice.value) {
      return allowed.filter((action) => action === 'RECORD_HIGH_RISK_HANDOFF')
    }
    return allowed.filter((action) => action !== 'RECORD_HIGH_RISK_HANDOFF')
  })
  const lifecycleText = computed(() => {
    const item = selectedCase.value
    if (!item) return '选择左侧记录查看跟进时间线与可用动作。'
    if (caseHasHighRisk(item)) return selectedHighRiskHandoffCount.value > 0
      ? `已停止常规初筛；已记录 ${selectedHighRiskHandoffCount.value} 次演练人工交接，风险标记仍未解除。本原型不实际联系、通知或派单，也不代表风险已解除、服务已完成或外部人员已真实接手。`
      : '已停止常规初筛；仅可反复记录演练人工交接，不会实际联系或通知，风险标记不会解除。'
    if (item.status === '已结束（服务结果未核实）') return '人工跟进已结束；本记录没有核实服务是否提供或完成。'
    if (item.status === '已提供信息') return '已提供信息可直接进入待分诊；本机状态不表示真实服务已提供或完成。'
    if (!isOpenIntakeStatus(item.status)) return '该记录已结束登记跟进；如需再次受理，请按运营流程建立关联记录。'
    if (item.status === '待补充') return '仅等待模拟信息补充；超时只标记内部待办，不自动联系或关闭。'
    if (item.status.includes('转介')) return '转介状态只记录外部确认，不代表服务已完成。'
    return '每条未结记录都需有负责人、下一步和截止时间。'
  })

  // ── 派生：状态流转表单 ──────────────────────────────────────────────
  const transitionReasonOptionsList = computed<IntakeReasonCode[]>(() =>
    transitionReasonOptions(forms.transition.value.action),
  )

  const transitionActionBlockedReason = computed(() => {
    const action = forms.transition.value.action
    return action && selectedCase.value ? getIntakeActionBlockedReason(action, selectedCase.value) : null
  })
  const needsReason = computed(() => {
    const action = forms.transition.value.action
    return !!action && intakeActionRequiresReason(action)
  })
  const transitionNoteRequired = computed(() => {
    const form = forms.transition.value
    return form.action === 'CONFIRM_REFERRAL'
      || form.action === 'REFER'
      || form.action === 'REFERRAL_FAILED'
      || form.action === 'CLOSE_FOLLOW_UP'
      || form.action === 'RECORD_HIGH_RISK_HANDOFF'
      || (needsReason.value && form.reasonCode === 'OTHER')
  })
  const transitionSubmitDisabled = computed(() => {
    const form = forms.transition.value
    return !form.action
      || !syntheticConfirmed.value
      || !!transitionActionBlockedReason.value
      || (needsReason.value && !form.reasonCode)
      || (transitionNoteRequired.value && !form.note.trim())
      || (form.action === 'REFER' && !form.referralTarget.trim())
      || (form.action === 'RECORD_HIGH_RISK_HANDOFF' && !form.handoffOutcome)
      || (form.action === 'RECORD_HIGH_RISK_HANDOFF'
        && form.handoffOutcome === 'accepted'
        && !form.handoffOwner.trim())
  })
  const transitionTargetIsOpen = computed(() => {
    const form = forms.transition.value
    return form.action && selectedCase.value
      ? isOpenIntakeStatus(getIntakeActionTarget(form.action, selectedCase.value.status))
      : false
  })

  // ── 派生：投诉复核 ──────────────────────────────────────────────────
  const complaintFilter = ref<'待复核' | '全部投诉'>('待复核')
  const selectedComplaintId = ref<string | null>(null)
  const filteredComplaints = computed(() => store.complaints.value.filter((item) =>
    complaintFilter.value === '待复核' ? item.status === '待复核' : true,
  ))
  const selectedComplaint = computed(() =>
    filteredComplaints.value.find((item) => item.id === selectedComplaintId.value) ?? null,
  )
  const selectedComplaintCase = computed(() => {
    const complaint = selectedComplaint.value
    return complaint ? store.cases.value.find((item) => item.id === complaint.caseId) ?? null : null
  })
  const selectedComplaintReviewBlockedReason = computed(() => {
    const complaint = selectedComplaint.value
    if (!complaint) return '请选择一条投诉记录。'
    if (complaint.status !== '待复核') return '该投诉已完成复核。'
    const availableReviewers = COMPLAINT_REVIEWER_ROLES.filter(
      (role) => role !== complaint.submittedByRole && role !== complaint.targetRole,
    )
    if (!availableReviewers.length) return '该历史投诉组合没有可用复核角色，无法复核；请重建投诉或重置演练数据。'
    const role = store.currentDemoRole.value
    if (!isComplaintReviewerRole(role)) return '只有 demo-review 或 demo-referral 演示角色可以复核。'
    if (role === complaint.submittedByRole) return '投诉提交人不能复核自己的投诉。'
    if (role === complaint.targetRole) return '被投诉角色不能复核针对自己的投诉。'
    return ''
  })
  const canReviewSelectedComplaint = computed(() => selectedComplaintReviewBlockedReason.value === '')
  const complaintTargetRoles = computed(() => roles.filter((role) => role.value !== store.currentDemoRole.value))
  const currentRoleReviewLabel = computed(() => isComplaintReviewerRole(store.currentDemoRole.value)
    ? '当前演示角色可复核（仍受提交人 / 被投诉角色回避限制）'
    : '当前演示角色不可复核投诉')

  // ── 对话框焦点与 Esc ────────────────────────────────────────────────
  const dialogFocus = createDialogFocus({
    isOpen: () => anyDialogOpen.value,
    onEscape: () => closeAllDialogs(),
  })

  // ── 选择与滚动 ──────────────────────────────────────────────────────
  /** 筛选或搜索变化后，保证详情区始终指向可见记录（对应 mvp 的三依赖 watch）。 */
  function ensureSelection(): void {
    const list = filteredCases.value
    if (!list.length) return
    const current = store.selectedId.value
    if (current && list.some((item) => item.id === current)) return
    store.select(list[0].id)
  }

  function setActiveFilter(value: IntakeFilter): void {
    if (activeFilter.value === value) return
    activeFilter.value = value
    writeIntakeFilter(value)
    ensureSelection()
  }

  function setSearch(value: string): void {
    if (search.value === value) return
    search.value = value
    ensureSelection()
  }

  /** 队列筛选无结果时的一键恢复，不改变任何记录。 */
  function resetQueueFilters(): void {
    activeFilter.value = '全部记录'
    search.value = ''
  }

  /** 选中后若该记录不在当前筛选内，退回全部记录（对应 `watch(selectedCase?.id)`）。 */
  function keepSelectionVisible(id: string): void {
    if (filteredCases.value.some((item) => item.id === id)) return
    activeFilter.value = '全部记录'
    search.value = ''
  }

  /** 移动端：选中记录后把详情带入视口，避免用户手动滚过整条队列。 */
  function selectCase(id: string): void {
    store.select(id)
    if (store.selectedId.value === id) writeRoute({ case: id }, { replace: true })
    if (!compactLayout()) return
    afterPaint(() => {
      const panel = document.querySelector<HTMLElement>('.detail-panel')
      if (!panel) return
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
      panel.focus({ preventScroll: true })
    })
  }

  /** 移动端：从详情返回队列，并把焦点交还给当前选中项。 */
  function backToQueue(): void {
    document.querySelector<HTMLElement>('.queue-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    afterPaint(() => {
      document.querySelector<HTMLElement>('.queue-item.selected')?.focus({ preventScroll: true })
    })
  }

  /** 投诉队列在页面底部，用页头入口直达并聚焦，避免长页滚动。 */
  function jumpToComplaints(): void {
    complaintFilter.value = '待复核'
    afterPaint(() => {
      const panel = document.querySelector<HTMLElement>('.complaint-panel')
      if (!panel) return
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
      panel.focus({ preventScroll: true })
    })
  }

  function selectRelatedCase(id: string): void {
    activeFilter.value = '全部记录'
    search.value = ''
    store.select(id)
    if (store.selectedId.value === id) writeRoute({ case: id }, { replace: true })
  }

  // ── 深链 ────────────────────────────────────────────────────────────
  /**
   * 读取 `?case=` 深链。记录不存在时清理参数并说明，避免分享链接停在空详情。
   * 记录选择本身已持久化在本机，这里主要服务于跨浏览器/跨设备的分享场景。
   */
  function applyCaseRouteFromLocation(options: { initial?: boolean } = {}): void {
    const id = readRouteParam('case')
    if (!id) return
    if (!store.cases.value.some((item) => item.id === id)) {
      writeRoute({ case: null }, { replace: true })
      if (options.initial) notify('链接中的演练记录不存在，已显示队列首条。')
      return
    }
    if (store.selectedId.value !== id) store.select(id)
    keepSelectionVisible(id)
  }

  /** 复制当前记录的深链；不含搜索词、筛选或任何居民信息。 */
  async function copySelectedCaseLink(): Promise<void> {
    const item = selectedCase.value
    if (!item) return
    const url = buildShareUrl({ case: item.id })
    const copied = url ? await copyText(url) : false
    notify(copied ? '已复制当前记录的演练链接。' : '复制失败：请从地址栏复制链接。')
  }

  // ── 受理开关 ────────────────────────────────────────────────────────
  function notifyAfterMutation(message: string): void {
    notify(store.storageStatus.value === 'memory-only'
      ? `${message}（仅保存在当前会话，刷新后不会保留）`
      : message)
  }

  function toggleIntakePaused(): void {
    const nextPaused = !store.intakePaused.value
    const result = store.setIntakePaused(nextPaused)
    if (!result.ok) {
      notify(result.errors.join(' '))
      return
    }
    notifyAfterMutation(nextPaused
      ? '已暂停本机合成演练的新登记；已有记录仍可继续跟进'
      : '已恢复本机合成演练的新登记')
  }

  // ── 备份 ────────────────────────────────────────────────────────────
  function exportBackup(): void {
    try {
      downloadTextFile(`a-plus-synthetic-backup-${dateStamp()}.json`, store.exportBackup())
      notify('已请求下载；请确认文件已保存，未下载时可查看备份文本')
    } catch {
      notify('当前演练数据超过备份容量上限；请先减少记录或时间线内容')
    }
  }

  function viewBackupText(): void {
    try {
      backupText.value = store.exportBackup()
    } catch {
      backupText.value = ''
      notify('当前演练数据超过备份容量上限；请先减少记录或时间线内容')
    }
  }

  function reloadLatestSnapshot(): void {
    const result = store.reloadFromStorage()
    if (!result.ok) {
      notify(result.errors.join(' '))
      return
    }
    closeAllDialogs()
    activeFilter.value = '全部记录'
    search.value = ''
    notify(result.errors.length ? result.errors.join(' ') : '已载入最新演练存档')
  }

  function exportUnreadableBackup(): void {
    const backup = store.exportUnreadableBackup()
    if (backup === null) {
      notify('没有可导出的旧存档')
      return
    }
    downloadTextFile('a-plus-unreadable-local-save.txt', backup, 'text/plain;charset=utf-8')
    unreadableDownloaded.value = true
    notify('已下载无法读取的旧存档原文')
  }

  function chooseBackup(): void {
    document.querySelector<HTMLInputElement>(backupInputSelector)?.click()
  }

  async function importBackupFile(event: { target: EventTarget | null }): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (store.storageStatus.value === 'recovery-required' && !unreadableDownloaded.value) {
      notify('当前有无法读取的旧存档；请先点“下载无法读取的旧存档”保存原文，再导入备份')
      return
    }
    try {
      if (file.size > MAX_BACKUP_BYTES) {
        notify('备份超过 5 MB，无法导入')
        return
      }
      if (!window.confirm('导入会完整替换当前所有演练记录。请确认文件只含虚构数据，并已备份当前记录。继续导入？')) return
      const result = store.importBackup(await file.text())
      if (!result.ok) {
        notify(result.errors.join(' '))
        return
      }
      closeAllDialogs()
      activeFilter.value = '全部记录'
      search.value = ''
      backupText.value = ''
      ensureSelection()
      const notice = store.storageStatus.value === 'memory-only'
        ? '已载入演练备份（仅保存在当前会话，刷新后不会保留）'
        : '已导入并保存演练备份'
      notify(result.warnings.length ? `${result.warnings.join(' ')} ${notice}` : notice)
    } catch {
      notify('读取备份文件失败；当前演练数据未变更')
    } finally {
      input.value = ''
    }
  }

  // ── 表单复位 ────────────────────────────────────────────────────────
  function resetAllForms(): void {
    syntheticConfirmed.value = false
    forms.create.value = { ...CREATE_DEFAULTS, dueAt: defaultDueDate() }
    forms.transition.value = { ...TRANSITION_DEFAULTS }
    forms.followUp.value = { ...FOLLOW_UP_DEFAULTS }
    forms.contactSimulation.value = { ...CONTACT_DEFAULTS }
    forms.reopen.value = { ...REOPEN_DEFAULTS, dueAt: defaultDueDate() }
    createError.value = ''
    duplicateCandidates.value = []
    duplicateReviewRequired.value = false
    duplicateConfirmed.value = false
    duplicateExplanation.value = ''
    duplicateError.value = ''
    transitionErrors.value = []
    followUpError.value = ''
    contactSimulationError.value = ''
    reopenError.value = ''
    highRiskNote.value = ''
    highRiskError.value = ''
    checkpointError.value = ''
    forms.checkpoint.value = { ...CHECKPOINT_DEFAULTS }
    complaintError.value = ''
    complaintSyntheticConfirmed.value = false
    complaintReviewResolution.value = ''
    complaintReviewError.value = ''
    forms.complaint.value = {
      targetRole: complaintTargetRoles.value[0]?.value ?? 'demo-review',
      description: '',
    }
  }

  function openCreate(): void {
    if (store.intakePaused.value) {
      notify(INTAKE_PAUSED_NOTICE)
      return
    }
    resetAllForms()
    showCreate.value = true
    dialogFocus.sync()
  }

  function openTransition(): void {
    if (!selectedCase.value || !actionOptions.value.length) return
    resetAllForms()
    const item = selectedCase.value
    forms.transition.value = {
      ...TRANSITION_DEFAULTS,
      owner: item.owner ?? '',
      nextStep: item.nextStep ?? '',
      dueAt: toLocalInput(item.dueAt) || defaultDueDate(),
    }
    showTransition.value = true
    dialogFocus.sync()
  }

  function openCheckpoint(): void {
    if (!selectedCase.value || !isOpenIntakeStatus(selectedCase.value.status) || caseHasHighRisk(selectedCase.value)) return
    resetAllForms()
    forms.checkpoint.value = {
      consentStatus: getCaseConsentStatus(selectedCase.value),
      requiredInfoComplete: isCaseRequiredInfoComplete(selectedCase.value),
      note: '',
    }
    showCheckpoint.value = true
    dialogFocus.sync()
  }

  function openFollowUp(): void {
    if (!selectedCase.value || caseHasHighRisk(selectedCase.value)) return
    if (selectedCaseCheckpointBlockedReason.value) {
      notify(selectedCaseCheckpointBlockedReason.value)
      return
    }
    resetAllForms()
    forms.followUp.value = {
      owner: selectedCase.value.owner ?? '',
      nextStep: selectedCase.value.nextStep ?? '',
      dueAt: toLocalInput(selectedCase.value.dueAt),
      note: '',
    }
    showFollowUp.value = true
    dialogFocus.sync()
  }

  function openContactSimulation(): void {
    if (!selectedCase.value || !isOpenIntakeStatus(selectedCase.value.status) || caseHasHighRisk(selectedCase.value)) return
    if (selectedCaseCheckpointBlockedReason.value) {
      notify(selectedCaseCheckpointBlockedReason.value)
      return
    }
    resetAllForms()
    forms.contactSimulation.value = {
      ...CONTACT_DEFAULTS,
      owner: selectedCase.value.owner ?? '',
      nextStep: selectedCase.value.nextStep ?? '',
      dueAt: toLocalInput(selectedCase.value.dueAt),
    }
    showContactSimulation.value = true
    dialogFocus.sync()
  }

  function openHighRiskStop(): void {
    if (!selectedCase.value || !isOpenIntakeStatus(selectedCase.value.status) || caseHasHighRisk(selectedCase.value)) return
    resetAllForms()
    showHighRiskStop.value = true
    dialogFocus.sync()
  }

  function openReopen(): void {
    if (store.intakePaused.value) {
      notify(INTAKE_PAUSED_NOTICE)
      return
    }
    if (!selectedCase.value || isOpenIntakeStatus(selectedCase.value.status) || caseHasHighRisk(selectedCase.value)) return
    resetAllForms()
    forms.reopen.value = {
      owner: '演练-受理席-01',
      nextStep: '重新核对演练记录并安排分诊',
      dueAt: defaultDueDate(),
      note: '',
    }
    showReopen.value = true
    dialogFocus.sync()
  }

  function openComplaint(): void {
    if (!selectedCase.value) return
    resetAllForms()
    forms.complaint.value = {
      targetRole: complaintTargetRoles.value[0]?.value ?? 'demo-review',
      description: '',
    }
    showComplaint.value = true
    dialogFocus.sync()
  }

  function openHelp(): void {
    showHelp.value = true
    dialogFocus.sync()
  }

  /**
   * 只关闭使用说明。mvp 里 `showHelp = false` 直接赋值即可，因为 watch 会接管焦点；
   * React 侧没有这个同步点，所以单独给一个动作，避免借用 closeAllDialogs
   * 顺手清掉用户正在填写的投诉复核说明。
   */
  function closeHelp(): void {
    showHelp.value = false
    dialogFocus.sync()
  }

  // ── 提交动作 ────────────────────────────────────────────────────────
  function createRecord(): void {
    createError.value = ''
    duplicateError.value = ''
    if (store.intakePaused.value) {
      const message = INTAKE_PAUSED_NOTICE
      if (duplicateReviewRequired.value) duplicateError.value = message
      else createError.value = message
      return
    }
    if (!syntheticConfirmed.value) {
      const message = '请先确认本次填写内容均为虚构演练数据。'
      if (duplicateReviewRequired.value) duplicateError.value = message
      else createError.value = message
      return
    }
    if (!forms.create.value.summary.trim()) {
      const message = '请填写不含身份信息的演练摘要。'
      if (duplicateReviewRequired.value) duplicateError.value = message
      else createError.value = message
      return
    }
    const isDuplicateReview = duplicateReviewRequired.value
    if (isDuplicateReview && (!duplicateConfirmed.value || !duplicateExplanation.value.trim())) {
      duplicateError.value = '请确认已人工核对候选记录，并填写重复复核说明。'
      return
    }
    const result = store.createCase(
      { ...forms.create.value },
      isDuplicateReview
        ? {
            candidateIds: duplicateCandidates.value.map((candidate) => candidate.id),
            explanation: duplicateExplanation.value,
          }
        : undefined,
    )
    if (result.duplicateCandidates?.length) {
      duplicateCandidates.value = result.duplicateCandidates
      duplicateReviewRequired.value = true
      duplicateConfirmed.value = false
      duplicateExplanation.value = ''
      return
    }
    if (!result.ok) {
      const message = result.errors.join(' ') || '创建演练记录失败。'
      if (isDuplicateReview) duplicateError.value = message
      else createError.value = message
      return
    }
    closeAllDialogs()
    ensureSelection()
    notifyAfterMutation(isDuplicateReview
      ? '已创建独立演练记录，并追加人工重复复核记录'
      : '演练记录已加入队列')
  }

  function cancelDuplicateReview(): void {
    duplicateCandidates.value = []
    duplicateReviewRequired.value = false
    duplicateConfirmed.value = false
    duplicateExplanation.value = ''
    duplicateError.value = ''
  }

  function openDuplicateCandidate(id: string): void {
    closeAllDialogs()
    selectRelatedCase(id)
    notify('已打开候选演练记录；未创建新记录')
  }

  function applyTransition(): void {
    const form = forms.transition.value
    if (!selectedCase.value || !form.action) return
    if (!syntheticConfirmed.value) {
      transitionErrors.value = ['请先确认本次填写内容均为虚构演练数据。']
      return
    }
    const result = store.transition({
      id: selectedCase.value.id,
      action: form.action,
      actorRole: store.currentDemoRole.value,
      reasonCode: form.reasonCode || undefined,
      referralTarget: form.referralTarget,
      note: form.note,
      owner: form.owner,
      nextStep: form.nextStep,
      dueAt: form.dueAt,
      handoffOutcome: form.action === 'RECORD_HIGH_RISK_HANDOFF'
        ? form.handoffOutcome || undefined
        : undefined,
      handoffOwner: form.action === 'RECORD_HIGH_RISK_HANDOFF'
        ? (form.handoffOutcome === 'accepted' ? form.handoffOwner : '')
        : undefined,
    })
    if (!result.ok) {
      transitionErrors.value = result.errors
      return
    }
    const isHandoff = form.action === 'RECORD_HIGH_RISK_HANDOFF'
    closeAllDialogs()
    notifyAfterMutation(isHandoff
      ? '人工交接记录已追加到时间线；风险仍未解除'
      : '状态和跟进时间线已更新')
  }

  function saveCheckpoint(): void {
    if (!selectedCase.value) return
    const form = forms.checkpoint.value
    if (!form.note.trim()) {
      checkpointError.value = '请填写登记检查点更新说明。'
      return
    }
    const result = store.updateCheckpoint({
      id: selectedCase.value.id,
      consentStatus: form.consentStatus,
      requiredInfoComplete: form.requiredInfoComplete,
      note: form.note,
    })
    if (!result.ok) {
      checkpointError.value = result.errors.join(' ')
      return
    }
    closeAllDialogs()
    notifyAfterMutation('登记检查点已更新并追加到时间线')
  }

  function saveFollowUp(): void {
    if (!selectedCase.value) return
    if (!syntheticConfirmed.value) {
      followUpError.value = '请先确认本次填写内容均为虚构演练数据。'
      return
    }
    const result = store.updateFollowUp({ id: selectedCase.value.id, ...forms.followUp.value })
    if (!result.ok) {
      followUpError.value = result.errors.join(' ')
      return
    }
    closeAllDialogs()
    notifyAfterMutation('跟进信息已追加到时间线')
  }

  function saveContactSimulation(): void {
    if (!selectedCase.value) return
    if (!syntheticConfirmed.value) {
      contactSimulationError.value = '请先确认本次填写内容均为虚构演练数据。'
      return
    }
    const result = store.recordContactSimulation({
      id: selectedCase.value.id,
      ...forms.contactSimulation.value,
    })
    if (!result.ok) {
      contactSimulationError.value = result.errors.join(' ')
      return
    }
    closeAllDialogs()
    notifyAfterMutation('模拟联系结果已追加到时间线，并更新负责人、下一步和截止时间')
  }

  function saveHighRiskStop(): void {
    if (!selectedCase.value) return
    if (!syntheticConfirmed.value) {
      highRiskError.value = '请先确认本次填写内容均为虚构演练数据。'
      return
    }
    if (!highRiskNote.value.trim()) {
      highRiskError.value = '请填写高风险停止初筛的虚构演练依据。'
      return
    }
    const result = store.raiseHighRiskStop({ id: selectedCase.value.id, note: highRiskNote.value })
    if (!result.ok) {
      highRiskError.value = result.errors.join(' ')
      return
    }
    closeAllDialogs()
    notifyAfterMutation('已停止普通初筛并记录演练标记')
  }

  function createReopenedRecord(): void {
    if (!selectedCase.value) return
    if (store.intakePaused.value) {
      reopenError.value = INTAKE_PAUSED_NOTICE
      return
    }
    if (!syntheticConfirmed.value) {
      reopenError.value = '请先确认本次填写内容均为虚构演练数据。'
      return
    }
    const result = store.reopenCase(selectedCase.value.id, { ...forms.reopen.value })
    if (!result.ok) {
      reopenError.value = result.errors.join(' ')
      return
    }
    closeAllDialogs()
    ensureSelection()
    notifyAfterMutation('已建立关联重开演练记录，原记录保留')
  }

  // ── 投诉 ────────────────────────────────────────────────────────────
  function submitComplaint(): void {
    if (!selectedCase.value) return
    if (!complaintSyntheticConfirmed.value) {
      complaintError.value = '请先确认本次投诉只使用演示角色和虚构内容。'
      return
    }
    if (!forms.complaint.value.description.trim()) {
      complaintError.value = '请填写投诉说明。'
      return
    }
    const result = store.submitComplaint({
      caseId: selectedCase.value.id,
      targetRole: forms.complaint.value.targetRole,
      description: forms.complaint.value.description,
    })
    if (!result.ok) {
      complaintError.value = result.errors.join(' ')
      return
    }
    complaintFilter.value = '待复核'
    selectedComplaintId.value = result.id ?? null
    closeAllDialogs()
    notifyAfterMutation(`投诉 ${result.id} 已提交到独立复核队列；未改动 case 风险时间线`)
  }

  function reviewSelectedComplaint(): void {
    const complaint = selectedComplaint.value
    if (!complaint) return
    if (!canReviewSelectedComplaint.value) {
      complaintReviewError.value = selectedComplaintReviewBlockedReason.value
      return
    }
    if (!complaintReviewResolution.value.trim()) {
      complaintReviewError.value = '完成复核必须填写处理说明。'
      return
    }
    const result = store.reviewComplaint({
      id: complaint.id,
      resolution: complaintReviewResolution.value,
    })
    if (!result.ok) {
      complaintReviewError.value = result.errors.join(' ')
      return
    }
    complaintReviewResolution.value = ''
    complaintReviewError.value = ''
    complaintFilter.value = '全部投诉'
    notifyAfterMutation('投诉已完成复核；未改动 case 风险时间线')
  }

  function selectComplaint(id: string): void {
    selectedComplaintId.value = id
    complaintReviewResolution.value = ''
    complaintReviewError.value = ''
  }

  function openComplaintCase(caseId: string): void {
    selectRelatedCase(caseId)
  }

  // ── 社区桥 ──────────────────────────────────────────────────────────
  function resetCommunityReview(): void {
    communityPendingPost.value = null
    communityPendingInput.value = null
    communityDuplicateCandidates.value = []
    communityDuplicateConfirmed.value = false
    communityDuplicateExplanation.value = ''
    communityBridgeError.value = ''
  }

  function resetCommunityBridge(): void {
    resetCommunityReview()
    communityReadResult.value = null
    communitySyntheticConfirmed.value = false
  }

  function readCommunityArchive(): void {
    resetCommunityReview()
    communitySyntheticConfirmed.value = false
    communityReadResult.value = readCommunityHelpPosts()
  }

  function openCommunityBridge(): void {
    resetCommunityBridge()
    readCommunityArchive()
    showCommunityBridge.value = true
    dialogFocus.sync()
  }

  function closeCommunityBridge(): void {
    showCommunityBridge.value = false
    resetCommunityBridge()
    dialogFocus.sync()
  }

  function startCommunityRegistration(post: CommunityHelpPost): void {
    if (store.intakePaused.value) {
      communityBridgeError.value = INTAKE_PAUSED_NOTICE
      return
    }
    if (!communitySyntheticConfirmed.value) {
      communityBridgeError.value = '请先确认只登记本机合成演练数据。'
      return
    }
    const registered = communityRegisteredCases.value.get(post.id)
    if (registered) {
      notify(`该社区求助已登记为 ${registered.id}，不会重复创建`)
      return
    }

    resetCommunityReview()
    const mapping = mapCommunityHelpPostToIntake(post)
    const input: NewIntakeInput = {
      label: mapping.label,
      summary: mapping.summary,
      sourceChannel: 'community-entry-local',
      sourcePostId: mapping.sourcePostId,
      owner: '演练-受理席-01',
      nextStep: '核对社区求助演练内容并完成常规初筛',
      dueAt: defaultDueDate(),
      highRisk: false,
      highRiskNote: '',
    }
    const result = store.createCase(input)
    if (result.already) {
      notify(`该社区求助已登记为 ${result.id}，不会重复创建`)
      return
    }
    if (result.duplicateCandidates?.length) {
      communityPendingPost.value = post
      communityPendingInput.value = input
      communityDuplicateCandidates.value = result.duplicateCandidates
      communityDuplicateConfirmed.value = false
      communityDuplicateExplanation.value = ''
      return
    }
    if (!result.ok) {
      communityBridgeError.value = result.errors.join(' ') || '登记到 A+ 队列失败。'
      return
    }
    ensureSelection()
    notifyAfterMutation(`已登记 ${result.id} 到 A+ 队列；未写回社区帖状态`)
  }

  function cancelCommunityReview(): void {
    resetCommunityReview()
  }

  function confirmCommunityRegistration(): void {
    if (store.intakePaused.value) {
      communityBridgeError.value = INTAKE_PAUSED_NOTICE
      return
    }
    const input = communityPendingInput.value
    if (!input) return
    if (!communitySyntheticConfirmed.value) {
      communityBridgeError.value = '请先确认只登记本机合成演练数据。'
      return
    }
    if (!communityDuplicateConfirmed.value || !communityDuplicateExplanation.value.trim()) {
      communityBridgeError.value = '请确认已人工核对候选记录，并填写重复复核说明。'
      return
    }

    const result = store.createCase(input, {
      candidateIds: communityDuplicateCandidates.value.map((candidate) => candidate.id),
      explanation: communityDuplicateExplanation.value,
    })
    if (result.duplicateCandidates?.length) {
      communityDuplicateCandidates.value = result.duplicateCandidates
      communityDuplicateConfirmed.value = false
      communityDuplicateExplanation.value = ''
      communityBridgeError.value = '候选记录已变化，请重新核对后填写说明。'
      return
    }
    if (result.already) {
      resetCommunityReview()
      notify(`该社区求助已登记为 ${result.id}，不会重复创建`)
      return
    }
    if (!result.ok) {
      communityBridgeError.value = result.errors.join(' ') || '创建演练记录失败。'
      return
    }
    resetCommunityReview()
    ensureSelection()
    notifyAfterMutation(`已创建独立演练记录 ${result.id}，并追加人工重复复核记录；未写回社区帖状态`)
  }

  // ── 关闭与重置 ──────────────────────────────────────────────────────
  function closeAllDialogs(): void {
    showHelp.value = false
    showCreate.value = false
    showTransition.value = false
    showFollowUp.value = false
    showContactSimulation.value = false
    showReopen.value = false
    showHighRiskStop.value = false
    showCheckpoint.value = false
    showComplaint.value = false
    showCommunityBridge.value = false
    resetAllForms()
    resetCommunityBridge()
    dialogFocus.sync()
  }

  function resetDemo(): void {
    const unreadableArchive = store.storageStatus.value === 'recovery-required'
    if (unreadableArchive && !unreadableDownloaded.value) {
      notify('当前有无法读取的旧存档；请先点“下载无法读取的旧存档”保存原文，再重置演练数据')
      return
    }
    const promptText = unreadableArchive
      ? '当前存在无法读取的旧存档。重置会覆盖这份原文且无法恢复；请确认已保存原文。确认仍要覆盖并恢复初始演练数据吗？'
      : '恢复初始合成演练记录？这会清除当前所有记录和修改，建议先导出备份。'
    if (!window.confirm(promptText)) return
    const result = store.reset()
    if (!result.ok) {
      notify(result.errors.join(' '))
      return
    }
    closeAllDialogs()
    activeFilter.value = '全部记录'
    search.value = ''
    backupText.value = ''
    ensureSelection()
    notify(store.storageStatus.value === 'memory-only'
      ? '已恢复初始合成演练数据（仅保存在当前会话，刷新后不会保留）'
      : '已恢复初始合成演练数据')
  }

  // ── 生命周期 ────────────────────────────────────────────────────────
  let overdueClockTimer: number | undefined
  let stopCaseRoutePop: (() => void) | null = null
  let stopKeydown: (() => void) | null = null

  function onAppError(event: Event) {
    const detail = (event as CustomEvent<AppErrorDetail>).detail
    notify(detail?.message ?? '界面出现异常，请刷新后重试。')
  }

  /** 由 App 的 effect 调用一次；返回的清理函数在卸载时执行。 */
  function init(): () => void {
    store.refreshClock()
    overdueClockTimer = window.setInterval(store.refreshClock, 60_000)
    window.addEventListener(APP_ERROR_EVENT, onAppError)
    stopKeydown = dialogFocus.attach()
    stopCaseRoutePop = onRoutePop(() => applyCaseRouteFromLocation())
    applyCaseRouteFromLocation({ initial: true })
    ensureSelection()

    return () => {
      if (overdueClockTimer !== undefined) window.clearInterval(overdueClockTimer)
      window.removeEventListener(APP_ERROR_EVENT, onAppError)
      stopKeydown?.()
      stopCaseRoutePop?.()
    }
  }

  return {
    // 基础
    store,
    revision,
    notify,
    toastMessage,
    toastIsError,
    // 常量与文案
    roles,
    reasonLabels,
    actionLabels,
    // 队列
    search,
    filters,
    activeFilter,
    filteredCases,
    setActiveFilter,
    setSearch,
    resetQueueFilters,
    selectCase,
    backToQueue,
    jumpToComplaints,
    isCaseOverdue,
    caseHasHighRisk,
    caseStatusLabel,
    eventHeading,
    eventChangeValue,
    formatDate,
    roleLabel,
    communityOrderStatusLabel,
    // 详情
    selectedCase,
    selectedRiskNotice,
    selectedHighRiskHandoffCount,
    linkedCases,
    selectedCaseCheckpointReady,
    selectedCaseCheckpointBlockedReason,
    actionOptions,
    lifecycleText,
    selectRelatedCase,
    copySelectedCaseLink,
    // 角色
    currentDemoRoleLabel,
    // 开关与对话框
    anyDialogOpen,
    showHelp,
    showCreate,
    showTransition,
    showFollowUp,
    showContactSimulation,
    showReopen,
    showHighRiskStop,
    showCheckpoint,
    showComplaint,
    showCommunityBridge,
    closeAllDialogs,
    openCreate,
    openTransition,
    openCheckpoint,
    openFollowUp,
    openContactSimulation,
    openHighRiskStop,
    openReopen,
    openComplaint,
    openHelp,
    closeHelp,
    toggleIntakePaused,
    // 表单
    syntheticConfirmed,
    forms,
    setForm,
    setTransitionAction,
    createError,
    duplicateCandidates,
    duplicateReviewRequired,
    duplicateConfirmed,
    duplicateExplanation,
    duplicateError,
    transitionErrors,
    transitionReasonOptions: transitionReasonOptionsList,
    needsReason,
    transitionNoteRequired,
    transitionSubmitDisabled,
    transitionTargetIsOpen,
    transitionActionBlockedReason,
    followUpError,
    contactSimulationError,
    reopenError,
    highRiskNote,
    highRiskError,
    checkpointError,
    complaintError,
    complaintSyntheticConfirmed,
    // 提交
    createRecord,
    cancelDuplicateReview,
    openDuplicateCandidate,
    applyTransition,
    saveCheckpoint,
    saveFollowUp,
    saveContactSimulation,
    saveHighRiskStop,
    createReopenedRecord,
    submitComplaint,
    // 投诉
    complaintFilter,
    filteredComplaints,
    selectedComplaintId,
    selectedComplaint,
    selectedComplaintCase,
    selectedComplaintReviewBlockedReason,
    canReviewSelectedComplaint,
    complaintTargetRoles,
    currentRoleReviewLabel,
    complaintReviewResolution,
    complaintReviewError,
    reviewSelectedComplaint,
    selectComplaint,
    openComplaintCase,
    // 社区桥
    communityReadResult,
    communitySyntheticConfirmed,
    communityPendingMapping,
    communityDuplicateCandidates,
    communityDuplicateConfirmed,
    communityDuplicateExplanation,
    communityBridgeError,
    communityReviewRequired,
    communityReadStatus,
    communityReadWarnings,
    communityReadMessage,
    communityPostsWithStatus,
    openCommunityBridge,
    closeCommunityBridge,
    readCommunityArchive,
    startCommunityRegistration,
    cancelCommunityReview,
    confirmCommunityRegistration,
    // 备份与重置
    backupText,
    unreadableDownloaded,
    storageStatusLabel,
    lastSavedLabel,
    exportBackup,
    viewBackupText,
    chooseBackup,
    importBackupFile,
    reloadLatestSnapshot,
    exportUnreadableBackup,
    resetDemo,
    // 生命周期
    init,
  }
})

export type AplusWorkbench = typeof aplusWorkbench
