import React, { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

/** 时间存折明细：只读流水，明确「未结算、不可兑现、不可转让」。 */
export const TimeLedgerPage: React.FC = () => {
  const { currentUser, timeLedger, setActiveSubPage } = useApp();

  const sorted = useMemo(
    () =>
      [...timeLedger].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [timeLedger],
  );

  const totalMinutes = sorted.reduce((sum, entry) => sum + entry.amount, 0);
  const unsettled = sorted.filter((entry) => entry.typeLabel.includes('未结算')).length;
  const mine = sorted.filter((entry) => entry.userId === currentUser.id);

  return (
    <Modal
      title="时间存折明细"
      subtitle="只读流水 · 本机演练数据 · 不产生真实结算"
      onClose={() => setActiveSubPage(null)}
      footer={
        <>
          <p className="nl-modal__foot-note">时间币不可兑现、不可转让，也不构成支付凭证。</p>
          <Button variant="ghost" size="sm" onClick={() => setActiveSubPage(null)}>
            关闭
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="nl-ledger-hero">
          <div className="nl-ledger-hero__row">
            <div>
              <p className="text-[10.5px] text-[var(--nl-accent-on-dark)]">当前可用时长</p>
              <p className="nl-ledger-hero__value">
                <span className="nl-num">{currentUser.timeCoins.toFixed(1)}</span>
                <span className="ml-1.5 font-sans text-[11px] font-normal text-[var(--nl-accent-on-dark)]">
                  小时
                </span>
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] text-white">
              未结算 {unsettled} 条
            </span>
          </div>
          <div className="nl-ledger-hero__stats">
            <span>累计记录 {mine.length} 条</span>
            <span>折合 {(totalMinutes / 60).toFixed(1)} 小时</span>
          </div>
        </div>

        {mine.length === 0 ? (
          <EmptyState
            title="还没有流水记录"
            hint="完成一次演练服务后，双方确认会在本机写入一条流水。"
          />
        ) : (
          <div className="nl-card nl-card--sm nl-timeline overflow-hidden">
            {mine.map((entry) => {
              const positive = entry.amount >= 0;
              return (
                <div key={entry.id} className="nl-timeline__row">
                  <span
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                      positive ? 'bg-accent-tint text-accent' : 'bg-sunken text-brand-ink'
                    }`}
                    aria-hidden="true"
                  >
                    {positive ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="nl-timeline__main">
                    <p className="nl-timeline__title">{entry.orderTitle}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10.5px] text-muted">{entry.description}</p>
                    <p className="nl-timeline__meta">
                      {entry.createdAt} · {entry.typeLabel} · 凭证 {entry.txHash.slice(0, 10)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`nl-timeline__amount ${positive ? '' : 'text-brand-ink'}`}>
                      {positive ? '+' : ''}
                      {(entry.amount / 60).toFixed(1)} 小时
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="nl-alert nl-alert--info">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            时间银行只做公益时长记账：<strong>不可兑现、不可转让、不可提现</strong>
            ，清理浏览器数据后本机流水不可恢复。
          </span>
        </div>
      </div>
    </Modal>
  );
};
