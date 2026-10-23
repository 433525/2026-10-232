/**
 * 内容安全前置校验（先审后发机制的第一道闸门）。
 *
 * 对应《开发步骤与雷点》R7 / R19：无内容审核机制 → 违法、侵权、诈骗信息传播，
 * 平台承担处置不力责任。真实系统需接内容安全 API + 人工复核队列；
 * 本原型实现本地词表拦截 + 分级建议文案，接口形态与线上保持一致，便于替换。
 */

export type ModerationSeverity = 'pass' | 'warn' | 'block';

export interface ModerationResult {
  ok: boolean;
  severity: ModerationSeverity;
  hits: string[];
  /** 给用户看的整改建议（中文，说明为什么被拦、怎么改） */
  advice: string;
}

/** 直接阻断：涉政涉暴、黄赌毒、诈骗、违禁品 */
const BLOCK_WORDS = [
  '诈骗', '传销', '赌博', '博彩', '套现', '洗钱', '枪支', '弹药', '毒品', '色情',
  '嫖娼', '办卡套现', '代开发票', '刷单', '博彩网站', '爆炸物', '管制刀具',
];

/** 需要提醒核实：医疗诊疗建议、药品转售、现金交易、站外导流、冒用名义 */
const WARN_WORDS = [
  '包治', '根治', '药到病除', '祖传秘方', '上门打针', '代开药', '处方药转让',
  '私聊加微信', '线下现金', '付费服务', '收费帮', '有偿代', '代刷时长', '转让时长',
  '社区官方名义', '街道授权', '身份证号', '银行卡号',
];

export function moderateContent(...texts: Array<string | undefined>): ModerationResult {
  const combined = texts.filter(Boolean).join(' ');

  const blocked = BLOCK_WORDS.filter((w) => combined.includes(w));
  if (blocked.length > 0) {
    return {
      ok: false,
      severity: 'block',
      hits: blocked,
      advice: `内容命中违规词「${blocked.join('、')}」，依据社区互助公约已拦截发布。请删除相关内容后重试；如涉及诈骗或违法线索，请立即拨打 110。`,
    };
  }

  const warned = WARN_WORDS.filter((w) => combined.includes(w));
  if (warned.length > 0) {
    return {
      ok: true,
      severity: 'warn',
      hits: warned,
      advice: `内容含需核实表述「${warned.join('、')}」。时间银行严禁时长买卖与现金交易，医疗与用药建议请注明「不构成医疗建议」，发布后将进入人工复核队列。`,
    };
  }

  return {
    ok: true,
    severity: 'pass',
    hits: [],
    advice: '内容已通过本地敏感词与风险项预检。',
  };
}

/** 基础长度与空值校验，返回中文错误提示（为空表示通过） */
export function validateRequired(value: string, label: string, min = 1): string {
  const trimmed = value.trim();
  if (trimmed.length < min) return `请填写${label}（至少 ${min} 个字）`;
  return '';
}
