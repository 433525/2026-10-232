import React from 'react';
import { useApp } from '../context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

/** 时间银行规则：首页公告「查看规则」与「我的」菜单共用同一个弹层。 */
export const TimeBankRulesModal: React.FC = () => {
  const { setActiveSubPage } = useApp();

  return (
    <Modal
      title="时间银行 · 互助规则"
      subtitle="演练口径，不对应任何真实机构"
      onClose={() => setActiveSubPage(null)}
      footer={
        <Button variant="ghost" block onClick={() => setActiveSubPage(null)}>
          知道了
        </Button>
      }
    >
      <div className="grid gap-3 text-[12px] leading-[1.9] text-text">
        <p>
          <strong>1. 纯公益储蓄原则：</strong>
          时间币遵循「低龄存时间、高龄换服务」原则，严禁买卖、套现或转作商业用途。
        </p>
        <p>
          <strong>2. 时长换算：</strong>
          标准互助服务 1 小时记 1 个时间币；不足 1 小时按服务类型阶梯核定。
        </p>
        <p>
          <strong>3. 存证与结算：</strong>
          服务完成后由长者/家属与志愿者双方在线确认，系统生成本机账本流水号。
        </p>
        <p>
          <strong>4. 调解与仲裁：</strong>
          本原型没有真实申诉渠道。演练中的争议可在详情页提交「演示投诉」，只写本机记录，
          不会提交给任何机构，也不会有外部回复。
        </p>
        <div className="nl-alert nl-alert--warn">
          <span>
            <strong>演示边界：</strong>
            时间币只在本机记账，不可兑现、不可转让、不可提现，也不构成任何支付或预付凭证。
          </span>
        </div>
      </div>
    </Modal>
  );
};
