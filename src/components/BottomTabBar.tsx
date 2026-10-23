import React from 'react';
import { Home, Users, Plus, MessageSquare, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

export const BottomTabBar: React.FC = () => {
  const { activeTab, setActiveTab, unreadMessagesCount, elderlyMode, setActiveSubPage } = useApp();

  const handleTabClick = (tab: 'home' | 'community' | 'publish' | 'messages' | 'profile') => {
    sound.playTap();
    setActiveSubPage(null);
    setActiveTab(tab);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1.5 sm:py-2">
        {/* 1. 首页 */}
        <button
          onClick={() => handleTabClick('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'home' 
              ? 'text-emerald-700 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Home className={`${elderlyMode ? 'w-6 h-6' : 'w-5 h-5'} transition-transform ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className={`${elderlyMode ? 'text-xs font-bold' : 'text-[11px] font-medium'} mt-0.5`}>
            首页
          </span>
        </button>

        {/* 2. 社区 */}
        <button
          onClick={() => handleTabClick('community')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'community' 
              ? 'text-emerald-700 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className={`${elderlyMode ? 'w-6 h-6' : 'w-5 h-5'} transition-transform ${activeTab === 'community' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className={`${elderlyMode ? 'text-xs font-bold' : 'text-[11px] font-medium'} mt-0.5`}>
            社区
          </span>
        </button>

        {/* 3. ＋ 发布 (Center Floating Button) */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            onClick={() => handleTabClick('publish')}
            className={`relative group flex items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all duration-200 ${
              elderlyMode ? 'w-14 h-14 ring-4 ring-amber-300' : 'w-12 h-12 ring-4 ring-white'
            }`}
            title="发布求助/动态/邻里贴"
          >
            <Plus className={`${elderlyMode ? 'w-8 h-8' : 'w-6 h-6'} stroke-[2.8]`} />
            <span className="sr-only">发布</span>
            {activeTab === 'publish' && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* 4. 消息 */}
        <button
          onClick={() => handleTabClick('messages')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'messages' 
              ? 'text-emerald-700 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`${elderlyMode ? 'w-6 h-6' : 'w-5 h-5'} transition-transform ${activeTab === 'messages' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[16px] h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadMessagesCount}
              </span>
            )}
          </div>
          <span className={`${elderlyMode ? 'text-xs font-bold' : 'text-[11px] font-medium'} mt-0.5`}>
            消息
          </span>
        </button>

        {/* 5. 我的 */}
        <button
          onClick={() => handleTabClick('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'profile' 
              ? 'text-emerald-700 font-bold scale-105' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className={`${elderlyMode ? 'w-6 h-6' : 'w-5 h-5'} transition-transform ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className={`${elderlyMode ? 'text-xs font-bold' : 'text-[11px] font-medium'} mt-0.5`}>
            我的
          </span>
        </button>
      </div>
    </nav>
  );
};
