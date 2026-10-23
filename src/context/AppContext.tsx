import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  User, 
  HelpOrder, 
  Post, 
  TimeLedger, 
  MessageItem, 
  VolunteerProfile, 
  EldercareArticle, 
  Announcement, 
  BannerItem, 
  ComplaintTicket, 
  ChatMessage,
  Comment
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_ORDERS, 
  INITIAL_POSTS, 
  INITIAL_TIME_LEDGER, 
  INITIAL_MESSAGES, 
  INITIAL_CHAT_MESSAGES, 
  INITIAL_VOLUNTEERS, 
  INITIAL_ARTICLES, 
  INITIAL_ANNOUNCEMENTS, 
  INITIAL_BANNERS, 
  INITIAL_COMPLAINTS 
} from '../data/mockData';
import { sound } from '../utils/audio';
import { safeRead, safeWrite, isArray } from '../utils/storage';

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

interface AppContextType {
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
  adminResolveComplaint: (ticketId: string, resolution: string) => void;
  adminAdjustTimeCoin: (userId: string, amount: number, note: string) => void;
  
  // UI helpers
  unreadMessagesCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 本地存档容错读取：单条损坏自动回退默认数据，绝不白屏（见 utils/storage.ts）
  const [users, setUsers] = useState<User[]>(() =>
    safeRead<User[]>('cuihu.users', INITIAL_USERS, isArray),
  );

  const [currentUserId, setCurrentUserId] = useState<string>('user_elder_1');
  const [viewMode, setViewMode] = useState<'mobile_frame' | 'responsive_web'>('responsive_web');
  const [elderlyMode, setElderlyMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'home' | 'community' | 'publish' | 'messages' | 'profile'>('home');
  const [activeSubPage, setActiveSubPage] = useState<SubPageType>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const [orders, setOrders] = useState<HelpOrder[]>(() =>
    safeRead<HelpOrder[]>('cuihu.orders', INITIAL_ORDERS, isArray),
  );

  const [posts, setPosts] = useState<Post[]>(() =>
    safeRead<Post[]>('cuihu.posts', INITIAL_POSTS, isArray),
  );

  const [messages, setMessages] = useState<MessageItem[]>(() =>
    safeRead<MessageItem[]>('cuihu.messages', INITIAL_MESSAGES, isArray),
  );

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    safeRead<ChatMessage[]>('cuihu.chats', INITIAL_CHAT_MESSAGES, isArray),
  );

  const [timeLedger, setTimeLedger] = useState<TimeLedger[]>(() =>
    safeRead<TimeLedger[]>('cuihu.ledger', INITIAL_TIME_LEDGER, isArray),
  );

  const [complaints, setComplaints] = useState<ComplaintTicket[]>(() =>
    safeRead<ComplaintTicket[]>('cuihu.complaints', INITIAL_COMPLAINTS, isArray),
  );

  const [volunteers] = useState<VolunteerProfile[]>(INITIAL_VOLUNTEERS);
  const [announcements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [banners] = useState<BannerItem[]>(INITIAL_BANNERS);
  const [eldercareArticles] = useState<EldercareArticle[]>(INITIAL_ARTICLES);

  const [playingArticleId, setPlayingArticleId] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  // 同步本地存档（写入失败不抛异常：隐私模式/配额满时仍可正常使用）
  useEffect(() => {
    safeWrite('cuihu.orders', orders);
  }, [orders]);

  useEffect(() => {
    safeWrite('cuihu.posts', posts);
  }, [posts]);

  useEffect(() => {
    safeWrite('cuihu.users', users);
  }, [users]);

  useEffect(() => {
    safeWrite('cuihu.ledger', timeLedger);
  }, [timeLedger]);

  useEffect(() => {
    safeWrite('cuihu.messages', messages);
  }, [messages]);

  useEffect(() => {
    safeWrite('cuihu.chats', chatMessages);
  }, [chatMessages]);

  useEffect(() => {
    safeWrite('cuihu.complaints', complaints);
  }, [complaints]);

  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const switchUser = (userId: string) => {
    setCurrentUserId(userId);
    sound.playTap();
  };

  // Audio Player
  const playArticleAudio = (article: EldercareArticle) => {
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
  };

  const stopArticleAudio = () => {
    sound.stopSpeaking();
    setIsAudioPlaying(false);
    setPlayingArticleId(null);
  };

  // Create Help Order
  const createHelpOrder = (orderData: Partial<HelpOrder>) => {
    const newId = `order_${Date.now()}`;
    const newOrder: HelpOrder = {
      id: newId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userPhoneMasked: currentUser.phoneMasked,
      userPhoneReal: currentUser.phone,
      community: currentUser.community,
      category: orderData.category || 'daily_chores',
      categoryLabel: orderData.categoryLabel || '日常家务',
      title: orderData.title || '社区求助需求',
      description: orderData.description || '',
      locationArea: orderData.locationArea || '翠湖花园3期',
      locationDetail: orderData.locationDetail || currentUser.address,
      isUrgent: orderData.isUrgent || false,
      dateStr: orderData.dateStr || '今天',
      timeStr: orderData.timeStr || '14:00 - 16:00',
      durationHours: orderData.durationHours || 2,
      timeCoinReward: orderData.timeCoinReward || 2,
      photos: orderData.photos || [],
      medicalNotes: orderData.medicalNotes || '',
      consentSensitive: orderData.consentSensitive || true,
      status: 'published', // Directly published in controlled sandbox
      createdAt: '刚刚'
    };

    setOrders(prev => [newOrder, ...prev]);

    // Send order message
    const newMsg: MessageItem = {
      id: `msg_${Date.now()}`,
      type: 'order',
      title: '求助订单已发布至接单大厅',
      content: `您的求助【${newOrder.title}】已成功发布，正等待就近志愿者认领。`,
      orderId: newId,
      unread: true,
      timestamp: '刚刚',
      extra: {
        statusBadge: '待接单',
        actionText: '查看订单',
        actionTarget: newId
      }
    };
    setMessages(prev => [newMsg, ...prev]);

    sound.playSuccess();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // Confetti fallback
    }
  };

  // Create UGC Post / Moment
  const createPost = (postData: Partial<Post>) => {
    const newId = `post_${Date.now()}`;
    const newPost: Post = {
      id: newId,
      userId: currentUser.id,
      userName: postData.isAnonymous ? '匿名邻里' : currentUser.name,
      userAvatar: postData.isAnonymous ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80' : currentUser.avatar,
      userRole: currentUser.role,
      isAnonymous: postData.isAnonymous || false,
      isOfficial: currentUser.role === 'admin',
      community: currentUser.community,
      category: postData.category || 'story',
      categoryLabel: postData.categoryLabel || '志愿风采',
      title: postData.title || '',
      content: postData.content || '',
      images: postData.images || [],
      likesCount: 0,
      isLiked: false,
      bookmarksCount: 0,
      isBookmarked: false,
      comments: [],
      status: 'approved',
      createdAt: '刚刚',
      locationTag: postData.locationTag || '翠湖花园社区',
      tags: postData.tags || ['邻里互助']
    };

    setPosts(prev => [newPost, ...prev]);
    sound.playSuccess();
  };

  // Accept Order (Volunteer accepts)
  const acceptOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: 'accepted',
          volunteerId: currentUser.id,
          volunteerName: currentUser.name,
          volunteerAvatar: currentUser.avatar,
          volunteerPhone: currentUser.phone,
          volunteerRating: currentUser.rating,
          volunteerDistance: '320米'
        };
      }
      return order;
    }));

    // Notification
    const newMsg: MessageItem = {
      id: `msg_${Date.now()}`,
      type: 'order',
      title: '您已成功认领互助订单',
      content: '请按时佩戴志愿者徽章前往服务地点，上门前建议通过订单留言与长者提前确认细节。',
      orderId: orderId,
      unread: true,
      timestamp: '刚刚',
      extra: {
        statusBadge: '已接单',
        actionText: '进入服务沟通',
        actionTarget: orderId
      }
    };
    setMessages(prev => [newMsg, ...prev]);

    sound.playSuccess();
  };

  // Clock In (Volunteer arrives)
  const clockInOrder = (orderId: string) => {
    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: 'in_progress',
          clockInTime: timeStr
        };
      }
      return order;
    }));

    sound.playNotification();
  };

  // Complete Order & Settle Time Coins
  const completeOrder = (orderId: string, ratingScore = 5, ratingComment = '服务非常满意，志愿者准时热情！') => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const completeTimeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const coins = targetOrder.timeCoinReward || 2;

    // Update order
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: 'completed',
          completeTime: completeTimeStr,
          ratingScore,
          ratingComment
        };
      }
      return order;
    }));

    // Update users: Volunteer +coins, hours; Elder -coins or stats
    const volId = targetOrder.volunteerId || 'user_volunteer_1';
    setUsers(prev => prev.map(u => {
      if (u.id === volId) {
        return {
          ...u,
          timeCoins: u.timeCoins + coins,
          volunteerHours: u.volunteerHours + targetOrder.durationHours,
          completedTasks: u.completedTasks + 1
        };
      }
      if (u.id === targetOrder.userId) {
        return {
          ...u,
          timeCoins: Math.max(0, u.timeCoins - coins),
          completedTasks: u.completedTasks + 1
        };
      }
      return u;
    }));

    // Add Time Ledgers (Immutable double-entry)
    const txIdVol = `tx_${Date.now()}_v`;
    const newVolLedger: TimeLedger = {
      id: txIdVol,
      userId: volId,
      orderId: targetOrder.id,
      orderTitle: targetOrder.title,
      amount: coins,
      type: 'earn',
      typeLabel: '志愿服务入账',
      balanceAfter: (users.find(u => u.id === volId)?.timeCoins || 80) + coins,
      description: `完成【${targetOrder.title}】服务，获得 ${coins} 时长币`,
      createdAt: '刚刚',
      txHash: `TX-${Date.now().toString().slice(-8)}`
    };

    const txIdElder = `tx_${Date.now()}_e`;
    const newElderLedger: TimeLedger = {
      id: txIdElder,
      userId: targetOrder.userId,
      orderId: targetOrder.id,
      orderTitle: targetOrder.title,
      amount: -coins,
      type: 'spend',
      typeLabel: '求助服务结算',
      balanceAfter: Math.max(0, (users.find(u => u.id === targetOrder.userId)?.timeCoins || 28) - coins),
      description: `支付【${targetOrder.title}】志愿者时长 ${coins} 币`,
      createdAt: '刚刚',
      txHash: `TX-${(Date.now() + 1).toString().slice(-8)}`
    };

    setTimeLedger(prev => [newVolLedger, newElderLedger, ...prev]);

    // System Message
    const settlementMsg: MessageItem = {
      id: `msg_${Date.now()}`,
      type: 'system',
      title: '订单完成与时间币到账提醒',
      content: `订单【${targetOrder.title}】已圆满完成双向确认，${coins} 时长币已安全入账时间银行。`,
      orderId: targetOrder.id,
      unread: true,
      timestamp: '刚刚',
      extra: {
        statusBadge: '已结算'
      }
    };
    setMessages(prev => [settlementMsg, ...prev]);

    sound.playSuccess();
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // Confetti fallback
    }
  };

  // Cancel Order
  const cancelOrder = (orderId: string, reason: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: 'cancelled',
          auditNote: reason
        };
      }
      return order;
    }));
    sound.playTap();
  };

  // Social Feed Actions
  const likePost = (postId: string) => {
    sound.playTap();
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = !p.isLiked;
        return {
          ...p,
          isLiked,
          likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1
        };
      }
      return p;
    }));
  };

  const bookmarkPost = (postId: string) => {
    sound.playTap();
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isBookmarked = !p.isBookmarked;
        return {
          ...p,
          isBookmarked,
          bookmarksCount: isBookmarked ? p.bookmarksCount + 1 : p.bookmarksCount - 1
        };
      }
      return p;
    }));
  };

  const addComment = (postId: string, content: string) => {
    if (!content.trim()) return;
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userRole: currentUser.role,
      content: content.trim(),
      createdAt: '刚刚',
      likesCount: 0
    };

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [newComment, ...p.comments]
        };
      }
      return p;
    }));

    sound.playSuccess();
  };

  const enrollActivity = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId && p.category === 'activity') {
        const isEnrolled = !p.isEnrolled;
        return {
          ...p,
          isEnrolled,
          activityEnrolledCount: isEnrolled ? (p.activityEnrolledCount || 0) + 1 : (p.activityEnrolledCount || 0) - 1
        };
      }
      return p;
    }));
    sound.playSuccess();
  };

  // Chat message sending with simulated response
  const sendChatMessage = (conversationId: string, text: string, type: 'text' | 'location' = 'text') => {
    const newMsg: ChatMessage = {
      id: `chat_${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      isMe: true,
      text,
      type,
      locationInfo: type === 'location' ? {
        name: '翠湖花园3期8号楼单元门前',
        address: '翠湖南路28号'
      } : undefined,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    sound.playTap();

    // Simulate auto reply after 1.2s if sending to volunteer/elder
    setTimeout(() => {
      const isElder = currentUser.role === 'elder';
      const autoText = isElder 
        ? '收到大爷！您在屋里安心歇着，我快步走过去，马上敲门！'
        : '好的小同志，门虚掩着的，进来直接换鞋套就行，麻烦你了！';
      
      const replyMsg: ChatMessage = {
        id: `chat_${Date.now() + 1}`,
        conversationId,
        senderId: isElder ? 'user_volunteer_1' : 'user_elder_1',
        senderName: isElder ? '陈明 (志愿者)' : '张建国 (长者)',
        senderAvatar: isElder ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' : 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
        isMe: false,
        text: autoText,
        type: 'text',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, replyMsg]);
      sound.playNotification();
    }, 1200);
  };

  // Complaint submission
  const submitComplaint = (data: Partial<ComplaintTicket>) => {
    const newTicket: ComplaintTicket = {
      id: `cmp_${Date.now()}`,
      ticketNo: `TS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      orderId: data.orderId || 'order_1001',
      orderTitle: data.orderTitle || '社区互助服务',
      targetUser: data.targetUser || '涉事人员',
      reason: data.reason || '服务不规范',
      detail: data.detail || '',
      evidencePhotos: data.evidencePhotos || [],
      status: 'pending',
      statusLabel: '等待网格长核查',
      createdAt: '刚刚'
    };

    setComplaints(prev => [newTicket, ...prev]);
    sound.playSuccess();
  };

  // Emergency SOS Trigger
  const triggerSos = () => {
    sound.playSosAlert();
    setActiveSubPage('sos_modal');
  };

  // Real-name verification
  const verifyRealName = (name: string, idCard: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          name,
          verifyStatus: 'verified',
          idCardMasked: `${idCard.slice(0, 6)}****${idCard.slice(-4)}`
        };
      }
      return u;
    }));
    sound.playSuccess();
  };

  // Admin Actions
  const adminApprovePost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved' } : p));
    sound.playSuccess();
  };

  const adminRejectPost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'rejected' } : p));
    sound.playTap();
  };

  const adminResolveComplaint = (ticketId: string, resolution: string) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === ticketId) {
        return {
          ...c,
          status: 'resolved',
          statusLabel: '已调解办结',
          resolutionNote: resolution,
          handlerName: currentUser.name,
          resolvedAt: '刚刚'
        };
      }
      return c;
    }));
    sound.playSuccess();
  };

  const adminAdjustTimeCoin = (userId: string, amount: number, note: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          timeCoins: Math.max(0, u.timeCoins + amount)
        };
      }
      return u;
    }));

    const tx: TimeLedger = {
      id: `tx_admin_${Date.now()}`,
      userId,
      orderTitle: '社区网格管理员手工调账（留痕）',
      amount,
      type: 'admin_adjust',
      typeLabel: '管理员人工核准',
      balanceAfter: (users.find(u => u.id === userId)?.timeCoins || 0) + amount,
      description: note,
      createdAt: '刚刚',
      txHash: `ADM-${Date.now().toString().slice(-8)}`
    };

    setTimeLedger(prev => [tx, ...prev]);
    sound.playSuccess();
  };

  const unreadMessagesCount = messages.filter(m => m.unread).length;

  return (
    <AppContext.Provider value={{
      currentUser,
      users,
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
      orders,
      posts,
      messages,
      chatMessages,
      timeLedger,
      complaints,
      volunteers,
      announcements,
      banners,
      eldercareArticles,
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
      adminResolveComplaint,
      adminAdjustTimeCoin,
      unreadMessagesCount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
