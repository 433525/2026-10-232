import React from 'react';
import { 
  HeartPulse, 
  Volume2, 
  VolumeX, 
  X, 
  Clock, 
  Eye, 
  ShieldCheck, 
  Share2, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';

export const EldercareModal: React.FC = () => {
  const { 
    eldercareArticles, 
    selectedArticleId, 
    setSelectedArticleId, 
    setActiveSubPage, 
    playingArticleId, 
    isAudioPlaying, 
    playArticleAudio, 
    stopArticleAudio,
    elderlyMode 
  } = useApp();

  const article = eldercareArticles.find(a => a.id === selectedArticleId) || eldercareArticles[0];

  const handleToggleAudio = () => {
    if (isAudioPlaying && playingArticleId === article.id) {
      stopArticleAudio();
    } else {
      playArticleAudio(article);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-sky-700 via-blue-800 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base">
                银龄康养科普 · 权威常识
              </span>
              <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-200 border border-sky-400/40">
                {article.categoryLabel}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              stopArticleAudio();
              sound.playTap();
              setActiveSubPage(null);
            }}
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Article Title & Meta */}
          <div className="space-y-2 border-b border-slate-100 pb-3">
            <h1 className={`font-bold text-slate-900 leading-snug ${elderlyMode ? 'text-2xl' : 'text-xl'}`}>
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {article.publishedAt}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                {article.views} 次学习
              </span>
              <span className="text-slate-600 font-medium">
                来源：{article.author}
              </span>
            </div>
          </div>

          {/* Voice Reader Audio Player Bar */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={handleToggleAudio}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-md shrink-0 ${
                  isAudioPlaying && playingArticleId === article.id 
                    ? 'bg-amber-500 animate-pulse ring-4 ring-amber-200' 
                    : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {isAudioPlaying && playingArticleId === article.id ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  {isAudioPlaying && playingArticleId === article.id ? '正在语音朗读正文…' : '点击收听真人语音朗读（适老化）'}
                </p>
                <p className="text-[11px] text-slate-500">
                  语速已专为长者优化 · 包含核心要点与注意事项
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                sound.playTap();
                navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
                toast('文章链接已复制，可直接分享至微信邻里群', 'success');
              }}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
              title="分享文章"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Paragraphs */}
          <div className={`space-y-3.5 leading-relaxed text-slate-700 ${elderlyMode ? 'text-lg font-medium' : 'text-sm sm:text-base'}`}>
            {article.content.map((p, idx) => (
              <p 
                key={idx} 
                className={`p-2.5 rounded-lg ${
                  p.startsWith('【温馨提示】') 
                    ? 'bg-amber-50 border border-amber-200 text-amber-900 font-bold' 
                    : p.startsWith('一要') || p.startsWith('二要') || p.startsWith('三要') || p.startsWith('四不要')
                    ? 'bg-slate-50 border-l-4 border-sky-500 pl-3'
                    : ''
                }`}
              >
                {p}
              </p>
            ))}
          </div>

          {/* Other Recommended Articles */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              更多养老科普指南
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eldercareArticles.filter(a => a.id !== article.id).map(other => (
                <button
                  key={other.id}
                  onClick={() => {
                    stopArticleAudio();
                    sound.playTap();
                    setSelectedArticleId(other.id);
                  }}
                  className="p-2.5 text-left rounded-lg bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 transition-all flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {other.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {other.categoryLabel} · {other.views}次阅读
                    </p>
                  </div>
                  <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>合规声明：本板块内容仅为生活照护与居家安全常识科普，不构成临床医疗诊断或用药处方建议。</span>
        </div>
      </div>
    </div>
  );
};
