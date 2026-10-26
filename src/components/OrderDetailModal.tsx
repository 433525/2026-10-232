import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Coins,
  Flag,
  History,
  Lock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { Avatar } from '../ui/Avatar';

const STATUS_TEXT: Record<string, string> = {
  published: '正在接单大厅公示 · 等待志愿者认领',
  accepted: '志愿者已认领 · 待上门签到服务',
  completed: '服务已圆满完成 · 时长已入账',
  cancelled: '订单已取消',
  pending_audit: '待审核',
  pending_confirm: '待双方确认',
  disputed: '申诉处理中',
};

export const OrderDetailModal: React.FC = () => {
  const {
    orders,
    selectedOrderId,
    setActiveSubPage,
    currentUser,
    acceptOrder,
    clockInOrder,
    counterpartAcceptOrder,
    completeOrder,
    cancelOrder,
    raiseOrderDispute,
    resolveOrderDispute,
    setActiveTab,
    setChatFocusPostId,
    submitComplaint,
  } = useApp();

  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('服务非常准时细心，老人非常满意，感谢志愿者付出！');
  const [showRating, setShowRating] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('时间安排冲突');
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [resolveAction, setResolveAction] = useState<'resume' | 'close' | null>(null);
  const [resolveReason, setResolveReason] = useState('');

  const order = orders.find((item) => item.id === selectedOrderId);
  if (!order) return null;

  const isMyOrder = order.userId === currentUser.id;
  const isMyClaimed = order.volunteerId === currentUser.id;
  const isParticipant = isMyOrder || isMyClaimed;
  const canClaim = currentUser.role === 'volunteer' && order.status === 'published';
  const canSeeDetail = isMyOrder || isMyClaimed || currentUser.role === 'admin';

  // 争议流程：接单方与发布方都能发起（领域层同口径）；撤销 / 关闭只在争议态可用，
  // 三者都必须带理由，写入 orderEvents 后立即出现在下面的「演练留痕」时间线。
  const canRaiseDispute = isParticipant && ['accepted', 'pending_confirm'].includes(order.status);
  const canResolveDispute = isParticipant && order.status === 'disputed';

  const close = () => setActiveSubPage(null);

  const openResolve = (action: 'resume' | 'close') => {
    sound.playTap();
    setResolveReason('');
    setResolveAction(action);
  };

  const openDispute = () => {
    sound.playTap();
    setDisputeReason('');
    setShowDispute(true);
  };

  // 发布者视角的完成确认：本人订单在已接单 / 待确认 / 服务中都可发起
  // （合成接单方代发起申请，本人确认）；接单者仍需先上门签到再确认。
  const canConfirmCompletion =
    (isMyClaimed && order.status === 'in_progress')
    || (isMyOrder && ['accepted', 'pending_confirm', 'in_progress'].includes(order.status));

  const startChat = () => {
    sound.playTap();
    // 先记住要沟通的订单：消息页据此定位（或准备创建）该订单的留言会话，
    // 不再固定落在第一条会话上。
    setChatFocusPostId(order.id);
    close();
    setActiveTab('messages');
  };

  const statusText =
    order.status === 'in_progress'
      ? `志愿服务进行中（签到时间：${order.clockInTime ?? '本机记录'}）`
      : STATUS_TEXT[order.status] ?? order.status;

  return (
    <>
      <Modal
        title="互助求助订单详情"
        subtitle={`#${order.id} · 发布于 ${order.createdAt}`}
        onClose={close}
        wide
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(isMyOrder || isMyClaimed) && (
                <Button variant="ghost" size="sm" onClick={startChat}>
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  订单内沟通留言
                </Button>
              )}
              {(isMyOrder || currentUser.role === 'admin') && order.status === 'published' ? (
                <Button variant="quiet" size="sm" onClick={() => setShowCancel(true)}>
                  取消订单
                </Button>
              ) : null}
              {canRaiseDispute ? (
                <Button variant="quiet" size="sm" onClick={openDispute}>
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  发起争议（演练）
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {canResolveDispute ? (
                <>
                  <Button variant="quiet" size="sm" onClick={() => openResolve('resume')}>
                    撤销争议并继续履约
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => openResolve('close')}>
                    因争议关闭订单
                  </Button>
                </>
              ) : null}

              {canClaim ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    acceptOrder(order.id);
                    close();
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  认领并提供志愿服务
                </Button>
              ) : null}

              {isMyClaimed && order.status === 'accepted' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => clockInOrder(order.id)}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  上门签到（本机记录）
                </Button>
              ) : null}

              {isMyOrder && order.status === 'published' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => counterpartAcceptOrder(order.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  代合成邻居接单（演练）
                </Button>
              ) : null}

              {canConfirmCompletion ? (
                <Button variant="primary" size="sm" onClick={() => setShowRating(true)}>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  双方确认完成（本机演练，不结算）
                </Button>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  sound.playTap();
                  submitComplaint({
                    orderId: order.id,
                    orderTitle: order.title,
                    reason: '接单大厅内容举报（演练）',
                    detail: '对当前查看的求助订单发起举报；只写本机记录，不通知任何机构。',
                  });
                }}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                举报该内容
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-[14px] bg-page px-4 py-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
                <Clock className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[12.5px] font-semibold text-ink">{statusText}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {order.isUrgent ? '置顶紧急需求' : '普通互助'} · 更新时间 {order.createdAt}
                </p>
              </div>
            </div>
            <Tag tone="brand">+{order.timeCoinReward} 时间币</Tag>
          </div>

          {order.status === 'disputed' ? (
            <section className="nl-alert nl-alert--warn" aria-label="争议处理中">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="block text-[11.5px]">争议处理中（本机演练）</strong>
                <span className="mt-1 block">{order.disputeReason ?? '未填写争议原因'}</span>
                <span className="mt-1 block text-[10.5px] text-muted">
                  页面不会向任何机构发出仲裁或投诉；撤销争议会回到履约中，关闭则整单终止，
                  两种处理都必须填写说明并留痕。
                </span>
              </span>
            </section>
          ) : null}

          <section className="nl-card nl-card--sm px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-[15px] font-semibold leading-snug text-ink">{order.title}</h3>
              <Tag tone={order.isUrgent ? 'danger' : 'neutral'}>{order.categoryLabel}</Tag>
            </div>
            <p className="mt-2 text-[12px] leading-[1.8] text-text">{order.description}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 border-t border-line pt-3 text-[11px] text-text2 sm:grid-cols-2">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                服务时间：{order.dateStr} {order.timeStr}
              </span>
              <span className="flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-[#9a6a1f]" aria-hidden="true" />
                预估时长：{order.durationHours} 小时（结算 {order.timeCoinReward} 币）
              </span>
            </div>
          </section>

          <section className="nl-card nl-card--sm px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-text2">
                <MapPin className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                服务地点与脱敏保护
              </span>
              <span className="nl-tag nl-tag--accent">
                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                敏感隐私受控
              </span>
            </div>

            <p className="mt-2 text-[13px] font-semibold text-ink">{order.locationArea}</p>

            {canSeeDetail ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-accent-tint px-3 py-2 text-[11px] text-[#174f42]">
                <span>
                  门牌详细地址：<strong>{order.locationDetail || '本机演练不采集门牌号'}</strong>
                </span>
                <span className="rounded bg-white px-2 py-0.5 text-[9.5px] text-accent">接单后凭证可见</span>
              </div>
            ) : (
              <div className="mt-2 flex items-start gap-2 rounded-[10px] bg-subtle px-3 py-2 text-[11px] text-text2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                <span>详细单元及门牌号已脱敏隐藏，志愿者成功认领后方可解锁查看。</span>
              </div>
            )}
          </section>

          {order.medicalNotes ? (
            <section className="nl-alert nl-alert--warn">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="block text-[11.5px]">长者健康与照护注意事项（单独授权）</strong>
                <span className="mt-1 block">{order.medicalNotes}</span>
              </span>
            </section>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <section className="nl-card nl-card--sm px-4 py-3.5">
              <p className="text-[9.5px] font-semibold tracking-wide text-muted">求助居民信息</p>
              <div className="mt-2 flex items-center gap-2.5">
                <Avatar name={order.userName} />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-ink">{order.userName}</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {canSeeDetail ? order.userPhoneReal : order.userPhoneMasked}
                  </p>
                </div>
              </div>
            </section>

            <section className="nl-card nl-card--sm px-4 py-3.5">
              <p className="text-[9.5px] font-semibold tracking-wide text-muted">认领志愿者信息</p>
              {order.volunteerName ? (
                <div className="mt-2 flex items-center gap-2.5">
                  <Avatar name={order.volunteerName} tone="accent" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[12px] font-semibold text-ink">
                      {order.volunteerName}
                      <span className="nl-tag nl-tag--warn">
                        {order.volunteerRating ? `★ ${order.volunteerRating}` : '暂无评分'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {order.volunteerPhone || '未提供（演练不采集手机号）'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  暂无志愿者认领
                </p>
              )}
            </section>
          </div>

          {order.events && order.events.length > 0 ? (
            <section className="nl-card nl-card--sm px-4 py-3.5" aria-label="订单留痕">
              <p className="mb-2 text-[9.5px] font-semibold tracking-wide text-muted">
                演练留痕 · 本机记录的时间线，不代表真实履约或结算
              </p>
              <div className="nl-timeline">
                {order.events.map((event) => (
                  <div key={event.id} className="nl-timeline__row">
                    <span
                      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-page text-brand"
                      aria-hidden="true"
                    >
                      <History className="h-3.5 w-3.5" />
                    </span>
                    <div className="nl-timeline__main">
                      <p className="nl-timeline__title">{event.typeLabel}</p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{event.note}</p>
                      <p className="nl-timeline__meta">
                        {event.actorLabel} · {event.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {order.status === 'completed' && order.ratingScore ? (
            <section className="rounded-[12px] bg-accent-tint px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-accent">长者服务评价</span>
                <span className="flex items-center gap-0.5 text-brand">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${star <= (order.ratingScore ?? 5) ? 'fill-brand' : 'text-line-strong'}`}
                      aria-hidden="true"
                    />
                  ))}
                </span>
              </div>
              {order.ratingComment ? (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-text">“{order.ratingComment}”</p>
              ) : null}
            </section>
          ) : null}
        </div>
      </Modal>

      {showRating ? (
        <Modal
          title="服务完成确认与长者满意度评价"
          subtitle="本机演练记账，不产生真实支付"
          onClose={() => setShowRating(false)}
          footer={
            <>
              <Button variant="quiet" onClick={() => setShowRating(false)}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  completeOrder(order.id, ratingScore, ratingComment);
                  setShowRating(false);
                  close();
                }}
              >
                提交确认并记账（未结算 {order.timeCoinReward} 币）
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <div>
              <span className="nl-label">服务打分</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    aria-label={`${score} 星`}
                    aria-pressed={ratingScore === score}
                    onClick={() => setRatingScore(score)}
                    className="p-0.5"
                  >
                    <Star
                      className={`h-7 w-7 ${score <= ratingScore ? 'fill-brand text-brand' : 'text-line-strong'}`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
                <span className="ml-1 text-[11px] font-semibold text-brand-ink">{ratingScore} 星好评</span>
              </div>
            </div>

            <div>
              <label className="nl-label" htmlFor="rating-comment">
                评价评语
              </label>
              <textarea
                id="rating-comment"
                className="nl-textarea"
                value={ratingComment}
                onChange={(event) => setRatingComment(event.target.value)}
                rows={3}
              />
            </div>
          </div>
        </Modal>
      ) : null}

      {showDispute ? (
        <Modal
          title="发起争议（本机演练）"
          subtitle="只写本机记录；不发起真实仲裁、投诉或通知"
          onClose={() => setShowDispute(false)}
          footer={
            <>
              <Button variant="quiet" onClick={() => setShowDispute(false)}>
                再想想
              </Button>
              <Button
                variant="danger"
                disabled={!disputeReason.trim()}
                onClick={() => {
                  raiseOrderDispute(order.id, disputeReason.trim());
                  setShowDispute(false);
                }}
              >
                确认发起争议
              </Button>
            </>
          }
        >
          <div className="grid gap-2">
            <label className="nl-label" htmlFor="dispute-reason">
              争议原因（必填）
            </label>
            <textarea
              id="dispute-reason"
              className="nl-textarea"
              rows={3}
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
              placeholder="例如：两次约定的上门时间都未能成行"
            />
            <p className="text-[10.5px] leading-relaxed text-muted">
              理由会原样写入本条订单的「演练留痕」，撤销或关闭后仍保留；没有真实仲裁方受理。
            </p>
          </div>
        </Modal>
      ) : null}

      {resolveAction ? (
        <Modal
          title={resolveAction === 'resume' ? '撤销争议并继续履约' : '因争议关闭订单'}
          subtitle="只写本机记录；不涉及真实退款、仲裁或通知"
          onClose={() => setResolveAction(null)}
          footer={
            <>
              <Button variant="quiet" onClick={() => setResolveAction(null)}>
                取消
              </Button>
              <Button
                variant={resolveAction === 'close' ? 'danger' : 'primary'}
                disabled={!resolveReason.trim()}
                onClick={() => {
                  resolveOrderDispute(order.id, resolveAction, resolveReason.trim());
                  setResolveAction(null);
                }}
              >
                {resolveAction === 'resume' ? '确认撤销并恢复履约' : '确认关闭该订单'}
              </Button>
            </>
          }
        >
          <div className="grid gap-2">
            <label className="nl-label" htmlFor="resolve-reason">
              处理说明（必填）
            </label>
            <textarea
              id="resolve-reason"
              className="nl-textarea"
              rows={3}
              value={resolveReason}
              onChange={(event) => setResolveReason(event.target.value)}
              placeholder={
                resolveAction === 'resume'
                  ? '例如：双方已重新约好上门时间'
                  : '例如：需求已由家属另行安排，双方确认终止'
              }
            />
            <p className="text-[10.5px] leading-relaxed text-muted">
              {resolveAction === 'resume'
                ? '撤销后订单回到「志愿者已认领」，可继续上门签到与完成确认。'
                : '关闭后订单终止，不再产生新的履约事件，也不会结算时间币。'}
            </p>
          </div>
        </Modal>
      ) : null}

      {showCancel ? (
        <Modal
          title="确认取消该求助订单？"
          subtitle="取消后不会产生时间币结算"
          onClose={() => setShowCancel(false)}
          footer={
            <>
              <Button variant="quiet" onClick={() => setShowCancel(false)}>
                再想想
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  cancelOrder(order.id, cancelReason);
                  setShowCancel(false);
                  close();
                }}
              >
                确认取消
              </Button>
            </>
          }
        >
          <label className="nl-label" htmlFor="cancel-reason">
            取消原因
          </label>
          <select
            id="cancel-reason"
            className="nl-select"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          >
            <option value="时间安排冲突">时间安排冲突</option>
            <option value="已通过其他途径解决">已通过其他途径解决</option>
            <option value="需求内容填写有误">需求内容填写有误</option>
          </select>
        </Modal>
      ) : null}
    </>
  );
};
