import React, { useMemo, useState } from 'react';
import {
  Accessibility,
  Award,
  ChevronRight,
  ClipboardList,
  HandHeart,
  HeartHandshake,
  HelpCircle,
  History,
  Lock,
  MessageSquareWarning,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { Avatar } from '../ui/Avatar';
import { Tag } from '../ui/Tag';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const ORDER_STATUS_LABEL: Record<string, string> = {
  completed: '已完成（未结算）',
  in_progress: '服务进行中',
  accepted: '待上门服务',
  pending_confirm: '待双方确认',
  published: '接单大厅公示中',
  pending_audit: '待审核',
  cancelled: '已取消',
  disputed: '申诉中',
};

const ORDER_STATUS_TONE: Record<string, 'accent' | 'brand' | 'warn' | 'neutral' | 'danger'> = {
  completed: 'accent',
  in_progress: 'accent',
  accepted: 'warn',
  pending_confirm: 'warn',
  published: 'brand',
  pending_audit: 'neutral',
  cancelled: 'neutral',
  disputed: 'danger',
};

export const ProfileTab: React.FC = () => {
  const {
    currentUser,
    orders,
    timeLedger,
    setActiveSubPage,
    setSelectedOrderId,
    elderlyMode,
    setElderlyMode,
    setActiveTab,
  } = useApp();

  const [orderTab, setOrderTab] = useState<'requests' | 'volunteered'>('requests');
  const [showAbout, setShowAbout] = useState(false);

  const myRequests = useMemo(
    () => orders.filter((order) => order.userId === currentUser.id),
    [orders, currentUser.id],
  );
  const myVolunteered = useMemo(
    () => orders.filter((order) => order.volunteerId === currentUser.id),
    [orders, currentUser.id],
  );
  const ledgers = useMemo(
    () => timeLedger.filter((entry) => entry.userId === currentUser.id),
    [timeLedger, currentUser.id],
  );

  const monthEarn = useMemo(() => {
    const now = new Date();
    return ledgers
      .filter((entry) => {
        const date = new Date(entry.createdAt);
        return (
          entry.amount > 0 &&
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      })
      .reduce((sum, entry) => sum + entry.amount, 0) / 60;
  }, [ledgers]);

  const list = orderTab === 'requests' ? myRequests : myVolunteered;

  const openOrder = (id: string) => {
    sound.playTap();
    setSelectedOrderId(id);
    setActiveSubPage('order_detail');
  };

  return (
    <div className="w-full">
      <div className="nl-pagehead">
        <div>
          <h1 className="nl-page-title">我的</h1>
          <p className="nl-page-sub">账户、存折与证明都收在这一页</p>
        </div>
        <button
          type="button"
          className="nl-iconbtn"
          aria-pressed={elderlyMode}
          onClick={() => {
            sound.playTap();
            setElderlyMode(!elderlyMode);
          }}
          aria-label={elderlyMode ? '关闭大字关怀模式' : '开启大字关怀模式'}
          title="切换大字关怀模式"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="nl-profile">
        {/* 用户卡 */}
        <section className="nl-card nl-user-card" aria-label="账户信息">
          <Avatar name={currentUser.name} size="lg" />
          <div className="nl-user-card__main">
            <div className="nl-user-card__name">
              <span className="truncate">{currentUser.nickname}</span>
              <Tag tone={currentUser.verifyStatus === 'verified' ? 'accent' : 'neutral'}>
                {currentUser.verifyStatus === 'verified' ? '已实名' : '未实名'}
              </Tag>
            </div>
            <p className="nl-user-card__meta">{currentUser.community}</p>
            <div className="nl-user-card__stats">
              <span>
                发起求助 <strong className="nl-num text-ink">{myRequests.length}</strong> 单
              </span>
              <span>
                完成服务 <strong className="nl-num text-ink">{currentUser.completedTasks}</strong> 次
              </span>
              <span>
                志愿时长{' '}
                <strong className="nl-num text-ink">{currentUser.volunteerHours.toFixed(1)}</strong> 小时
              </span>
            </div>
          </div>
          <button
            type="button"
            className="nl-iconbtn"
            aria-label="实名认证与身份信息"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('realname_verify');
            }}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

        {/* 时间存折 */}
        <section className="nl-ledger-card" aria-label="我的时间存折">
          <div>
            <p className="text-[10.5px] text-[var(--nl-accent-on-dark)]">我的时间存折</p>
            <p className="nl-ledger-card__value">
              <span className="nl-num">{currentUser.timeCoins.toFixed(1)}</span>
              <span className="nl-ledger-card__unit">小时</span>
            </p>
            <p className="nl-ledger-card__meta">本月 +{monthEarn.toFixed(1)} 小时 · 只记账，不可兑现</p>
          </div>
          <button
            type="button"
            className="nl-ledger-card__link"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('time_ledger_page');
            }}
          >
            明细
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </section>

        {/* 桌面三张统计卡 */}
        <div className="nl-stat-grid">
          <button
            type="button"
            className="nl-card nl-stat"
            onClick={() => {
              sound.playTap();
              setOrderTab('requests');
              document.getElementById('profile-orders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <span className="nl-stat__icon">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="nl-stat__title">我的求助订单</span>
            <span className="nl-stat__desc">
              进行中 {myRequests.filter((order) => order.status !== 'completed').length} 单 · 共{' '}
              {myRequests.length} 单
            </span>
          </button>

          <button
            type="button"
            className="nl-card nl-stat"
            onClick={() => {
              sound.playTap();
              setOrderTab('volunteered');
              document.getElementById('profile-orders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <span className="nl-stat__icon bg-accent-tint text-accent">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="nl-stat__title">我的志愿服务</span>
            <span className="nl-stat__desc">
              累计 {currentUser.volunteerHours.toFixed(1)} 小时 · 本月 +{monthEarn.toFixed(1)}
            </span>
          </button>

          <button
            type="button"
            className="nl-card nl-stat"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('certificate_view');
            }}
          >
            <span className="nl-stat__icon bg-warn-tint text-[#9a6a1f]">
              <Award className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="nl-stat__title">志愿证明</span>
            <span className="nl-stat__desc">可在线预览并下载（演练证明）</span>
          </button>
        </div>

        {/* 订单列表：设计稿用菜单入口，这里保留可核对的明细 */}
        <section id="profile-orders" className="nl-card nl-card--sm overflow-hidden" aria-label="我的订单">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="nl-seg w-full max-w-[300px]">
              <button
                type="button"
                role="tab"
                aria-selected={orderTab === 'requests'}
                className="nl-seg__btn"
                onClick={() => {
                  sound.playTap();
                  setOrderTab('requests');
                }}
              >
                我发起的求助
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={orderTab === 'volunteered'}
                className="nl-seg__btn"
                onClick={() => {
                  sound.playTap();
                  setOrderTab('volunteered');
                }}
              >
                我认领的志愿
              </button>
            </div>
            <span className="hidden text-[9.5px] text-muted sm:block">双向确认后自动结算</span>
          </div>

          {list.length === 0 ? (
            <p className="px-4 py-8 text-center text-[11px] text-muted">
              {orderTab === 'requests' ? '还没有发起过求助。' : '还没有认领过志愿服务。'}
            </p>
          ) : (
            <div className="divide-y divide-line">
              {list.map((order) => (
                <div
                  key={order.id}
                  className="cursor-pointer flex items-center gap-3 px-4 py-3 transition-colors hover:bg-page"
                  role="button"
                  tabIndex={0}
                  onClick={() => openOrder(order.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openOrder(order.id);
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag tone={ORDER_STATUS_TONE[order.status] ?? 'neutral'}>
                        {ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </Tag>
                      <span className="truncate text-[12px] font-semibold text-ink">{order.title}</span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-muted">
                      {order.dateStr} · {order.locationArea} · 预估 {order.durationHours} 小时
                    </p>
                  </div>
                  <span className="nl-num shrink-0 text-[11px] font-semibold text-brand-ink">
                    +{order.timeCoinReward} 时间币
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 菜单 */}
        <section className="nl-card nl-menu" aria-label="账户与帮助">
          <button
            type="button"
            className="nl-menu__row"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('certificate_view');
            }}
          >
            <span className="nl-menu__icon bg-warn-tint text-[#9a6a1f]">
              <Award className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="nl-menu__label">志愿证明（可预览并下载）</span>
            <span className="nl-tag">演练证明</span>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="nl-menu__row"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('realname_verify');
            }}
          >
            <span className="nl-menu__icon bg-accent-tint text-accent">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="nl-menu__label">实名认证与身份信息</span>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
          </button>

          <div className="nl-menu__row">
            <span className="nl-menu__icon bg-brand-tint text-brand">
              <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="nl-menu__label">
              大字关怀模式
              <span className="mt-0.5 block text-[9.5px] font-normal text-muted">
                正文放大，触控热区不小于 44px
              </span>
            </span>
            <button
              type="button"
              className="nl-switch"
              role="switch"
              aria-checked={elderlyMode}
              aria-label="大字关怀模式"
              onClick={() => {
                sound.playTap();
                setElderlyMode(!elderlyMode);
              }}
            />
          </div>

          <button
            type="button"
            className="nl-menu__row"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('help_center');
            }}
          >
            <span className="nl-menu__icon bg-subtle text-text2">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="nl-menu__label">帮助中心（支持人机朗读）</span>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="nl-menu__row"
            onClick={() => {
              sound.playTap();
              setActiveTab('messages');
              toast('投诉与举报记录在「消息 → 投诉反馈」通道；本演示不会通知任何机构。');
            }}
          >
            <span className="nl-menu__icon bg-danger-tint text-danger">
              <MessageSquareWarning className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="nl-menu__label">意见反馈与投诉</span>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="nl-menu__row"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('rules_modal');
            }}
          >
            <span className="nl-menu__icon bg-subtle text-text2">
              <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="nl-menu__label">时间银行规则与演示边界</span>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="nl-menu__row"
            onClick={() => {
              sound.playTap();
              setShowAbout(true);
            }}
          >
            <span className="nl-menu__icon bg-subtle text-text2">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="nl-menu__label">关于邻里（演练说明与数据来源）</span>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="nl-menu__row"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('admin_center');
            }}
          >
            <span className="nl-menu__icon bg-brand-tint text-brand">
              <HandHeart className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="nl-menu__label">演练审核与举报处置后台（项目组）</span>
            <span className="nl-tag nl-tag--outline">管理入口</span>
            <ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
          </button>
        </section>

        <p className="flex items-center justify-center gap-1.5 pb-2 text-[9.5px] text-muted">
          <History className="h-3 w-3" aria-hidden="true" />
          时间币仅用于演示记账，不可兑现、不可转让
        </p>
      </div>

      {showAbout ? (
        <Modal
          title="关于邻里"
          subtitle="合成演练 · 数据只存在本机"
          onClose={() => setShowAbout(false)}
          footer={
            <Button variant="ghost" onClick={() => setShowAbout(false)}>
              关闭
            </Button>
          }
        >
          <div className="grid gap-3 text-[12px] leading-relaxed text-text">
            <p>
              本页面是「时间银行 + 银龄邻里守护」的双入口演练：B 端面向居民与志愿者，A+ 端面向社区受理人员。
            </p>
            <p>
              所有姓名、订单、时长与留言均为合成内容，不对应任何真实居民；不采集身份证号、手机号与门牌号。
            </p>
            <p className="text-[10.5px] text-muted">
              图标来自本地依赖，字体使用系统字体栈，无外部 CDN 请求。
            </p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};
