import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

/**
 * 页脚（轻量版，对齐设计稿）。
 *
 * 设计稿的页脚只有一行 10px 说明。这个项目必须保留合规披露，
 * 所以拆成三层：一行主披露 → 协议与备案 → 可展开的「合规与边界说明」。
 * 折叠不等于删除：正文仍在 DOM 里，读屏与检索都能拿到。
 */
export const FooterCompliance: React.FC = () => {
  const { setActiveSubPage } = useApp();

  const openTerms = () => {
    sound.playTap();
    setActiveSubPage('terms_modal');
  };

  return (
    <footer className="nl-footer">
      <div className="nl-container nl-footer__inner">
        <p className="nl-footer__line">
          本页为社区互助演练数据，不含真实居民信息，联系方式均已脱敏。
        </p>

        <div className="nl-footer__meta">
          <button type="button" onClick={openTerms} className="nl-footer__link">
            用户服务协议
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={openTerms} className="nl-footer__link">
            隐私保护政策
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={openTerms} className="nl-footer__link">
            互助公约与免责声明
          </button>
          <span aria-hidden="true">·</span>
          <span>ICP 备案未办理（演示环境）</span>
        </div>

        <details className="nl-footer__more">
          <summary>
            合规与边界说明
            <ChevronDown className="nl-footer__chev" aria-hidden="true" />
          </summary>
          <div className="nl-footer__more-body">
            <p>
              <strong>急救特别提示：</strong>
              本平台是邻里互助与时间银行的信息交互演练，不是医疗急救或专业抢险通道，也没有 24
              小时值守。如遇急性心脑血管险情、跌倒重伤、燃气火情等生命危急事件，请务必立即拨打
              120 急救、119 消防或 110 报警。
            </p>
            <p>
              <strong>演示边界：</strong>
              未办理 ICP 备案与公安联网备案；未接入短信验证码、对象存储与图片上传、真实定位、支付、WebSocket
              实时消息与多账号体系；不采集身份证号、手机号、门牌号。演示数据全部为合成虚构内容，刷新与「恢复演示数据」都会改变本机状态。
            </p>
            <p className="nl-footer__facts">
              公益免费 · 0 抽成 · 无支付能力 ／ 先审后发 · 举报可达 · 操作留痕 ／ 按 WCAG 2.2 AA
              目标设计（未做第三方认证）
            </p>
          </div>
        </details>
      </div>
    </footer>
  );
};
