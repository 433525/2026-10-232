import React, { useState } from 'react';
import { 
  Search, 
  Volume2, 
  Smartphone, 
  Monitor, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronDown, 
  Accessibility
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { BrandMark } from './BrandMark';

export const HeaderNav: React.FC = () => {
  const { 
    currentUser, 
    users, 
    switchUser, 
    viewMode, 
    setViewMode, 
    elderlyMode, 
    setElderlyMode, 
    setActiveSubPage, 
    isAudioPlaying, 
    stopArticleAudio,
    triggerSos
  } = useApp();

  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-emerald-100/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Community & Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white ring-1 ring-emerald-100 flex items-center justify-center shadow-xs shrink-0">
              <BrandMark size={30} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 text-sm sm:text-base tracking-tight truncate">
                  {currentUser.community}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                  互助演练站
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden xs:block">
                时间银行·银龄邻里守护平台
              </p>
            </div>
          </div>

          {/* Center/Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search shortcut */}
            <button
              onClick={() => {
                sound.playTap();
                setActiveSubPage('search_page');
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 flex items-center gap-1.5 text-xs font-medium transition-colors"
              title="全局搜索服务、志愿者、帖子"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">搜索</span>
            </button>

            {/* Audio Speech Status Indicator */}
            {isAudioPlaying && (
              <button
                onClick={stopArticleAudio}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium animate-pulse border border-amber-300"
                title="正在语音朗读，点击停止"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden xs:inline text-[11px]">正在朗读</span>
              </button>
            )}

            {/* Elderly Care Mode Toggle */}
            <button
              onClick={() => {
                sound.playTap();
                setElderlyMode(!elderlyMode);
              }}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                elderlyMode 
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-amber-200' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title="切换大字关怀模式"
            >
              <Accessibility className="w-4 h-4" />
              <span className="text-xs">{elderlyMode ? '长辈大字版' : '关怀模式'}</span>
            </button>

            {/* Device View Switcher (Desktop Portal vs Mini-Program Simulator) */}
            <button
              onClick={() => {
                sound.playTap();
                setViewMode(viewMode === 'mobile_frame' ? 'responsive_web' : 'mobile_frame');
              }}
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              title="切换手机模拟框 / 宽屏网页视图"
            >
              {viewMode === 'mobile_frame' ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-slate-600" />
                  <span>宽屏网页</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>小程序视图</span>
                </>
              )}
            </button>

            {/* SOS Fast Trigger Button */}
            <button
              onClick={triggerSos}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all animate-pulse"
              title="一键紧急求助"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS</span>
            </button>

            {/* User Identity Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-lg hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              >
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-emerald-500"
                />
                <span className="hidden sm:inline text-xs font-medium max-w-[70px] truncate">
                  {currentUser.name}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showUserDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        切换演示角色身份
                      </p>
                    </div>
                    <div className="space-y-1">
                      {users.map((u) => {
                        const isCurrent = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              switchUser(u.id);
                              setShowUserDropdown(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                              isCurrent 
                                ? 'bg-emerald-50 text-emerald-900 font-semibold' 
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <img 
                              src={u.avatar} 
                              alt={u.name} 
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="truncate">{u.nickname}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                                  u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                  u.role === 'volunteer' ? 'bg-emerald-100 text-emerald-800' :
                                  u.role === 'elder' ? 'bg-amber-100 text-amber-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {u.roleLabel}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                时间币: {u.timeCoins} | {u.address}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
