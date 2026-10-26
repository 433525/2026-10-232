import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Coins, Database, FileText, ShieldCheck, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { StoragePanel } from './StoragePanel';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';

const TABS = [
  { key: 'audit', label: '内容审核', icon: FileText },
  { key: 'complaints', label: '举报处置工单', icon: AlertTriangle },
  { key: 'ledger', label: '时间账本', icon: Coins },
  { key: 'users', label: '演练身份', icon: Users },
  { key: 'storage', label: '存档与恢复', icon: Database },
] as const;

export const AdminCenter: React.FC = () => {
  const {
    currentUser,
    pendingPosts,
    pendingComments,
    orders,
    complaints,
    users,
    timeLedger,
    adminApprovePost,
    adminRejectPostWithReason,
    adminApproveComment,
    adminRejectCommentWithReason,
    adminResolveComplaint,
    adminAdjustTimeCoin,
    setActiveSubPage,
  } = useApp();

  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('audit');
  const [selectedUserForCoin, setSelectedUserForCoin] = useState<string>(users[0].id);
  const [adjustCoinAmount, setAdjustCoinAmount] = useState<number>(5);
  const [adjustCoinReason, setAdjustCoinReason] = useState<string>('年度邻里互助模范特别奖励');
  const [complaintReplies, setComplaintReplies] = useState<Record<string, string>>({});
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const replyOf = (id: string) => complaintReplies[id] ?? '已核对本机演练记录，按互助规则完成处置。';
  const pendingOrders = orders.filter((order) => order.status === 'pending_audit');
  const pendingComplaints = complaints.filter((item) => item.status === 'pending');

  return (
    <Modal
      title="审核与举报处置后台"
      subtitle={`内容审核与举报处置 · 当前操作员：${currentUser.name} · 先审后发 · 处置留痕`}
      onClose={() => setActiveSubPage(null)}
      wide
      footer={
        <>
          <p className="nl-modal__foot-note">
            本后台只操作本机存档；不连接真实审核系统，也不会通知任何机构。
          </p>
          <Button variant="ghost" size="sm" onClick={() => setActiveSubPage(null)}>
            关闭
          </Button>
        </>
      }
    >
      <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto border-b border-line pb-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const count =
            item.key === 'audit'
              ? pendingPosts.length + pendingComments.length + pendingOrders.length
              : item.key === 'complaints'
                ? pendingComplaints.length
                : 0;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={tab === item.key}
              onClick={() => {
                sound.playTap();
                setTab(item.key);
              }}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] transition-colors ${
                tab === item.key
                  ? 'bg-brand text-white'
                  : 'text-text2 hover:bg-page hover:text-ink'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
              {count > 0 ? (
                <span
                  className={`nl-num rounded-full px-1 text-[9px] ${
                    tab === item.key ? 'bg-white/20' : 'bg-sunken text-brand-ink'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === 'audit' ? (
        <div className="grid gap-3">
          {pendingPosts.length === 0 && pendingComments.length === 0 && pendingOrders.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6 text-accent" aria-hidden="true" />}
              title="当前没有积压的待审核内容"
              hint="新的发布与评论提交会进入这里；先审后发不会跳过队列。"
            />
          ) : null}

          {pendingPosts.map((post) => (
            <section key={post.id} className="nl-card nl-card--sm px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Tag tone="warn">待审内容 · {post.categoryLabel}</Tag>
                <span className="text-[9.5px] text-faint">{post.createdAt}</span>
              </div>
              <p className="mt-2 text-[12.5px] font-semibold text-ink">{post.title || '动态分享'}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-text2">{post.content}</p>

              <div className="mt-2.5 border-t border-line pt-2.5">
                <label className="nl-label" htmlFor={`reject-${post.id}`}>
                  驳回理由（必填，会写入审核日志）
                </label>
                <input
                  id={`reject-${post.id}`}
                  type="text"
                  className="nl-field"
                  value={rejectReasons[post.id] ?? ''}
                  onChange={(event) =>
                    setRejectReasons((prev) => ({ ...prev, [post.id]: event.target.value }))
                  }
                  placeholder="例如：包含未脱敏的联系方式 / 与互助无关的推广"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    size="xs"
                    variant="quiet"
                    disabled={!(rejectReasons[post.id] ?? '').trim()}
                    onClick={() => adminRejectPostWithReason(post.id, rejectReasons[post.id] ?? '')}
                  >
                    驳回并记录理由
                  </Button>
                  <Button size="xs" variant="primary" onClick={() => adminApprovePost(post.id)}>
                    审核通过并公开
                  </Button>
                </div>
              </div>
            </section>
          ))}

          {pendingComments.map((comment) => (
            <section key={comment.id} className="nl-card nl-card--sm px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Tag tone="warn">待审评论</Tag>
                <span className="text-[9.5px] text-faint">{comment.createdAt}</span>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                {comment.userName} · 发表在《{comment.postTitle}》
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-text2">{comment.content}</p>

              <div className="mt-2.5 border-t border-line pt-2.5">
                <label className="nl-label" htmlFor={`reject-${comment.id}`}>
                  驳回理由（必填，会写入审核日志）
                </label>
                <input
                  id={`reject-${comment.id}`}
                  type="text"
                  className="nl-field"
                  value={rejectReasons[comment.id] ?? ''}
                  onChange={(event) =>
                    setRejectReasons((prev) => ({ ...prev, [comment.id]: event.target.value }))
                  }
                  placeholder="例如：评论含人身攻击 / 站外引流"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    size="xs"
                    variant="quiet"
                    disabled={!(rejectReasons[comment.id] ?? '').trim()}
                    onClick={() =>
                      adminRejectCommentWithReason(
                        comment.postId,
                        comment.id,
                        rejectReasons[comment.id] ?? '',
                      )
                    }
                  >
                    驳回并记录理由
                  </Button>
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => adminApproveComment(comment.postId, comment.id)}
                  >
                    审核通过并展示
                  </Button>
                </div>
              </div>
            </section>
          ))}

          {pendingOrders.length > 0 ? (
            <section className="nl-alert nl-alert--info">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                还有 {pendingOrders.length} 条求助单处于待审状态，需要在 A+ 受理工作台按登记流程处理；
                B 端后台只负责社区内容的先审后发。
              </span>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'complaints' ? (
        <div className="grid gap-3">
          <p className="text-[10.5px] leading-relaxed text-muted">
            每条 UGC 都可被举报；处置结论会写入举报记录，并作为站内消息回给举报人。
          </p>

          {complaints.length === 0 ? (
            <EmptyState title="还没有举报工单" hint="在信息流、评论或订单留言上使用「举报」后会出现。" />
          ) : null}

          {complaints.map((ticket) => (
            <section key={ticket.id} className="nl-card nl-card--sm px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] font-semibold text-text2">
                  工单编号：{ticket.ticketNo}
                </span>
                <span className="flex items-center gap-1.5">
                  <Tag tone="neutral">
                    {ticket.targetType === 'comment'
                      ? '演练评论'
                      : ticket.targetType === 'message'
                        ? '订单留言'
                        : '信息流内容'}
                  </Tag>
                  <Tag tone={ticket.status === 'resolved' ? 'accent' : 'warn'}>{ticket.statusLabel}</Tag>
                </span>
              </div>

              <div className="mt-2 grid gap-1 text-[11px] leading-relaxed text-text2">
                <p>
                  <strong className="text-text">举报人：</strong>
                  {ticket.userName || '演练用户'}
                  <span className="mx-1 text-line-strong">|</span>
                  <strong className="text-text">被举报内容：</strong>
                  {ticket.orderTitle ?? ticket.targetUser ?? '演练内容'}
                  {ticket.targetId ? (
                    <span className="ml-1 font-mono text-[9.5px] text-faint">（{ticket.targetId}）</span>
                  ) : null}
                </p>
                <p>
                  <strong className="text-text">举报原因：</strong>
                  {ticket.reason}
                </p>
                <p className="rounded-[8px] bg-page px-2.5 py-2">{ticket.detail}</p>
              </div>

              {ticket.status === 'pending' ? (
                <div className="mt-2.5 border-t border-line pt-2.5">
                  <label className="nl-label" htmlFor={`reply-${ticket.id}`}>
                    处置结论（写入举报记录，留痕）
                  </label>
                  <input
                    id={`reply-${ticket.id}`}
                    type="text"
                    className="nl-field"
                    value={replyOf(ticket.id)}
                    onChange={(event) =>
                      setComplaintReplies((prev) => ({ ...prev, [ticket.id]: event.target.value }))
                    }
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => adminResolveComplaint(ticket.id, replyOf(ticket.id))}
                    >
                      确认办结（只写本机站内消息）
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-[8px] bg-accent-tint px-2.5 py-2 text-[10.5px] leading-relaxed text-[#174f42]">
                  <p>
                    <strong>经办人：</strong>
                    {ticket.handlerName}（{ticket.resolvedAt}）
                  </p>
                  <p className="mt-0.5">
                    <strong>处理说明：</strong>
                    {ticket.resolutionNote}
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      ) : null}

      {tab === 'ledger' ? (
        <div className="grid gap-3">
          <section className="rounded-[12px] bg-warn-tint px-4 py-3.5">
            <h4 className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6f5327]">
              <Coins className="h-3.5 w-3.5" aria-hidden="true" />
              人工调账（演示禁用：账本只读）
            </h4>

            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className="nl-label" htmlFor="coin-user">
                  目标居民 / 志愿者
                </label>
                <select
                  id="coin-user"
                  className="nl-select"
                  value={selectedUserForCoin}
                  onChange={(event) => setSelectedUserForCoin(event.target.value)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}（余额 {user.timeCoins.toFixed(1)}）
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="nl-label" htmlFor="coin-amount">
                  调整额度（可正可负）
                </label>
                <input
                  id="coin-amount"
                  type="number"
                  className="nl-field"
                  value={adjustCoinAmount}
                  onChange={(event) => setAdjustCoinAmount(Number(event.target.value))}
                />
              </div>
              <div>
                <label className="nl-label" htmlFor="coin-reason">
                  核准调账原因
                </label>
                <input
                  id="coin-reason"
                  type="text"
                  className="nl-field"
                  value={adjustCoinReason}
                  onChange={(event) => setAdjustCoinReason(event.target.value)}
                />
              </div>
            </div>

            <p className="mt-2 text-[9.5px] leading-relaxed text-[#6f5327]">
              时间账本在演示环境里是只读的：不存在结算、兑现或转让。生产环境若保留人工调账，
              必须双人复核并保留独立操作日志。
            </p>

            <div className="mt-2 flex justify-end">
              <Button
                size="xs"
                variant="quiet"
                aria-disabled="true"
                title="演示环境账本只读"
                onClick={() => {
                  adminAdjustTimeCoin(selectedUserForCoin, adjustCoinAmount, adjustCoinReason);
                  toast('演练数据只读：时间账本不支持调账、兑现或转让。');
                }}
              >
                调账不可用（演练只读）
              </Button>
            </div>
          </section>

          <section>
            <h4 className="mb-1.5 text-[10px] font-semibold tracking-wide text-muted">
              本机演练时间记录（只读 · 全部未结算）
            </h4>
            <div className="overflow-hidden rounded-[12px] border border-line">
              <table className="w-full text-left text-[10.5px]">
                <thead className="bg-page text-text2">
                  <tr>
                    <th className="px-2.5 py-2 font-semibold">流水号</th>
                    <th className="px-2.5 py-2 font-semibold">事项说明</th>
                    <th className="px-2.5 py-2 font-semibold">变动</th>
                    <th className="px-2.5 py-2 font-semibold">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {timeLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-page">
                      <td className="px-2.5 py-2 font-mono text-[9.5px] text-muted">{tx.txHash}</td>
                      <td className="px-2.5 py-2 text-text">{tx.description}</td>
                      <td
                        className={`px-2.5 py-2 font-semibold ${
                          tx.amount > 0 ? 'text-accent' : 'text-danger'
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 分钟
                      </td>
                      <td className="px-2.5 py-2 text-[9.5px] text-muted">{tx.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'users' ? (
        <div className="grid gap-3">
          <h3 className="text-[11.5px] font-semibold text-ink">
            演练身份与派生志愿者（无真实手机号 / 身份证）
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 rounded-[12px] border border-line bg-white px-3.5 py-3">
                <Avatar name={user.nickname} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold text-ink">{user.name}</span>
                    <Tag tone="neutral">{user.roleLabel}</Tag>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted">
                    {user.address} · 未结算{' '}
                    <strong className="nl-num text-text2">{user.timeCoins.toFixed(1)}</strong> 币
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-faint">身份信息：演练不采集</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'storage' ? <StoragePanel /> : null}

      <p className="mt-3 flex items-center gap-1.5 text-[9.5px] text-muted">
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
        后台操作只写本机存档，操作记录可在「存档与恢复」中导出核对
      </p>
    </Modal>
  );
};
