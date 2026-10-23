import React, { useState } from 'react';
import { ShieldCheck, X, Lock, UserCheck, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

export const RealNameModal: React.FC = () => {
  const { currentUser, verifyRealName, setActiveSubPage } = useApp();
  const [name, setName] = useState(currentUser.name || '');
  const [idCard, setIdCard] = useState('320106199408226618');
  const [hasAgreed, setHasAgreed] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('请输入真实姓名');
      return;
    }
    if (idCard.length !== 18) {
      setErrorMsg('请输入18位有效身份证号码');
      return;
    }
    if (!hasAgreed) {
      setErrorMsg('请勾选敏感个人信息处理与实名授权协议');
      return;
    }

    verifyRealName(name.trim(), idCard.trim());
    setActiveSubPage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-base">社区实名认证与信息存证</span>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage(null);
            }}
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>依据《互联网信息服务管理办法》与网络实名制要求，发布求助订单与提供入户志愿服务须完成社区实名核验。您的敏感身份信息全程采用国密算法脱敏存储。</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">真实姓名：</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的真实姓名（如 张建国）"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">公民身份号码（18位）：</label>
            <input
              type="text"
              value={idCard}
              onChange={(e) => setIdCard(e.target.value)}
              placeholder="请输入18位身份证号"
              maxLength={18}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">常住小区及楼栋：</label>
            <input
              type="text"
              value={currentUser.address}
              disabled
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-500"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {errorMsg}
            </p>
          )}

          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="privacyCheck"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="privacyCheck" className="text-[11px] text-slate-500 leading-tight">
              我已阅读并同意《社区互助实名认证服务协议》及《敏感个人信息单独授权书》，确认所提交信息真实有效。
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            <span>提交并完成实名认证</span>
          </button>
        </form>
      </div>
    </div>
  );
};
