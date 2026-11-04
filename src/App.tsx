import React, { Suspense, lazy, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { HeaderNav } from './components/HeaderNav';
import { BottomTabBar } from './components/BottomTabBar';
import { HomeTab } from './components/HomeTab';
import { CommunityTab } from './components/CommunityTab';
import { MessagesTab } from './components/MessagesTab';
import { ProfileTab } from './components/ProfileTab';
import { FooterCompliance } from './components/FooterCompliance';
import { StorageBanner } from './components/StorageBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './utils/toast';
import { sound } from './utils/audio';

/**
 * 业务弹层全部按需加载：
 * 首屏只带 4 个页签 + 外壳，12 个弹层各自成 chunk。
 * 打开弹层的路径都在用户点击之后，因此不会影响首屏 LCP。
 */
const PublishModal = lazy(() =>
  import('./components/PublishModal').then((m) => ({ default: m.PublishModal })),
);
const OrderDetailModal = lazy(() =>
  import('./components/OrderDetailModal').then((m) => ({ default: m.OrderDetailModal })),
);
const TasksHall = lazy(() => import('./components/TasksHall').then((m) => ({ default: m.TasksHall })));
const EldercareModal = lazy(() =>
  import('./components/EldercareModal').then((m) => ({ default: m.EldercareModal })),
);
const CertificateModal = lazy(() =>
  import('./components/CertificateModal').then((m) => ({ default: m.CertificateModal })),
);
const HelpCenterModal = lazy(() =>
  import('./components/HelpCenterModal').then((m) => ({ default: m.HelpCenterModal })),
);
const SosModal = lazy(() => import('./components/SosModal').then((m) => ({ default: m.SosModal })));
const SearchModal = lazy(() =>
  import('./components/SearchModal').then((m) => ({ default: m.SearchModal })),
);
const CommunityQrModal = lazy(() =>
  import('./components/CommunityQrModal').then((m) => ({ default: m.CommunityQrModal })),
);
const RealNameModal = lazy(() =>
  import('./components/RealNameModal').then((m) => ({ default: m.RealNameModal })),
);
const AdminCenter = lazy(() =>
  import('./components/AdminCenter').then((m) => ({ default: m.AdminCenter })),
);
const TermsModal = lazy(() =>
  import('./components/TermsModal').then((m) => ({ default: m.TermsModal })),
);
const TimeLedgerPage = lazy(() =>
  import('./components/TimeLedgerPage').then((m) => ({ default: m.TimeLedgerPage })),
);
const TimeBankRulesModal = lazy(() =>
  import('./components/TimeBankRulesModal').then((m) => ({ default: m.TimeBankRulesModal })),
);

const MainLayout: React.FC = () => {
  const { activeTab, activeSubPage, setActiveSubPage, elderlyMode } = useApp();

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

  // 页签切换统一回顶：移动端长列表切页后停在半空会很困惑
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  /**
   * 空闲时预取三个最常用的弹层（发布 / 订单详情 / 接单大厅）。
   * 首屏仍然只带页签，只是把「第一次点开要等 chunk」的等待挪到浏览器空闲期；
   * 不支持 requestIdleCallback 的浏览器退化为 2.5s 后预取。
   */
  useEffect(() => {
    const prefetch = () => {
      void import('./components/PublishModal');
      void import('./components/OrderDetailModal');
      void import('./components/TasksHall');
    };
    const idle = (window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }).requestIdleCallback;
    if (typeof idle === 'function') {
      const id = idle(prefetch, { timeout: 4000 });
      return () => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(prefetch, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'community':
        return <CommunityTab />;
      case 'messages':
        return <MessagesTab />;
      case 'profile':
        return <ProfileTab />;
      case 'home':
      default:
        return <HomeTab />;
    }
  };

  return (
    <div className={`nl-shell ${elderlyMode ? 'elderly-mode-active' : ''}`}>
      <a href="#app-main" className="nl-skip">
        跳转到主要内容
      </a>

      <HeaderNav />

      <main id="app-main" tabIndex={-1} className="nl-main">
        <StorageBanner />
        <div key={activeTab} className="nl-enter">
          {renderTab()}
        </div>
      </main>

      <FooterCompliance />
      <BottomTabBar />
      <Toaster />

      <Suspense fallback={null}>
        {activeSubPage === 'publish_modal' && <PublishModal />}
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
        {activeSubPage === 'time_ledger_page' && <TimeLedgerPage />}
        {activeSubPage === 'rules_modal' && <TimeBankRulesModal />}
      </Suspense>
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
