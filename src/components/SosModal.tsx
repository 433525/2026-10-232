import React, { useState } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  ShieldAlert,
  MapPin,
  X,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

/**
 * 紧急求助。
 *
 * 合规口径（R12，需求 §1.3.4）：
 * - 显著提示「紧急情况请拨打 120 / 110」，并声明本平台**不是急救通道**、**非 24 小时值守**；
 * - 120 / 110 只以文字提示「请手动拨打」，**不做 tel: 链接**：本原型不应承担一键拨号的角色，
 *   也不应让用户误以为平台参与了急救链路；
 * - 本机「记录一次求助」不得暗示已报警、已通知任何人、已派单。
 */
export const SosModal: React.FC = () => {
  const { currentUser, setActiveSubPage, elderlyMode } = useApp();
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleBroadcast = () => {
    sound.playSosAlert();
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setBroadcastSent(true);
          sound.playSuccess();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-rose-500 overflow-hidden">
        {/* Header Alert Strip */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                紧急求助（非急救通道）
              </h2>
              <p className="text-xs text-rose-100 mt-0.5">
                生命危急请直接拨打 120 / 110；本平台不提供急救调度，也没有 24 小时值守
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage(null);
            }}
            aria-label="关闭紧急求助"
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* 公共服务号码：只用文字提示，不做 tel: 链接（本原型不是急救通道，也不应承担一键拨号的角色） */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-red-50 border-2 border-red-500 text-red-700 font-bold min-h-[44px]"
            >
              <PhoneCall className="w-5 h-5 text-red-600" aria-hidden="true" />
              <div className="text-left">
                <div className="text-xs text-red-500">医疗急救</div>
                <div className="text-base sm:text-lg">请手动拨打 120</div>
              </div>
            </div>

            <div
              className="flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-blue-50 border-2 border-blue-500 text-blue-700 font-bold min-h-[44px]"
            >
              <ShieldAlert className="w-5 h-5 text-blue-600" aria-hidden="true" />
              <div className="text-left">
                <div className="text-xs text-blue-500">公安报警</div>
                <div className="text-base sm:text-lg">请手动拨打 110</div>
              </div>
            </div>
          </div>

          {/* Location preview：只到小区一级 */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>求助小区：{currentUser.community}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 pl-6">
              <span>身份：{currentUser.roleLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 pl-6 text-[11px]">
              <span>演练不采集门牌号、手机号与实时定位；真实环境需单独授权后限时可见。</span>
            </div>
          </div>

          {/* Local record only */}
          {!broadcastSent ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                下面的按钮**只在本机演练数据里记一条「紧急求助」事件**并展示 120/110 提示。
                它<strong className="text-rose-600">不会</strong>拨号、不会发送短信、不会通知网格员或志愿者，
                也不代表已经报警。
              </p>

              <button
                onClick={handleBroadcast}
                disabled={countdown !== null}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                  countdown !== null
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700'
                } ${elderlyMode ? 'text-lg' : 'text-sm sm:text-base'}`}
              >
                <Radio className={`w-5 h-5 ${countdown !== null ? 'animate-pulse' : ''}`} />
                <span>
                  {countdown !== null ? `本机记录中… ${countdown}s` : '在本机记录一次求助演练'}
                </span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-emerald-900">已在本机记录（演练）</h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                未报警、未通知任何人、未派单。真实的紧急情况请立即拨打 120 或 110，
                并联系可到场的家人、邻居。
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold min-h-[36px]"
                >
                  <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                  请手动拨打 120
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold min-h-[36px]"
                >
                  <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                  请手动拨打 110
                </span>
              </div>
            </div>
          )}

          {/* Disclaimer Note */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
            <p className="flex items-start gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                免责声明：社区互助是邻里自愿帮扶，不是急救或专业抢险通道。遇突发心梗、中风、火灾等
                危及人身安全的险情，请务必首选 120 / 119 / 110。
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
