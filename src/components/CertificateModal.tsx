import React, { useRef } from 'react';
import { 
  Award, 
  Download, 
  Printer, 
  X, 
  QrCode, 
  CheckCircle, 
  Building
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';

export const CertificateModal: React.FC = () => {
  const { currentUser, setActiveSubPage } = useApp();
  const certRef = useRef<HTMLDivElement>(null);

  const certNo = `CN-VOL-2026-${currentUser.id.slice(-4).toUpperCase()}-8821`;
  const issueDate = '2026年10月22日';

  const handlePrint = () => {
    sound.playSuccess();
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      //
    }
    window.print();
  };

  const handleDownload = () => {
    sound.playSuccess();
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      //
    }
    toast('志愿服务电子证书已生成，可使用打印对话框保存为 PDF', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm sm:text-base">
              社区志愿服务电子证明规范查验
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs flex items-center gap-1 font-medium transition-colors"
              title="打印证书"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">打印/保存PDF</span>
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1 font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">下载证书</span>
            </button>
            <button
              onClick={() => {
                sound.playTap();
                setActiveSubPage(null);
              }}
              className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-amber-50/40">
          <div 
            ref={certRef}
            className="relative bg-white rounded-xl border-4 border-amber-600/30 p-6 sm:p-10 shadow-lg text-slate-800 space-y-6"
            style={{
              backgroundImage: 'radial-gradient(#fef3c7 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            {/* Corner Ornaments */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-600 pointer-events-none" />
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-600 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-600 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-600 pointer-events-none" />

            {/* Certificate Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-900 shadow-md mb-1">
                <Award className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-widest text-slate-900">
                志愿服务荣誉证书
              </h1>
              <p className="text-xs uppercase tracking-widest text-amber-800 font-semibold font-mono">
                CERTIFICATE OF COMMUNITY VOLUNTEER SERVICE
              </p>
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-2" />
            </div>

            {/* Certificate Body */}
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-700 font-serif pt-2">
              <p className="indent-8">
                兹证明 <strong className="text-slate-950 font-sans text-lg underline decoration-amber-500 underline-offset-4 font-bold">{currentUser.name}</strong> 同志（身份证号：<span className="font-mono text-slate-900">{currentUser.idCardMasked || '3201061994****6618'}</span>），热心践行邻里互助精神，积极参与翠湖花园社区“时间银行·银龄守护”志愿服务行动。
              </p>
              <p className="indent-8">
                截至目前，该同志已累计完成社区陪同就医、慢病照护、家务修缮等助老服务 <strong className="text-emerald-700 font-sans text-lg font-bold">{currentUser.completedTasks || 68}</strong> 次，经街道社区互助监督委员会审核认证，有效志愿服务时长累计达：
              </p>
              
              <div className="text-center py-2">
                <div className="inline-block px-8 py-3 bg-gradient-to-r from-amber-50 via-yellow-100 to-amber-50 rounded-xl border border-amber-300 shadow-xs">
                  <span className="text-3xl sm:text-4xl font-black font-sans text-amber-800 tracking-tight">
                    {currentUser.volunteerHours || 142.5}
                  </span>
                  <span className="text-sm font-bold text-amber-900 ml-1.5 font-sans">
                    标准志愿小时
                  </span>
                </div>
              </div>

              <p className="indent-8 text-xs sm:text-sm text-slate-600">
                特发此证，以资鼓励与表彰。志愿精神，德行流芳！
              </p>
            </div>

            {/* Certificate Footer with Seals & QR */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-amber-200/80">
              {/* QR Verification */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-center">
                  <QrCode className="w-14 h-14 text-slate-800" />
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div className="font-mono text-slate-800 font-bold">{certNo}</div>
                  <div className="flex items-center gap-1 text-emerald-700">
                    <CheckCircle className="w-3 h-3" />
                    <span>官方防伪编码已上链备案</span>
                  </div>
                  <div>扫码查验服务真伪与明细</div>
                </div>
              </div>

              {/* Official Seal Mock */}
              <div className="relative text-center sm:text-right">
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">翠湖花园社区志愿服务工作站</div>
                  <div className="font-bold text-slate-800">翠湖社区新时代文明实践站</div>
                  <div className="text-slate-500 font-mono">{issueDate}</div>
                </div>

                {/* Red Circular Stamp Graphic */}
                <div className="sm:absolute -top-3 -right-2 w-20 h-20 rounded-full border-2 border-red-600/80 text-red-600 flex flex-col items-center justify-center text-[8px] font-bold rotate-[-12deg] opacity-85 select-none pointer-events-none mx-auto mt-2 sm:mt-0 shadow-xs">
                  <div className="text-[7px]">★ 社区工作站 ★</div>
                  <div className="text-[9px] my-0.5">志愿服务审核专用</div>
                  <div className="text-[7px]">2026.10.22</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tip */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          <span>本电子证书符合《志愿服务条例》规范标准，可用于学生社会实践学时认定及个人信用积分申报。</span>
        </div>
      </div>
    </div>
  );
};
