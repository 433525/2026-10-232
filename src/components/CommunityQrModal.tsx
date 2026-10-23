import React from 'react';
import { QrCode, X, MessageCircle, ShieldCheck, Users, Copy, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

export const CommunityQrModal: React.FC = () => {
  const { setActiveSubPage } = useApp();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    sound.playTap();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-4">
        <button
          onClick={() => {
            sound.playTap();
            setActiveSubPage(null);
          }}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <MessageCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">
            梧桐里（虚构）邻里互助演练群
          </h3>
          <p className="text-xs text-slate-500">
            本图为版式演示，不对应任何真实群聊、线下渠道或工作人员
          </p>
        </div>

        {/* QR Code Graphic Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="w-44 h-44 bg-white p-2 rounded-xl border border-slate-200 shadow-xs mx-auto flex items-center justify-center relative group">
            <QrCode className="w-40 h-40 text-slate-900" />
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
              <Users className="w-8 h-8 text-emerald-600 mb-1" />
              <span className="text-xs font-bold text-slate-800">演练模拟群（虚构）</span>
              <span className="text-[10px] text-slate-400">负责人：演练-受理席-01</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>实名业主与认证志愿者专属群聊 · 杜绝广告</span>
          </div>
        </div>

        {/* Assistant Service ID */}
        <div className="p-2.5 rounded-xl bg-slate-100 flex items-center justify-between text-xs text-slate-700">
          <span>客服微信号：<strong>cuihu_care2026</strong></span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-emerald-700 font-bold hover:text-emerald-800"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-400">
          若微信群二维码已过期（微信7天有效机制），请添加上方网格员微信拉您入群。
        </p>
      </div>
    </div>
  );
};
