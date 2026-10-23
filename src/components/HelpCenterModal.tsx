import React, { useState } from 'react';
import { 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Coins, 
  HeartHandshake, 
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  audioText: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    id: 'faq_1',
    question: '老人如何一键发布求助订单？',
    answer: '点击屏幕中央的【＋】号大按钮，选择【发布求助订单】，选择您需要的服务类型（如陪同就医、日常家务、维修等），填写您所在单元门牌号，点击提交即可！附近认证的志愿者将立即收到通知并接单。',
    audioText: '老人如何发布求助订单：点击屏幕中间的加号按钮，选择发布求助，选择您需要的服务，比如陪同看病或者日常家务，确认您的房间号，点击提交就可以啦！附近的志愿者很快就会接单联系您。'
  },
  {
    id: 'faq_2',
    question: '什么是“时间银行”？时间币怎么存入和使用？',
    answer: '时间银行是社区纯公益互助模式。志愿者每为老人服务 1 小时，个人账户就存入 1 个标准时间币。存入的时间币可在自己或父母年迈需要帮助时，免费兑换其他志愿者的服务。时间币严禁任何形式的买卖或非法套现。',
    audioText: '什么是时间银行：时间银行是社区爱心储蓄池。年轻时服务老人存入时间币，年迈时可以用时间币免费兑换别人的照顾。时间币是邻里爱心的记录，不可兑换现金。'
  },
  {
    id: 'faq_3',
    question: '志愿者上门服务时如何保障老人家中安全与隐私？',
    answer: '本原型不做任何背景审核或实名认证：页面上的志愿者头像、评分与“已实名”标签全部是虚构演示数据，不代表真实人员或真实资质。老人门牌号与病史在本机演练中不会被采集，也不存在“接单后自动解锁”的真实数据；服务前后的签到与双向确认仅记录在当前浏览器。',
    audioText: '安全保障说明：本演练不进行实名审核，志愿者信息和评分都是虚构演示数据，不会采集真实门牌号或病史，所有记录只保存在当前浏览器。'
  },
  {
    id: 'faq_4',
    question: '遇到突发紧急情况该怎么使用？',
    answer: '遇到严重身体不适或险情，请直接拨打 120 / 110。本平台的“紧急求助”只是界面演示：它不会呼叫急救、不会通知网格员、不会定位，也不会派单，因此不能替代任何急救通道。',
    audioText: '紧急情况应对：请直接拨打 120 或 110。本页的紧急求助按钮只是界面演示，不会真的通知任何人，也不能替代急救电话。'
  }
];

export const HelpCenterModal: React.FC = () => {
  const { setActiveSubPage, elderlyMode } = useApp();
  const [openId, setOpenId] = useState<string>('faq_1');
  const [readingId, setReadingId] = useState<string | null>(null);

  const toggleRead = (item: FaqItem) => {
    if (readingId === item.id) {
      sound.stopSpeaking();
      setReadingId(null);
    } else {
      setReadingId(item.id);
      sound.speakText(item.audioText, () => {
        setReadingId(null);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">
                帮助中心 · 适老操作教程与语音指南
              </h2>
              <p className="text-xs text-emerald-100">
                支持人机语音朗读 · 大字清晰排版 · 常见问题解答
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.stopSpeaking();
              sound.playTap();
              setActiveSubPage(null);
            }}
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Quick Guide Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <HeartHandshake className="w-6 h-6 text-emerald-700 mx-auto" />
              <div className="text-xs font-bold text-emerald-900">1. 一键求助</div>
              <p className="text-[11px] text-emerald-700">点加号发单，就近志愿者上门</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
              <Coins className="w-6 h-6 text-amber-700 mx-auto" />
              <div className="text-xs font-bold text-amber-900">2. 时间储蓄</div>
              <p className="text-[11px] text-amber-700">服务记录上链，时长终身有效</p>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-center space-y-1">
              <ShieldCheck className="w-6 h-6 text-sky-700 mx-auto" />
              <div className="text-xs font-bold text-sky-900">3. 实名安全</div>
              <p className="text-[11px] text-sky-700">社区网格把关，全程双向确认</p>
            </div>
          </div>

          {/* FAQ Accordion with Speech Buttons */}
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              常见使用疑问（点击可展开并朗读）
            </h3>

            {FAQ_LIST.map((item) => {
              const isOpen = openId === item.id;
              const isReading = readingId === item.id;
              return (
                <div 
                  key={item.id}
                  className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs"
                >
                  <button
                    onClick={() => {
                      sound.playTap();
                      setOpenId(isOpen ? '' : item.id);
                    }}
                    className={`w-full p-3.5 text-left flex items-center justify-between gap-3 transition-colors ${
                      isOpen ? 'bg-emerald-50/60 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span className={`${elderlyMode ? 'text-base font-bold' : 'text-sm font-semibold'} flex-1`}>
                      {item.question}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRead(item);
                        }}
                        className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
                          isReading 
                            ? 'bg-amber-500 text-white border-amber-600 animate-pulse' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="语音朗读该条解答"
                      >
                        {isReading ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
                        <span className="text-[11px] hidden xs:inline">{isReading ? '停止' : '朗读'}</span>
                      </button>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                      <p className={`text-slate-700 leading-relaxed ${elderlyMode ? 'text-base font-medium' : 'text-xs sm:text-sm'}`}>
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hotline Box */}
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Phone className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  如遇操作困难，可先看图文教程；本演示不提供真实热线
                </p>
                <p className="text-[11px] text-slate-500">
                  生产环境应提供社区帮办电话与值班时段，并明示响应时限
                </p>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
              未提供
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400">
          社区服务演练项目组（虚构）编制
        </div>
      </div>
    </div>
  );
};
