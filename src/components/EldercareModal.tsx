import React from 'react';
import { BookOpen, ChevronRight, Clock, Eye, Share2, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { copyText } from '../shared/clipboard';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

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
    elderlyMode,
  } = useApp();

  const article = eldercareArticles.find((item) => item.id === selectedArticleId) ?? eldercareArticles[0];
  const playing = isAudioPlaying && playingArticleId === article.id;

  const toggleAudio = () => {
    if (playing) stopArticleAudio();
    else playArticleAudio(article);
  };

  return (
    <Modal
      title="银龄康养科普"
      subtitle={`${article.categoryLabel} · 生活照护与居家安全常识`}
      onClose={() => {
        stopArticleAudio();
        setActiveSubPage(null);
      }}
      wide
      footer={
        <>
          <p className="nl-modal__foot-note">
            内容仅作生活照护常识科普，不构成临床诊断或用药处方建议。
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopArticleAudio();
              setActiveSubPage(null);
            }}
          >
            关闭
          </Button>
        </>
      }
    >
      <article className="grid gap-4">
        <header>
          <h1
            className={`font-serif font-bold leading-snug text-ink ${
              elderlyMode ? 'text-[24px]' : 'text-[21px]'
            }`}
          >
            {article.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {article.publishedAt}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" aria-hidden="true" />
              {article.views} 次学习
            </span>
            <span>来源：{article.author}</span>
          </div>
        </header>

        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-page px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={toggleAudio}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-colors ${
                playing ? 'bg-brand' : 'bg-accent'
              }`}
              aria-label={playing ? '停止朗读' : '开始语音朗读'}
            >
              {playing ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11.5px] font-semibold text-ink">
                {playing ? '正在语音朗读正文…' : '点击收听语音朗读（适老化）'}
              </p>
              <p className="mt-0.5 text-[9.5px] text-muted">语速已为长者优化 · 含核心要点与注意事项</p>
            </div>
          </div>
          <button
            type="button"
            className="nl-iconbtn shrink-0"
            title="分享文章"
            aria-label="复制文章链接"
            onClick={async () => {
              sound.playTap();
              const ok = await copyText(window.location.href);
              toast(ok ? '文章链接已复制，可分享至邻里群' : '复制失败，请手动复制地址栏', ok ? 'success' : 'error');
            }}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          className={`grid gap-2.5 leading-[1.9] text-text ${
            elderlyMode ? 'text-[15px] font-medium' : 'text-[12.5px]'
          }`}
        >
          {article.content.map((paragraph, index) => {
            const warm = paragraph.startsWith('【温馨提示】');
            const keyPoint =
              paragraph.startsWith('一要') ||
              paragraph.startsWith('二要') ||
              paragraph.startsWith('三要') ||
              paragraph.startsWith('四不要');
            return (
              <p
                key={index}
                className={
                  warm
                    ? 'rounded-[10px] border border-line bg-warn-tint px-3 py-2.5 font-semibold text-[#6f5327]'
                    : keyPoint
                      ? 'rounded-r-[8px] border-l-2 border-brand bg-page py-1.5 pl-3'
                      : ''
                }
              >
                {paragraph}
              </p>
            );
          })}
        </div>

        <section className="border-t border-line pt-3">
          <h4 className="mb-2 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted">
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            更多养老科普
          </h4>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {eldercareArticles
              .filter((item) => item.id !== article.id)
              .map((other) => (
                <button
                  key={other.id}
                  type="button"
                  className="flex items-center justify-between gap-2 rounded-[10px] border border-line bg-white px-3 py-2 text-left transition-colors hover:border-line-strong"
                  onClick={() => {
                    stopArticleAudio();
                    sound.playTap();
                    setSelectedArticleId(other.id);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-semibold text-ink">{other.title}</span>
                    <span className="mt-0.5 block text-[9.5px] text-muted">
                      {other.categoryLabel} · {other.views} 次阅读
                    </span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
                </button>
              ))}
          </div>
        </section>

        <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          本板块内容仅为生活照护与居家安全常识科普，不构成临床医疗诊断或用药处方建议。
        </p>
      </article>
    </Modal>
  );
};
