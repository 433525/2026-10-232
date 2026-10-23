import React from 'react';
import { ShieldCheck, HeartHandshake, Accessibility, Phone, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { BrandMark } from './BrandMark';

export const FooterCompliance: React.FC = () => {
  const { setActiveSubPage } = useApp();

  return (
    <footer className="mt-8 bg-slate-900 text-slate-400 text-xs border-t border-slate-800 pb-20 pt-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand Signature */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pb-2">
          <BrandMark size={44} />
          <div className="text-center sm:text-left">
            <div className="font-black text-slate-200 text-sm tracking-tight">
              翠湖花园社区 · 时间银行与银龄守护互助平台
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              纯公益邻里互助 · 时间币仅记账不可兑现 · 本演示环境数据为本机合成，不用于真实运营
            </div>
          </div>
        </div>

        {/* Top Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-xs">社区纯公益互助 · 0抽成0商业</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-xs">实名准入 · 先审后发 · 存证留痕</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300">
            <Accessibility className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-xs">国家信息无障碍三级标准认证</span>
          </div>
        </div>

        {/* Emergency Note */}
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] leading-relaxed text-slate-300 flex items-start gap-2">
          <Phone className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>
            <strong>急救特别提示：</strong>本平台为邻里互助与时间银行志愿信息交互系统，非医疗急救或专业抢险通道。如遇急性心脑血管险情、跌倒重伤、燃气火情等生命危急事件，请务必立即拨打 <strong>120急救</strong>、<strong>119消防</strong> 或 <strong>110报警</strong>。
          </span>
        </div>

        {/* Links & Filings */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400">
            <button
              onClick={() => {
                sound.playTap();
                setActiveSubPage('terms_modal');
              }}
              className="hover:text-slate-200 underline underline-offset-2"
            >
              用户服务协议
            </button>
            <span>·</span>
            <button
              onClick={() => {
                sound.playTap();
                setActiveSubPage('terms_modal');
              }}
              className="hover:text-slate-200 underline underline-offset-2"
            >
              隐私保护政策
            </button>
            <span>·</span>
            <button
              onClick={() => {
                sound.playTap();
                setActiveSubPage('terms_modal');
              }}
              className="hover:text-slate-200 underline underline-offset-2"
            >
              社区互助公约与免责声明
            </button>
          </div>

          <div className="text-center sm:text-right space-y-1 font-mono text-[10px]">
            <div>
              <a 
                href="https://beian.miit.gov.cn/" 
                target="_blank" 
                rel="noreferrer" 
                className="hover:text-emerald-400 flex items-center justify-center sm:justify-end gap-1"
              >
                <span>ICP备案：京ICP备20261018号-1</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div>京公网安备 11010802026101号 · 翠湖花园社区居委会版权所有</div>
          </div>
        </div>
      </div>
    </footer>
  );
};
