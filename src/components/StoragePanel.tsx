import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  HardDrive,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import type { CommunityStorageStatus } from '../data/community/types';

/**
 * 本机存档与恢复（§7 存储契约的可达入口）。
 *
 * 为什么单独成组件：232 原实现把 `storageStatus` / `unreadableStoredData` 留在 store 里，
 * 界面从不读取——存档损坏时所有写入被静默拦下，用户既看不到原因也没有恢复路径。
 * 这里只做「状态投影 + 四个已存在的 store 动作」，不新增业务存档键，也不改领域层。
 */

const STATUS_META: Record<CommunityStorageStatus, {
  label: string;
  tone: 'ok' | 'warn' | 'danger';
  description: string;
}> = {
  ready: {
    label: '尚未写入（初始演练数据）',
    tone: 'ok',
    description: '当前显示的是初始合成数据；第一次操作后才会写入本机存档。',
  },
  saved: {
    label: '已保存在本机',
    tone: 'ok',
    description: '改动已写入当前浏览器的 localStorage，刷新后仍在。',
  },
  'memory-only': {
    label: '仅保存在本页内存',
    tone: 'warn',
    description: '浏览器拒绝写入本机存储（隐私模式或站点存储被禁用），刷新后改动会丢失。',
  },
  'save-error': {
    label: '写入失败',
    tone: 'danger',
    description: '写入本机存储时出错（常见原因是配额已满）。建议先导出备份，再清理浏览器存储后重试。',
  },
  'recovery-required': {
    label: '存档无法读取',
    tone: 'danger',
    description: '存档解析失败，已改用初始合成数据；为避免覆盖原文，所有写入都会被拦下。',
  },
  conflict: {
    label: '另一个标签页改写过存档',
    tone: 'warn',
    description: '为避免覆盖对方的改动，本页的写入已暂停。载入最新存档会覆盖本页未保存的内容，请确认后再操作。',
  },
};

const TONE_CLASS: Record<'ok' | 'warn' | 'danger', { box: string; badge: string; icon: string }> = {
  ok: {
    box: 'border-emerald-200 bg-emerald-50/70',
    badge: 'bg-emerald-600 text-white',
    icon: 'text-emerald-700',
  },
  warn: {
    box: 'border-amber-200 bg-amber-50/70',
    badge: 'bg-amber-500 text-white',
    icon: 'text-amber-700',
  },
  danger: {
    box: 'border-rose-200 bg-rose-50/70',
    badge: 'bg-rose-600 text-white',
    icon: 'text-rose-700',
  },
};

const TONE_ICON = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  danger: ShieldAlert,
} as const;

export const StoragePanel: React.FC = () => {
  const {
    storageStatus,
    storageError,
    lastSavedAt,
    hasUnreadableArchive,
    unreadableArchiveExported,
    exportBackup,
    exportUnreadableArchive,
    reloadArchive,
    resetDemoData,
    importBackupFile,
  } = useApp();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const meta = STATUS_META[storageStatus];
  const tone = TONE_CLASS[meta.tone];
  const StatusIcon = TONE_ICON[meta.tone];
  const recoveryBlocked = storageStatus === 'recovery-required' && !unreadableArchiveExported;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center ${tone.box} border`}>
            <StatusIcon className={`w-5 h-5 ${tone.icon}`} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">存档与恢复（本机演练）</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tone.badge}`}>
                {meta.label}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{meta.description}</p>
            {storageError ? (
              <p className="text-[11px] text-slate-500 leading-relaxed break-words">
                底层说明：{storageError}
              </p>
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
            <dt className="text-slate-500 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" /> 存档键
            </dt>
            <dd className="text-slate-800 font-mono break-all">community-mvp.synthetic-state.v1</dd>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
            <dt className="text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 最后保存
            </dt>
            <dd className="text-slate-800">
              {lastSavedAt ? new Date(lastSavedAt).toLocaleString('zh-CN') : '本次会话尚未写入'}
            </dd>
          </div>
        </dl>
      </div>

      {hasUnreadableArchive ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 space-y-2.5" role="alert">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-900">
            <ShieldAlert className="w-4 h-4" /> 旧存档原文仍在浏览器里，重置前请先取回
          </div>
          <p className="text-xs text-rose-900/90 leading-relaxed">
            这份原文无法被本演练解析，但可能包含你之前录入的内容。重置会直接覆盖它且无法恢复，
            所以必须先下载一份原文；下载完成前「恢复初始演练数据」保持禁用。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                exportUnreadableArchive();
              }}
              className="min-h-[44px] px-3.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> 下载旧存档原文（.txt）
            </button>
            <span className={`text-[11px] font-bold ${unreadableArchiveExported ? 'text-emerald-700' : 'text-rose-800'}`}>
              {unreadableArchiveExported ? '已请求下载：确认文件在下载目录后即可重置' : '尚未下载：重置按钮不可用'}
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            exportBackup();
          }}
          className="min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center justify-center gap-1.5 px-3"
        >
          <Download className="w-4 h-4 text-slate-600" /> 导出当前备份 JSON
        </button>

        {/* 导入：文件选择交给隐藏 input，解析与覆盖确认都在 AppContext（组件不碰领域逻辑） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          data-storage-import=""
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void importBackupFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            fileInputRef.current?.click();
          }}
          className="min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center justify-center gap-1.5 px-3"
        >
          <Upload className="w-4 h-4 text-slate-600" /> 导入备份 JSON
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playTap();
            reloadArchive();
          }}
          className="min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center justify-center gap-1.5 px-3"
        >
          <RefreshCw className="w-4 h-4 text-slate-600" /> 载入最新本机存档
        </button>

        <button
          type="button"
          disabled={recoveryBlocked}
          title={recoveryBlocked ? '请先下载旧存档原文，再重置演练数据' : undefined}
          onClick={() => {
            sound.playTap();
            resetDemoData();
          }}
          className={`min-h-[44px] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 px-3 border ${
            recoveryBlocked
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> 恢复初始演练数据
        </button>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        存档只存在于当前浏览器，换浏览器、换设备或清除站点数据都会消失；本演练没有云端同步、没有自动备份。
        导出的 JSON 与原文都只在本机生成，不会上传。导入会先显示备份内条数并二次确认，
        确认后才覆盖本机存档；文件上限 5 MB，内容上限 100 万字符（与运行期存档一致）。
      </p>
    </div>
  );
};
