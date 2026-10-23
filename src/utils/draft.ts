/**
 * 发布草稿本机暂存（借鉴 community-service-mvp `community-mvp.publish-draft.v1`）。
 *
 * 约定（与参考实现一致）：
 * - 草稿只暂存输入内容，不暂存「敏感信息授权」等合规勾选；
 *   提交前必须由用户亲自重新勾选，避免把同意当成可恢复状态。
 * - 草稿是独立的 UI 数据，不写入业务存档；提交成功后即清除。
 */
import { safeRead, safeWrite, isObject } from './storage';

const DRAFT_KEY = 'cuihu.publish-draft.v1';

export interface PublishDraft {
  mode: number;
  helpTitle: string;
  helpCategory: string;
  helpDesc: string;
  helpLocationArea: string;
  helpLocationDetail: string;
  helpDate: string;
  helpTime: string;
  helpDuration: number;
  helpMedicalNotes: string;
  isUrgent: boolean;
  postTitle: string;
  postContent: string;
  postCategory: string;
  savedAt: string;
}

export function loadDraft(): PublishDraft | null {
  const draft = safeRead<Partial<PublishDraft> | null>(DRAFT_KEY, null, isObject);
  if (!draft || typeof draft.savedAt !== 'string') return null;
  return draft as PublishDraft;
}

export function saveDraft(draft: Omit<PublishDraft, 'savedAt'>): void {
  safeWrite(DRAFT_KEY, { ...draft, savedAt: new Date().toISOString() });
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 隐私模式下忽略
  }
}
