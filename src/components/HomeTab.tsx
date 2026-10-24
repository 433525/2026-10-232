import React, { useState, useEffect } from 'react';
import { 
  Search, 
  HandHeart, 
  UserCheck, 
  AlertTriangle, 
  HeartPulse, 
  Award, 
  HelpCircle, 
  ChevronRight, 
  Flame, 
  MapPin, 
  Clock, 
  Coins, 
  Star, 
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

export const HomeTab: React.FC = () => {
  const { 
    banners, 
    volunteers, 
    orders, 
    setActiveTab, 
    setActiveSubPage, 
    setSelectedOrderId, 
    setSelectedArticleId, 
    triggerSos,
    elderlyMode 
  } = useApp();

  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Auto rotate banners
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const urgentOrders = orders.filter(o => o.status === 'published');

  const handleBannerAction = (banner: typeof banners[0]) => {
    sound.playTap();
    if (banner.actionType === 'help') {
      setActiveTab('publish');
    } else if (banner.actionType === 'community') {
      setActiveTab('community');
    } else if (banner.actionType === 'article') {
      setSelectedArticleId('art_1');
      setActiveSubPage('eldercare_detail');
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* Search Bar Bar */}
      <div 
        onClick={() => {
          sound.playTap();
          setActiveSubPage('search_page');
        }}
        className="cursor-pointer p-2.5 rounded-2xl bg-white shadow-xs border border-slate-200/80 hover:border-emerald-300 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-slate-400">
          <Search className="w-4 h-4 text-emerald-600" />
          <span className="text-xs sm:text-sm text-slate-500 font-medium">
            搜索服务类型、附近志愿者、紧急求助...
          </span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
          一键直达
        </span>
      </div>

      {/* Banner Carousel */}
      <div className="relative rounded-2xl overflow-hidden shadow-md group">
        <div className="relative h-44 sm:h-52 w-full overflow-hidden">
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                idx === activeBannerIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img 
                src={banner.image} 
                alt={banner.title} 
                className="w-full h-full object-cover brightness-75 scale-105 transition-transform duration-1000"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${banner.bgGradient} opacity-80 mix-blend-multiply`} />
              <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end text-white">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 w-max mb-1.5 shadow-xs">
                  {banner.tag}
                </span>
                <h2 className="text-base sm:text-xl font-black leading-tight drop-shadow-md">
                  {banner.title}
                </h2>
                <p className="text-xs text-slate-200 line-clamp-1 mt-0.5 max-w-md drop-shadow-sm">
                  {banner.subtitle}
                </p>
                <div className="mt-2.5">
                  <button
                    onClick={() => handleBannerAction(banner)}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-amber-300 font-bold text-xs shadow-md transition-all flex items-center gap-1"
                  >
                    <span>{banner.actionText}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-2.5 right-4 z-20 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveBannerIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeBannerIdx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 6 Quick Action Grid Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>核心便民互助入口</span>
          </h3>
          <span className="text-[11px] text-emerald-700 font-medium">
            梧桐里互助站 24H（虚构）
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
          {/* 1. 我要求助 */}
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('publish');
            }}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-teal-500/10 border border-emerald-200/80 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 group-hover:scale-110 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 transition-transform">
              <HandHeart className="w-6 h-6" />
            </div>
            <span className={`font-bold text-slate-800 group-hover:text-emerald-800 mt-2 ${elderlyMode ? 'text-sm' : 'text-xs'}`}>
              我要求助
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
              快速发布派单
            </span>
          </button>

          {/* 2. 我要接单 */}
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage('tasks_hall');
            }}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-blue-500/10 to-sky-500/10 border border-blue-200/80 hover:border-blue-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-600 group-hover:scale-110 text-white flex items-center justify-center shadow-md shadow-blue-500/20 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <span className={`font-bold text-slate-800 group-hover:text-blue-800 mt-2 ${elderlyMode ? 'text-sm' : 'text-xs'}`}>
              我要接单
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
              接单大厅认领
            </span>
          </button>

          {/* 3. 紧急求助 (SOS) */}
          <button
            onClick={triggerSos}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-rose-500/15 to-red-500/15 border-2 border-rose-300 hover:border-rose-500 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group animate-pulse"
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-600 group-hover:scale-110 text-white flex items-center justify-center shadow-md shadow-rose-500/30 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className={`font-bold text-rose-700 mt-2 ${elderlyMode ? 'text-sm' : 'text-xs'}`}>
              紧急求助
            </span>
            <span className="text-[10px] text-rose-500 mt-0.5 hidden sm:block">
              非急救：请拨打 120/110
            </span>
          </button>

          {/* 4. 养老科普 */}
          <button
            onClick={() => {
              sound.playTap();
              setSelectedArticleId('art_1');
              setActiveSubPage('eldercare_detail');
            }}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-sky-500/10 to-indigo-500/10 border border-sky-200/80 hover:border-sky-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-sky-600 group-hover:scale-110 text-white flex items-center justify-center shadow-md shadow-sky-500/20 transition-transform">
              <HeartPulse className="w-6 h-6" />
            </div>
            <span className={`font-bold text-slate-800 group-hover:text-sky-800 mt-2 ${elderlyMode ? 'text-sm' : 'text-xs'}`}>
              养老科普
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
              慢病语音指南
            </span>
          </button>

          {/* 5. 志愿证明 */}
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage('certificate_view');
            }}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/10 to-yellow-500/10 border border-amber-200/80 hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-500 group-hover:scale-110 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <span className={`font-bold text-slate-800 group-hover:text-amber-800 mt-2 ${elderlyMode ? 'text-sm' : 'text-xs'}`}>
              志愿证明
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
              下载演练证明
            </span>
          </button>

          {/* 6. 帮助中心 */}
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage('help_center');
            }}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-purple-500/10 to-violet-500/10 border border-purple-200/80 hover:border-purple-400 hover:shadow-md transition-all flex flex-col items-center justify-center text-center group"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-600 group-hover:scale-110 text-white flex items-center justify-center shadow-md shadow-purple-500/20 transition-transform">
              <HelpCircle className="w-6 h-6" />
            </div>
            <span className={`font-bold text-slate-800 group-hover:text-purple-800 mt-2 ${elderlyMode ? 'text-sm' : 'text-xs'}`}>
              帮助中心
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
              语音操作教程
            </span>
          </button>
        </div>
      </div>

      {/* Recommended Nearby Volunteers List */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              附近可接单志愿者（就近调配）
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            按距离排序 · 已实名
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {volunteers.map((vol) => (
            <div
              key={vol.id}
              className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-200 transition-all flex items-start gap-3"
            >
              <div className="relative shrink-0">
                <img 
                  src={vol.avatar} 
                  alt={vol.name} 
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/30"
                />
                <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-slate-900 shadow-xs">
                  {vol.badge}
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                      {vol.name}
                    </span>
                    <span className="flex items-center text-[10px] text-amber-600 font-bold">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
                      {vol.rating}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-emerald-100">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    {vol.distance}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {vol.skills.map((s, idx) => (
                    <span 
                      key={idx} 
                      className="text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200/60"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {vol.bio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hot Urgent Help Requests */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              热门急需求助订单（接单大厅）
            </h3>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage('tasks_hall');
            }}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
          >
            <span>进入大厅全部 ({urgentOrders.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {urgentOrders.slice(0, 3).map((order) => (
            <div
              key={order.id}
              onClick={() => {
                sound.playTap();
                setSelectedOrderId(order.id);
                setActiveSubPage('order_detail');
              }}
              className="cursor-pointer p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-300 transition-all space-y-2 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {order.isUrgent && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-rose-600" />
                        紧急
                      </span>
                    )}
                    <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {order.categoryLabel}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {order.createdAt}
                    </span>
                  </div>
                  <h4 className={`font-bold text-slate-900 group-hover:text-emerald-800 transition-colors ${elderlyMode ? 'text-base' : 'text-xs sm:text-sm'}`}>
                    {order.title}
                  </h4>
                </div>

                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200 shrink-0">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  <span>+{order.timeCoinReward} 币</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    {order.locationArea}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {order.timeStr}
                  </span>
                </div>
                <span className="text-emerald-700 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center">
                  详情 <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
