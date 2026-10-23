import React, { useState } from 'react';
import { 
  AlertTriangle, 
  PhoneCall, 
  ShieldAlert, 
  MapPin, 
  X, 
  CheckCircle2, 
  Radio
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

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
                紧急求助 · 绿色急救通道
              </h2>
              <p className="text-xs text-rose-100 mt-0.5">
                生命急救优先拨打 120 / 110，非急救将同步呼叫社区网格员与就近志愿者
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage(null);
            }}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Statutory Emergency Dialers */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:120"
              className="flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-red-50 hover:bg-red-100 border-2 border-red-500 text-red-700 font-bold transition-all shadow-xs"
            >
              <PhoneCall className="w-5 h-5 text-red-600" />
              <div className="text-left">
                <div className="text-xs text-red-500">医疗急救</div>
                <div className="text-base sm:text-lg">拨打 120</div>
              </div>
            </a>

            <a
              href="tel:110"
              className="flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-500 text-blue-700 font-bold transition-all shadow-xs"
            >
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <div className="text-xs text-blue-500">公安报警</div>
                <div className="text-base sm:text-lg">拨打 110</div>
              </div>
            </a>
          </div>

          {/* Location & Contact Info Preview */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>当前求助地址：{currentUser.address}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 pl-6">
              <span>求助人：{currentUser.name} ({currentUser.phoneMasked})</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 pl-6 text-[11px]">
              <span>常住社区：{currentUser.community} | 网格值守站：翠湖党群服务中心</span>
            </div>
          </div>

          {/* Broadcast State */}
          {!broadcastSent ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                点击下方按钮将立即启动<strong className="text-rose-600">【社区就近应急联防】</strong>：向方圆 500 米内已认证且在线的 <strong>4位金牌志愿者</strong> 及 <strong>网格长王芳 (189****0011)</strong> 发送高优先级震动告警与精准门牌定位。
              </p>

              <button
                onClick={handleBroadcast}
                disabled={countdown !== null}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  countdown !== null 
                    ? 'bg-amber-500 animate-pulse' 
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 hover:shadow-rose-500/30 active:scale-98'
                } ${elderlyMode ? 'text-lg' : 'text-base'}`}
              >
                {countdown !== null ? (
                  <>
                    <Radio className="w-5 h-5 animate-spin" />
                    <span>正在发起紧急呼叫 ({countdown}s)...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    <span>确认呼叫附近志愿者与社区网格员</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-emerald-900">
                紧急呼叫已成功广播！
              </h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                已向网格长王芳（189****0011）及志愿者陈明（距离320米）发送高优先级求助弹窗与住址，请保持手机畅通并注意敲门声。
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <a
                  href="tel:18900000011"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  拨打网格长专线
                </a>
              </div>
            </div>
          )}

          {/* Disclaimer Note */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>免责声明：社区互助为邻里自治自愿帮扶，遇突发心梗、中风、火灾等危及人身安全险情，请务必首选 120/119/110。</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
