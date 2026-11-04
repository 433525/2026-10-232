import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPin, PhoneCall, Radio, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

/**
 * 紧急求助（非急救通道）。
 * 120 / 110 只做文字提示，不做 tel: 链接；本机按钮不得暗示已报警或已通知任何人。
 */
export const SosModal: React.FC = () => {
  const { currentUser, setActiveSubPage, elderlyMode } = useApp();
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const record = () => {
    sound.playSosAlert();
    setCountdown(3);
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          window.clearInterval(timer);
          setSent(true);
          sound.playSuccess();
          return null;
        }
        return prev - 1;
      });
    }, 900);
  };

  return (
    <Modal
      title="紧急求助（非急救通道）"
      subtitle="生命危急请直接拨打 120 / 110；本平台不提供急救调度，也没有 24 小时值守"
      onClose={() => setActiveSubPage(null)}
      sheet
      footer={
        sent ? (
          <Button variant="ghost" block onClick={() => setActiveSubPage(null)}>
            关闭
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setActiveSubPage(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={record} disabled={countdown !== null}>
              <Radio className={`h-4 w-4 ${countdown !== null ? 'animate-pulse' : ''}`} aria-hidden="true" />
              {countdown !== null ? `界面演练中… ${countdown}s` : '演练一次求助流程（不写记录）'}
            </Button>
          </>
        )
      }
    >
      <div className="grid gap-3">
        <div className="flex items-start gap-3 rounded-[12px] bg-danger-tint px-3.5 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-danger-ink">
              这不是报警按钮，也不会派单
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-danger-ink/85">
              下面的按钮只做界面演练：不写入本机存档，也不产生任何事件记录。真实的紧急情况，
              请立即用手机拨打 120、119 或 110，并联系能马上到场的家人邻居。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[12px] border border-danger bg-white px-3 py-3 text-center">
            <PhoneCall className="mx-auto h-4 w-4 text-danger" aria-hidden="true" />
            <p className="mt-1 text-[10px] text-muted">医疗急救</p>
            <p className="text-[13px] font-semibold text-danger-ink">请手动拨打 120</p>
          </div>
          <div className="rounded-[12px] border border-line-strong bg-white px-3 py-3 text-center">
            <ShieldAlert className="mx-auto h-4 w-4 text-ink" aria-hidden="true" />
            <p className="mt-1 text-[10px] text-muted">公安报警</p>
            <p className="text-[13px] font-semibold text-ink">请手动拨打 110</p>
          </div>
        </div>

        <div className="rounded-[12px] bg-page px-3.5 py-3 text-[11px] text-text2">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <MapPin className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
            求助小区：{currentUser.community}
          </p>
          <p className="mt-1 pl-5">身份：{currentUser.roleLabel}</p>
          <p className="mt-1 pl-5 text-[10px] text-muted">
            演练不采集门牌号、手机号与实时定位；真实环境需单独授权后限时可见。
          </p>
        </div>

        {sent ? (
          <div className="rounded-[12px] bg-accent-tint px-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-accent" aria-hidden="true" />
            <p className="mt-1.5 text-[12.5px] font-semibold text-accent">界面演练完成（未写入任何记录）</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#174f42]">
              未报警、未通知任何人、未派单，也未在本机保存数据。真实险情请立即拨打 120 或 110。
            </p>
          </div>
        ) : (
          <p className={`text-[11px] leading-relaxed text-muted ${elderlyMode ? 'text-[12.5px]' : ''}`}>
            免责声明：社区互助是邻里自愿帮扶，不是急救或专业抢险通道。遇突发心梗、中风、火灾等危及人身安全的险情，
            请务必首选 120 / 119 / 110。
          </p>
        )}
      </div>
    </Modal>
  );
};
