import React, { useEffect, useRef, useState } from 'react';
import { Accessibility, Bell, Check, ChevronDown, House, Search, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

const NAV_ITEMS = [
  { key: 'home', label: '首页' },
  { key: 'community', label: '社区' },
  { key: 'messages', label: '消息' },
  { key: 'profile', label: '我的' },
] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 11) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

/**
 * 顶栏：桌面与移动两套结构。
 * 桌面＝标识 + 导航 + 搜索 + 工具；移动＝问候 + 社区名 + 铃铛 + 搜索。
 * 设计稿的桌面顶栏没有导航项，这里补一组 11px 文本导航，避免只能靠底部坞切页。
 */
export const HeaderNav: React.FC = () => {
  const {
    currentUser,
    users,
    switchUser,
    elderlyMode,
    setElderlyMode,
    setActiveSubPage,
    setActiveTab,
    activeTab,
    isAudioPlaying,
    stopArticleAudio,
    unreadMessagesCount,
  } = useApp();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowUserMenu(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [showUserMenu]);

  const goTab = (tab: (typeof NAV_ITEMS)[number]['key']) => {
    sound.playTap();
    setActiveSubPage(null);
    setActiveTab(tab);
  };

  const openSearch = () => {
    sound.playTap();
    setActiveSubPage('search_page');
  };

  const communityLabel = currentUser.community.replace(/（虚构）$/, '');

  return (
    <header className="nl-header">
      {/* 桌面 */}
      <div className="nl-container nl-header__inner">
        <div className="nl-brand">
          <span className="nl-brand__mark" aria-hidden="true">
            <House className="h-[22px] w-[22px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="nl-brand__name">
              <span className="min-w-0 truncate">{communityLabel}</span>
              <span className="nl-tag shrink-0">互助演练站</span>
            </div>
            <p className="nl-brand__sub">时间银行 · 银龄邻里守护平台</p>
          </div>
        </div>

        <nav className="nl-nav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="nl-nav__link"
              aria-current={activeTab === item.key ? 'page' : undefined}
              onClick={() => goTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="nl-search" onClick={openSearch} aria-label="搜索服务、志愿者、求助">
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="nl-search__text">搜索服务、志愿者、求助</span>
          <kbd className="nl-search__kbd">Ctrl K</kbd>
        </button>

        <div className="nl-tools">
          {isAudioPlaying ? (
            <button type="button" className="nl-modebtn" onClick={stopArticleAudio} title="正在语音朗读，点击停止">
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              停止朗读
            </button>
          ) : null}

          <button
            type="button"
            className="nl-modebtn"
            aria-pressed={elderlyMode}
            onClick={() => {
              sound.playTap();
              setElderlyMode(!elderlyMode);
            }}
            title="切换大字关怀模式"
          >
            <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />
            {elderlyMode ? '大字版' : '大字模式'}
          </button>

          <button
            type="button"
            className="nl-iconbtn"
            onClick={() => goTab('messages')}
            aria-label={`消息${unreadMessagesCount > 0 ? `，${unreadMessagesCount} 条未读` : ''}`}
          >
            <Bell className="h-[17px] w-[17px]" aria-hidden="true" />
            {unreadMessagesCount > 0 ? <span className="nl-iconbtn__dot" /> : null}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="nl-user"
              onClick={() => setShowUserMenu((open) => !open)}
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
            >
              <span className="nl-user__avatar" aria-hidden="true">
                {currentUser.name.slice(0, 1)}
              </span>
              <span className="nl-user__name">{currentUser.nickname}</span>
              <ChevronDown className="h-3 w-3 text-muted" aria-hidden="true" />
            </button>

            {showUserMenu ? (
              <div
                role="menu"
                aria-label="切换演示角色身份"
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[264px] rounded-[18px] border border-line bg-surface p-2"
              >
                <p className="px-2 py-1 text-[10px] font-medium text-muted">切换演示角色身份</p>
                <div className="grid gap-0.5">
                  {users.map((user) => {
                    const isCurrent = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isCurrent}
                        onClick={() => {
                          switchUser(user.id);
                          setShowUserMenu(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-page ${
                          isCurrent ? 'bg-page' : ''
                        }`}
                      >
                        <span className="nl-avatar nl-avatar--sm" aria-hidden="true">
                          {user.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[11.5px] font-semibold text-ink">{user.nickname}</span>
                            <span className="nl-tag nl-tag--neutral shrink-0">{user.roleLabel}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-muted">
                            时间币 {(user.timeCoins ?? 0).toFixed(1)} · {user.address}
                          </span>
                        </span>
                        {isCurrent ? <Check className="h-3.5 w-3.5 shrink-0 text-brand" /> : null}
                      </button>
                    );
                  })}
                </div>

              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 移动：仅首页显示问候与地址，其余页由页面标题承担 */}
      {activeTab === 'home' ? (
      <div className="nl-mheader">
        <div className="nl-mheader__top">
          <div className="min-w-0">
            <p className="nl-mheader__greet">
              {greeting()}，{currentUser.nickname}
            </p>
            <h1 className="nl-mheader__title truncate">{communityLabel}</h1>
          </div>
          <button
            type="button"
            className="nl-iconbtn"
            onClick={() => goTab('messages')}
            aria-label={`消息${unreadMessagesCount > 0 ? `，${unreadMessagesCount} 条未读` : ''}`}
          >
            <Bell className="h-[17px] w-[17px]" aria-hidden="true" />
            {unreadMessagesCount > 0 ? <span className="nl-iconbtn__dot" /> : null}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="nl-search" onClick={openSearch} aria-label="搜索服务、志愿者、求助">
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="nl-search__text text-[12px]">搜索服务、志愿者、求助</span>
          </button>
        </div>
      </div>
      ) : null}
    </header>
  );
};
