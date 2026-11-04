import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  ChevronRight,
  FileText,
  Flag,
  MessageSquare,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { Segmented } from '../ui/Segmented';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { EmptyState } from '../ui/EmptyState';

type ChannelKey = 'system' | 'order' | 'chat' | 'complaint';

const CHANNEL_ICON: Record<ChannelKey, React.ComponentType<{ className?: string }>> = {
  system: Bell,
  order: FileText,
  chat: MessageSquare,
  complaint: ShieldAlert,
};

const CHANNEL_TINT: Record<ChannelKey, string> = {
  system: 'bg-warn-tint text-[#9a6a1f]',
  order: 'bg-brand-tint text-brand',
  chat: 'bg-accent-tint text-accent',
  complaint: 'bg-danger-tint text-danger',
};

const COMPLAINT_TONE: Record<string, 'warn' | 'accent' | 'neutral' | 'danger'> = {
  pending: 'warn',
  investigating: 'warn',
  resolved: 'accent',
  dismissed: 'neutral',
};

const QUICK_REPLIES = ['我马上到楼下', '老人已准备好，门虚掩着', '需要带什么工具吗？', '已确认，谢谢'];

/**
 * 列表按「今天 / 更早」分组：设计稿用小标题把时间轴拉开，
 * 这里用消息自带的相对时间文案判断，不额外解析时间戳。
 */
function groupByDay<T extends { timestamp: string }>(items: T[]) {
  const isToday = (value: string) =>
    value.startsWith('今天') || value.includes('分钟前') || value.includes('小时前');
  const today = items.filter((item) => isToday(item.timestamp));
  const earlier = items.filter((item) => !isToday(item.timestamp));
  return [
    today.length > 0 ? { label: '今天', items: today } : null,
    earlier.length > 0 ? { label: '更早', items: earlier } : null,
  ].filter(Boolean) as { label: string; items: T[] }[];
}

export const MessagesTab: React.FC = () => {
  const {
    messages,
    chatMessages,
    complaints,
    orders,
    chatFocusPostId,
    sendChatMessage,
    submitComplaint,
    setActiveSubPage,
    setSelectedOrderId,
    isMessageRead,
    markAllMessagesRead,
  } = useApp();

  const [channel, setChannel] = useState<ChannelKey>('system');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const threadRef = useRef<HTMLDivElement | null>(null);

  const systemItems = useMemo(() => messages.filter((item) => item.type === 'system'), [messages]);
  const orderItems = useMemo(() => messages.filter((item) => item.type === 'order'), [messages]);
  const chatItems = useMemo(() => messages.filter((item) => item.type === 'chat'), [messages]);

  const channelCounts = useMemo(() => {
    const countUnread = (list: typeof messages) =>
      list.filter((item) => item.unread && !isMessageRead(item.id)).length;
    return {
      system: countUnread(systemItems),
      order: countUnread(orderItems),
      chat: countUnread(chatItems),
      complaint: complaints.filter((item) => item.status === 'pending').length,
    };
  }, [systemItems, orderItems, chatItems, complaints, isMessageRead]);

  useEffect(() => {
    setSelectedId(null);
    setMobileDetail(false);
  }, [channel]);

  const messageList =
    channel === 'system' ? systemItems : channel === 'order' ? orderItems : channel === 'chat' ? chatItems : [];
  const activeMessage = messageList.find((item) => item.id === selectedId) ?? messageList[0] ?? null;
  const activeComplaint =
    complaints.find((item) => item.id === selectedId) ?? complaints[0] ?? null;

  /* 订单留言会话：按会话分组，并把每条会话绑回所属订单（postId）。
   * 修复前固定取 chatMessages[0]，多订单时留言会落到别的订单线程上；
   * 焦点订单还没有会话时给一个占位条目，保证第一条留言能按订单建会话。 */
  const conversations = useMemo(() => {
    const byId = new Map<
      string,
      { key: string; conversationId: string; postId?: string; title: string; lastText: string; lastTime: string }
    >();
    for (const item of chatMessages) {
      const current = byId.get(item.conversationId);
      if (current) {
        current.lastText = item.text;
        current.lastTime = item.timestamp;
      } else {
        byId.set(item.conversationId, {
          key: item.conversationId,
          conversationId: item.conversationId,
          postId: item.postId,
          title: item.conversationTitle ?? '订单留言会话',
          lastText: item.text,
          lastTime: item.timestamp,
        });
      }
    }
    return [...byId.values()];
  }, [chatMessages]);

  const focusedOrder = useMemo(
    () => orders.find((item) => item.id === chatFocusPostId) ?? null,
    [orders, chatFocusPostId],
  );

  const chatConversations = useMemo(() => {
    if (!focusedOrder) return conversations;
    if (conversations.some((item) => item.postId === focusedOrder.id)) return conversations;
    return [
      {
        key: `pending:${focusedOrder.id}`,
        conversationId: '',
        postId: focusedOrder.id,
        title: focusedOrder.title,
        lastText: '',
        lastTime: '',
      },
      ...conversations,
    ];
  }, [conversations, focusedOrder]);

  // 焦点订单变化（从另一张订单详情跳过来）时清掉手动选择，回到焦点会话。
  useEffect(() => {
    setSelectedId(null);
  }, [chatFocusPostId]);

  const activeConversation =
    chatConversations.find((item) => item.key === selectedId)
    ?? (focusedOrder
      ? chatConversations.find((item) => item.postId === focusedOrder.id)
      : undefined)
    ?? chatConversations[0]
    ?? null;

  const thread = useMemo(
    () =>
      activeConversation?.conversationId
        ? chatMessages.filter((item) => item.conversationId === activeConversation.conversationId)
        : [],
    [chatMessages, activeConversation],
  );

  useEffect(() => {
    if (channel === 'chat' && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [channel, thread.length, activeConversation?.key]);

  const totalUnread =
    channelCounts.system + channelCounts.order + channelCounts.chat + channelCounts.complaint;

  const send = (text: string) => {
    if (!text.trim()) return;
    if (!activeConversation) {
      toast('当前没有可留言的订单会话。');
      return;
    }
    // 会话已存在走会话 id；占位会话（新接单订单）带 postId 由领域层建线程。
    sendChatMessage(
      activeConversation.conversationId,
      text.trim(),
      'text',
      activeConversation.postId,
    );
    setChatInput('');
  };

  const openItem = (id: string) => {
    sound.playTap();
    setSelectedId(id);
    setMobileDetail(true);
  };

  const renderDetail = () => {
    if (channel === 'complaint') {
      if (!activeComplaint) {
        return (
          <EmptyState
            title="还没有投诉或举报记录"
            hint="在信息流、评论或订单留言上使用「举报」，记录会出现在这里；本演示不会通知任何机构。"
          />
        );
      }
      return (
        <>
          <div className="nl-detail__head">
            <div>
              <h2 className="nl-detail__title">{activeComplaint.reason}</h2>
              <p className="nl-detail__meta">
                工单 {activeComplaint.ticketNo} · {activeComplaint.createdAt}
              </p>
            </div>
            <Tag tone={COMPLAINT_TONE[activeComplaint.status] ?? 'neutral'}>
              {activeComplaint.statusLabel}
            </Tag>
          </div>
          <hr className="nl-detail__hr" />
          <p className="nl-detail__body">{activeComplaint.detail}</p>
          {activeComplaint.resolutionNote ? (
            <div className="nl-alert nl-alert--accent mt-4">
              <span>
                <strong>复核记录{activeComplaint.handlerName ? `（${activeComplaint.handlerName}）` : ''}：</strong>
                {activeComplaint.resolutionNote}
              </span>
            </div>
          ) : (
            <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
              本演示只在本机记录举报，没有外部处置时限，也不会通知被举报人。
            </p>
          )}
        </>
      );
    }

    if (channel === 'chat') {
      return (
        <>
          <div className="nl-detail__head">
            <div>
              <h2 className="nl-detail__title">{activeConversation?.title ?? '演练联系人（虚构）'}</h2>
              <p className="nl-detail__meta">订单留言 · 非实时 · 仅保存在本机</p>
            </div>
            {activeConversation?.postId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  sound.playTap();
                  setSelectedOrderId(activeConversation.postId ?? null);
                  setActiveSubPage('order_detail');
                }}
              >
                查看订单详情
              </Button>
            ) : (
              <Tag tone="neutral">演示会话</Tag>
            )}
          </div>
          <hr className="nl-detail__hr" />

          <div className="nl-thread">
            <div className="nl-thread__body" ref={threadRef}>
              <p className="text-center text-[9.5px] text-faint">
                留言未加密、未上传，不会通知任何人
              </p>
              {thread.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted">
                  {activeConversation?.postId && !activeConversation.conversationId
                    ? '这条订单还没有留言；发出的第一条会绑定到该订单。'
                    : '还没有留言。先在接单大厅认领一条求助，或等待对方发起会话。'}
                </p>
              ) : (
                thread.map((item) => (
                  <div key={item.id} className={`flex flex-col ${item.isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`nl-bubble ${item.isMe ? 'nl-bubble--me' : 'nl-bubble--peer'}`}>
                      {item.text}
                      <div className="nl-bubble__meta">
                        {item.senderName} · {item.timestamp}
                      </div>
                    </div>
                    {!item.isMe ? (
                      <button
                        type="button"
                        className="mt-1 inline-flex items-center gap-1 text-[9px] text-muted hover:text-danger"
                        aria-label={`举报这条留言：${item.text.slice(0, 12)}`}
                        onClick={() =>
                          submitComplaint({
                            targetType: 'message',
                            targetId: item.id,
                            orderTitle: `留言：${item.text.slice(0, 14)}`,
                            reason: '订单留言举报（演练）',
                            detail: '在订单留言中举报单条留言；只写本机记录，不通知任何机构。',
                          })
                        }
                      >
                        <Flag className="h-2.5 w-2.5" aria-hidden="true" />
                        举报
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="nl-quick-reply" aria-label="快捷回复">
              {QUICK_REPLIES.map((text) => (
                <button
                  key={text}
                  type="button"
                  className="nl-chip shrink-0"
                  onClick={() => send(text)}
                >
                  {text}
                </button>
              ))}
            </div>

            <form
              className="nl-composer"
              onSubmit={(event) => {
                event.preventDefault();
                send(chatInput);
              }}
            >
              <input
                type="text"
                className="nl-field"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="输入沟通留言…"
                aria-label="留言内容"
              />
              <Button type="submit" variant="primary" size="sm" disabled={!chatInput.trim()}>
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                发送
              </Button>
            </form>
          </div>
        </>
      );
    }

    if (!activeMessage) {
      return (
        <EmptyState
          title="这个通道还没有消息"
          hint="消息只在本机生成：发布、接单、审核与举报都会在这里留下记录。"
        />
      );
    }

    const read = isMessageRead(activeMessage.id);
    return (
      <>
        <div className="nl-detail__head">
          <div>
            <h2 className="nl-detail__title">{activeMessage.title}</h2>
            <p className="nl-detail__meta">
              {channel === 'system' ? '系统通知' : '订单消息'} · {activeMessage.timestamp} · 来源：演练系统
            </p>
          </div>
          <Tag tone={read ? 'accent' : 'brand'}>{read ? '已读' : '未读'}</Tag>
        </div>
        <hr className="nl-detail__hr" />
        <p className="nl-detail__body">{activeMessage.content}</p>

        <div className="nl-detail__actions">
          {channel === 'order' && activeMessage.orderId ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                sound.playTap();
                setSelectedOrderId(activeMessage.orderId ?? null);
                setActiveSubPage('order_detail');
              }}
            >
              查看订单详情
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                sound.playTap();
                setActiveSubPage('time_ledger_page');
              }}
            >
              查看存折明细
            </Button>
          )}
          <button
            type="button"
            className="nl-detail__link"
            onClick={() => {
              sound.playTap();
              setActiveSubPage('help_center');
            }}
          >
            消息有异常？提交申诉
          </button>
        </div>
      </>
    );
  };

  return (
    <div>
      <div className="nl-pagehead">
        <div>
          <h1 className="nl-page-title">消息</h1>
          <p className="nl-page-sub">
            {totalUnread > 0 ? `${totalUnread} 条未读` : '全部已读'} · 系统通知、订单进度、私信与投诉都在这里
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[32px] items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-strong disabled:text-faint"
          onClick={() => {
            sound.playTap();
            markAllMessagesRead();
            toast('已把当前消息全部标为已读', 'success');
          }}
          disabled={totalUnread === 0}
        >
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
          全部已读
        </button>
      </div>

      <Segmented
        label="消息通道"
        className="nl-seg--inline"
        value={channel}
        onChange={(key) => setChannel(key as ChannelKey)}
        items={[
          { key: 'system', label: '系统通知', count: channelCounts.system },
          { key: 'order', label: '订单消息', count: channelCounts.order },
          {
            key: 'chat',
            label: (
              <>
                私信
                <span className="nl-sr-only">订单留言</span>
              </>
            ),
            count: channelCounts.chat,
          },
          { key: 'complaint', label: '投诉反馈', count: channelCounts.complaint },
        ]}
      />

      <div className={`nl-msg mt-4 ${mobileDetail ? 'nl-msg--detail' : ''}`}>
        <div className="nl-card nl-card--sm nl-msg__list" aria-label="消息列表">
          {channel === 'complaint' ? (
            complaints.length === 0 ? (
              <p className="px-4 py-8 text-center text-[11px] text-muted">暂无投诉或举报记录</p>
            ) : (
              complaints.map((item) => {
                const Icon = CHANNEL_ICON.complaint;
                const active = activeComplaint?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="nl-msg__item"
                    aria-current={active}
                    onClick={() => openItem(item.id)}
                  >
                    <span className={`nl-msg__icon ${CHANNEL_TINT.complaint}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="nl-msg__main">
                      <span className="nl-msg__title">
                        <span className="truncate">{item.reason}</span>
                        {item.status === 'pending' ? <span className="nl-msg__unread" /> : null}
                      </span>
                      <span className="nl-msg__preview">{item.ticketNo}</span>
                    </span>
                    <span className="nl-msg__time">{item.createdAt.slice(5, 10)}</span>
                  </button>
                );
              })
            )
          ) : messageList.length === 0 && channel !== 'chat' ? (
            <p className="px-4 py-8 text-center text-[11px] text-muted">这个通道还没有消息</p>
          ) : channel === 'chat' ? (
            chatConversations.length === 0 ? (
              <p className="px-4 py-8 text-center text-[11px] text-muted">这个通道还没有消息</p>
            ) : (
              chatConversations.map((conversation) => {
                const active = activeConversation?.key === conversation.key;
                return (
                  <button
                    key={conversation.key}
                    type="button"
                    className="nl-msg__item"
                    aria-current={active}
                    onClick={() => openItem(conversation.key)}
                  >
                    <span className={`nl-msg__icon ${CHANNEL_TINT.chat}`}>
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="nl-msg__main">
                      <span className="nl-msg__title">
                        <span className="truncate">{conversation.title}</span>
                      </span>
                      <span className="nl-msg__preview">
                        {conversation.lastText || '订单留言会话 · 仅保存在本机'}
                      </span>
                    </span>
                    <span className="nl-msg__time">{conversation.lastTime || '今天'}</span>
                  </button>
                );
              })
            )
          ) : (
            groupByDay(messageList).map((group) => (
              <React.Fragment key={group.label}>
                <p className="nl-msg__day">{group.label}</p>
                {group.items.map((item) => {
                  const Icon = CHANNEL_ICON[channel];
                  const active = activeMessage?.id === item.id;
                  const unread = item.unread && !isMessageRead(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="nl-msg__item"
                      aria-current={active}
                      onClick={() => openItem(item.id)}
                    >
                      <span className={`nl-msg__icon ${CHANNEL_TINT[channel]}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="nl-msg__main">
                        <span className="nl-msg__title">
                          <span className="truncate">{item.title}</span>
                          {unread ? <span className="nl-msg__unread" /> : null}
                        </span>
                        <span className="nl-msg__preview">{item.content}</span>
                      </span>
                      <span className="nl-msg__time">{item.timestamp}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </div>

        <div className="nl-card nl-card--sm nl-detail">
          <button
            type="button"
            className="mb-3 inline-flex items-center gap-1 text-[10.5px] text-muted hover:text-brand lg:hidden"
            onClick={() => setMobileDetail(false)}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            返回消息列表
          </button>
          {renderDetail()}
        </div>
      </div>

      <p className="mt-6 text-center text-[9.5px] text-muted">
        消息只保存在本机浏览器，不接入真实通知通道
        <ChevronRight className="inline h-3 w-3" aria-hidden="true" />
      </p>
    </div>
  );
};
