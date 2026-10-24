import React from 'react';
import { AlertTriangle, Download, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

/**
 * 存档异常时的常驻提示条。
 *
 * 只在 `ready` / `saved` 以外的状态出现：此时用户的操作可能随时被拦下，
 * 提示必须出现在主内容区顶部，而不是藏在「管理入口」的三级页面里。
 * 动作全部调用 AppContext 的同一组实现，与「存档与恢复」面板共享守卫与确认逻辑。
 */
export const StorageBanner: React.FC = () => {
  const {
    storageStatus,
    hasUnreadableArchive,
    unreadableArchiveExported,
    exportBackup,
    exportUnreadableArchive,
    reloadArchive,
    resetDemoData,
  } = useApp();

  if (storageStatus === 'ready' || storageStatus === 'saved') return null;

  const danger = storageStatus === 'recovery-required' || storageStatus === 'save-error';
  const recoveryBlocked = storageStatus === 'recovery-required' && !unreadableArchiveExported;

  const message: Record<Exclude<typeof storageStatus, 'ready' | 'saved'>, { title: string; body: string }> = {
    'memory-only': {
      title: '存档只在本次会话有效',
      body: '浏览器拒绝写入本机存储（多为隐私模式），刷新后改动会丢失。可先导出备份。',
    },
    'save-error': {
      title: '存档写入失败',
      body: '本机存储写入出错（常见原因是配额已满）。请先导出备份，再清理浏览器存储后重试。',
    },
    'recovery-required': {
      title: '存档无法读取，写入已暂停',
      body: '为避免覆盖旧存档原文，发布、接单、审核等写入都会被拦下。请先下载原文，再决定是否重置。',
    },
    conflict: {
      title: '另一个标签页改写了存档',
      body: '为避免覆盖对方的改动，本页的写入已暂停。载入最新存档会覆盖本页未保存的内容。',
    },
  };

  const text = message[storageStatus as Exclude<typeof storageStatus, 'ready' | 'saved'>];

  return (
    <div
      role={danger ? 'alert' : 'status'}
      className={`mb-3 rounded-xl border px-3 py-2.5 text-xs ${
        danger ? 'border-rose-300 bg-rose-50 text-rose-950' : 'border-amber-300 bg-amber-50 text-amber-950'
      }`}
    >
      <div className="flex items-start gap-2">
        {danger ? (
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-700" />
        ) : (
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
        )}
        <div className="flex-1 space-y-1">
          <p className="font-bold">{text.title}</p>
          <p className="leading-relaxed opacity-90">{text.body}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {storageStatus === 'recovery-required' && hasUnreadableArchive ? (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  exportUnreadableArchive();
                }}
                className="min-h-[44px] px-3 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {unreadableArchiveExported ? '再下载一次原文' : '下载旧存档原文'}
              </button>
            ) : null}

            {storageStatus === 'conflict' ? (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  reloadArchive();
                }}
                className="min-h-[44px] px-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 载入最新存档
              </button>
            ) : null}

            {storageStatus === 'recovery-required' || storageStatus === 'save-error' ? (
              <button
                type="button"
                disabled={recoveryBlocked}
                title={recoveryBlocked ? '请先下载旧存档原文' : undefined}
                onClick={() => {
                  sound.playTap();
                  resetDemoData();
                }}
                className={`min-h-[44px] px-3 rounded-lg font-bold inline-flex items-center gap-1.5 border ${
                  recoveryBlocked
                    ? 'bg-white/60 text-rose-300 border-rose-200 cursor-not-allowed'
                    : 'bg-white text-rose-900 border-rose-300 hover:bg-rose-100'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" /> 恢复初始演练数据
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                sound.playTap();
                exportBackup();
              }}
              className="min-h-[44px] px-3 rounded-lg bg-white/70 hover:bg-white border border-current/20 font-bold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> 导出当前备份
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
