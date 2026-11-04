import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  QrCode,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { SmartImage } from './SmartImage';
import { DEMO_LEADERBOARD as LEADERBOARD_TOP5 } from '../data/community/content';
import { copyText } from '../shared/clipboard';
import { readRouteParam } from '../shared/route-state';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { Modal } from '../ui/Modal';

const CATEGORY_TABS = [
  { key: 'all', label: '全部动态' },
  { key: 'help', label: '求助交流' },
  { key: 'story', label: '志愿风采' },
  { key: 'activity', label: '线下活动' },
  { key: 'idle', label: '闲置互助' },
];

const SCOPE_OPTIONS = [
  { key: 'all', label: '全部内容' },
  { key: 'community', label: '只看本社区' },
  { key: 'official', label: '只看官方发布' },
] as const;

/** 装饰性二维码：用确定性方块拼出，不伪装成可扫描的真码。 */
const QrPattern: React.FC = () => {
  const cells = Array.from({ length: 121 }, (_, i) => {
    const row = Math.floor(i / 11);
    const col = i % 11;
    const finder =
      (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
    const noise = (row * 7 + col * 13 + row * col) % 5 < 2;
    return finder || noise;
  });
  return (
    <svg viewBox="0 0 11 11" width="96" height="96" aria-hidden="true" focusable="false">
      <rect width="11" height="11" fill="#fff" />
      {cells.map((on, index) =>
        on ? (
          <rect
            key={index}
            x={index % 11}
            y={Math.floor(index / 11)}
            width="1"
            height="1"
            fill="#2a2320"
          />
        ) : null,
      )}
    </svg>
  );
};

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
    submitComplaint,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filterScope, setFilterScope] = useState<'all' | 'community' | 'official'>('all');
  const [scopeOpen, setScopeOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [noticeExpanded, setNoticeExpanded] = useState(false);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!menuPostId) return;
    const close = () => setMenuPostId(null);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuPostId]);

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        if (post.status !== 'approved') return false;
        if (activeCategory !== 'all' && post.category !== activeCategory) return false;
        if (filterScope === 'community' && post.community !== currentUser.community) return false;
        if (filterScope === 'official' && !post.isOfficial) return false;
        return true;
      }),
    [posts, activeCategory, filterScope, currentUser.community],
  );

  const idlePosts = useMemo(() => posts.filter((post) => post.category === 'idle').slice(0, 3), [posts]);

  /* 深链：?post=<id> 打开社区页时滚到该帖并高亮 2.4 秒。 */
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  useEffect(() => {
    const target = readRouteParam('post');
    if (!target) return;
    const reveal = window.setTimeout(() => {
      const element = document.getElementById(`post-${target}`);
      if (!element) return;
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setHighlightPostId(target);
    }, 120);
    const clear = window.setTimeout(() => setHighlightPostId(null), 2600);
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(clear);
    };
  }, []);
  const onlineCount = 128;
  const todayCount = posts.filter((post) => post.status === 'approved').length;

  const handleComment = (postId: string) => {
    if (!commentInput.trim()) return;
    addComment(postId, commentInput.trim());
    setCommentInput('');
  };

  const handleShare = async (postId: string, title: string) => {
    sound.playTap();
    const base = `${window.location.origin}${window.location.pathname}`;
    const ok = await copyText(`${base}?tab=community&post=${encodeURIComponent(postId)}`);
    toast(
      ok ? `【${title || '社区动态'}】链接已复制，可粘贴到邻里群` : '复制失败，请手动复制地址栏链接',
      ok ? 'success' : 'error',
    );
  };

  const handleEnroll = (postId: string) => {
    sound.playTap();
    enrollActivity(postId);
  };

  const reportPost = (post: { id: string; title?: string; content: string }) => {
    sound.playTap();
    submitComplaint({
      targetType: 'post',
      targetId: post.id,
      orderId: post.id,
      orderTitle: post.title || post.content.slice(0, 24),
      reason: '信息流内容举报（演练）',
      detail: '在社区信息流对指定内容发起举报；只写本机记录，不通知任何机构。',
    });
  };

  const topNotice = announcements[0];

  return (
    <div>
      <div className="nl-pagehead">
        <div>
          <h1 className="nl-page-title">社区动态</h1>
          <p className="nl-page-sub">
            建工新村 · {onlineCount} 位志愿者在线 · 今日 {todayCount} 条新动态
          </p>
        </div>
        <div className="nl-pagehead__aside">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('publish_modal');
            }}
          >
            发布动态
          </Button>
        </div>
      </div>

      <div className="nl-community">
        <div className="min-w-0">
          <div className="nl-filters">
            <div className="nl-filter-chips no-scrollbar overflow-x-auto" role="group" aria-label="内容分类">
              {CATEGORY_TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`nl-chip${activeCategory === item.key ? ' nl-chip--active' : ''}`}
                  aria-pressed={activeCategory === item.key}
                  onClick={() => {
                    sound.playTap();
                    setActiveCategory(item.key);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                className="nl-scope"
                aria-expanded={scopeOpen}
                aria-haspopup="menu"
                aria-label={`内容范围：${SCOPE_OPTIONS.find((option) => option.key === filterScope)?.label}`}
                onClick={() => setScopeOpen((open) => !open)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="nl-scope__label">
                  {SCOPE_OPTIONS.find((option) => option.key === filterScope)?.label}
                </span>
                <ChevronDown className="nl-scope__caret h-3 w-3" aria-hidden="true" />
              </button>
              {scopeOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+6px)] z-30 w-[132px] rounded-xl border border-line bg-surface p-1"
                >
                  {SCOPE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={filterScope === option.key}
                      onClick={() => {
                        setFilterScope(option.key);
                        setScopeOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11px] ${
                        filterScope === option.key ? 'bg-page font-semibold text-ink' : 'text-text2 hover:bg-page'
                      }`}
                    >
                      {option.label}
                      {filterScope === option.key ? <ChevronRight className="h-3 w-3" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {topNotice ? (
            <>
              <button
                type="button"
                className="nl-notice-bar"
                aria-expanded={noticeExpanded}
                onClick={() => setNoticeExpanded((open) => !open)}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                <span className="nl-notice-bar__text">{topNotice.title}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
              </button>
              {noticeExpanded ? (
                <div className="nl-card nl-card--sm mt-2 px-4 py-3 text-[11px] leading-relaxed text-text2">
                  {topNotice.content}
                  <p className="mt-2 text-[9.5px] text-muted">
                    {topNotice.source} · {topNotice.date}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="nl-feed" id="community-feed">
            {filteredPosts.length === 0 ? (
              <div className="nl-empty">
                <p className="nl-empty__title">这个分类下还没有内容</p>
                <p className="nl-empty__hint">换个分类看看，或发布一条邻里动态。</p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const commentsOpen = activeCommentPostId === post.id;
                return (
                  <article
                    key={post.id}
                    id={`post-${post.id}`}
                    className={`nl-post${highlightPostId === post.id ? ' nl-post--flash' : ''}`}
                  >
                    <div className="nl-post__head">
                      <Avatar
                        name={post.userName}
                        size="sm"
                        tone={post.isOfficial ? 'ink' : 'brand'}
                      />
                      <div className="nl-post__ident">
                        <div className="nl-post__name">
                          <span className="truncate">{post.userName}</span>
                          {post.isOfficial ? (
                            <Tag tone="solid">官方</Tag>
                          ) : (
                            <Tag tone="neutral">{post.userRole === 'volunteer' ? '志愿者' : '邻里'}</Tag>
                          )}
                        </div>
                        <p className="nl-post__meta">
                          {post.createdAt} · {post.locationTag ?? post.community}
                        </p>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-page hover:text-text2"
                          aria-label="更多操作"
                          aria-expanded={menuPostId === post.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuPostId(menuPostId === post.id ? null : post.id);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {menuPostId === post.id ? (
                          <div
                            role="menu"
                            className="absolute right-0 top-[calc(100%+4px)] z-20 w-[148px] rounded-xl border border-line bg-surface p-1"
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-text2 hover:bg-page"
                              onClick={() => {
                                setMenuPostId(null);
                                void handleShare(post.id, post.title || post.content);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              复制链接
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-danger hover:bg-danger-tint"
                              onClick={() => {
                                setMenuPostId(null);
                                reportPost(post);
                              }}
                            >
                              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                              举报这条内容
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <p className="nl-post__body">{post.content}</p>

                    {post.images.length > 0 ? (
                      <div className="nl-post__media">
                        <SmartImage src={post.images[0]} alt="社区动态配图" />
                      </div>
                    ) : null}

                    {post.category === 'activity' && post.activityDate ? (
                      <div className="nl-activity">
                        <span className="nl-activity__time">
                          <Calendar className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                          {post.activityDate}
                        </span>
                        <div className="nl-activity__right">
                          <span className="nl-activity__left">
                            已报名 {post.activityEnrolledCount ?? 0}/{post.activityMaxCount ?? '不限'} 人
                          </span>
                          <Button
                            size="xs"
                            variant={post.isEnrolled ? 'ghost' : 'primary'}
                            disabled={post.isEnrolled}
                            onClick={() => handleEnroll(post.id)}
                          >
                            {post.isEnrolled ? '已报名' : '立即报名'}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="nl-post__actions">
                      <button
                        type="button"
                        className="nl-post__action"
                        aria-pressed={post.isLiked}
                        aria-label={`赞同，当前 ${post.likesCount} 次`}
                        onClick={() => {
                          sound.playTap();
                          likePost(post.id);
                        }}
                      >
                        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="nl-num">{post.likesCount}</span>
                      </button>

                      <button
                        type="button"
                        className="nl-post__action"
                        aria-expanded={commentsOpen}
                        aria-label={`评论（${post.comments.length}）`}
                        onClick={() => {
                          sound.playTap();
                          setActiveCommentPostId(commentsOpen ? null : post.id);
                          setCommentInput('');
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="nl-num">{post.comments.length}</span>
                      </button>

                      <button
                        type="button"
                        className="nl-post__action"
                        aria-pressed={post.isBookmarked}
                        onClick={() => {
                          sound.playTap();
                          bookmarkPost(post.id);
                        }}
                      >
                        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                        收藏
                      </button>

                      <button
                        type="button"
                        className="nl-post__action"
                        onClick={() => void handleShare(post.id, post.title || post.content)}
                      >
                        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                        转发
                      </button>

                      <button
                        type="button"
                        className="nl-post__action nl-post__action--danger nl-post__more"
                        onClick={() => reportPost(post)}
                        aria-label="举报这条内容"
                      >
                        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                        举报
                      </button>
                    </div>

                    {commentsOpen ? (
                      <div className="nl-comments">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="nl-comment">
                            <Avatar name={comment.userName} size="sm" tone="accent" />
                            <div className="nl-comment__body">
                              <div className="flex items-center justify-between gap-2">
                                <span className="nl-comment__name">{comment.userName}</span>
                                <button
                                  type="button"
                                  className="text-[9.5px] text-muted hover:text-danger"
                                  aria-label={`举报 ${comment.userName} 的这条评论`}
                                  onClick={() =>
                                    submitComplaint({
                                      targetType: 'comment',
                                      targetId: comment.id,
                                      orderTitle: `评论：${comment.content.slice(0, 14)}`,
                                      reason: '评论区内容举报（演练）',
                                      detail:
                                        '在信息流对单条评论发起举报；只写本机记录，不通知任何机构。',
                                    })
                                  }
                                >
                                  举报
                                </button>
                              </div>
                              <p className="nl-comment__text">{comment.content}</p>
                            </div>
                          </div>
                        ))}

                        <form
                          className="nl-comment-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            handleComment(post.id);
                          }}
                        >
                          <input
                            type="text"
                            className="nl-field"
                            value={commentInput}
                            onChange={(event) => setCommentInput(event.target.value)}
                            placeholder="写下你的留言…"
                            aria-label="评论内容"
                          />
                          <Button type="submit" size="sm" variant="primary" disabled={!commentInput.trim()}>
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                            发送
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </div>

        <aside className="nl-community__side" aria-label="社区侧栏">
          <section className="nl-card nl-qr-card">
            <p className="text-[12px] font-semibold text-ink">本社区互助群</p>
            <div className="nl-qr-card__box">
              <QrPattern />
            </div>
            <p className="nl-qr-card__cap">
              扫码加入本社区互助群。线下帮扶、物品借用、活动报名都在群里对接。
              <span className="mt-1 block text-[9.5px] text-faint">演示环境不提供真实群码。</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              block
              className="mt-3"
              onClick={() => {
                sound.playTap();
                setActiveSubPage('community_qr');
              }}
            >
              <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
              查看群二维码
            </Button>
          </section>

          <section className="nl-card nl-card__pad">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">闲置互助</p>
              <span className="text-[10.5px] text-muted">纯公益 · 不计时长</span>
            </div>
            <div className="mt-1">
              {idlePosts.length === 0 ? (
                <p className="py-3 text-[10.5px] text-muted">暂时没有闲置物品登记。</p>
              ) : (
                idlePosts.map((post) => (
                  <div key={post.id} className="nl-idle">
                    <span className="truncate">{post.title || post.content.slice(0, 16)}</span>
                    <Tag tone="neutral">可借</Tag>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              className="nl-idle__more"
              onClick={() => {
                sound.playTap();
                setActiveCategory('idle');
                document.getElementById('community-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              查看全部闲置
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </section>

          <button
            type="button"
            className="nl-card nl-card__pad flex items-center justify-between gap-3 text-left transition-colors hover:border-line-strong"
            onClick={() => {
              sound.playTap();
              setShowLeaderboard(true);
            }}
          >
            <span className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-warn-tint text-[#9a6a1f]">
                <Trophy className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[12px] font-semibold text-ink">月度时间币榜</span>
                <span className="mt-0.5 block text-[9.5px] text-muted">查看本月 TOP 5</span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-faint" aria-hidden="true" />
          </button>

          <p className="flex items-center gap-1.5 px-1 text-[9.5px] text-muted">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            仅展示到社区一级，不含门牌号
          </p>
        </aside>
      </div>

      {showLeaderboard ? (
        <Modal
          title="本月时间币 TOP 5"
          subtitle="合成演练榜单 · 不含真实居民与联系方式"
          onClose={() => setShowLeaderboard(false)}
          footer={
            <Button variant="ghost" onClick={() => setShowLeaderboard(false)}>
              关闭
            </Button>
          }
        >
          <div className="grid gap-1">
            {LEADERBOARD_TOP5.map((entry) => (
              <div
                key={entry.rank}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-page"
              >
                <span
                  className={`nl-num grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${
                    entry.rank <= 3 ? 'bg-brand text-white' : 'bg-subtle text-text2'
                  }`}
                >
                  {entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-ink">{entry.name}</p>
                  <p className="text-[10px] text-muted">{entry.badge}</p>
                </div>
                <div className="text-right">
                  <p className="nl-num text-[12px] font-semibold text-accent">{entry.hours} 小时</p>
                  <p className="text-[9.5px] text-muted">{entry.coins} 时间币</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
};
