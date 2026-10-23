import React from 'react';
import { ShieldCheck, HeartHandshake, Accessibility, Phone, ClipboardList } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { BrandMark } from './BrandMark';

/**
 * 页脚合规区。
 *
 * 232 原版在这里写了 ICP 备案号、公安备案号和「国家信息无障碍三级标准认证」，
 * 但演示环境三者都没有办理。按需求 §8.7「不得把演示能力写成已实现」，
 * 这里改为**如实披露未办理项**，并把「紧急求助非急救通道」放在页脚固定位置（R12）。
 */
export const FooterCompliance: React.FC = () => {
  const { setActiveSubPage } = useApp();

  const openTerms = () => {
    sound.playTap();
    setActiveSubPage('terms_modal');
  };

  return (
    <footer className="mt-8 bg-slate-900 text-slate-400 text-xs border-t border-slate-800 pb-20 pt-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand Signature */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pb-2">
          <BrandMark size={44} />
          <div className="text-center sm:text-left">
            <div className="font-black text-slate-200 text-sm tracking-tight">
              邻里互助演练 · 时间银行与银龄守护（合成演示）
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              纯前端合成演练 · 时间币只记账不可兑现 · 数据只存在本机浏览器 · 不可用于真实运营
            </div>
          </div>
        </div>

        {/* Top Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300">
            <HeartHandshake className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-xs">公益免费 · 0 抽成 · 无支付能力</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-xs">先审后发 · 举报可达 · 操作留痕</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300">
            <Accessibility className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-xs">按 WCAG 2.2 AA 目标设计（未做第三方认证）</span>
          </div>
        </div>

        {/* Emergency Note */}
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] leading-relaxed text-slate-300 flex items-start gap-2">
          <Phone className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>
            <strong>急救特别提示：</strong>本平台是邻里互助与时间银行的**信息交互演练**，不是医疗急救或专业抢险通道，
            也没有 24 小时值守。如遇急性心脑血管险情、跌倒重伤、燃气火情等生命危急事件，
            请务必立即拨打 <strong>120 急救</strong>、<strong>119 消防</strong> 或 <strong>110 报警</strong>。
          </span>
        </div>

        {/* Demo scope disclosure */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-[11px] leading-relaxed text-slate-400 flex items-start gap-2">
          <ClipboardList className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">演示边界：</strong>
            未办理 ICP 备案与公安联网备案；未接入短信验证码、对象存储与图片上传、真实定位、支付、
            WebSocket 实时消息与多账号体系；不采集身份证号、手机号、门牌号。演示数据全部为合成虚构内容，
            刷新与「恢复演示数据」都会改变本机状态。
          </span>
        </div>

        {/* Links & Filings */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400">
            <button onClick={openTerms} className="hover:text-slate-200 underline underline-offset-2 min-h-[32px]">
              用户服务协议
            </button>
            <span>·</span>
            <button onClick={openTerms} className="hover:text-slate-200 underline underline-offset-2 min-h-[32px]">
              隐私保护政策
            </button>
            <span>·</span>
            <button onClick={openTerms} className="hover:text-slate-200 underline underline-offset-2 min-h-[32px]">
              互助公约与免责声明
            </button>
          </div>

          <div className="text-center sm:text-right space-y-1 font-mono text-[10px] text-slate-500">
            <div>ICP 备案：未办理（演示环境，不对外提供真实服务）</div>
            <div>公安联网备案：未办理 · 主办方：项目组（合成演练）</div>
          </div>
        </div>
      </div>
    </footer>
  );
};
