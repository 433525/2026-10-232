import React, { useState } from 'react';
import { Check, Copy, QrCode, ShieldCheck, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { copyText } from '../shared/clipboard';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const CONTACT_ID = 'cuihu_care2026';

export const CommunityQrModal: React.FC = () => {
  const { setActiveSubPage } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    sound.playTap();
    const ok = await copyText(CONTACT_ID);
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      title="邻里互助演练群"
      subtitle="本图为版式演示，不对应任何真实群聊或工作人员"
      onClose={() => setActiveSubPage(null)}
      footer={
        <Button variant="ghost" block onClick={() => setActiveSubPage(null)}>
          关闭
        </Button>
      }
    >
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-tint text-brand">
          <QrCode className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-[15px] font-semibold text-ink">梧桐里（虚构）邻里互助演练群</h3>
        <p className="mt-1 text-[10.5px] text-muted">
          仅作版式演示 · 群码与值班微信均不对应真实渠道
        </p>

        <div className="mx-auto mt-4 w-full max-w-[280px] rounded-[18px] border border-line bg-page p-4">
          <div className="mx-auto grid h-[152px] w-[152px] place-items-center rounded-[12px] border border-line bg-white">
            <svg viewBox="0 0 11 11" width="128" height="128" aria-hidden="true">
              <rect width="11" height="11" fill="#fff" />
              {Array.from({ length: 121 }, (_, i) => {
                const row = Math.floor(i / 11);
                const col = i % 11;
                const finder = (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
                const noise = (row * 7 + col * 13 + row * col) % 5 < 2;
                return finder || noise ? (
                  <rect
                    key={i}
                    x={col}
                    y={row}
                    width="1"
                    height="1"
                    fill="#2a2320"
                  />
                ) : null;
              })}
            </svg>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1 text-[10px] font-medium text-accent">
            <Users className="h-3 w-3" aria-hidden="true" />
            演练成员与志愿者专属群（虚构）
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-[12px] bg-page px-3 py-2 text-left">
          <span className="text-[10.5px] text-text2">
            值班微信（虚构）：<strong className="text-ink">{CONTACT_ID}</strong>
          </span>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex min-h-[32px] items-center gap-1 text-[10.5px] font-semibold text-brand hover:text-brand-strong"
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-left text-[9.5px] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          若群二维码过期（微信 7 天有效机制），可添加值班微信拉入群；本演示不会真的建群。
        </p>
      </div>
    </Modal>
  );
};
