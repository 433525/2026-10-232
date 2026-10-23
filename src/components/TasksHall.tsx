import React, { useState } from 'react';
import { 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Coins, 
  Flame, 
  X, 
  Search, 
  HeartHandshake, 
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

export const TasksHall: React.FC = () => {
  const { orders, setActiveSubPage, setSelectedOrderId, currentUser, acceptOrder, elderlyMode } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterUrgentOnly, setFilterUrgentOnly] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');

  const openOrders = orders.filter(o => {
    if (o.status !== 'published') return false;
    if (selectedCategory !== 'all' && o.category !== selectedCategory) return false;
    if (filterUrgentOnly && !o.isUrgent) return false;
    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      return o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || o.locationArea.toLowerCase().includes(q);
    }
    return true;
  });

  const categories = [
    { key: 'all', label: '全部需求' },
    { key: 'medical_escort', label: '陪同就医' },
    { key: 'daily_chores', label: '日常家务' },
    { key: 'chat_companion', label: '聊天陪伴' },
    { key: 'childcare_guide', label: '隔代育儿' },
    { key: 'urgent_help', label: '紧急求助' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <HeartHandshake className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">
                社区志愿接单大厅 · 邻里互助广场
              </h2>
              <p className="text-xs text-emerald-100">
                可接需求共 {openOrders.length} 条 · 服务时长 100% 存入时间银行
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage(null);
            }}
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索求助标题、地点或需求描述..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.key}
                  onClick={() => {
                    sound.playTap();
                    setSelectedCategory(c.key);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === c.key
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                sound.playTap();
                setFilterUrgentOnly(!filterUrgentOnly);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                filterUrgentOnly
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>仅看紧急</span>
            </button>
          </div>
        </div>

        {/* Order List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
          {openOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-medium">当前筛选条件下暂无待接单需求</p>
              <p className="text-xs text-slate-400">您可以尝试清空筛选关键词或稍后刷新</p>
            </div>
          ) : (
            openOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.isUrgent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-rose-600" />
                          加急置顶
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {order.categoryLabel}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {order.createdAt}
                      </span>
                    </div>
                    <h3 className={`font-bold text-slate-900 group-hover:text-emerald-800 transition-colors ${elderlyMode ? 'text-lg' : 'text-base'}`}>
                      {order.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200 shrink-0">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span>+{order.timeCoinReward} 币</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
                  {order.description}
                </p>

                {/* Details Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {order.locationArea}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {order.dateStr} {order.timeStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        sound.playTap();
                        setSelectedOrderId(order.id);
                        setActiveSubPage('order_detail');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                    >
                      查看详情
                    </button>
                    
                    {currentUser.role === 'volunteer' && (
                      <button
                        onClick={() => {
                          acceptOrder(order.id);
                          setSelectedOrderId(order.id);
                          setActiveSubPage('order_detail');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>快速接单</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
