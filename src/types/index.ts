export type UserRole = 'elder' | 'family' | 'volunteer' | 'admin';

export type VerifyStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  phone: string;
  name: string;
  nickname: string;
  avatar: string;
  role: UserRole;
  roleLabel: string;
  community: string;
  communityId: string;
  verifyStatus: VerifyStatus;
  idCardMasked?: string;
  timeCoins: number;
  volunteerHours: number;
  rating: number;
  completedTasks: number;
  tags: string[];
  phoneMasked: string;
  address: string;
}

export type HelpCategory = 
  | 'daily_chores'      // 日常家务
  | 'medical_escort'    // 陪同就医
  | 'chat_companion'    // 聊天陪伴
  | 'childcare_guide'   // 隔代育儿指导
  | 'urgent_help';      // 紧急求助

export type OrderStatus = 
  | 'pending_audit'     // 待审核
  | 'published'         // 接单大厅中(待接单)
  | 'accepted'          // 已接单(待上门)
  | 'in_progress'       // 志愿服务中(已签到)
  | 'pending_confirm'   // 待双方确认
  | 'completed'         // 服务完成/时长结算
  | 'cancelled'         // 已取消
  | 'disputed';         // 申诉中

export interface HelpOrder {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userPhoneMasked: string;
  userPhoneReal: string;
  community: string;
  category: HelpCategory;
  categoryLabel: string;
  title: string;
  description: string;
  locationArea: string;       // 翠湖花苑3期 (公开展示区)
  locationDetail: string;     // 8号楼2单元601 (接单后凭证可见)
  isUrgent: boolean;
  dateStr: string;
  timeStr: string;
  durationHours: number;
  timeCoinReward: number;
  photos: string[];
  medicalNotes?: string;      // 既往病史与禁忌说明 (加密脱敏，单独授权)
  consentSensitive: boolean;  // 是否勾选敏感信息单独授权
  status: OrderStatus;
  volunteerId?: string;
  volunteerName?: string;
  volunteerAvatar?: string;
  volunteerPhone?: string;
  volunteerRating?: number;
  volunteerDistance?: string;
  clockInTime?: string;
  completeTime?: string;
  ratingScore?: number;
  ratingComment?: string;
  disputeReason?: string;
  createdAt: string;
  auditNote?: string;
}

export type PostCategory = 'story' | 'help' | 'activity' | 'idle';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: UserRole;
  isAnonymous: boolean;
  isOfficial?: boolean;
  community: string;
  category: PostCategory;
  categoryLabel: string;
  title: string;
  content: string;
  images: string[];
  likesCount: number;
  isLiked?: boolean;
  bookmarksCount: number;
  isBookmarked?: boolean;
  comments: Comment[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  locationTag?: string;
  tags?: string[];
  activityDate?: string;
  activityEnrolledCount?: number;
  activityMaxCount?: number;
  isEnrolled?: boolean;
  idleItemStatus?: 'available' | 'lent_out' | 'gifted';
}

export interface TimeLedger {
  id: string;
  userId: string;
  orderId?: string;
  orderTitle: string;
  amount: number;       // +2 or -2
  type: 'earn' | 'spend' | 'admin_adjust' | 'reward';
  typeLabel: string;
  balanceAfter: number;
  description: string;
  createdAt: string;
  txHash: string;       // 幂等凭证编号
}

export interface MessageItem {
  id: string;
  type: 'system' | 'order' | 'chat' | 'complaint';
  title: string;
  content: string;
  orderId?: string;
  unread: boolean;
  timestamp: string;
  avatar?: string;
  senderName?: string;
  extra?: {
    actionText?: string;
    actionTarget?: string;
    statusBadge?: string;
  };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  isMe: boolean;
  text: string;
  type: 'text' | 'image' | 'location' | 'status_card';
  locationInfo?: {
    name: string;
    address: string;
  };
  imageUrl?: string;
  timestamp: string;
}

export interface VolunteerProfile {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  completedTasks: number;
  skills: string[];
  distance: string;
  phone: string;
  badge: string;
  isOnline: boolean;
  bio: string;
  community: string;
}

export interface EldercareArticle {
  id: string;
  title: string;
  category: 'care' | 'safety' | 'diet' | 'chronic';
  categoryLabel: string;
  summary: string;
  content: string[];
  audioText: string;
  audioDurationSec: number;
  readMinutes: number;
  views: number;
  tag: string;
  publishedAt: string;
  author: string;
}

export interface Announcement {
  id: string;
  title: string;
  tag: string;
  tagType: 'urgent' | 'rule' | 'event' | 'notice';
  date: string;
  content: string;
  isPinned: boolean;
  source: string;
}

export interface ComplaintTicket {
  id: string;
  ticketNo: string;
  userId: string;
  userName: string;
  orderId?: string;
  orderTitle?: string;
  targetUser?: string;
  reason: string;
  detail: string;
  evidencePhotos: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  statusLabel: string;
  resolutionNote?: string;
  handlerName?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  bgGradient: string;
  image: string;
  actionText: string;
  actionType: 'help' | 'tasks' | 'article' | 'community' | 'sos';
  targetId?: string;
}
