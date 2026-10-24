import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type {
  Announcement,
  BannerItem,
  ChatMessage,
  ComplaintTicket,
  EldercareArticle,
  HelpOrder,
  MessageItem,
  Post,
  TimeLedger,
  User,
  VolunteerProfile,
} from '../types';
import { useCommunityStore } from '../data/community/store';
import { SYNTHETIC_DEMO_AUTHOR } from '../data/community/fixtures';
import {
  ANNOUNCEMENTS,
  BANNER_ITEMS,
  ELDERCARE_ARTICLES,
} from '../data/community/content';
import {
  MEMBERSHIP_USER_IDS,
  membershipFromUserId,
  projectCommunity,
} from '../selectors/community';
import type { PostMode, CommunityStorageStatus } from '../data/community/types';
import { sound } from '../utils/audio';
import { safeRead, safeWrite } from '../utils/storage';
import { toast } from '../utils/toast';
import { dateStamp, downloadTextFile } from '../shared/download';

export type SubPageType =
  | null
  | 'tasks_hall'
  | 'order_detail'
  | 'eldercare_detail'
  | 'certificate_view'
  | 'help_center'
  | 'admin_center'
  | 'sos_modal'
  | 'complaint_modal'
  | 'post_detail'
  | 'community_qr'
  | 'realname_verify'
  | 'terms_modal'
  | 'search_page'
  | 'time_ledger_page';

/**
 * 与 232 原实现完全一致的上下文契约（字段名与签名不变）。
 * 变化只发生在实现侧：数据来自 mvp 领域层，而不是 mockData。
 */
export interface AppContextType {
  // User & View
  currentUser: User;
  users: User[];
  switchUser: (userId: string) => void;
  viewMode: 'mobile_frame' | 'responsive_web';
  setViewMode: (mode: 'mobile_frame' | 'responsive_web') => void;
  elderlyMode: boolean;
  setElderlyMode: (val: boolean) => void;

  // Navigation
  activeTab: 'home' | 'community' | 'publish' | 'messages' | 'profile';
  setActiveTab: (tab: 'home' | 'community' | 'publish' | 'messages' | 'profile') => void;
  activeSubPage: SubPageType;
  setActiveSubPage: (page: SubPageType) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;
  selectedArticleId: string | null;
  setSelectedArticleId: (id: string | null) => void;
  searchKeyword: string;
  setSearchKeyword: (val: string) => void;

  // Data entities
  orders: HelpOrder[];
  posts: Post[];
  messages: MessageItem[];
  chatMessages: ChatMessage[];
  timeLedger: TimeLedger[];
  complaints: ComplaintTicket[];
  volunteers: VolunteerProfile[];
  announcements: Announcement[];
  banners: BannerItem[];
  eldercareArticles: EldercareArticle[];

  // Audio state
  playingArticleId: string | null;
  isAudioPlaying: boolean;
  playArticleAudio: (article: EldercareArticle) => void;
  stopArticleAudio: () => void;

  // Actions
  createHelpOrder: (order: Partial<HelpOrder>) => void;
  createPost: (post: Partial<Post>) => void;
  acceptOrder: (orderId: string) => void;
  clockInOrder: (orderId: string) => void;
  completeOrder: (orderId: string, ratingScore?: number, ratingComment?: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  likePost: (postId: string) => void;
  bookmarkPost: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
  enrollActivity: (postId: string) => void;
  sendChatMessage: (conversationId: string, text: string, type?: 'text' | 'location') => void;
  submitComplaint: (data: Partial<ComplaintTicket>) => void;
  triggerSos: () => void;
  verifyRealName: (name: string, idCard: string) => void;

  // Admin actions
  adminApprovePost: (postId: string) => void;
  adminRejectPost: (postId: string) => void;
  /**
   * 追加能力（不改变既有签名）：带理由的驳回。
   * 232 原实现没有理由收集，R7 要求「驳回必须有理由」，所以后台改用这个入口。
   */
  adminRejectPostWithReason: (postId: string, reason: string) => void;
  adminResolveComplaint: (ticketId: string, resolution: string) => void;
  adminAdjustTimeCoin: (userId: string, amount: number, note: string) => void;

  /**
   * 追加能力（不改变既有签名）：本机存档的可见状态与恢复动作（§7 存储契约）。
   * 232 原实现把存档异常藏在 store 里，界面无法感知；这里只做只读投影 + 四个动作，
   * 不新增业务存档键，也不改领域层。
   */
  storageStatus: CommunityStorageStatus;
  storageError: string | null;
  lastSavedAt: string | null;
  hasUnreadableArchive: boolean;
  unreadableArchiveExported: boolean;
  exportBackup: () => void;
  exportUnreadableArchive: () => void;
  reloadArchive: () => void;
  resetDemoData: () => void;

  // UI helpers
  unreadMessagesCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/** UI 偏好键：与业务存档（community-mvp.synthetic-state.v1）分开，互不污染。 */
const UI_KEYS = {
  viewMode: 'community.ui.view-mode',
  elderlyMode: 'community.ui.elderly-mode',
  activeTab: 'community.ui.active-tab',
} as const;

const TAB_STORAGE_IDS: Record<AppContextType['activeTab'], string> = {
  home: 'home',
  community: 'community',
  publish: 'publish',
  messages: 'messages',
  profile: 'profile',
};

function readTab(): AppContextType['activeTab'] {
  const stored = safeRead<string>(UI_KEYS.activeTab, 'home');
  const found = (Object.keys(TAB_STORAGE_IDS) as AppContextType['activeTab'][]).find(
    (tab) => TAB_STORAGE_IDS[tab] === stored,
  );
  return found ?? 'home';
}

/** 232 的分类 → mvp 发布模式。见 docs/组件映射表 与 README 的「裁决记录」。 */
function resolvePublishMode(post: Partial<Post>): PostMode {
  if (post.category === 'activity') return 'volunteer';
  // 志愿动态必须落在 volunteer 上：mvp 的解析器只允许 volunteer 携带匿名/同步开关，
  // 若按字面映射成 neighbor，匿名发布会直接校验失败（见 §8.1 不改 mvp 类型）。
  if (post.category === 'story') return 'volunteer';
  // 邻里帖（含「求助交流」话题）不生成订单、不计时长。
  return 'neighbor';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // store 是「对象」而不是「函数」：React 侧由 useSyncExternalStore 驱动。
  const store = useCommunityStore;

  // 订阅 store 版本号：ref 写入后递增，用来触发重渲染。
  const version = useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);

  const [viewMode, setViewModeState] = useState<'mobile_frame' | 'responsive_web'>(() =>
    safeRead<'mobile_frame' | 'responsive_web'>(UI_KEYS.viewMode, 'responsive_web'),
  );
  const [elderlyMode, setElderlyModeState] = useState<boolean>(() =>
    safeRead<boolean>(UI_KEYS.elderlyMode, false),
  );
  const [activeTab, setActiveTabState] = useState<AppContextType['activeTab']>(readTab);
  const [activeSubPage, setActiveSubPage] = useState<SubPageType>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [playingArticleId, setPlayingArticleId] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const state = store.state.value;
  const membership = store.membership.value;

  const projection = useMemo(
    // version 参与依赖：store 每次写入都会重建投影。
    () => projectCommunity(state, membership, ANNOUNCEMENTS, BANNER_ITEMS, ELDERCARE_ARTICLES),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, state, membership],
  );

  const currentUser =
    projection.users.find((user) => user.id === MEMBERSHIP_USER_IDS[membership])
    ?? projection.users[1];

  const setViewMode = useCallback((mode: 'mobile_frame' | 'responsive_web') => {
    setViewModeState(mode);
    safeWrite(UI_KEYS.viewMode, mode);
  }, []);

  const setElderlyMode = useCallback((value: boolean) => {
    setElderlyModeState(value);
    safeWrite(UI_KEYS.elderlyMode, value);
  }, []);

  const setActiveTab = useCallback((tab: AppContextType['activeTab']) => {
    setActiveTabState(tab);
    safeWrite(UI_KEYS.activeTab, TAB_STORAGE_IDS[tab]);
  }, []);

  const switchUser = useCallback(
    (userId: string) => {
      const next = membershipFromUserId(userId);
      const result = store.setMembership(next);
      sound.playTap();
      if (!result.ok) toast(result.errors[0] ?? '切换演练身份失败');
    },
    [store],
  );

  /* ---------------- 音频（浏览器朗读；不是唯一入口，见 T18） ---------------- */
  const playArticleAudio = useCallback(
    (article: EldercareArticle) => {
      if (playingArticleId === article.id && isAudioPlaying) {
        sound.stopSpeaking();
        setIsAudioPlaying(false);
        setPlayingArticleId(null);
        return;
      }
      setPlayingArticleId(article.id);
      setIsAudioPlaying(true);
      sound.speakText(article.audioText, () => {
        setIsAudioPlaying(false);
        setPlayingArticleId(null);
      });
    },
    [playingArticleId, isAudioPlaying],
  );

  const stopArticleAudio = useCallback(() => {
    sound.stopSpeaking();
    setIsAudioPlaying(false);
    setPlayingArticleId(null);
  }, []);

  /* ------------------------------ 发布 ------------------------------ */
  const createHelpOrder = useCallback(
    (order: Partial<HelpOrder>) => {
      // 实名前置（R5）：未实名不进入 store，直接拦在门口并给出可执行下一步。
      if (membership === 'visitor') {
        sound.playSosAlert();
        toast('发布求助订单需先完成演练实名（仅切换身份，不采集身份证号）。');
        setActiveSubPage('realname_verify');
        return;
      }

      const title = order.title?.trim() ?? '';
      const content = order.description?.trim() ?? '';
      const result = store.publishPost({
        mode: 'help',
        title,
        content,
        category: order.categoryLabel,
        timeWindow: [order.dateStr, order.timeStr].filter(Boolean).join(' ').trim() || undefined,
        duration: order.durationHours ? `${order.durationHours} 小时` : undefined,
        // 敏感信息最小化（R6）：未勾选单独同意就不写进存档。
        specialNote: order.consentSensitive ? order.medicalNotes?.trim() || undefined : undefined,
        location: order.locationArea,
      });

      if (!result.ok) {
        toast(result.errors[0] ?? '发布失败');
        return;
      }
      sound.playSuccess();
      toast('已提交审核；通过后才会出现在接单大厅（本机演练，不会通知任何人）。', 'success');
      setActiveTab('home');
    },
    [membership, store],
  );

  const createPost = useCallback(
    (post: Partial<Post>) => {
      const mode = resolvePublishMode(post);
      const result = store.publishPost({
        mode,
        title: post.title?.trim() || '（无标题）',
        content: post.content?.trim() ?? '',
        category: post.categoryLabel,
        location: post.locationTag,
        anonymous: mode === 'volunteer' ? post.isAnonymous === true : undefined,
        volunteerKind: mode === 'volunteer'
          ? (post.category === 'activity' ? 'activity' : 'update')
          : undefined,
        publishedToFeed: mode === 'volunteer' ? true : undefined,
      });

      if (!result.ok) {
        toast(result.errors[0] ?? '发布失败');
        return;
      }
      sound.playSuccess();
      toast('已提交审核；通过后才会进入社区信息流（本机演练）。', 'success');
      setActiveTab('community');
    },
    [store],
  );

  /* ------------------------------ 订单 ------------------------------ */
  const acceptOrder = useCallback(
    (orderId: string) => {
      const result = store.acceptOrder(orderId);
      if (!result.ok) {
        toast(result.errors[0] ?? '接单失败');
        return;
      }
      sound.playSuccess();
      toast('已在本机演练中标记接单（不产生真实派单或通知）。', 'success');
    },
    [store],
  );

  const clockInOrder = useCallback(
    (orderId: string) => {
      const result = store.clockInOrder(orderId);
      if (!result.ok) {
        toast(result.errors[0] ?? '签到失败');
        return;
      }
      sound.playNotification();
      toast('已记录上门签到（本机演练；不代表真实到场）。', 'success');
    },
    [store],
  );

  const completeOrder = useCallback(
    (orderId: string, ratingScore = 5, ratingComment = '') => {
      // 双方确认在本机拆成两步：发起完成申请 → 确认完成。任一步失败就停下，不写账本。
      const requested = store.requestOrderCompletion(orderId, '');
      if (!requested.ok) {
        toast(requested.errors[0] ?? '发起完成申请失败');
        return;
      }
      // 第二步的确认方取决于本机身份：
      // - 本人是求助发布者时，由本人确认（confirmOrderCompletion）；
      // - 本人是接单者时，求助方是合成角色，只能由本机代其确认
      //   （counterpartConfirmOrderCompletion，事件来源标记 synthetic-counterpart）。
      //   之前只调前者，接单者会卡在「等待确认」且账本永远不新增，验收链路断在这里。
      const byAuthor = store.confirmOrderCompletion(orderId);
      const confirmed = byAuthor.ok ? byAuthor : store.counterpartConfirmOrderCompletion(orderId);
      if (!confirmed.ok) {
        toast(confirmed.errors[0] ?? '确认完成失败');
        return;
      }
      if (ratingComment.trim()) {
        store.submitOrderFeedback(orderId, ratingScore, ratingComment.trim());
      }
      sound.playSuccess();
      toast(
        byAuthor.ok
          ? '已完成双方确认（本机演练），时间账本新增一条「未结算」记录。'
          : '已记录你方完成申请，并由合成求助方代确认（本机演练）；账本新增一条「未结算」记录。',
        'success',
      );
    },
    [store],
  );

  const cancelOrder = useCallback(
    (orderId: string, reason: string) => {
      const result = store.cancelOrder(orderId, reason);
      if (!result.ok) {
        toast(result.errors[0] ?? '取消失败');
        return;
      }
      sound.playTap();
      toast('已取消（本机演练），取消原因已写入订单事件。');
    },
    [store],
  );

  /* ------------------------------ 互动 ------------------------------ */
  const likePost = useCallback(
    (postId: string) => {
      sound.playTap();
      const result = store.toggleLike(postId);
      if (!result.ok) toast(result.errors[0] ?? '操作失败');
    },
    [store],
  );

  const bookmarkPost = useCallback(
    (postId: string) => {
      sound.playTap();
      const result = store.toggleFavorite(postId);
      if (!result.ok) toast(result.errors[0] ?? '操作失败');
    },
    [store],
  );

  const addComment = useCallback(
    (postId: string, content: string) => {
      if (!content.trim()) return;
      const result = store.addComment(postId, content);
      if (!result.ok) {
        toast(result.errors[0] ?? '评论失败');
        return;
      }
      sound.playSuccess();
      toast('评论已提交，待审核通过后展示（先审后发）。', 'success');
    },
    [store],
  );

  const enrollActivity = useCallback(
    (postId: string) => {
      const post = store.posts.value.find((item) => item.id === postId);
      const result = post?.signedUpByMe === true
        ? store.cancelEventSignup(postId)
        : store.signUpForEvent(postId);
      if (!result.ok) {
        toast(result.errors[0] ?? '报名失败');
        return;
      }
      sound.playSuccess();
      toast(result.message ?? '已记录本机演练报名');
    },
    [store],
  );

  const sendChatMessage = useCallback(
    (conversationId: string, text: string) => {
      // 路线 B：自由私信关闭，私信降级为「订单内留言」（T9）。
      const thread = store.threads.value.find((item) => item.id === conversationId);
      if (!thread) {
        toast('找不到这条演练会话。');
        return;
      }
      if (thread.kind !== 'order' || !thread.postId) {
        toast('按受控社区方案，私信已降级为订单内留言；非订单会话不接收新消息。');
        return;
      }
      const result = store.sendOrderMessage(thread.postId, text);
      if (!result.ok) {
        toast(result.errors[0] ?? '留言失败');
        return;
      }
      sound.playTap();
    },
    [store],
  );

  const submitComplaint = useCallback(
    (data: Partial<ComplaintTicket>) => {
      // 举报目标：显式传入优先（帖子 / 评论 / 订单留言），否则按 232 的通用投诉表单处理。
      const targetType = data.targetType ?? 'post';
      let targetId = data.targetId ?? data.orderId ?? '';
      let targetLabel = data.orderTitle ?? (targetType === 'comment' ? '演练评论' : '演练留言');

      if (!targetId) {
        // 通用投诉表单没有目标选择器：退化为「最新一条公开内容」，并在提示里点名。
        // 写死 posts[0] 会把举报挂到与该用户操作无关的帖子上（旧实现的缺陷）。
        const fallback = store.visiblePosts.value[0];
        if (!fallback) {
          toast('当前没有可举报的演练内容。');
          return;
        }
        targetId = fallback.id;
        targetLabel = fallback.title || fallback.content.slice(0, 18);
      }

      const reason = [data.reason, data.detail].filter(Boolean).join('：') || '未填写原因';
      const result = store.reportContent(targetType, targetId, reason);
      if (!result.ok) {
        toast(result.errors[0] ?? '提交失败');
        return;
      }
      sound.playSuccess();
      toast(`举报已记录（目标：${targetLabel}）；只写本机，不通知任何机构，处置结果写入站内消息。`, 'success');
    },
    [store],
  );

  const triggerSos = useCallback(() => {
    sound.playSosAlert();
    setActiveSubPage('sos_modal');
  }, []);

  const verifyRealName = useCallback(
    (_name: string, _idCard: string) => {
      // 只切换演练身份：不接收、不校验、不存储身份证号（R5 / T13）。
      const result = store.setMembership('member');
      if (!result.ok) {
        toast(result.errors[0] ?? '实名状态切换失败');
        return;
      }
      sound.playSuccess();
      toast('已切换为「演练成员（已实名）」；本演练不采集身份证号。', 'success');
      setActiveSubPage(null);
    },
    [store],
  );

  /* ------------------------------ 审核 ------------------------------ */
  const adminApprovePost = useCallback(
    (postId: string) => {
      const result = store.moderatePost(postId, 'approved', '内容符合演练社区规范');
      if (!result.ok) {
        toast(result.errors[0] ?? '审核失败');
        return;
      }
      sound.playSuccess();
      toast('已通过审核，内容进入信息流。', 'success');
    },
    [store],
  );

  const adminRejectPostWithReason = useCallback(
    (postId: string, reason: string) => {
      const trimmed = reason.trim();
      if (!trimmed) {
        toast('驳回必须填写理由（会写入审核日志并通知发布者）。');
        return;
      }
      const result = store.moderatePost(postId, 'rejected', trimmed);
      if (!result.ok) {
        toast(result.errors[0] ?? '审核失败');
        return;
      }
      sound.playTap();
      toast('已驳回并记录理由。');
    },
    [store],
  );

  const adminRejectPost = useCallback(
    (postId: string) => {
      // 兼容旧签名：没有理由时不放行，避免出现“无理由驳回”。
      adminRejectPostWithReason(postId, '');
    },
    [adminRejectPostWithReason],
  );

  const adminResolveComplaint = useCallback(
    (ticketId: string, resolution: string) => {
      const result = store.resolveReport(ticketId, 'resolved', resolution);
      if (!result.ok) {
        toast(result.errors[0] ?? '处理失败');
        return;
      }
      sound.playSuccess();
      toast('举报已处置，结果已写入站内消息。', 'success');
    },
    [store],
  );

  const adminAdjustTimeCoin = useCallback(() => {
    // 账本只读：不伪造流水，也不改余额（R18 / T11）。
    toast('演练数据只读：时间账本不支持调账、兑现或转让。');
  }, []);

  /* ---------------------------- 本机存档 ---------------------------- */
  /**
   * 坏档闸门：recovery-required 时 store 会拦下所有写入，用户必须先拿到旧存档原文。
   * 这个标记只存在于当前会话（不写 localStorage）——写进去就等于承认「已备份」，
   * 而真正的确认只能是用户看到浏览器下载完成。
   */
  const [unreadableArchiveExported, setUnreadableArchiveExported] = useState(false);

  const storageStatus = store.storageStatus.value;
  const storageError = store.storageError.value;
  const lastSavedAt = store.lastSavedAt.value;
  const hasUnreadableArchive = store.unreadableStoredData.value !== null;

  const exportBackup = useCallback(() => {
    try {
      downloadTextFile(
        `community-synthetic-backup-${dateStamp()}.json`,
        store.readBackupJson(),
      );
      toast('已请求下载备份 JSON；文件只包含本机合成演练数据。', 'success');
    } catch {
      toast('导出失败：当前演练数据超出浏览器可下载的大小，请先清理部分记录。');
    }
  }, [store]);

  const exportUnreadableArchive = useCallback(() => {
    const raw = store.unreadableStoredData.value;
    if (!raw) {
      toast('没有可导出的旧存档原文。');
      return;
    }
    try {
      downloadTextFile('community-unreadable-local-save.txt', raw, 'text/plain;charset=utf-8');
      setUnreadableArchiveExported(true);
      toast('已请求下载旧存档原文；请确认文件已保存，再重置演练数据。', 'success');
    } catch {
      toast('原文下载失败：浏览器拒绝创建下载。请改用桌面浏览器重试。');
    }
  }, [store]);

  const reloadArchive = useCallback(() => {
    const confirmed = window.confirm(
      '载入最新本机存档会覆盖当前页面显示的内容（包括本页尚未保存的改动）。继续？',
    );
    if (!confirmed) return;
    const result = store.reloadFromStorage();
    if (!result.ok) {
      toast(result.errors[0] ?? '载入存档失败');
      return;
    }
    setUnreadableArchiveExported(false);
    sound.playTap();
    toast(result.message ?? '已载入最新本机存档。', 'success');
  }, [store]);

  const resetDemoData = useCallback(() => {
    if (store.storageStatus.value === 'recovery-required' && !unreadableArchiveExported) {
      toast('当前有无法读取的旧存档：请先「下载旧存档原文」，再重置演练数据。');
      return;
    }
    const recovery = store.storageStatus.value === 'recovery-required';
    const confirmed = window.confirm(
      recovery
        ? '重置会覆盖这份无法读取的旧存档且无法恢复；请确认已保存原文。仍要重置吗？'
        : '恢复初始合成演练数据？当前所有帖子、订单、举报与账本记录都会被清除，建议先导出备份。',
    );
    if (!confirmed) return;
    const result = store.resetDemoData();
    if (!result.ok) {
      toast(result.errors[0] ?? '重置失败');
      return;
    }
    setUnreadableArchiveExported(false);
    setActiveSubPage(null);
    sound.playSuccess();
    toast(result.message ?? '已恢复为虚构演练数据。', 'success');
  }, [store, unreadableArchiveExported]);

  const unreadMessagesCount = projection.messages.filter((message) => message.unread).length;

  const value: AppContextType = {
    currentUser,
    users: projection.users,
    switchUser,
    viewMode,
    setViewMode,
    elderlyMode,
    setElderlyMode,
    activeTab,
    setActiveTab,
    activeSubPage,
    setActiveSubPage,
    selectedOrderId,
    setSelectedOrderId,
    selectedPostId,
    setSelectedPostId,
    selectedArticleId,
    setSelectedArticleId,
    searchKeyword,
    setSearchKeyword,
    orders: projection.orders,
    posts: projection.posts,
    messages: projection.messages,
    chatMessages: projection.chatMessages,
    timeLedger: projection.timeLedger,
    complaints: projection.complaints,
    volunteers: projection.volunteers,
    announcements: projection.announcements,
    banners: projection.banners,
    eldercareArticles: projection.eldercareArticles,
    playingArticleId,
    isAudioPlaying,
    playArticleAudio,
    stopArticleAudio,
    createHelpOrder,
    createPost,
    acceptOrder,
    clockInOrder,
    completeOrder,
    cancelOrder,
    likePost,
    bookmarkPost,
    addComment,
    enrollActivity,
    sendChatMessage,
    submitComplaint,
    triggerSos,
    verifyRealName,
    adminApprovePost,
    adminRejectPost,
    adminRejectPostWithReason,
    adminResolveComplaint,
    adminAdjustTimeCoin,
    storageStatus,
    storageError,
    lastSavedAt,
    hasUnreadableArchive,
    unreadableArchiveExported,
    exportBackup,
    exportUnreadableArchive,
    reloadArchive,
    resetDemoData,
    unreadMessagesCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

/** 演练身份 id → 展示名（供「我的」页切换身份使用）。 */
export const DEMO_IDENTITY_LABELS: Record<string, string> = {
  [MEMBERSHIP_USER_IDS.visitor]: '访客（未实名）',
  [MEMBERSHIP_USER_IDS.member]: '演练成员（已实名）',
  [MEMBERSHIP_USER_IDS.reviewer]: '审核员（演练）',
};

export { SYNTHETIC_DEMO_AUTHOR };
