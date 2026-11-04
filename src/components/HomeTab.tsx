import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Flame,
  HandHeart,
  MapPin,
  Pause,
  Phone,
  Play,
  ScrollText,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { SectionHead } from '../ui/SectionHead';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

/** 相对时间：设计稿用「2 小时前 / 昨天」这类口语写法。 */
function timeAgo(value: string): string {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  const diff = Date.now() - time;
  const minute = 60_000;
  if (diff < minute) return '刚刚';
  if (diff < 60 * minute) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))} 小时前`;
  if (diff < 48 * 60 * minute) return '昨天';
  return `${Math.floor(diff / (24 * 60 * minute))} 天前`;
}

const QUICK_ACTIONS = [
  {
    key: 'help',
    label: '我要求助',
    hint: '一键发布需求',
    icon: HandHeart,
    tone: 'bg-brand-tint text-brand',
  },
  {
    key: 'accept',
    label: '我要接单',
    hint: '附近可接任务',
    icon: UserCheck,
    tone: 'bg-accent-tint text-accent',
  },
  {
    key: 'sos',
    label: '紧急求助',
    hint: '非急救：120 / 110',
    icon: Phone,
    tone: 'bg-danger-tint text-danger',
  },
  {
    key: 'article',
    label: '养老科普',
    hint: '慢病 · 居家安全',
    icon: BookOpen,
    tone: 'bg-warn-tint text-[#9a6a1f]',
  },
  {
    key: 'certificate',
    label: '志愿证明',
    hint: '查看 / 下载',
    icon: ScrollText,
    tone: 'bg-accent-tint text-accent',
  },
  {
    key: 'help-center',
    label: '帮助中心',
    hint: '支持人机朗读',
    icon: CircleHelp,
    tone: 'bg-subtle text-text2',
  },
] as const;

export const HomeTab: React.FC = () => {
  const {
    banners,
    volunteers,
    orders,
    posts,
    announcements,
    currentUser,
    timeLedger,
    setActiveTab,
    setActiveSubPage,
    setSelectedOrderId,
    setSelectedArticleId,
    triggerSos,
  } = useApp();

  const [bannerIdx, setBannerIdx] = useState(0);
  const [openAnnouncement, setOpenAnnouncement] = useState<string | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const playing = !userPaused && !hoverPaused && !reducedMotion && banners.length > 1;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % banners.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [banners.length, playing]);

  const openOrders = useMemo(
    () => orders.filter((order) => order.status === 'published').slice(0, 2),
    [orders],
  );
  const freshPosts = useMemo(
    () => posts.filter((post) => post.status === 'approved').slice(0, 2),
    [posts],
  );
  const ledgerSummary = useMemo(() => {
    const now = new Date();
    const monthEarn = timeLedger
      .filter((entry) => {
        const date = new Date(entry.createdAt);
        return (
          entry.amount > 0 &&
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      })
      .reduce((sum, entry) => sum + entry.amount, 0) / 60;
    const pending = orders
      .filter((order) => order.status === 'in_progress' || order.status === 'pending_confirm')
      .reduce((sum, order) => sum + order.timeCoinReward, 0);
    return { monthEarn, pending };
  }, [timeLedger, orders]);

  const noticeRows = useMemo(
    () => [...announcements].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)).slice(0, 3),
    [announcements],
  );

  const banner = banners.length > 0 ? banners[bannerIdx % banners.length] : null;
  const slideCount = banners.length;

  const goSlide = (next: number) => {
    if (slideCount === 0) return;
    setBannerIdx((next + slideCount) % slideCount);
  };

  const handleQuickAction = (key: string) => {
    sound.playTap();
    if (key === 'help') setActiveSubPage('publish_modal');
    else if (key === 'accept') setActiveSubPage('tasks_hall');
    else if (key === 'sos') triggerSos();
    else if (key === 'article') {
      setSelectedArticleId('art_1');
      setActiveSubPage('eldercare_detail');
    } else if (key === 'certificate') setActiveSubPage('certificate_view');
    else setActiveSubPage('help_center');
  };

  const runBannerAction = () => {
    if (!banner) return;
    sound.playTap();
    if (banner.actionType === 'help') setActiveSubPage('publish_modal');
    else if (banner.actionType === 'community') setActiveTab('community');
    else if (banner.actionType === 'tasks') setActiveSubPage('tasks_hall');
    else if (banner.actionType === 'sos') triggerSos();
    else if (banner.actionType === 'rules') setActiveSubPage('rules_modal');
    else {
      setSelectedArticleId(banner.targetId ?? 'art_1');
      setActiveSubPage('eldercare_detail');
    }
  };

  return (
    <div className="pb-2">
      <h1 className="nl-sr-only">暖阳邻里 · 社区互助演练首页</h1>

      <div className="nl-home">
        <div className="nl-home__main">
          {/* ── 公告轮播 ───────────────────────────────────────── */}
          <section
            className="nl-home__banner"
            aria-label="社区公告"
            aria-roledescription="carousel"
            onMouseEnter={() => setHoverPaused(true)}
            onMouseLeave={() => setHoverPaused(false)}
            onFocusCapture={() => setHoverPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setHoverPaused(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                goSlide(bannerIdx + 1);
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goSlide(bannerIdx - 1);
              }
            }}
          >
            <div className="nl-banner">
              {banner ? (
                <>
                  <span className="nl-banner__tag">{banner.tag}</span>
                  <h2 className="nl-banner__title">{banner.title}</h2>
                  <p className="nl-banner__sub">{banner.subtitle}</p>
                  <button type="button" className="nl-banner__cta" onClick={runBannerAction}>
                    {banner.actionText}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <p className="text-[13px] text-white/85">暂无可展示的社区公告。</p>
              )}

              {slideCount > 1 ? (
                <div className="nl-banner__controls">
                  <button
                    type="button"
                    className="nl-banner__arrow"
                    aria-label="上一条公告"
                    onClick={() => goSlide(bannerIdx - 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
                  </button>

                  <div className="nl-banner__dots">
                    {banners.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        className="nl-banner__dot"
                        aria-label={`第 ${index + 1} 条公告：${item.title}`}
                        aria-current={index === bannerIdx % slideCount}
                        onClick={() => goSlide(index)}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="nl-banner__arrow"
                    aria-label="下一条公告"
                    onClick={() => goSlide(bannerIdx + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    className="nl-banner__arrow"
                    aria-label={userPaused ? '继续自动播放公告' : '暂停自动播放公告'}
                    aria-pressed={userPaused}
                    onClick={() => {
                      setUserPaused((paused) => !paused);
                      setHoverPaused(false);
                    }}
                  >
                    {userPaused || reducedMotion ? (
                      <Play className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <Pause className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          {/* ── 常用功能 ───────────────────────────────────────── */}
          <section className="nl-home__quick" aria-labelledby="home-quick-title">
            <SectionHead
              id="home-quick-title"
              title="常用功能"
              sub="老人与家属最常办的六件事"
              action={
                <span className="hidden items-center gap-1 text-[10.5px] text-muted sm:flex">
                  <Sparkles className="h-3 w-3 text-brand" aria-hidden="true" />
                  演练环境 · 不连接真实服务
                </span>
              }
            />

            <div className="nl-quick">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => handleQuickAction(action.key)}
                    className="nl-quick__item"
                  >
                    <span className={`nl-quick__icon ${action.tone}`}>
                      <Icon className="h-[23px] w-[23px]" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="nl-quick__label">{action.label}</span>
                    <span className="nl-quick__hint">{action.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 附近的志愿者 ───────────────────────────────────── */}
          <section className="nl-home__vol" aria-labelledby="home-volunteer-title">
            <SectionHead
              id="home-volunteer-title"
              title="附近的志愿者"
              action={
                <button
                  type="button"
                  className="nl-sec__link"
                  onClick={() => {
                    sound.playTap();
                    setActiveSubPage('tasks_hall');
                  }}
                >
                  全部 {volunteers.length} 人
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </button>
              }
            />

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {volunteers.slice(0, 2).map((vol, index) => (
                <div key={vol.id} className="nl-mini">
                  <Avatar name={vol.name} tone="accent" />
                  <div className="nl-mini__main">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-semibold text-ink">{vol.name}</span>
                      {vol.badge ? <span className="nl-tag nl-tag--accent">{vol.badge}</span> : null}
                    </div>
                    <p className="nl-mini__meta">
                      {vol.skills.join(' / ')} · 已服务 {vol.completedTasks} 小时
                    </p>
                    <p className="nl-mini__rating">
                      {vol.rating > 0 ? (
                        <>
                          <span className="nl-num">{vol.rating.toFixed(1)}</span> 分
                        </>
                      ) : (
                        <span>暂无评分</span>
                      )}
                      <span className="text-line-strong" aria-hidden="true">
                        ·
                      </span>
                      距您 {vol.distance}
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant={index === 0 ? 'primary' : 'ghost'}
                    onClick={() => {
                      sound.playTap();
                      setActiveSubPage('tasks_hall');
                    }}
                    aria-label={`预约志愿者 ${vol.name}`}
                  >
                    预约
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* ── 社区新鲜事 ─────────────────────────────────────── */}
          <section className="nl-home__fresh" aria-labelledby="home-fresh-title">
            <SectionHead
              id="home-fresh-title"
              title="社区新鲜事"
              action={
                <button
                  type="button"
                  className="nl-sec__link"
                  onClick={() => {
                    sound.playTap();
                    setActiveTab('community');
                  }}
                >
                  进入社区
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
              }
            />

            <div className="mt-3 grid gap-2.5">
              {freshPosts.map((post) => (
                <article key={post.id} className="nl-fresh">
                  <Avatar name={post.userName} size="sm" tone={post.isOfficial ? 'ink' : 'brand'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-semibold text-ink">{post.userName}</span>
                      {post.isOfficial ? <span className="nl-tag">服务</span> : null}
                    </div>
                    <p className="nl-fresh__text">{post.content}</p>
                  </div>
                  <span className="shrink-0 text-[9.5px] text-faint">{timeAgo(post.createdAt)}</span>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="nl-home__side">
          {/* ── 时间存折 ───────────────────────────────────────── */}
          <section className="nl-home__ledger" aria-label="我的时间存折">
            <div className="nl-ledger">
              <div className="nl-ledger__top">
                <div>
                  <p className="nl-ledger__label">我的时间存折</p>
                  <p className="nl-ledger__value">
                    <span className="nl-num">{currentUser.timeCoins.toFixed(1)}</span>
                    <span className="nl-ledger__unit">小时</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="nl-ledger__link"
                  onClick={() => {
                    sound.playTap();
                    setActiveSubPage('time_ledger_page');
                  }}
                >
                  查看明细
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
              <p className="nl-ledger__meta">
                本月 +{ledgerSummary.monthEarn.toFixed(1)} 小时 · 待结算{' '}
                {ledgerSummary.pending.toFixed(1)}
              </p>
            </div>
          </section>

          {/* ── 热门求助 ───────────────────────────────────────── */}
          <section className="nl-home__hot" aria-labelledby="home-hot-title">
            <SectionHead
              id="home-hot-title"
              title="热门求助"
              action={
                <button
                  type="button"
                  className="nl-sec__link"
                  onClick={() => {
                    sound.playTap();
                    setActiveSubPage('tasks_hall');
                  }}
                >
                  接单大厅
                </button>
              }
            />

            <div className="mt-3 grid gap-2.5">
              {openOrders.length === 0 ? (
                <div className="nl-card nl-card--sm px-4 py-6 text-center text-[11.5px] text-muted">
                  当前没有待接单的求助。发起一单试试？
                </div>
              ) : (
                openOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    className="nl-hot"
                    onClick={() => {
                      sound.playTap();
                      setSelectedOrderId(order.id);
                      setActiveSubPage('order_detail');
                    }}
                  >
                    <div className="nl-hot__top">
                      <span className={`nl-tag ${order.isUrgent ? 'nl-tag--danger' : ''}`}>
                        {order.isUrgent ? <Flame className="h-2.5 w-2.5" aria-hidden="true" /> : null}
                        {order.categoryLabel}
                      </span>
                      <span className="text-[9.5px] text-muted">约 {order.durationHours} 小时</span>
                    </div>
                    <p className="nl-hot__title">{order.title}</p>
                    <p className="nl-hot__meta">
                      {order.dateStr} {order.timeStr} · {order.locationArea}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* ── 公告与制度 ─────────────────────────────────────── */}
          <section className="nl-home__notices" aria-labelledby="home-notice-title">
            <SectionHead id="home-notice-title" title="公告与制度" />
            <div className="nl-card nl-notices nl-divide">
              {noticeRows.map((notice) => {
                const expanded = openAnnouncement === notice.id;
                return (
                  <div key={notice.id}>
                    <button
                      type="button"
                      className="nl-notice-row"
                      aria-expanded={expanded}
                      onClick={() => setOpenAnnouncement(expanded ? null : notice.id)}
                    >
                      <span className="nl-notice-row__title">{notice.title}</span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 text-faint transition-transform ${
                          expanded ? 'rotate-90' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {expanded ? (
                      <div className="nl-notice-row__body">
                        {notice.content}
                        <p className="mt-2 text-[9.5px] text-muted">
                          {notice.source} · {notice.date}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <p className="mt-7 flex items-center justify-center gap-1.5 text-[10px] text-muted">
        <MapPin className="h-3 w-3" aria-hidden="true" />
        {currentUser.community} · 合成演练数据，不对应任何真实居民或机构
      </p>
    </div>
  );
};
