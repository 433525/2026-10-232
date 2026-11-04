import React from 'react';
import { Home, MessageSquare, Plus, User, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

const TABS = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'community', label: '社区', icon: Users },
  { key: 'messages', label: '消息', icon: MessageSquare },
  { key: 'profile', label: '我的', icon: User },
] as const;

/**
 * 移动端底部坞：白色胶囊 + 中央黑色「+」。
 * 当前项为品牌橘实底胶囊（图标与文字横排），其余为图标在上、文字在下。
 * 桌面隐藏（顶栏已有导航）。
 */
export const BottomTabBar: React.FC = () => {
  const { activeTab, setActiveTab, setActiveSubPage, unreadMessagesCount } = useApp();

  const goTab = (tab: (typeof TABS)[number]['key']) => {
    sound.playTap();
    setActiveSubPage(null);
    setActiveTab(tab);
  };

  const item = (tab: (typeof TABS)[number]) => {
    const Icon = tab.icon;
    const active = activeTab === tab.key;
    return (
      <button
        key={tab.key}
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={() => goTab(tab.key)}
        className={`nl-dock__item${active ? ' nl-dock__item--active' : ''}`}
      >
        <span className="relative flex">
          <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
          {tab.key === 'messages' && unreadMessagesCount > 0 ? (
            <span
              className="absolute -right-1.5 -top-1 h-3 min-w-3 rounded-full bg-brand px-0.5 text-center text-[8px] font-bold leading-3 text-white"
              aria-hidden="true"
            >
              {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
            </span>
          ) : null}
        </span>
        <span className="text-[10px] leading-none">{tab.label}</span>
      </button>
    );
  };

  return (
    <nav className="nl-dock" aria-label="主导航">
      {item(TABS[0])}
      {item(TABS[1])}

      <button
        type="button"
        className="nl-dock__plus"
        onClick={() => {
          sound.playTap();
          setActiveSubPage('publish_modal');
        }}
        aria-label="发布求助、志愿动态或邻里帖子"
      >
        <Plus className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
        <span className="nl-sr-only">发布</span>
      </button>

      {item(TABS[2])}
      {item(TABS[3])}
    </nav>
  );
};
