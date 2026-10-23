import React, { useState } from 'react';
import { 
  Coins, 
  Award, 
  ShieldCheck, 
  Accessibility, 
  ChevronRight, 
  Lock, 
  HelpCircle, 
  History, 
  LayoutDashboard
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { useDialog } from '../hooks/useDialog';

export const ProfileTab: React.FC = () => {
  const { 
    currentUser, 
    orders, 
    timeLedger, 
    setActiveSubPage, 
    setSelectedOrderId, 
    elderlyMode, 
    setElderlyMode 
  } = useApp();

  const [activeOrderTab, setActiveOrderTab] = useState<'my_requests' | 'my_volunteered'>('my_requests');
  const [showLedgerModal, setShowLedgerModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // 弹层可访问性：Esc 关闭、焦点归还、背景滚动锁定
  useDialog(showLedgerModal, () => setShowLedgerModal(false));
  useDialog(showRulesModal, () => setShowRulesModal(false));

  const myRequests = orders.filter(o => o.userId === currentUser.id);
  const myVolunteered = orders.filter(o => o.volunteerId === currentUser.id);
  const userLedgers = timeLedger.filter(l => l.userId === currentUser.id);

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* User Header Profile Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-xs"
            />
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400 text-slate-900 shadow-2xs">
              {currentUser.rating} ★
            </span>
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg truncate">
                {currentUser.name}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                {currentUser.roleLabel}
              </span>
            </div>

            <p className="text-xs text-slate-500 truncate">
              {currentUser.address}
            </p>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <span>手机: {currentUser.phoneMasked}</span>
              <span>·</span>
              <span className="text-emerald-700 flex items-center gap-0.5 font-sans font-medium">
                <ShieldCheck className="w-3 h-3" />
                已实名认证
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playTap();
            setActiveSubPage('realname_verify');
          }}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center gap-1 shrink-0"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">实名信息</span>
        </button>
      </div>

      {/* Golden Time Bank Wallet Card */}
      <div className="relative rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-700 text-white p-5 shadow-lg shadow-amber-500/20 overflow-hidden space-y-4">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-yellow-300/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-100 font-mono">
                COMMUNITY TIME BANK
              </span>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                时间银行 · 邻里互助储蓄池
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              setShowRulesModal(true);
            }}
            className="text-xs font-bold text-amber-950 bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg shadow-xs transition-colors flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>使用规则</span>
          </button>
        </div>

        {/* 3 Metric Columns */}
        <div className="relative grid grid-cols-3 gap-2 text-center pt-1 border-t border-amber-400/40">
          <div>
            <div className="text-2xl sm:text-3xl font-black font-sans tracking-tight">
              {currentUser.timeCoins}
            </div>
            <div className="text-[11px] text-amber-100 mt-0.5">
              未结算时长（币）
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black font-sans tracking-tight">
              {currentUser.volunteerHours}
            </div>
            <div className="text-[11px] text-amber-100 mt-0.5">
              未结算学时(h)
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black font-sans tracking-tight">
              {currentUser.completedTasks}
            </div>
            <div className="text-[11px] text-amber-100 mt-0.5">
              累计服务次数
            </div>
          </div>
        </div>

        {/* Ledger History Button */}
        <div className="relative flex justify-end pt-1">
          <button
            onClick={() => {
              sound.playTap();
              setShowLedgerModal(true);
            }}
            className="text-xs font-bold text-white hover:text-amber-200 flex items-center gap-1"
          >
            <History className="w-3.5 h-3.5" />
            <span>查看时间币存取流水账本 ({userLedgers.length}条)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Orders Manager (Tabbed: My Requests vs My Claimed Tasks) */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex gap-2">
            <button
              onClick={() => {
                sound.playTap();
                setActiveOrderTab('my_requests');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeOrderTab === 'my_requests'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              我发起的求助 ({myRequests.length})
            </button>

            <button
              onClick={() => {
                sound.playTap();
                setActiveOrderTab('my_volunteered');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeOrderTab === 'my_volunteered'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              我认领的志愿 ({myVolunteered.length})
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            双向确认后时长自动结算
          </span>
        </div>

        {/* Order Cards List */}
        <div className="space-y-2.5">
          {(activeOrderTab === 'my_requests' ? myRequests : myVolunteered).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              暂无相关订单记录
            </p>
          ) : (
            (activeOrderTab === 'my_requests' ? myRequests : myVolunteered).map((order) => (
              <div
                key={order.id}
                onClick={() => {
                  sound.playTap();
                  setSelectedOrderId(order.id);
                  setActiveSubPage('order_detail');
                }}
                className="cursor-pointer p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-300 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'in_progress' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                      order.status === 'accepted' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {order.status === 'completed' ? '已完成（未结算）' :
                       order.status === 'in_progress' ? '服务进行中' :
                       order.status === 'accepted' ? '待上门服务' : '接单大厅公示中'}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {order.title}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 truncate">
                    {order.dateStr} · {order.locationArea} · 预估{order.durationHours}小时
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-amber-700 font-mono">
                    +{order.timeCoinReward} 币
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Feature Menu List */}
      <div className="p-2 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1 text-xs sm:text-sm font-semibold text-slate-700">
        {/* Certificate View */}
        <button
          onClick={() => {
            sound.playTap();
            setActiveSubPage('certificate_view');
          }}
          className="w-full p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-500" />
            <span>查验/下载个人志愿服务电子证明</span>
          </div>
          <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
            <span>演练证明</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>

        {/* Elderly Mode Switcher */}
        <div className="p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2.5">
            <Accessibility className="w-5 h-5 text-emerald-600" />
            <div>
              <p>适老化大字关怀模式</p>
              <p className="text-[11px] text-slate-400 font-normal">正文放大至18px，高对比度界面排版</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setElderlyMode(!elderlyMode);
            }}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              elderlyMode ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <span className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        {/* Help Center */}
        <button
          onClick={() => {
            sound.playTap();
            setActiveSubPage('help_center');
          }}
          className="w-full p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-sky-600" />
            <span>帮助中心与长者语音教程</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Admin Center */}
        <button
          onClick={() => {
            sound.playTap();
            setActiveSubPage('admin_center');
          }}
          className="w-full p-3 rounded-xl bg-purple-50/60 hover:bg-purple-100/60 text-purple-950 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-5 h-5 text-purple-700" />
            <span>社区网格管理与风控审核后台</span>
          </div>
          <span className="text-xs text-purple-700 font-bold bg-white px-2 py-0.5 rounded shadow-2xs">
            管理入口
          </span>
        </button>
      </div>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-5 space-y-3 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-500" />
                时间银行·互助规则须知
              </h3>
              <button onClick={() => setShowRulesModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="text-xs sm:text-sm text-slate-600 space-y-2 leading-relaxed">
              <p><strong>1. 纯公益储蓄原则：</strong>时间币遵循“低龄存时间、高龄换服务”纯公益原则，严禁买卖、非法套现或转作商业用途。</p>
              <p><strong>2. 时长换算：</strong>标准互助服务 1 小时对应记入 1 个时间币；不足 1 小时按服务类型阶梯核定。</p>
              <p><strong>3. 存证与结算：</strong>服务完成后，须由长者/家属与志愿者双方完成在线确认或拍照签核，系统将生成不可篡改的账本流水号。</p>
              <p><strong>4. 调解与仲裁：</strong>本原型没有真实申诉渠道。演练中的争议可在详情页提交“演示投诉”，由演示角色在自己的浏览器内记录；不会提交给任何机构，也不会有外部回复。</p>
            </div>
          </div>
        </div>
      )}

      {/* Ledger History Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-5 space-y-3 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                <History className="w-5 h-5 text-amber-600" />
                时间银行个人流水明细账本
              </h3>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-2">
              {userLedgers.map((tx) => (
                <div key={tx.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 truncate">{tx.description}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.txHash} · {tx.createdAt}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-emerald-600">
                      +{tx.amount} 分钟
                    </div>
                    <div className="text-[10px] text-slate-400">未结算 · 不可兑现</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
