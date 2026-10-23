import React, { useState } from 'react';
import { ShieldCheck, X, Lock, UserCheck, AlertTriangle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

/**
 * 演练实名。
 *
 * 生产环境的实名核验需要「手机号验证 + 社区人工核验」，若采集身份证号还要单独同意、
 * 加密存储与访问审计（R5 / 文档 §3.5）。本演示既没有后端也没有加密存储，因此这里
 * **不接收、不校验、不保存任何身份证号**，只做身份档位的切换：
 * 访客（未实名）→ 演练成员（已实名）。输入框按需求 §5 改为说明文案。
 */
export const RealNameModal: React.FC = () => {
  const { verifyRealName, setActiveSubPage } = useApp();
  const [hasAgreed, setHasAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreed) {
      setErrorMsg('请先确认你已了解本演练的实名口径');
      return;
    }
    verifyRealName('', '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-base">演练实名（不采集身份证号）</span>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage(null);
            }}
            aria-label="关闭实名说明"
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              当前是纯前端合成演练：没有后端、没有短信、没有加密存储，因此不会采集身份证号、
              手机号或门牌号。点下面的按钮只是把本机身份从「访客」切换到「演练成员」，
              用来演示「实名前置」这条规则本身。
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span>
                真实环境的做法：手机号验证码 + 社区人工核验；如确需身份证号，须单独同意、加密存储、
                最小化展示并留存访问审计。
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span>本演练可验证的部分：未实名（访客）无法发布求助订单，会被拦在提交之前。</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-700">身份信息采集</span>
            <div className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs sm:text-sm text-slate-500">
              本演练不提供身份证号输入框（避免演示环境出现真实格式证件号）
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 flex items-center gap-1 font-medium" role="alert">
              <AlertTriangle className="w-3.5 h-3.5" />
              {errorMsg}
            </p>
          )}

          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="privacyCheck"
              checked={hasAgreed}
              onChange={(e) => {
                setHasAgreed(e.target.checked);
                if (e.target.checked) setErrorMsg('');
              }}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="privacyCheck" className="text-[11px] text-slate-500 leading-tight">
              我了解：本演练不采集真实身份信息；切换后的「已实名」状态只保存在本机浏览器，
              不代表任何机构完成过核验。
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <UserCheck className="w-4 h-4" />
            <span>切换为演练成员（已实名）</span>
          </button>
        </form>
      </div>
    </div>
  );
};
