/**
 * 选择器层：把 mvp 领域状态投影成 232 的视图模型。
 *
 * 这是本轮**唯一**允许做“数据变形”的地方。原则（需求 §8.1）：
 * 不为让数据对上而修改 mvp 的类型或状态机；只在选择器里适配。
 * 所有函数都是纯函数，输入 `CommunityState` + 身份，输出 232 组件直接消费的
 * `User / HelpOrder / Post / MessageItem / ...`，因此可以单独测试。
 *
 * 三个必须由选择器守住的合规点：
 * 1. 详细地址与病史：只有发布者本人或已接单者可读（R6）。
 * 2. 未审内容不进信息流、不进接单大厅（R7）。
 * 3. 手机号、门牌号一律不回填任何看起来像真实号码的字符串。
 */
import type {
  CommunityState,
  DemoMessage,
  FictionalAuthor,
  LedgerEntry,
  MembershipRole,
  OrderEvent,
  Post as CommunityPost,
  Report,
} from '../data/community/types';
import { SYNTHETIC_DEMO_AUTHOR } from '../data/community/fixtures';
import type {
  Announcement,
  BannerItem,
  ChatMessage,
  Comment as ViewComment,
  ComplaintTicket,
  EldercareArticle,
  HelpCategory,
  HelpOrder,
  MessageItem,
  OrderStatus,
  Post as ViewPost,
  TimeLedger,
  User,
  UserRole,
  VolunteerProfile,
} from '../types';

/** 演练里“组织账号”的 id：UI 上的「项目组发布」筛选映射到它。 */
const SYNTHETIC_TEAM_AUTHOR_ID = 'SYNTH-AUTHOR-003';

const ORGANIZATION_LABEL = '互助演练·项目组（虚构）';

const COMMUNITY_NAME = '演练社区·梧桐里（虚构）';
const COMMUNITY_ID = 'SYNTH-COMMUNITY-WUTONGLI';

/** 演练不采集手机号，用一句可读说明占位，避免任何看起来像真实号码的字符串。 */
export const NO_PHONE_TEXT = '未提供（演练不采集手机号）';

/** 详细地址同理：只在接单后展示“为什么看不到”。 */
export const NO_DETAIL_ADDRESS_TEXT = '本机演练不采集门牌号（真实环境需单独同意后限时可见）';

const MEMBERSHIP_VIEW: Record<
  MembershipRole,
  { role: UserRole; roleLabel: string; name: string; nickname: string; verify: User['verifyStatus'] }
> = {
  visitor: {
    role: 'elder',
    roleLabel: '访客 · 未实名',
    name: '演练访客（未实名·虚构）',
    nickname: '演练访客',
    verify: 'unverified',
  },
  member: {
    role: 'volunteer',
    roleLabel: '演练成员 · 已实名',
    name: '演练用户·我（虚构）',
    nickname: '演练用户',
    verify: 'verified',
  },
  reviewer: {
    role: 'admin',
    roleLabel: '审核员（演练）',
    name: '演练审核员（虚构）',
    nickname: '演练审核员',
    verify: 'verified',
  },
};

export const MEMBERSHIP_USER_IDS: Record<MembershipRole, string> = {
  visitor: 'view-user-visitor',
  member: 'view-user-member',
  reviewer: 'view-user-reviewer',
};

export function membershipFromUserId(userId: string): MembershipRole {
  const entry = (Object.keys(MEMBERSHIP_USER_IDS) as MembershipRole[]).find(
    (role) => MEMBERSHIP_USER_IDS[role] === userId,
  );
  return entry ?? 'member';
}

/* ------------------------------------------------------------------ */
/* 基础格式化                                                          */
/* ------------------------------------------------------------------ */

const HELP_CATEGORY_BY_TEXT: Array<[RegExp, HelpCategory, string]> = [
  [/就医|陪诊|医院|复诊/, 'medical_escort', '陪同就医'],
  [/聊天|陪伴|聊天陪伴|唠嗑/, 'chat_companion', '聊天陪伴'],
  [/育儿|隔代|带娃|接送孩子/, 'childcare_guide', '隔代育儿指导'],
  [/紧急|急救|突发|急事/, 'urgent_help', '紧急求助'],
  [/家务|打扫|搬运|做饭|采买|物资/, 'daily_chores', '日常家务'],
];

function mapCategory(post: CommunityPost): { category: HelpCategory; label: string } {
  const text = `${post.category ?? ''} ${post.title}`;
  for (const [pattern, category, label] of HELP_CATEGORY_BY_TEXT) {
    if (pattern.test(text)) return { category, label };
  }
  return { category: 'daily_chores', label: post.category?.trim() || '待分类（演练）' };
}

/** 把「约 1 小时 / 90 分钟 / 2.5小时」解析成分钟；解析不出时按 60 分钟计。 */
export function parseDurationMinutes(duration: string | undefined): number {
  if (!duration) return 60;
  const hours = /(\d+(?:\.\d+)?)\s*(小时|時|h|hr|hours?)/i.exec(duration);
  if (hours) return Math.max(1, Math.round(Number(hours[1]) * 60));
  const minutes = /(\d+)\s*(分钟|分|min|minutes?)/i.exec(duration);
  if (minutes) return Math.max(1, Number(minutes[1]));
  return 60;
}

const pad = (value: number) => String(value).padStart(2, '0');

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${formatClock(iso)}`;
}

function formatRelative(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  const diff = Math.max(0, now - time);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatDateTime(iso);
}

/* ------------------------------------------------------------------ */
/* 用户与身份                                                          */
/* ------------------------------------------------------------------ */

export function buildUsers(state: CommunityState, membership: MembershipRole): User[] {
  const minutes = state.ledgerEntries.reduce((sum, entry) => sum + entry.minutes, 0);
  const completedCount = state.posts.filter(
    (post) => post.mode === 'help' && post.orderStatus === 'completed-local-demo',
  ).length;

  return (Object.keys(MEMBERSHIP_VIEW) as MembershipRole[]).map((role) => {
    const view = MEMBERSHIP_VIEW[role];
    return {
      id: MEMBERSHIP_USER_IDS[role],
      // 空字符串而不是假号码：组件里不会渲染出 tel: 链接。
      phone: '',
      name: view.name,
      nickname: view.nickname,
      avatar: '',
      role: view.role,
      roleLabel: view.roleLabel,
      community: COMMUNITY_NAME,
      communityId: COMMUNITY_ID,
      verifyStatus: view.verify,
      // 演练不接收身份证号，也不保存掩码后的片段（R5：不做身份证采集）。
      idCardMasked: undefined,
      timeCoins: role === membership ? Math.round((minutes / 60) * 10) / 10 : 0,
      volunteerHours: role === membership ? Math.round((minutes / 60) * 10) / 10 : 0,
      rating: 0,
      completedTasks: role === membership ? completedCount : 0,
      tags: [],
      phoneMasked: NO_PHONE_TEXT,
      // 只到小区一级，不含楼栋门牌（R6）。
      address: COMMUNITY_NAME,
    } satisfies User;
  });
}

/* ------------------------------------------------------------------ */
/* 求助订单                                                            */
/* ------------------------------------------------------------------ */

function orderStatusOf(post: CommunityPost): OrderStatus {
  if (post.moderation === 'pending') return 'pending_audit';
  if (post.moderation === 'rejected' || post.moderation === 'hidden') return 'cancelled';

  switch (post.orderStatus) {
    case 'open':
      return 'published';
    case 'accepted-local-demo':
      // 签到是选择器层面的派生：mvp 状态机不为“服务中”单开状态。
      return hasClockIn(post) ? 'in_progress' : 'accepted';
    case 'completion-requested':
      return 'pending_confirm';
    case 'completed-local-demo':
      return 'completed';
    case 'cancelled-local-demo':
      return 'cancelled';
    case 'disputed-local-demo':
      return 'disputed';
    default:
      return 'published';
  }
}

export function hasClockIn(post: CommunityPost): boolean {
  return (post.orderEvents ?? []).some((event) => event.type === 'clock-in');
}

function clockInAt(post: CommunityPost): string | undefined {
  const event = (post.orderEvents ?? []).find((item) => item.type === 'clock-in');
  return event ? formatClock(event.createdAt) : undefined;
}

function lastEventOfType(post: CommunityPost, type: OrderEvent['type']): OrderEvent | undefined {
  const events = (post.orderEvents ?? []).filter((event) => event.type === type);
  return events[events.length - 1];
}

/** 本人是否参与该订单（发布者或接单者）——决定敏感信息可见性。 */
function viewerParticipates(post: CommunityPost): boolean {
  return post.author.id === SYNTHETIC_DEMO_AUTHOR.id || post.acceptedByMe === true;
}

function authorName(author: FictionalAuthor): string {
  if (author.id === SYNTHETIC_TEAM_AUTHOR_ID) return ORGANIZATION_LABEL;
  return author.name;
}

/**
 * 信息流与订单里的 `userId` / `volunteerId` 是**领域层**的作者 id；组件却拿
 * `currentUser.id`（视图身份 id）做相等比较。演练里「我」在数据层固定是
 * `SYNTHETIC_DEMO_AUTHOR`，在视图层按 membership 有三个 id，两边直接比会永假，
 * 于是「我的订单」为空、接单后也看不到「上门签到」。这里在选择器把本人投影成
 * 当前视图 id，数据层与组件都不动（需求 §8.1：只允许 selectors 做变形）。
 */
function viewAuthorId(authorId: string, viewerId?: string): string {
  if (!viewerId) return authorId;
  return authorId === SYNTHETIC_DEMO_AUTHOR.id ? viewerId : authorId;
}

export function buildOrder(post: CommunityPost, viewerId?: string): HelpOrder {
  const { category, label } = mapCategory(post);
  const minutes = parseDurationMinutes(post.duration);
  const participates = viewerParticipates(post);
  const acceptedByCounterpart =
    post.orderStatus !== undefined
    && post.orderStatus !== 'open'
    && post.acceptedByMe !== true;

  return {
    id: post.id,
    userId: viewAuthorId(post.author.id, viewerId),
    userName: authorName(post.author),
    userAvatar: '',
    userPhoneMasked: NO_PHONE_TEXT,
    userPhoneReal: NO_PHONE_TEXT,
    community: post.location,
    category,
    categoryLabel: label,
    title: post.title,
    description: post.content,
    locationArea: post.location,
    // 未接单只到小区；接单后也不回填门牌，而是说明“为何没有”（R6）。
    locationDetail: participates ? NO_DETAIL_ADDRESS_TEXT : '',
    isUrgent: category === 'urgent_help',
    dateStr: post.timeWindow?.trim() || '时间未定（演练）',
    timeStr: '',
    durationHours: Math.round((minutes / 60) * 10) / 10,
    timeCoinReward: Math.round((minutes / 60) * 10) / 10,
    photos: [],
    // 病史/特殊注意事项：只有参与双方可读（R6）。
    medicalNotes: participates ? post.specialNote : undefined,
    consentSensitive: Boolean(post.specialNote),
    status: orderStatusOf(post),
    volunteerId: post.acceptedByMe
      ? viewAuthorId(SYNTHETIC_DEMO_AUTHOR.id, viewerId)
      : acceptedByCounterpart
        ? 'SYNTH-AUTHOR-002'
        : undefined,
    volunteerName: post.acceptedByMe
      ? MEMBERSHIP_VIEW.member.name
      : acceptedByCounterpart
        ? '合成邻居（演练）'
        : undefined,
    volunteerAvatar: '',
    volunteerPhone: post.acceptedByMe || acceptedByCounterpart ? NO_PHONE_TEXT : undefined,
    volunteerRating: undefined,
    volunteerDistance: acceptedByCounterpart ? '本机演练不定位' : undefined,
    clockInTime: clockInAt(post),
    completeTime: lastEventOfType(post, 'confirm-completion')
      ? formatClock(lastEventOfType(post, 'confirm-completion')!.createdAt)
      : undefined,
    ratingScore: post.orderFeedback?.rating,
    ratingComment: post.orderFeedback?.note,
    disputeReason: lastEventOfType(post, 'dispute')?.note,
    createdAt: formatRelative(post.createdAt, Date.now()),
    auditNote: post.reviewNote,
  };
}

/** 接单大厅与「我的订单」都从这里取；未审与已驳回不进大厅。 */
export function buildOrders(state: CommunityState, viewerId?: string): HelpOrder[] {
  return state.posts
    .filter((post) => post.mode === 'help')
    .filter((post) => post.moderation !== 'hidden')
    .map((post) => buildOrder(post, viewerId))
    .sort((a, b) => {
      if (a.status === 'published' && b.status !== 'published') return -1;
      if (b.status === 'published' && a.status !== 'published') return 1;
      return 0;
    });
}

/* ------------------------------------------------------------------ */
/* 社区帖子                                                            */
/* ------------------------------------------------------------------ */

function postCategoryOf(post: CommunityPost): ViewPost['category'] {
  if (post.mode === 'help') return 'help';
  if (post.mode === 'volunteer') return post.volunteerKind === 'activity' ? 'activity' : 'story';
  // 邻里帖与闲置互助在 mvp 里同属 neighbor；232 用 idle 承载「0 币借赠」区块。
  return 'idle';
}

const POST_CATEGORY_LABELS: Record<ViewPost['category'], string> = {
  help: '求助交流',
  story: '志愿风采',
  activity: '线下活动',
  idle: '闲置互助',
};

function moderationToStatus(post: CommunityPost): ViewPost['status'] {
  if (post.moderation === 'approved') return 'approved';
  if (post.moderation === 'pending') return 'pending';
  return 'rejected';
}

function buildComment(
  comment: CommunityPost['comments'][number],
  currentUserName: string,
): ViewComment {
  const mine = comment.author.id === SYNTHETIC_DEMO_AUTHOR.id;
  return {
    id: comment.id,
    userId: comment.author.id,
    userName: mine ? currentUserName : authorName(comment.author),
    userAvatar: '',
    userRole: comment.author.id === SYNTHETIC_TEAM_AUTHOR_ID ? 'admin' : 'volunteer',
    content: comment.content,
    createdAt: formatRelative(comment.createdAt, Date.now()),
    likesCount: 0,
    isLiked: false,
  };
}

export function buildPost(post: CommunityPost, currentUserName: string, viewerId?: string): ViewPost {
  const category = postCategoryOf(post);
  const anonymous = post.anonymous === true;
  const isOrganization = post.author.id === SYNTHETIC_TEAM_AUTHOR_ID;

  return {
    id: post.id,
    userId: viewAuthorId(post.author.id, viewerId),
    // 匿名仅前台匿名：后台（审核/日志）仍能定位作者，见 A+ 与 AdminCenter。
    userName: anonymous ? '匿名邻里（演练）' : authorName(post.author),
    userAvatar: '',
    userRole: isOrganization ? 'admin' : 'volunteer',
    isAnonymous: anonymous,
    isOfficial: isOrganization,
    community: post.location,
    category,
    categoryLabel: POST_CATEGORY_LABELS[category],
    title: post.title,
    content: post.content,
    images: [],
    likesCount: post.likeCount,
    isLiked: post.likedByMe,
    bookmarksCount: post.favorited ? 1 : 0,
    isBookmarked: post.favorited,
    // 未审评论不进信息流（R7）；自己的待审评论用 toast 反馈，不在此处伪造。
    comments: post.comments
      .filter((comment) => comment.moderation === 'approved')
      .map((comment) => buildComment(comment, currentUserName)),
    status: moderationToStatus(post),
    createdAt: formatRelative(post.createdAt, Date.now()),
    locationTag: post.location,
    tags: post.category ? [post.category] : [],
    activityDate: post.eventStartsAt ? formatDateTime(post.eventStartsAt) : undefined,
    activityEnrolledCount: post.eventSignupCount ?? 0,
    activityMaxCount: post.eventCapacity,
    isEnrolled: post.signedUpByMe === true,
    idleItemStatus: category === 'idle' ? 'available' : undefined,
  };
}

/**
 * 信息流：只有审核通过、且未关闭“同步到社区”的内容会出现。
 * `includeUnapproved` 仅供审核后台使用（AdminCenter 自己会再筛一次）。
 */
export function buildPosts(state: CommunityState, currentUserName: string, viewerId?: string): ViewPost[] {
  return [...state.posts]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((post) => buildPost(post, currentUserName, viewerId))
    .filter((post) => post.status === 'approved');
}

/* ------------------------------------------------------------------ */
/* 消息中心                                                            */
/* ------------------------------------------------------------------ */

function messageTypeFor(sender: DemoMessage['sender'], threadKind: string): MessageItem['type'] {
  if (threadKind === 'order') return 'order';
  if (sender === 'system') return 'system';
  return 'chat';
}

function buildMessageItem(message: DemoMessage, threadKind: string, readAt: number | null): MessageItem {
  return {
    id: message.id,
    type: messageTypeFor(message.sender, threadKind),
    title: threadKind === 'order' ? '订单消息（演练）' : threadKind === 'system' ? '系统通知（演练）' : '演练留言',
    content: message.automaticReply ? `【合成自动回复】${message.content}` : message.content,
    unread: readAt === null || Date.parse(message.createdAt) > readAt,
    timestamp: formatRelative(message.createdAt, Date.now()),
    senderName: message.sender === 'system' ? '系统（演练）' : '演练联系人（虚构）',
  };
}

export function buildMessages(state: CommunityState): MessageItem[] {
  const readAt = state.notificationsReadAt ? Date.parse(state.notificationsReadAt) : null;
  const items = state.threads.flatMap((thread) =>
    thread.messages
      .filter((message) => message.hidden !== true)
      .map((message) => buildMessageItem(message, thread.kind, readAt)),
  );
  return items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export function buildChatMessages(state: CommunityState): ChatMessage[] {
  return state.threads
    .filter((thread) => thread.kind === 'chat' || thread.kind === 'order')
    .flatMap((thread) =>
      thread.messages
        .filter((message) => message.hidden !== true)
        .map<ChatMessage>((message) => ({
          id: message.id,
          conversationId: thread.id,
          senderId: message.sender === 'demo-user' ? SYNTHETIC_DEMO_AUTHOR.id : `synthetic:${message.sender}`,
          senderName: message.sender === 'demo-user' ? '我（演练）' : '演练联系人（虚构）',
          senderAvatar: '',
          isMe: message.sender === 'demo-user',
          text: message.automaticReply ? `【合成自动回复】${message.content}` : message.content,
          type: 'text',
          timestamp: formatClock(message.createdAt),
        })),
    );
}

/* ------------------------------------------------------------------ */
/* 时间账本                                                            */
/* ------------------------------------------------------------------ */

function ledgerTypeLabel(entry: LedgerEntry): string {
  return entry.status === 'unsettled' ? '演练记账（未结算）' : '演练记账';
}

/**
 * 账本只读：`amount` 单位是**分钟**（1 币 = 60 分钟），由 ProfileTab 直接以「分钟」展示。
 * 这样「未结算」不会被误读成余额。
 */
export function buildTimeLedger(state: CommunityState, userId: string): TimeLedger[] {
  return state.ledgerEntries.map((entry) => ({
    id: entry.id,
    userId,
    orderTitle: entry.title,
    amount: entry.minutes,
    type: 'earn',
    typeLabel: ledgerTypeLabel(entry),
    balanceAfter: 0,
    description: entry.note,
    createdAt: formatDateTime(entry.createdAt),
    txHash: entry.id,
  }));
}

/* ------------------------------------------------------------------ */
/* 投诉 / 举报                                                         */
/* ------------------------------------------------------------------ */

const REPORT_STATUS_LABELS: Record<Report['status'], string> = {
  pending: '待处理',
  resolved: '已处理',
  dismissed: '已驳回',
};

export function buildReports(state: CommunityState): ComplaintTicket[] {
  const posts = new Map(state.posts.map((post) => [post.id, post]));
  return [...(state.reports ?? [])]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((report) => {
      const target = report.targetType === 'post' ? posts.get(report.targetId) : undefined;
      return {
        id: report.id,
        ticketNo: report.id.replace('SYNTH-REPORT-', 'JB-'),
        userId: report.reporter?.id ?? '',
        userName: report.reporter?.name ?? '未记录举报人（旧档）',
        orderId: report.targetType === 'post' ? report.targetId : undefined,
        orderTitle: target?.title,
        targetUser: report.targetType === 'post' ? '演练帖子' : report.targetType === 'comment' ? '演练评论' : '演练留言',
        // 举报目标随视图透出：管理端据此区分「帖子 / 评论 / 留言」，避免把评论举报显示成帖子。
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        detail: report.resolution ?? '',
        evidencePhotos: [],
        status: report.status,
        statusLabel: REPORT_STATUS_LABELS[report.status],
        resolutionNote: report.resolution,
        handlerName: report.status === 'pending' ? undefined : '演练审核员',
        createdAt: formatDateTime(report.createdAt),
        resolvedAt: report.status === 'pending' ? undefined : formatDateTime(report.createdAt),
      } satisfies ComplaintTicket;
    });
}

/* ------------------------------------------------------------------ */
/* 志愿者（由 FictionalAuthor 派生）                                    */
/* ------------------------------------------------------------------ */

const AUTHOR_SKILLS: Record<string, string[]> = {
  'SYNTH-AUTHOR-001': ['日常家务', '邻里协调'],
  'SYNTH-AUTHOR-002': ['共享空间整理', '陪伴聊天'],
  'SYNTH-AUTHOR-003': ['活动组织', '步道清洁'],
  'SYNTH-AUTHOR-004': ['绿植养护', '闲置互助'],
};

export function buildVolunteers(state: CommunityState): VolunteerProfile[] {
  const authors = new Map<string, FictionalAuthor>();
  for (const post of state.posts) authors.set(post.author.id, post.author);
  for (const comment of state.posts.flatMap((post) => post.comments)) {
    authors.set(comment.author.id, comment.author);
  }

  return [...authors.values()]
    .filter((author) => author.id !== SYNTHETIC_DEMO_AUTHOR.id)
    .map((author) => {
      const accepted = state.posts.filter(
        (post) => post.author.id === author.id && post.orderStatus === 'completed-local-demo',
      ).length;
      return {
        id: author.id,
        name: authorName(author),
        avatar: '',
        // 没有真实评价数据时保持 0，并在界面标为「暂无评分」，不编造 4.9 分。
        rating: 0,
        completedTasks: accepted,
        skills: AUTHOR_SKILLS[author.id] ?? ['邻里互助'],
        distance: '未定位（演练）',
        phone: NO_PHONE_TEXT,
        badge: author.id === SYNTHETIC_TEAM_AUTHOR_ID ? '组织账号' : '演练成员',
        isOnline: false,
        bio: '合成演练身份，不对应任何真实居民。',
        community: COMMUNITY_NAME,
      } satisfies VolunteerProfile;
    });
}

/* ------------------------------------------------------------------ */
/* 聚合                                                                */
/* ------------------------------------------------------------------ */

export interface CommunityProjection {
  users: User[];
  orders: HelpOrder[];
  posts: ViewPost[];
  messages: MessageItem[];
  chatMessages: ChatMessage[];
  timeLedger: TimeLedger[];
  complaints: ComplaintTicket[];
  volunteers: VolunteerProfile[];
}

export function projectCommunity(
  state: CommunityState,
  membership: MembershipRole,
  announcements: Announcement[],
  banners: BannerItem[],
  articles: EldercareArticle[],
): CommunityProjection & {
  announcements: Announcement[];
  banners: BannerItem[];
  eldercareArticles: EldercareArticle[];
} {
  const users = buildUsers(state, membership);
  const currentUser = users.find((user) => user.id === MEMBERSHIP_USER_IDS[membership]) ?? users[1];
  return {
    users,
    orders: buildOrders(state, currentUser.id),
    posts: buildPosts(state, currentUser.name, currentUser.id),
    messages: buildMessages(state),
    chatMessages: buildChatMessages(state),
    timeLedger: buildTimeLedger(state, currentUser.id),
    complaints: buildReports(state),
    volunteers: buildVolunteers(state),
    announcements,
    banners,
    eldercareArticles: articles,
  };
}
