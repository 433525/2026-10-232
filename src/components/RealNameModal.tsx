import React, { useState } from 'react';
import { AlertTriangle, Info, Lock, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

/**
 * 演练实名：不接收、不校验、不保存任何身份证号，只切换本机身份档位。
 */
export const RealNameModal: React.FC = () => {
  const { verifyRealName, setActiveSubPage } = useApp();
  const [hasAgreed, setHasAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasAgreed) {
      setErrorMsg('请先确认你已了解本演练的实名口径');
      return;
    }
    verifyRealName('', '');
  };

  return (
    <Modal
      title="演练实名（不采集身份证号）"
      subtitle="只切换本机身份档位，不代表任何机构完成核验"
      onClose={() => setActiveSubPage(null)}
      footer={
        <>
          <Button variant="ghost" onClick={() => setActiveSubPage(null)}>
            稍后再说
          </Button>
          <Button type="submit" form="realname-form" variant="primary">
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            切换为演练成员（已实名）
          </Button>
        </>
      }
    >
      <form id="realname-form" className="grid gap-3" onSubmit={submit}>
        <div className="nl-alert nl-alert--warn">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            当前是纯前端合成演练：没有后端、没有短信、没有加密存储，因此不会采集身份证号、手机号或门牌号。
            点下面的按钮只是把本机身份从「访客」切换到「演练成员」。
          </span>
        </div>

        <div className="nl-card nl-card--sm grid gap-2 px-4 py-3 text-[10.5px] leading-relaxed text-text2">
          <p className="flex items-start gap-1.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            真实环境：手机号验证码 + 社区人工核验；如确需身份证号，须单独同意、加密存储、最小化展示并留存访问审计。
          </p>
          <p className="flex items-start gap-1.5">
            <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            本演练可验证的部分：未实名（访客）无法发布求助订单，会被拦在提交之前。
          </p>
        </div>

        <div>
          <span className="nl-label">身份信息采集</span>
          <div className="rounded-[12px] border border-dashed border-line-strong bg-page px-3 py-2.5 text-[11px] text-muted">
            本演练不提供身份证号输入框（避免演示环境出现真实格式证件号）
          </div>
        </div>

        <label className="nl-consent">
          <input
            type="checkbox"
            checked={hasAgreed}
            onChange={(event) => {
              setHasAgreed(event.target.checked);
              if (event.target.checked) setErrorMsg('');
            }}
          />
          <span>
            我了解：本演练不采集真实身份信息；切换后的「已实名」状态只保存在本机浏览器，不代表任何机构完成过核验。
          </span>
        </label>

        {errorMsg ? (
          <p role="alert" className="flex items-center gap-1 text-[11px] font-medium text-danger">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {errorMsg}
          </p>
        ) : null}
      </form>
    </Modal>
  );
};
