import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Coins, Flame, MapPin, Search, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { EmptyState } from '../ui/EmptyState';

const CATEGORIES = [
  { key: 'all', label: '全部需求' },
  { key: 'medical_escort', label: '陪同就医' },
  { key: 'daily_chores', label: '日常家务' },
  { key: 'chat_companion', label: '聊天陪伴' },
  { key: 'childcare_guide', label: '隔代育儿' },
  { key: 'urgent_help', label: '紧急求助' },
];

/** 接单大厅：与社区同一套卡片语言，筛选条固定在弹层顶部。 */
export const TasksHall: React.FC = () => {
  const { orders, setActiveSubPage, setSelectedOrderId, currentUser, acceptOrder } = useApp();
  const [category, setCategory] = useState('all');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [keyword, setKeyword] = useState('');

  const openOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (order.status !== 'published') return false;
        if (category !== 'all' && order.category !== category) return false;
        if (urgentOnly && !order.isUrgent) return false;
        if (keyword.trim()) {
          const query = keyword.trim().toLowerCase();
          return (
            order.title.toLowerCase().includes(query) ||
            order.description.toLowerCase().includes(query) ||
            order.locationArea.toLowerCase().includes(query)
          );
        }
        return true;
      }),
    [orders, category, urgentOnly, keyword],
  );

  return (
    <Modal
      title="社区志愿接单大厅"
      subtitle={`可接需求 ${openOrders.length} 条 · 服务时长 100% 存入时间存折`}
      onClose={() => setActiveSubPage(null)}
      wide
      footer={
        <>
          <p className="nl-modal__foot-note">接单前只能看到社区级位置；病史与门牌号在认领后才可见。</p>
          <Button variant="ghost" size="sm" onClick={() => setActiveSubPage(null)}>
            关闭
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            className="nl-field nl-field--icon"
            placeholder="搜索求助标题、地点或需求描述…"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="搜索待接单需求"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="需求分类">
            {CATEGORIES.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`nl-chip shrink-0${category === item.key ? ' nl-chip--active' : ''}`}
                aria-pressed={category === item.key}
                onClick={() => {
                  sound.playTap();
                  setCategory(item.key);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`nl-chip shrink-0${urgentOnly ? ' nl-chip--active' : ''}`}
            aria-pressed={urgentOnly}
            onClick={() => setUrgentOnly((value) => !value)}
          >
            <Flame className="h-3 w-3" aria-hidden="true" />
            仅看紧急
          </button>
        </div>

        {openOrders.length === 0 ? (
          <EmptyState
            title="当前筛选条件下没有待接单需求"
            hint="清空关键词或切换分类再看看；也可以到「我要求助」发起一条。"
            icon={<CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
          />
        ) : (
          <div className="grid gap-2.5">
            {openOrders.map((order) => (
              <div key={order.id} className="group nl-card nl-card--sm px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {order.isUrgent ? (
                        <Tag tone="danger">
                          <Flame className="h-2.5 w-2.5" aria-hidden="true" />
                          加急置顶
                        </Tag>
                      ) : null}
                      <Tag tone="neutral">{order.categoryLabel}</Tag>
                      <span className="text-[9.5px] text-faint">{order.createdAt}</span>
                    </div>
                    <h3 className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ink">
                      {order.title}
                    </h3>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-lg bg-warn-tint px-2 py-1 text-[10.5px] font-semibold text-[#8a5f1c]">
                    <Coins className="h-3 w-3" aria-hidden="true" />+{order.timeCoinReward} 币
                  </span>
                </div>

                <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-text2">
                  {order.description}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-danger" aria-hidden="true" />
                      {order.locationArea}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {order.dateStr} {order.timeStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        sound.playTap();
                        setSelectedOrderId(order.id);
                        setActiveSubPage('order_detail');
                      }}
                    >
                      查看详情
                    </Button>
                    {currentUser.role === 'volunteer' ? (
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => {
                          acceptOrder(order.id);
                          setSelectedOrderId(order.id);
                          setActiveSubPage('order_detail');
                        }}
                      >
                        <UserCheck className="h-3 w-3" aria-hidden="true" />
                        快速接单
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
