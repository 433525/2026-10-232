import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  Coins,
  HeartHandshake,
  HelpCircle,
  Phone,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  audioText: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    id: 'faq_1',
    question: '老人如何发布一条求助订单？',
    answer:
      '点击屏幕中央的「＋」按钮，选择「求助订单」，选需求类型，填写标题、社区级地点与时间后提交。未实名访客会被拦在提交之前；提交后进入先审后发队列，通过后才会出现在接单大厅。',
    audioText:
      '发布求助订单：点击屏幕中间的加号，选择求助订单，选择需求类型，填写标题、地点和时间，然后提交。未实名的访客需要先切换为演练成员。',
  },
  {
    id: 'faq_2',
    question: '什么是「时间银行」？时间币怎么记账？',
    answer:
      '时间银行是社区纯公益互助的记账方式：志愿者每服务 1 小时，本机账本记 1 个时间币。演练中的时间币只做展示，不可兑现、不可转让，也不构成任何支付凭证。',
    audioText:
      '什么是时间银行：时间银行是社区爱心记账。服务一小时记一个时间币。演练里的时间币只能看，不能换钱，也不能转给别人。',
  },
  {
    id: 'faq_3',
    question: '上门服务时如何保障老人安全与隐私？',
    answer:
      '本原型不做真实背景审核或实名认证：志愿者头像、评分与「已实名」标签全部是虚构演示数据。演练不采集门牌号与病史，也不存在「接单后自动解锁」的真实数据；签到与双向确认只记录在当前浏览器。',
    audioText:
      '安全说明：本演练不做真实实名审核，志愿者信息和评分都是虚构的，不会采集真实门牌号或病史，所有记录只存在当前浏览器。',
  },
  {
    id: 'faq_4',
    question: '遇到突发紧急情况该怎么使用？',
    answer:
      '遇到严重身体不适或险情，请直接拨打 120 / 110。本平台的「紧急求助」只是界面演示：它不会呼叫急救、不会通知项目组值班人员、不会定位，也不会派单，不能替代任何急救通道。',
    audioText:
      '紧急情况：请直接拨打 120 或 110。本页的紧急求助只是演示，不会通知任何人，也不能替代急救电话。',
  },
];

export const HelpCenterModal: React.FC = () => {
  const { setActiveSubPage, elderlyMode } = useApp();
  const [openId, setOpenId] = useState<string>('faq_1');
  const [readingId, setReadingId] = useState<string | null>(null);

  // 关闭时停止朗读，避免声音留在后台
  useEffect(() => () => sound.stopSpeaking(), []);

  const toggleRead = (item: FaqItem) => {
    if (readingId === item.id) {
      sound.stopSpeaking();
      setReadingId(null);
    } else {
      setReadingId(item.id);
      sound.speakText(item.audioText, () => setReadingId(null));
    }
  };

  return (
    <Modal
      title="帮助中心 · 适老操作教程"
      subtitle="支持人机语音朗读 · 大字排版 · 常见问题"
      onClose={() => {
        sound.stopSpeaking();
        setActiveSubPage(null);
      }}
      footer={
        <Button variant="ghost" block onClick={() => setActiveSubPage(null)}>
          关闭
        </Button>
      }
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { icon: HeartHandshake, title: '1. 一键求助', desc: '点加号发单，等待审核', tone: 'bg-brand-tint text-brand' },
            { icon: Coins, title: '2. 时间记账', desc: '双方确认后写入本机账本', tone: 'bg-warn-tint text-[#9a6a1f]' },
            { icon: ShieldCheck, title: '3. 实名前置', desc: '未实名不能发布求助', tone: 'bg-accent-tint text-accent' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[12px] bg-page px-3 py-3 text-center">
                <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full ${item.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="mt-1.5 text-[11.5px] font-semibold text-ink">{item.title}</p>
                <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{item.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-1 grid gap-2">
          <h3 className="text-[10px] font-semibold tracking-wide text-muted">常见使用疑问</h3>
          {FAQ_LIST.map((item) => {
            const isOpen = openId === item.id;
            const isReading = readingId === item.id;
            return (
              <div key={item.id} className="overflow-hidden rounded-[12px] border border-line bg-white">
                <div className="flex items-center gap-2 px-3.5 py-2.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    aria-expanded={isOpen}
                    onClick={() => {
                      sound.playTap();
                      setOpenId(isOpen ? '' : item.id);
                    }}
                  >
                    <span
                      className={`flex-1 ${elderlyMode ? 'text-[14px] font-semibold' : 'text-[12px] font-semibold'} text-ink`}
                    >
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleRead(item)}
                    className={`inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-full border px-2.5 text-[10px] font-medium ${
                      isReading
                        ? 'border-brand bg-brand text-white'
                        : 'border-line-strong text-text2 hover:border-brand hover:text-brand'
                    }`}
                    title="语音朗读该条解答"
                    aria-label={isReading ? `停止朗读：${item.question}` : `朗读：${item.question}`}
                  >
                    {isReading ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    {isReading ? '停止' : '朗读'}
                  </button>
                </div>

                {isOpen ? (
                  <div className="border-t border-line bg-page px-3.5 py-3">
                    <p
                      className={`leading-relaxed text-text2 ${
                        elderlyMode ? 'text-[14px] font-medium' : 'text-[11.5px]'
                      }`}
                    >
                      {item.answer}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-page px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <Phone className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-semibold text-ink">操作困难时，可先看图文教程</p>
              <p className="mt-0.5 text-[9.5px] text-muted">本演示不提供真实热线与值班时段</p>
            </div>
          </div>
          <span className="nl-tag nl-tag--neutral shrink-0">未提供</span>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[9.5px] text-muted">
          <HelpCircle className="h-3 w-3" aria-hidden="true" />
          社区服务演练项目组（虚构）编制
        </p>
      </div>
    </Modal>
  );
};
