import React from 'react';
import { Award, CheckCircle2, Download, Printer, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { dateStamp, downloadTextFile } from '../shared/download';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export const CertificateModal: React.FC = () => {
  const { currentUser, setActiveSubPage } = useApp();

  const certNo = `CN-VOL-2026-${currentUser.id.slice(-4).toUpperCase()}-8821`;
  const issueDate = '2026 年 10 月 22 日';

  const celebrate = (count: number) => {
    try {
      confetti({ particleCount: count, spread: 70, origin: { y: 0.6 } });
    } catch {
      // 无 canvas 环境时静默
    }
  };

  const handlePrint = () => {
    sound.playSuccess();
    celebrate(90);
    window.print();
  };

  /** 下载的证明文本：与版式同一套口径，明确标注合成数据、不具备真实证明效力。 */
  const certificateText = () =>
    [
      '社区志愿服务电子证明（本机合成演练）',
      '====================================',
      `证明编号：${certNo}（仅用于本机核对）`,
      `演练身份：${currentUser.name}`,
      `演练社区：${currentUser.community}`,
      `签发日期（演示）：${issueDate}`,
      '',
      `累计完成演练任务：${currentUser.completedTasks} 次`,
      `统计志愿时长：${currentUser.volunteerHours.toFixed(1)} 小时（未经任何机构审核或认证）`,
      '',
      '兹证明上述演练身份参与了「时间银行 · 银龄守护」本机合成演练。',
      '本人名称、服务次数与时长均为虚构演示数据，不构成任何真实的志愿服务记录或证明，',
      '不能用于学时认定、信用申报或任何真实用途。',
      '',
      '社区服务演练项目组（虚构） · 合成数据 · 非真实证明',
      `生成时间：${new Date().toLocaleString('zh-CN')}`,
    ].join('\n');

  const handleDownload = () => {
    try {
      downloadTextFile(
        `community-drill-certificate-${dateStamp()}.txt`,
        certificateText(),
        'text/plain;charset=utf-8',
      );
      sound.playSuccess();
      celebrate(70);
      toast('已请求下载演练证明文本；内容仅为本机合成数据，不具备真实证明效力。', 'success');
    } catch {
      toast('证明下载失败：浏览器拒绝了文件创建。可改用「打印 / 保存 PDF」保存。');
    }
  };

  return (
    <Modal
      title="社区志愿服务电子证明"
      subtitle="演练证明 · 合成数据 · 不具备真实证明效力"
      onClose={() => setActiveSubPage(null)}
      wide
      footer={
        <>
          <p className="nl-modal__foot-note">
            本证明仅为版式演示，不对接任何机构核验，也不能用于学时认定或信用申报。
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              打印 / 保存 PDF
            </Button>
            <Button variant="primary" size="sm" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              下载证书
            </Button>
          </div>
        </>
      }
    >
      <div
        className="relative rounded-[16px] border border-line-strong bg-white px-6 py-8 sm:px-10"
        style={{
          backgroundImage: 'radial-gradient(#f6e7d8 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <span className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l border-t border-brand/40" />
        <span className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r border-t border-brand/40" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b border-l border-brand/40" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b border-r border-brand/40" />

        <div className="text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-brand-tint text-brand">
            <Award className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-2 font-serif text-[24px] font-bold tracking-[0.18em] text-ink">
            志愿服务荣誉证书
          </h1>
          <p className="mt-1 font-mono text-[9px] tracking-[0.2em] text-muted">
            CERTIFICATE OF COMMUNITY VOLUNTEER SERVICE
          </p>
          <div className="mx-auto mt-3 h-px w-28 bg-line-strong" />
        </div>

        <div className="mt-5 grid gap-3 font-serif text-[12.5px] leading-[2] text-text">
          <p className="indent-8">
            兹证明{' '}
            <strong className="font-sans text-[15px] text-ink underline decoration-brand/50 underline-offset-4">
              {currentUser.name}
            </strong>{' '}
            参与了梧桐里（虚构）社区「时间银行 · 银龄守护」<strong>本机合成演练</strong>。本人名称、服务次数与时长均为虚构演示数据，
            不构成任何真实的志愿服务记录或证明。
          </p>
          <p className="indent-8">
            截至目前，该演练账号在本机记录中累计完成陪医、照护、修缮等演练任务{' '}
            <strong className="font-sans text-[14px] text-accent">{currentUser.completedTasks}</strong> 次；
            以下时长按本机演练规则统计，未经任何机构审核或认证：
          </p>

          <div className="py-1 text-center">
            <div className="inline-flex items-baseline gap-1.5 rounded-[12px] border border-line bg-page px-7 py-2.5">
              <span className="nl-num font-sans text-[30px] font-bold text-brand-ink">
                {currentUser.volunteerHours.toFixed(1)}
              </span>
              <span className="font-sans text-[11px] font-semibold text-brand-ink">标准志愿小时</span>
            </div>
          </div>

          <p className="indent-8 text-[11.5px] text-text2">
            特发此证，以资鼓励。志愿精神，德行流芳。
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-line pt-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-[10px] border border-line bg-white">
              <QrCode className="h-9 w-9 text-ink" aria-hidden="true" />
            </span>
            <div className="text-[9.5px] leading-relaxed text-muted">
              <p className="font-mono text-[10px] font-semibold text-text2">{certNo}</p>
              <p className="mt-0.5 flex items-center gap-1 text-accent">
                <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                演练编号，仅用于本机核对
              </p>
              <p>二维码仅作版式演示，不连接核验服务</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 sm:justify-end">
            <p className="text-right text-[9.5px] leading-relaxed text-muted">
              社区服务演练项目组（虚构）
              <br />
              合成数据 · 非真实证明
              <br />
              <span className="font-mono">{issueDate}</span>
            </p>
            <span
              className="grid h-16 w-16 -rotate-12 place-items-center rounded-full border border-danger/50 text-center text-[7px] font-bold leading-tight text-danger/75"
              aria-hidden="true"
            >
              演练项目组
              <br />
              仅用于版式演示
            </span>
          </div>
        </div>
      </div>

    </Modal>
  );
};
