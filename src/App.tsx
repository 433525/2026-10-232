import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { HeaderNav } from './components/HeaderNav';
import { BottomTabBar } from './components/BottomTabBar';
import { HomeTab } from './components/HomeTab';
import { CommunityTab } from './components/CommunityTab';
import { PublishModal } from './components/PublishModal';
import { MessagesTab } from './components/MessagesTab';
import { ProfileTab } from './components/ProfileTab';
import { FooterCompliance } from './components/FooterCompliance';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './utils/toast';
import { useDialog } from './hooks/useDialog';

// 子页面与弹层
import { OrderDetailModal } from './components/OrderDetailModal';
import { TasksHall } from './components/TasksHall';
import { EldercareModal } from './components/EldercareModal';
import { CertificateModal } from './components/CertificateModal';
import { HelpCenterModal } from './components/HelpCenterModal';
import { SosModal } from './components/SosModal';
import { SearchModal } from './components/SearchModal';
import { CommunityQrModal } from './components/CommunityQrModal';
import { RealNameModal } from './components/RealNameModal';
import { AdminCenter } from './components/AdminCenter';
import { TermsModal } from './components/TermsModal';
import { StorageBanner } from './components/StorageBanner';

import { Wifi, BatteryMedium, Signal, Smartphone, Monitor } from 'lucide-react';
import { sound } from './utils/audio';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    activeSubPage,
    setActiveSubPage,
    viewMode,
    setViewMode,
    elderlyMode,
  } = useApp();

  const [currentTime, setCurrentTime] = React.useState('');

  // 弹层可访问性基线：Esc 关闭 + 滚动锁定 + 焦点归还
  useDialog(activeSubPage !== null, () => setActiveSubPage(null));

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // 全局快捷键：⌘K / Ctrl+K 打开全局搜索
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isSearchShortcut) return;
      event.preventDefault();
      sound.playTap();
      setActiveSubPage('search_page');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActiveSubPage]);

  return (
    <div className={`min-h-screen bg-slate-100/90 text-slate-800 ${elderlyMode ? 'elderly-mode-active' : ''}`}>
      {/* 键盘跳过链接：Tab 第一站直达主内容 */}
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[110] focus:px-4 focus:py-2 focus:bg-emerald-700 focus:text-white focus:rounded-xl focus:shadow-xl"
      >
        跳转到主要内容
      </a>

      {viewMode === 'mobile_frame' ? (
        <div className="py-6 sm:py-10 px-2 flex flex-col items-center justify-center min-h-screen">
          <div className="mb-4 flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-slate-200 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-bold text-slate-800">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              微信小程序体验模拟器（iPhone 16 Pro 视口）
            </span>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setViewMode('responsive_web')}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>切换至电脑宽屏网页端</span>
            </button>
          </div>

          {/* 手机机身 */}
          <div className="relative w-full max-w-[412px] h-[860px] bg-slate-950 rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] ring-1 ring-slate-800 border-4 border-slate-700/60 overflow-hidden flex flex-col">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-blue-950/60 ring-1 ring-blue-900/40" />
            </div>

            <div className="relative z-40 pt-2 pb-1 px-6 flex items-center justify-between text-[11px] font-bold text-slate-800 bg-white/90 backdrop-blur-sm select-none">
              <span>{currentTime || '09:41'}</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <BatteryMedium className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            <div className="relative flex-1 bg-slate-100 overflow-y-auto flex flex-col rounded-[36px] overflow-hidden">
              <HeaderNav />
              <main id="app-main" tabIndex={-1} className="flex-1 p-3.5 pb-20">
                <StorageBanner />
                {activeTab === 'home' && <HomeTab />}
                {activeTab === 'community' && <CommunityTab />}
                {activeTab === 'publish' && <PublishModal />}
                {activeTab === 'messages' && <MessagesTab />}
                {activeTab === 'profile' && <ProfileTab />}
              </main>
              <BottomTabBar />
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full z-50 pointer-events-none" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col min-h-screen">
          <HeaderNav />

          <main id="app-main" tabIndex={-1} className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <StorageBanner />
            {activeTab === 'home' && <HomeTab />}
            {activeTab === 'community' && <CommunityTab />}
            {activeTab === 'publish' && <PublishModal />}
            {activeTab === 'messages' && <MessagesTab />}
            {activeTab === 'profile' && <ProfileTab />}
          </main>

          <FooterCompliance />
          <BottomTabBar />
        </div>
      )}

      {/* 子页面 / 弹层 */}
      {activeSubPage === 'order_detail' && <OrderDetailModal />}
      {activeSubPage === 'tasks_hall' && <TasksHall />}
      {activeSubPage === 'eldercare_detail' && <EldercareModal />}
      {activeSubPage === 'certificate_view' && <CertificateModal />}
      {activeSubPage === 'help_center' && <HelpCenterModal />}
      {activeSubPage === 'sos_modal' && <SosModal />}
      {activeSubPage === 'search_page' && <SearchModal />}
      {activeSubPage === 'community_qr' && <CommunityQrModal />}
      {activeSubPage === 'realname_verify' && <RealNameModal />}
      {activeSubPage === 'admin_center' && <AdminCenter />}
      {activeSubPage === 'terms_modal' && <TermsModal />}

      {/* 全局提示 */}
      <Toaster />
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
