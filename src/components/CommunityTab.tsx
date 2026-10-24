import React, { useState } from 'react';
import { 
  MessageCircle, 
  Heart, 
  Bookmark, 
  Share2, 
  Send, 
  Trophy, 
  Megaphone, 
  QrCode, 
  MapPin, 
  Gift, 
  Calendar,
  ShieldCheck,
  ChevronRight,
  Flag
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { SmartImage } from './SmartImage';
import { useDialog } from '../hooks/useDialog';
import { DEMO_LEADERBOARD as LEADERBOARD_TOP5 } from '../data/community/content';

export const CommunityTab: React.FC = () => {
  const { 
    posts, 
    currentUser, 
    likePost, 
    bookmarkPost, 
    addComment, 
    enrollActivity, 
    setActiveSubPage, 
    announcements, 
    elderlyMode,
    submitComplaint
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filterScope, setFilterScope] = useState<'all' | 'community' | 'official'>('all');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);
  const [noticeExpanded, setNoticeExpanded] = useState<boolean>(false);

  // 排行榜弹层可访问性基线
  useDialog(showLeaderboardModal, () => setShowLeaderboardModal(false));

  const filteredPosts = posts.filter(post => {
    if (post.status !== 'approved') return false;
    if (activeCategory !== 'all' && post.category !== activeCategory) return false;
    if (filterScope === 'community' && post.community !== currentUser.community) return false;
    if (filterScope === 'official' && !post.isOfficial) return false;
    return true;
  });

  const handleSendComment = (postId: string) => {
    if (!commentInput.trim()) return;
    addComment(postId, commentInput.trim());
    setCommentInput('');
  };

  const handleShare = (postTitle: string) => {
    sound.playTap();
    navigator.clipboard?.writeText(window.location.href);
    toast(`【${postTitle || '社区动态'}】链接已复制，可粘贴发送至微信邻里群`, 'success');
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* Pinned Announcement & Top 5 Leaderboard Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Pinned Notice */}
        <div className="sm:col-span-2 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-400 text-slate-900">
                  社区公告
                </span>
                <span className="text-xs text-emerald-200 truncate">
                  {announcements[0]?.date}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {announcements[0]?.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setNoticeExpanded((v) => !v);
            }}
            aria-expanded={noticeExpanded}
            className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold whitespace-nowrap"
          >
            {noticeExpanded ? '收起公告' : '查看详情'}
          </button>

          {/* 公告正文：原地展开，不打断阅读流 */}
          {noticeExpanded && (
            <div className="basis-full w-full pt-2 border-t border-white/15 text-xs text-emerald-50 leading-relaxed animate-in fade-in duration-150">
              <p>{announcements[0]?.content}</p>
              <p className="mt-1.5 text-emerald-200/80">
                发布单位：{announcements[0]?.source} · 发布日期：{announcements[0]?.date}
              </p>
            </div>
          )}
        </div>

        {/* Time Bank Monthly Ranking Shortcut */}
        <button
          onClick={() => {
            sound.playTap();
            setShowLeaderboardModal(true);
          }}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold shadow-md hover:scale-[1.02] transition-transform flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/40 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-900" />
            </div>
            <div className="text-left">
              <div className="text-xs text-amber-900 uppercase font-mono">TIME BANK RANK</div>
              <div className="text-sm font-black">月度时间币 TOP 5 榜单</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-900" />
        </button>
      </div>

      {/* Community QR Group Entry Card */}
      <div 
        onClick={() => {
          sound.playTap();
          setActiveSubPage('community_qr');
        }}
        className="cursor-pointer p-3 rounded-2xl bg-white border border-emerald-200/80 hover:border-emerald-400 shadow-xs flex items-center justify-between gap-3 group transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-emerald-800">
              梧桐里（虚构）1-4 期邻里互助群入口
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              项目组值班 · 线下互助随时对接 · 邻里急事相助
            </p>
          </div>
        </div>
        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-0.5 shrink-0">
          <span>扫码进群</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Category Tabs & Sub Filters */}
      <div className="space-y-2">
        {/* Main Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { key: 'all', label: '全部动态' },
            { key: 'story', label: '志愿风采' },
            { key: 'activity', label: '线下活动' },
            { key: 'idle', label: '闲置互助' },
            { key: 'help', label: '求助交流' },
          ].map(c => (
            <button
              key={c.key}
              onClick={() => {
                sound.playTap();
                setActiveCategory(c.key);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === c.key
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Sub-Filters */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <span>筛选范围:</span>
            {[
              { key: 'all', label: '全部' },
              { key: 'community', label: '本社区' },
              { key: 'official', label: '项目组发布' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => {
                  sound.playTap();
                  setFilterScope(f.key as typeof filterScope);
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filterScope === f.key ? 'bg-emerald-100 text-emerald-800 font-bold' : 'hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400">共 {filteredPosts.length} 条</span>
        </div>
      </div>

      {/* Feed Stream */}
      <div className="space-y-3.5">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3"
          >
            {/* User Meta Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img 
                  src={post.userAvatar} 
                  alt={post.userName} 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {post.userName}
                    </span>
                    {post.isOfficial && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-purple-100 text-purple-700 flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        项目组标注
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600">
                      {post.categoryLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{post.createdAt}</span>
                    {post.locationTag && (
                      <span className="flex items-center gap-0.5 text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {post.locationTag}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Category-Specific Badges */}
              {post.category === 'idle' && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  0币爱心借赠
                </span>
              )}
            </div>

            {/* Title & Body */}
            <div className="space-y-1.5">
              {post.title && (
                <h3 className={`font-bold text-slate-900 leading-snug ${elderlyMode ? 'text-lg' : 'text-sm sm:text-base'}`}>
                  {post.title}
                </h3>
              )}
              <p className={`text-slate-700 leading-relaxed ${elderlyMode ? 'text-base' : 'text-xs sm:text-sm'}`}>
                {post.content}
              </p>
            </div>

            {/* Photos */}
            {post.images && post.images.length > 0 && (
              <div className={`grid gap-2 ${post.images.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
                {post.images.map((img, idx) => (
                  <SmartImage
                    key={idx}
                    src={img}
                    alt="社区实拍"
                    className="w-full h-44 rounded-xl object-cover border border-slate-100"
                    fallbackLabel="社区实拍配图"
                  />
                ))}
              </div>
            )}

            {/* Activity Enrollment Bar if Category is Activity */}
            {post.category === 'activity' && (
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between gap-2">
                <div className="space-y-0.5 text-xs text-purple-900">
                  <div className="flex items-center gap-1 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>活动时间：{post.activityDate || '周六 09:30'}</span>
                  </div>
                  <div className="text-[11px] text-purple-700">
                    已报名 <strong>{post.activityEnrolledCount}</strong> / {post.activityMaxCount} 人 · 仅本机记录，不计时长
                  </div>
                </div>
                <button
                  onClick={() => enrollActivity(post.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all ${
                    post.isEnrolled
                      ? 'bg-purple-200 text-purple-900'
                      : 'bg-purple-700 hover:bg-purple-800 text-white'
                  }`}
                >
                  {post.isEnrolled ? '已报名参与' : '立即报名'}
                </button>
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {post.tags.map((t, idx) => (
                  <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Interaction Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                {/* Like */}
                <button
                  onClick={() => likePost(post.id)}
                  className={`flex items-center gap-1 transition-colors ${
                    post.isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{post.likesCount}</span>
                </button>

                {/* Comment Toggle */}
                <button
                  onClick={() => {
                    sound.playTap();
                    setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id);
                  }}
                  aria-label={`${activeCommentPostId === post.id ? '收起' : '查看'}评论（${post.comments.length} 条）`}
                  aria-expanded={activeCommentPostId === post.id}
                  className="flex items-center gap-1 hover:text-emerald-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comments.length}</span>
                </button>

                {/* Bookmark */}
                <button
                  onClick={() => bookmarkPost(post.id)}
                  className={`flex items-center gap-1 transition-colors ${
                    post.isBookmarked ? 'text-amber-600 font-bold' : 'hover:text-amber-600'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${post.isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>{post.bookmarksCount}</span>
                </button>
              </div>

              {/* Share + Report：每条 UGC 都有举报入口（R7），举报写入本机 reports 并留痕 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleShare(post.title || post.content)}
                  className="flex items-center gap-1 hover:text-slate-800 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>转发</span>
                </button>
                <button
                  onClick={() => {
                    sound.playTap();
                    submitComplaint({
                      targetType: 'post',
                      targetId: post.id,
                      orderId: post.id,
                      orderTitle: post.title || post.content.slice(0, 24),
                      reason: '信息流内容举报（演练）',
                      detail: '在社区信息流对指定内容发起举报；只写本机记录，不通知任何机构。',
                    });
                  }}
                  aria-label={`举报这条内容：${post.title || post.content.slice(0, 16)}`}
                  className="flex items-center gap-1 hover:text-rose-600 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>举报</span>
                </button>
              </div>
            </div>

            {/* Expandable Comment Section */}
            {activeCommentPostId === post.id && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-150">
                {/* Comment Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post.id)}
                    placeholder="写下温情留言，与邻里友好互动..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleSendComment(post.id)}
                    className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Comments List */}
                <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                  {post.comments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">
                      暂无评论，快来做第一个温暖互动的邻居吧～
                    </p>
                  ) : (
                    post.comments.map((c) => (
                      <div key={c.id} className="p-2 rounded-lg bg-slate-50 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-bold text-slate-800">{c.userName}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                            {/* 评论也是 UGC：举报目标为 comment，不是父帖（R7） */}
                            <button
                              type="button"
                              onClick={() => {
                                sound.playTap();
                                submitComplaint({
                                  targetType: 'comment',
                                  targetId: c.id,
                                  orderTitle: `评论：${c.content.slice(0, 14)}`,
                                  reason: '评论区内容举报（演练）',
                                  detail: '在信息流对单条评论发起举报；只写本机记录，不通知任何机构。',
                                });
                              }}
                              aria-label={`举报 ${c.userName} 的这条评论`}
                              title="举报这条评论"
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-700">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">
                  互助演练 · 月度参与榜 TOP 5（合成数据）
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {LEADERBOARD_TOP5.map((item) => (
                <div 
                  key={item.rank}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    item.rank === 1 ? 'bg-amber-50 border-amber-300' :
                    item.rank === 2 ? 'bg-slate-50 border-slate-300' :
                    item.rank === 3 ? 'bg-orange-50 border-orange-200' :
                    'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                      item.rank === 1 ? 'bg-amber-400 text-slate-900' :
                      item.rank === 2 ? 'bg-slate-300 text-slate-900' :
                      item.rank === 3 ? 'bg-orange-300 text-slate-900' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.rank}
                    </span>
                    <div
                      aria-hidden="true"
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0"
                    >
                      {item.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-xs sm:text-sm">{item.name}</div>
                      <div className="text-[10px] text-amber-800">{item.badge}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-700 text-sm">{item.coins} 币</div>
                    <div className="text-[10px] text-slate-400">{item.hours} 小时</div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              本榜为虚构演练展示，非真实统计；时间币只记账、不结算、不上链、不可兑现。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
