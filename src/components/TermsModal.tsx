import React, { useState } from 'react';
import { ShieldCheck, X, FileText, Lock, HeartHandshake } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

export const TermsModal: React.FC = () => {
  const { setActiveSubPage } = useApp();
  const [tab, setTab] = useState<'terms' | 'privacy' | 'elderly'>('terms');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base">社区服务合规协议与隐私政策说明</h2>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage(null);
            }}
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-600 shrink-0">
          {[
            { key: 'terms', label: '用户服务协议', icon: FileText },
            { key: 'privacy', label: '隐私保护政策', icon: Lock },
            { key: 'elderly', label: '邻里互助公约与免责', icon: HeartHandshake },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => {
                sound.playTap();
                setTab(t.key as typeof tab);
              }}
              className={`py-2.5 px-3 border-b-2 flex items-center gap-1 transition-colors ${
                tab === t.key ? 'border-emerald-600 text-emerald-800 font-bold bg-white' : 'border-transparent hover:text-slate-900'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
          {tab === 'terms' && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-base">翠湖社区“时间银行·银龄守护”用户服务协议</h3>
              <p>版本生效日期：2026年10月18日</p>
              <p><strong>1. 主体与服务定位：</strong>本平台由翠湖花园社区居委会与新时代文明实践站联合创办，旨在通过“时间银行”志愿储蓄机制，促进社区居民之间的就近助老互助、邻里照护与经验分享。</p>
              <p><strong>2. 纯公益免费属性：</strong>平台所有助老求助、接单、时间币流转均属于纯公益行为，严禁任何个人或第三方以平台名义进行变相收费、非法集资或中介牟利。</p>
              <p><strong>3. 内容管理与先审后发：</strong>为保障健康向上的社区交流环境，用户发布的所有求助订单、风采动态及评论均须经过敏感词检测与网格员合规审查后方可对外公开。</p>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-base">敏感个人信息保护与脱敏规则</h3>
              <p><strong>1. 最小必要原则：</strong>平台仅在您使用特定服务时收集手机号、真实姓名、脱敏住址等必要信息。</p>
              <p><strong>2. 门牌住址脱敏分级：</strong>公开展示时默认仅模糊显示至“翠湖花园3期”等大范围；长者具体的单元与房间号仅在志愿者成功接单并完成安全凭证校验后，在订单内限时授权可见。</p>
              <p><strong>3. 既往病史与特殊健康说明：</strong>长者的身体禁忌与慢性病信息属于敏感个人信息，须在发布时经本人或家属单独勾选同意后，采用高等级加密存储，严禁泄露。</p>
            </div>
          )}

          {tab === 'elderly' && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-base">邻里互助公约与急救免责声明</h3>
              <p><strong>1. 友善守信公约：</strong>志愿者接单后应准时履约，如遇特殊情况需提前在订单内留言告知；求助长者及家属应如实说明需求与照护要点。</p>
              <p><strong>2. 紧急险情处置通道：</strong>本平台为邻里志愿协作工具，非 120 急救专线。遇急性疾病突发、摔倒骨折昏迷等危及生命险情，家属或现场志愿者应第一时间直接拨打 120/110，切勿延误急救时机。</p>
              <p><strong>3. 纠纷仲裁机制：</strong>如因服务引发纠纷，可向社区网格仲裁委员会提交工单，网格长将提供调解与信誉扣减处置。</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right shrink-0">
          <button
            onClick={() => setActiveSubPage(null)}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
          >
            我已知晓并同意
          </button>
        </div>
      </div>
    </div>
  );
};
