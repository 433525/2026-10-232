import React, { useState } from 'react';
import { FileText, HeartHandshake, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';

export const TermsModal: React.FC = () => {
  const { setActiveSubPage } = useApp();
  const [tab, setTab] = useState<'terms' | 'privacy' | 'elderly'>('terms');

  return (
    <Modal
      title="社区服务合规协议与隐私政策"
      subtitle="演练环境 · 不具备真实法律效力"
      onClose={() => setActiveSubPage(null)}
      footer={
        <>
          <p className="nl-modal__foot-note">继续使用即表示你理解本页的演练边界。</p>
          <Button variant="primary" onClick={() => setActiveSubPage(null)}>
            我已知晓并同意
          </Button>
        </>
      }
    >
      <Segmented
        label="协议类型"
        value={tab}
        onChange={(key) => {
          sound.playTap();
          setTab(key as typeof tab);
        }}
        items={[
          { key: 'terms', label: '用户服务协议' },
          { key: 'privacy', label: '隐私保护政策' },
          { key: 'elderly', label: '互助公约与免责' },
        ]}
      />

      <div className="mt-4 grid gap-3 text-[12px] leading-[1.9] text-text">
        {tab === 'terms' ? (
          <>
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <FileText className="h-4 w-4 text-brand" aria-hidden="true" />
              梧桐里（虚构）社区服务演练 使用说明
            </h3>
            <p className="text-[10px] text-muted">版本生效日期：2026 年 10 月 18 日</p>
            <p>
              <strong>1. 主体与服务定位：</strong>
              本项目是课程/校内演练原型，由项目组维护。它<strong>未获得任何社区、街道或机构的授权</strong>
              ，不代表任何官方主体，也不提供真实服务；页面内的社区名称、居民与志愿者均为虚构。
            </p>
            <p>
              <strong>2. 纯公益免费属性：</strong>
              所有助老求助、接单与时间币流转均属纯公益行为，严禁以平台名义变相收费、非法集资或中介牟利。
            </p>
            <p>
              <strong>3. 内容管理与先审后发：</strong>
              求助订单、风采动态与评论均须经敏感词检测与人工复核后方可公开。
            </p>
          </>
        ) : null}

        {tab === 'privacy' ? (
          <>
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <Lock className="h-4 w-4 text-accent" aria-hidden="true" />
              敏感个人信息保护与脱敏规则
            </h3>
            <p>
              <strong>1. 最小必要原则：</strong>
              演练环境不采集手机号、身份证号与门牌号；页面不出现任何真实联系方式。
            </p>
            <p>
              <strong>2. 住址脱敏分级：</strong>
              公开展示只到社区一级；具体单元与房间号在真实环境需单独授权、限时可见。
            </p>
            <p>
              <strong>3. 健康信息：</strong>
              病史与照护禁忌属敏感个人信息，需本人或家属单独勾选同意，且只在认领后向志愿者展示。
            </p>
          </>
        ) : null}

        {tab === 'elderly' ? (
          <>
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <HeartHandshake className="h-4 w-4 text-brand" aria-hidden="true" />
              邻里互助公约与急救免责声明
            </h3>
            <p>
              <strong>1. 友善守信：</strong>
              志愿者接单后应准时履约，如遇特殊情况需提前在订单内留言告知；求助方应如实说明需求。
            </p>
            <p>
              <strong>2. 紧急险情：</strong>
              本平台不是 120 急救专线。遇急性疾病、跌倒骨折昏迷等险情，请立即拨打 120/110。
            </p>
            <p>
              <strong>3. 纠纷处理：</strong>
              本原型没有真实仲裁能力，争议只写入本机演练记录，不构成调解、裁决或信誉处置。
            </p>
          </>
        ) : null}
      </div>
    </Modal>
  );
};
