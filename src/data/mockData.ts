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
  ChatMessage 
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user_elder_1',
    phone: '138****9218',
    name: '张建国',
    nickname: '张大爷 (72岁/独居)',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
    role: 'elder',
    roleLabel: '长者 (居民)',
    community: '翠湖花园社区',
    communityId: 'cuihu_01',
    verifyStatus: 'verified',
    idCardMasked: '3201061954****1832',
    timeCoins: 28,
    volunteerHours: 0,
    rating: 4.9,
    completedTasks: 14,
    tags: ['独居老人', '高血压日常照护', '二楼住户'],
    phoneMasked: '138****9218',
    address: '翠湖花园3期8号楼2单元601'
  },
  {
    id: 'user_family_1',
    phone: '139****8823',
    name: '李静',
    nickname: '李静 (家属代办)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    role: 'family',
    roleLabel: '长者家属',
    community: '翠湖花园社区',
    communityId: 'cuihu_01',
    verifyStatus: 'verified',
    idCardMasked: '3201061985****2341',
    timeCoins: 15,
    volunteerHours: 4,
    rating: 5.0,
    completedTasks: 3,
    tags: ['长者子女', '异地代办', '爱心居民'],
    phoneMasked: '139****8823',
    address: '翠湖花园1期2号楼1单元1202'
  },
  {
    id: 'user_volunteer_1',
    phone: '136****5510',
    name: '陈明',
    nickname: '陈明 (五星金牌志愿者)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    role: 'volunteer',
    roleLabel: '认证志愿者',
    community: '翠湖花园社区',
    communityId: 'cuihu_01',
    verifyStatus: 'verified',
    idCardMasked: '3201061994****6618',
    timeCoins: 86,
    volunteerHours: 142.5,
    rating: 4.98,
    completedTasks: 68,
    tags: ['急救员证书', '慢病陪同', '家电小修', '心理慰藉'],
    phoneMasked: '136****5510',
    address: '翠湖花园4期12号楼1单元302'
  },
  {
    id: 'user_admin_1',
    phone: '189****0011',
    name: '王主任',
    nickname: '王芳 (社区网格总支长)',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    role: 'admin',
    roleLabel: '社区管理员',
    community: '翠湖花园社区',
    communityId: 'cuihu_01',
    verifyStatus: 'verified',
    idCardMasked: '3201061978****1122',
    timeCoins: 200,
    volunteerHours: 320,
    rating: 5.0,
    completedTasks: 180,
    tags: ['网格长', '调解员', '认证社工师'],
    phoneMasked: '189****0011',
    address: '翠湖花园社区党群服务中心2楼'
  }
];

export const INITIAL_BANNERS: BannerItem[] = [
  {
    id: 'b1',
    title: '时间银行·邻里守望互助计划',
    subtitle: '存储奉献时长，兑换晚年关照，让善意在社区温情流淌',
    tag: '时间银行规则',
    bgGradient: 'from-emerald-700 via-teal-800 to-slate-900',
    image: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80',
    actionText: '查看规则',
    actionType: 'help'
  },
  {
    id: 'b2',
    title: '独居长者“暖心敲门”志愿行动',
    subtitle: '每周两次入户问安，关照慢病饮食与燃气用电安全',
    tag: '志愿招募',
    bgGradient: 'from-amber-600 via-orange-700 to-stone-900',
    image: 'https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=800&q=80',
    actionText: '立即报名',
    actionType: 'community'
  },
  {
    id: 'b3',
    title: '慢病防治与居家防跌倒科普周',
    subtitle: '三甲医院全科医生指导，配图文讲解与真人语音朗读',
    tag: '养老科普',
    bgGradient: 'from-sky-700 via-blue-800 to-indigo-950',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    actionText: '听科普',
    actionType: 'article'
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: '关于开展2026年第四季度“社区金牌志愿者”表彰与时间币结算公示',
    tag: '官方公示',
    tagType: 'urgent',
    date: '2026-10-22',
    content: '为鼓励邻里互助，本季度时间币排名前五位的志愿者将获得街道颁发的志愿服务实体证书及便民优先权益。详细榜单已公示在社区大厅。',
    isPinned: true,
    source: '翠湖社区居委会'
  },
  {
    id: 'a2',
    title: '时间银行规范使用须知：严禁任何形式的线下现金交易或违规套现',
    tag: '制度规则',
    tagType: 'rule',
    date: '2026-10-19',
    content: '时间银行以“服务换服务”为纯公益记账原则，时长不得私自转让或兑换法定货币，求助订单需经过实名校验及双向确认。',
    isPinned: true,
    source: '社区互助监督委员会'
  },
  {
    id: 'a3',
    title: '本周六下午社区活动室举办“老年智能手机一对一答疑与防诈课堂”',
    tag: '线下活动',
    tagType: 'event',
    date: '2026-10-18',
    content: '青年志愿者现场手把手指导老人使用微信视频、在线挂号、生活缴费，欢迎社区叔叔阿姨报名参加！',
    isPinned: false,
    source: '青年志愿先锋队'
  }
];

export const INITIAL_VOLUNTEERS: VolunteerProfile[] = [
  {
    id: 'vol_1',
    name: '陈明',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    rating: 4.98,
    completedTasks: 68,
    skills: ['就医陪同', '家电小修', '轮椅推行', '应急救护'],
    distance: '320米',
    phone: '136****5510',
    badge: '五星标兵',
    isOnline: true,
    bio: '退伍军人，红十字救护员，常住4期，热心街坊邻里互助。',
    community: '翠湖花园社区'
  },
  {
    id: 'vol_2',
    name: '林薇 (退休护士)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    rating: 4.95,
    completedTasks: 52,
    skills: ['血压测量', '慢病用药指导', '心理抚慰', '老年营养'],
    distance: '580米',
    phone: '137****3299',
    badge: '医护先锋',
    isOnline: true,
    bio: '三甲医院退休护士长，擅长糖尿病与高血压日常调理沟通。',
    community: '翠湖花园社区'
  },
  {
    id: 'vol_3',
    name: '张小宇 (大学生)',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    rating: 4.90,
    completedTasks: 34,
    skills: ['日常代购', '智能手机教学', '聊天解闷', '垃圾分类'],
    distance: '850米',
    phone: '188****7120',
    badge: '青年骨干',
    isOnline: false,
    bio: '南大社会学在读研究生，课余时间践行社区互助。',
    community: '翠湖花园社区'
  },
  {
    id: 'vol_4',
    name: '周建业 (水电师傅)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    rating: 4.92,
    completedTasks: 41,
    skills: ['水管疏通', '换灯泡开关', '门窗润滑', '重物搬运'],
    distance: '1.2公里',
    phone: '135****4481',
    badge: '巧手匠人',
    isOnline: true,
    bio: '拥有高级电工证，社区内免费为70岁以上独居老人检修线路。',
    community: '翠湖花园社区'
  }
];

export const INITIAL_ORDERS: HelpOrder[] = [
  {
    id: 'order_1001',
    userId: 'user_elder_1',
    userName: '张建国',
    userAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
    userPhoneMasked: '138****9218',
    userPhoneReal: '13812349218',
    community: '翠湖花园社区',
    category: 'medical_escort',
    categoryLabel: '陪同就医',
    title: '陪同前往市第一人民医院复查白内障及取药',
    description: '本人腿脚稍有不便，周四上午需要志愿者陪同乘车去医院，帮忙挂号、引导就诊并取降压药与眼药水。',
    locationArea: '翠湖花园3期8号楼',
    locationDetail: '8号楼2单元601室',
    isUrgent: true,
    dateStr: '2026-10-24 (周六)',
    timeStr: '08:30 - 11:30',
    durationHours: 3,
    timeCoinReward: 3,
    photos: [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=400&q=80'
    ],
    medicalNotes: '有轻度白内障及原发性高血压二期，随身携带降压含片，步速偏慢。',
    consentSensitive: true,
    status: 'published',
    createdAt: '2026-10-22 14:20'
  },
  {
    id: 'order_1002',
    userId: 'user_family_1',
    userName: '李静 (为母亲代发)',
    userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    userPhoneMasked: '139****8823',
    userPhoneReal: '13987658823',
    community: '翠湖花园社区',
    category: 'daily_chores',
    categoryLabel: '日常家务',
    title: '帮忙更换卧室顶灯及阳台高处窗帘擦拭',
    description: '母亲78岁独自在家，卧室LED吸顶灯损坏，新灯具已网购到家，急需细心志愿者帮忙爬梯更换并简单清扫。',
    locationArea: '翠湖花园1期2号楼',
    locationDetail: '2号楼1单元1202室',
    isUrgent: false,
    dateStr: '2026-10-23 (今日)',
    timeStr: '15:00 - 16:30',
    durationHours: 1.5,
    timeCoinReward: 2,
    photos: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80'
    ],
    consentSensitive: true,
    status: 'accepted',
    volunteerId: 'user_volunteer_1',
    volunteerName: '陈明',
    volunteerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    volunteerPhone: '13612345510',
    volunteerRating: 4.98,
    volunteerDistance: '320米',
    createdAt: '2026-10-22 09:15'
  },
  {
    id: 'order_1003',
    userId: 'user_elder_1',
    userName: '张建国',
    userAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
    userPhoneMasked: '138****9218',
    userPhoneReal: '13812349218',
    community: '翠湖花园社区',
    category: 'chat_companion',
    categoryLabel: '聊天陪伴',
    title: '周末下棋读报与手机微信视频功能复习',
    description: '希望能有耐心的年轻邻居来家里坐坐，下两盘象棋，读读近期社区周报，顺便教我用微信给远在外地的孙子发视频。',
    locationArea: '翠湖花园3期8号楼',
    locationDetail: '8号楼2单元601室',
    isUrgent: false,
    dateStr: '2026-10-25 (周日)',
    timeStr: '14:00 - 16:00',
    durationHours: 2,
    timeCoinReward: 2,
    photos: [],
    consentSensitive: true,
    status: 'published',
    createdAt: '2026-10-21 16:40'
  },
  {
    id: 'order_1004',
    userId: 'user_elder_1',
    userName: '张建国',
    userAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
    userPhoneMasked: '138****9218',
    userPhoneReal: '13812349218',
    community: '翠湖花园社区',
    category: 'daily_chores',
    categoryLabel: '日常家务',
    title: '粮油大米重物搬运与厨房水龙头防漏检修',
    description: '超市送来的20斤大米和食用油帮忙搬上二楼，顺便将老化的水胶布重新缠紧，服务非常细致满意。',
    locationArea: '翠湖花园3期8号楼',
    locationDetail: '8号楼2单元601室',
    isUrgent: false,
    dateStr: '2026-10-18',
    timeStr: '10:00 - 11:30',
    durationHours: 1.5,
    timeCoinReward: 2,
    photos: [],
    consentSensitive: true,
    status: 'completed',
    volunteerId: 'user_volunteer_1',
    volunteerName: '陈明',
    volunteerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    volunteerPhone: '13612345510',
    volunteerRating: 5.0,
    clockInTime: '2026-10-18 10:02',
    completeTime: '2026-10-18 11:32',
    ratingScore: 5,
    ratingComment: '小陈同志非常热情周到，修完水龙头还帮我把门前的废纸箱也顺路带下楼扔了，非常感谢！',
    createdAt: '2026-10-17 19:10'
  }
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post_1',
    userId: 'user_volunteer_1',
    userName: '陈明',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    userRole: 'volunteer',
    isAnonymous: false,
    isOfficial: false,
    community: '翠湖花园社区',
    category: 'story',
    categoryLabel: '志愿风采',
    title: '今天陪伴8号楼张大爷下棋读报，温暖在细微处',
    content: '下午给张大爷调好了血压仪的语音播报，还下了三盘象棋。大爷年轻时在机床厂工作，聊起当年的工业岁月眼睛里闪着光。其实老人需要的不仅是一次具体的帮扶，更是有人愿意驻足倾听他们的故事。存入时间银行的不仅是数字，更是邻里之间实打实的温度。',
    images: [
      'https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=600&q=80'
    ],
    likesCount: 38,
    isLiked: false,
    bookmarksCount: 12,
    isBookmarked: false,
    comments: [
      {
        id: 'c1',
        userId: 'user_elder_1',
        userName: '张建国',
        userAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
        userRole: 'elder',
        content: '小陈小伙子耐心特别好，下次再来尝尝大爷泡的雨前龙井！',
        createdAt: '2小时前',
        likesCount: 8
      },
      {
        id: 'c2',
        userId: 'user_family_1',
        userName: '李静',
        userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        userRole: 'family',
        content: '感谢陈师傅！我们在外地工作的子女最放不下的就是老人，看到你们这么用心，心里踏实多了。',
        createdAt: '1小时前',
        likesCount: 5
      }
    ],
    status: 'approved',
    createdAt: '3小时前',
    locationTag: '翠湖花园3期',
    tags: ['长者关怀', '时间银行', '爱心陪伴']
  },
  {
    id: 'post_2',
    userId: 'user_admin_1',
    userName: '社区管理员 (王芳)',
    userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    userRole: 'admin',
    isAnonymous: false,
    isOfficial: true,
    community: '翠湖花园社区',
    category: 'activity',
    categoryLabel: '线下活动',
    title: '【官方招募】周六“非遗剪纸进社区·银龄添彩”公益互动坊',
    content: '为丰富长者文化生活，促进隔代交流，本周六上午9:30在社区综合服务中心开展非遗剪纸体验活动。特邀民间非遗传承人现场指导，招募10位青年志愿者协助老人安全使用圆头剪刀并维持现场秩序。活动计入2小时志愿时长！',
    images: [
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80'
    ],
    likesCount: 56,
    isLiked: true,
    bookmarksCount: 24,
    isBookmarked: true,
    comments: [
      {
        id: 'c3',
        userId: 'user_volunteer_1',
        userName: '陈明',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        userRole: 'volunteer',
        content: '已报名！我可以负责签到和发放材料包。',
        createdAt: '5小时前',
        likesCount: 4
      }
    ],
    status: 'approved',
    createdAt: '6小时前',
    locationTag: '党群活动中心1楼',
    tags: ['非遗传承', '银龄文化', '志愿招募'],
    activityDate: '2026-10-25 09:30',
    activityEnrolledCount: 7,
    activityMaxCount: 10,
    isEnrolled: false
  },
  {
    id: 'post_3',
    userId: 'user_family_1',
    userName: '李静',
    userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    userRole: 'family',
    isAnonymous: false,
    isOfficial: false,
    community: '翠湖花园社区',
    category: 'idle',
    categoryLabel: '闲置互助',
    title: '【免费借用/转赠】九成新九折铝合金老人助行器及可调节坐浴椅',
    content: '家里老人做完髋关节康复手术后已经能自主慢走，现将9成新的轻便助行器和浴室专用防滑坐浴椅免费借给或赠送给有需要的邻居（不产生时间币，纯邻里互助）。需要的朋友请在下方留言，自提在1期2号楼。',
    images: [
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80'
    ],
    likesCount: 29,
    isLiked: false,
    bookmarksCount: 15,
    isBookmarked: false,
    comments: [
      {
        id: 'c4',
        userId: 'user_elder_1',
        userName: '张建国',
        userAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
        userRole: 'elder',
        content: '这个坐浴椅防滑特别实用，为好邻居点赞！',
        createdAt: '4小时前',
        likesCount: 3
      }
    ],
    status: 'approved',
    createdAt: '8小时前',
    locationTag: '翠湖花园1期',
    tags: ['闲置环保', '爱心转赠', '康复辅具'],
    idleItemStatus: 'available'
  },
  {
    id: 'post_4',
    userId: 'user_elder_1',
    userName: '热心长者',
    userAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
    userRole: 'elder',
    isAnonymous: true,
    isOfficial: false,
    community: '翠湖花园社区',
    category: 'help',
    categoryLabel: '求助交流',
    title: '咨询：阳台多肉植物入冬防冻有什么好土方子吗？',
    content: '养了七八盆长寿花和生石花，这几天气温骤降，夜里放在南阳台担心冻坏。想请教社区里有经验的花友，是加塑料罩好还是搬进室内开补光灯好？',
    images: [
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=600&q=80'
    ],
    likesCount: 14,
    isLiked: false,
    bookmarksCount: 6,
    isBookmarked: false,
    comments: [],
    status: 'approved',
    createdAt: '1天前',
    locationTag: '翠湖花园3期',
    tags: ['花草养护', '邻里求教', '长者日常']
  }
];

export const INITIAL_TIME_LEDGER: TimeLedger[] = [
  {
    id: 'tx_101',
    userId: 'user_volunteer_1',
    orderId: 'order_1004',
    orderTitle: '粮油大米重物搬运与厨房水龙头防漏检修',
    amount: 2,
    type: 'earn',
    typeLabel: '志愿服务入账',
    balanceAfter: 86,
    description: '完成服务，长者已确认签核并给予五星好评',
    createdAt: '2026-10-18 11:35',
    txHash: 'TX-20261018-0928371'
  },
  {
    id: 'tx_102',
    userId: 'user_volunteer_1',
    orderId: 'order_0998',
    orderTitle: '社区重阳节长者茶话会场地布置与护送',
    amount: 3,
    type: 'earn',
    typeLabel: '专项志愿活动',
    balanceAfter: 84,
    description: '重阳节敬老主题志愿活动，累计时长3小时',
    createdAt: '2026-10-11 16:30',
    txHash: 'TX-20261011-8847120'
  },
  {
    id: 'tx_103',
    userId: 'user_elder_1',
    orderId: 'order_1004',
    orderTitle: '粮油大米重物搬运与厨房水龙头防漏检修',
    amount: -2,
    type: 'spend',
    typeLabel: '求助服务划扣',
    balanceAfter: 28,
    description: '支付陈明志愿者服务时长2币',
    createdAt: '2026-10-18 11:35',
    txHash: 'TX-20261018-0928372'
  },
  {
    id: 'tx_104',
    userId: 'user_elder_1',
    orderTitle: '新用户实名认证与银龄关怀初始赠币',
    amount: 30,
    type: 'reward',
    typeLabel: '社区基础赠币',
    balanceAfter: 30,
    description: '完成翠湖社区长者实名认证，街道发放初始关爱额度',
    createdAt: '2026-09-01 09:00',
    txHash: 'TX-20260901-0001882'
  }
];

export const INITIAL_MESSAGES: MessageItem[] = [
  {
    id: 'msg_1',
    type: 'order',
    title: '求助订单已被陈明志愿者认领',
    content: '您的求助单【帮忙更换卧室顶灯及阳台窗帘擦拭】已被接单，志愿者预计今日15:00上门。',
    orderId: 'order_1002',
    unread: true,
    timestamp: '10分钟前',
    extra: {
      actionText: '查看订单详情',
      actionTarget: 'order_1002',
      statusBadge: '已接单'
    }
  },
  {
    id: 'msg_2',
    type: 'system',
    title: '时间币到账通知 (+2.0 时长币)',
    content: '您完成的【粮油大米搬运与水龙头检修】服务时长已核实到账，已记入时间银行个人账本。',
    unread: false,
    timestamp: '2天前',
    extra: {
      statusBadge: '已结算'
    }
  },
  {
    id: 'msg_3',
    type: 'chat',
    title: '陈明 志愿者',
    content: '“张大爷您好，我带好换灯工具了，大概10分钟后到您家楼下。”',
    orderId: 'order_1002',
    unread: true,
    timestamp: '刚刚',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    senderName: '陈明'
  },
  {
    id: 'msg_4',
    type: 'complaint',
    title: '工单处理进度更新',
    content: '您提交的关于【公共楼道杂物堆放影响长者通行】的反馈，网格员已现场核查并清理完毕。',
    unread: false,
    timestamp: '3天前',
    extra: {
      statusBadge: '已办结'
    }
  }
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'chat_1',
    conversationId: 'order_1002',
    senderId: 'user_volunteer_1',
    senderName: '陈明',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    isMe: false,
    text: '李女士您好，我是接单的志愿者陈明。请问阿姨家里有结实的人字梯吗？没有的话我从社区工具站自带一把。',
    type: 'text',
    timestamp: '14:20'
  },
  {
    id: 'chat_2',
    conversationId: 'order_1002',
    senderId: 'user_family_1',
    senderName: '李静',
    senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    isMe: true,
    text: '陈师傅辛苦了！家里只有两级小木凳，麻烦您从工具站带一把人字梯过来，太感谢了！',
    type: 'text',
    timestamp: '14:25'
  },
  {
    id: 'chat_3',
    conversationId: 'order_1002',
    senderId: 'user_volunteer_1',
    senderName: '陈明',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    isMe: false,
    text: '没问题，梯子和绝缘电笔我都备齐了。我目前正在小区北门附近，10分钟后准时到1期2号楼1单元。',
    type: 'text',
    timestamp: '14:48'
  },
  {
    id: 'chat_4',
    conversationId: 'order_1002',
    senderId: 'user_volunteer_1',
    senderName: '陈明',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    isMe: false,
    text: '当前实时位置共享',
    type: 'location',
    locationInfo: {
      name: '翠湖花园北门便民驿站',
      address: '翠湖北路18号'
    },
    timestamp: '14:50'
  }
];

export const INITIAL_ARTICLES: EldercareArticle[] = [
  {
    id: 'art_1',
    title: '秋冬高血压长者居家保暖与平稳降压“五要五不要”',
    category: 'chronic',
    categoryLabel: '慢病护理',
    summary: '气温骤降血管易收缩，早晨醒来切勿猛起，按时服药切忌私自调量，图文与语音详尽解析。',
    content: [
      '秋冬季气温偏低，人体交感神经容易兴奋，导致小血管收缩、血压升高。高血压长者需特别警惕晨峰血压。',
      '一要【慢起晨练】：醒来后在床上平躺静卧2分钟，再坐起2分钟，最后双脚着地站立2分钟，遵循“三个半分钟”原则，防止体位性低血压摔倒。',
      '二要【温水洗漱】：洗脸刷牙宜用35℃左右温水，避免冰冷刺激引起血管剧烈反射性收缩。',
      '三要【定时监测】：每日清晨排尿后及傍晚各测量一次血压，并清晰记录在健康手册上。',
      '四不要【私自换药/停药】：即使测量值暂时偏高或偏低，也应通过专业就医咨询调整，切忌自行盲目加减药量。',
      '【温馨提示】：本指南属于生活常识与日常护理建议，不构成临床医疗诊断。如感头晕恶心、肢体麻木，请立即拨打120或前往急诊。'
    ],
    audioText: '秋冬高血压长者居家保暖与平稳降压指南。气温骤降血管易收缩，早晨醒来切勿猛起。一要慢起晨练，醒来平躺两分钟，再坐起两分钟，防止摔倒；二要温水洗漱；三要按时监测血压并做好记录。切记不要私自停药。如有严重不适请及时就医。',
    audioDurationSec: 58,
    readMinutes: 3,
    views: 1240,
    tag: '心血管健康',
    publishedAt: '2026-10-15',
    author: '市老年医学研究会 / 社区卫生站'
  },
  {
    id: 'art_2',
    title: '独居老人居家防跌倒“环境排查与安全动线”改造清单',
    category: 'safety',
    categoryLabel: '居家安全',
    summary: '跌倒是老年人意外伤害首要诱因，卫生间防滑扶手、夜灯感应、地面去绊物改造法。',
    content: [
      '卫生间地面是长者滑倒的高发区，建议加铺通体防滑垫，并在马桶旁及淋浴区加装不锈钢带防滑颗粒扶手。',
      '床头至卫生间动线上安装插电式红外人体感应小夜灯，避免起夜摸黑撞伤。',
      '清理客厅与卧室地面的杂乱拖线板、松动地垫及门槛障碍，保持走道宽度不小于80厘米。',
      '洗澡水温控制在38℃-40℃，避免浴室密闭时间过长引起胸闷头晕。'
    ],
    audioText: '独居老人居家防跌倒改造清单。卫生间加铺防滑地垫，马桶旁安装防滑扶手；卧室通往卫生间走道安装人体感应夜灯；定期清理地面散落电线；洗澡温度适中切勿锁死内门。',
    audioDurationSec: 42,
    readMinutes: 2,
    views: 980,
    tag: '适老化安全',
    publishedAt: '2026-10-12',
    author: '社区适老化辅具指导站'
  },
  {
    id: 'art_3',
    title: '银发族健康饮食：控盐控油、优质蛋白与膳食纤维搭配法',
    category: 'diet',
    categoryLabel: '饮食作息',
    summary: '少盐多鲜、蒸煮替代油炸，多吃豆腐鱼肉，呵护肠道吸收与肌肉力量。',
    content: [
      '老年人味蕾敏感度下降容易吃得偏咸，每日食盐摄入量应严格控制在5克以内（约一平啤酒盖）。',
      '每餐保证优质蛋白质供给，如清蒸淡水鱼、嫩豆腐、煮鸡蛋、低脂牛奶，有助于延缓肌肉衰减（肌少症）。',
      '主食粗细搭配，适量增加燕麦、南瓜、山药等软烂易消化的粗粮，促进肠胃蠕动防便秘。'
    ],
    audioText: '银发族健康饮食指南。每日食盐控制在5克以内；保证清蒸鱼、鸡蛋和豆腐等优质蛋白摄入；粗细搭配多吃南瓜山药；多喝温开水保持肠道通畅。',
    audioDurationSec: 36,
    readMinutes: 2,
    views: 812,
    tag: '营养健康',
    publishedAt: '2026-10-10',
    author: '社区营养膳食顾问'
  }
];

export const INITIAL_COMPLAINTS: ComplaintTicket[] = [
  {
    id: 'cmp_1',
    ticketNo: 'TS-20261020-001',
    userId: 'user_elder_1',
    userName: '张建国',
    orderId: 'order_1001',
    orderTitle: '医院陪同复查求助',
    targetUser: '暂无',
    reason: '接单后爽约未提前告知',
    detail: '原定前天上午陪同去医院的预约临时取消，希望管理员加强对志愿者接单履约率的考核。',
    evidencePhotos: [],
    status: 'resolved',
    statusLabel: '已调解办结',
    resolutionNote: '已核实该志愿者因突发工作加班未能按时前往，已扣除相应信誉积分并向张大爷致歉，同时已重新为您优先指派五星志愿者陈明对接。',
    handlerName: '王主任 (网格长)',
    createdAt: '2026-10-20 16:00',
    resolvedAt: '2026-10-21 10:30'
  }
];

export const LEADERBOARD_TOP5 = [
  { rank: 1, name: '陈明', hours: 142.5, coins: 86, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80', badge: '卓越先锋' },
  { rank: 2, name: '林薇 (退休护士)', hours: 118.0, coins: 74, avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80', badge: '银龄天使' },
  { rank: 3, name: '周建业 (水电师傅)', hours: 96.5, coins: 62, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', badge: '社区能手' },
  { rank: 4, name: '张小宇 (大学生)', hours: 82.0, coins: 55, avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80', badge: '青年热血' },
  { rank: 5, name: '赵海燕 (教师)', hours: 67.5, coins: 48, avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80', badge: '爱心使者' },
];
