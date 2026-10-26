import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, EyeOff, Flame, Lock, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { moderateContent, validateRequired } from '../utils/moderation';
import { loadDraft, saveDraft, clearDraft } from '../utils/draft';
import type { HelpCategory, PostCategory } from '../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';

const CATEGORIES: { key: HelpCategory; label: string }[] = [
  { key: 'daily_chores', label: '日常家务' },
  { key: 'medical_escort', label: '陪同就医' },
  { key: 'chat_companion', label: '聊天陪伴' },
  { key: 'childcare_guide', label: '隔代育儿' },
  { key: 'urgent_help', label: '紧急求助' },
];

const DURATIONS = [1, 2, 3, 4];

/**
 * 发布弹层：桌面为 880px 双栏弹层，移动端铺满整页。
 * 三条通道共用一套外壳，提交逻辑沿用既有校验（实名前置 / 内容预检 / 草稿恢复）。
 */
export const PublishModal: React.FC = () => {
  const { currentUser, createHelpOrder, createPost, setActiveSubPage } = useApp();

  const [publishMode, setPublishMode] = useState<1 | 2 | 3>(1);

  const [helpTitle, setHelpTitle] = useState('');
  const [helpCategory, setHelpCategory] = useState<HelpCategory>('medical_escort');
  const [helpDesc, setHelpDesc] = useState('');
  const [helpLocationArea, setHelpLocationArea] = useState(currentUser.community);
  const [helpDate, setHelpDate] = useState('明日 (周六)');
  const [helpTime, setHelpTime] = useState('09:00 - 11:30');
  const [helpDuration, setHelpDuration] = useState(2);
  const [helpMedicalNotes, setHelpMedicalNotes] = useState('');
  const [consentSensitive, setConsentSensitive] = useState(true);
  const [promiseTruth, setPromiseTruth] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [postCategory, setPostCategory] = useState<PostCategory>('story');

  // 草稿自动暂存：误刷新/误返回不丢长段输入
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDraft({
        mode: publishMode,
        helpTitle,
        helpCategory,
        helpDesc,
        helpLocationArea,
        helpLocationDetail: '',
        helpDate,
        helpTime,
        helpDuration,
        helpMedicalNotes,
        isUrgent,
        postTitle,
        postContent,
        postCategory,
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    publishMode,
    helpTitle,
    helpCategory,
    helpDesc,
    helpLocationArea,
    helpDate,
    helpTime,
    helpDuration,
    helpMedicalNotes,
    isUrgent,
    postTitle,
    postContent,
    postCategory,
  ]);

  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    const hasContent = Boolean(draft.helpTitle || draft.helpDesc || draft.postTitle || draft.postContent);
    if (!hasContent) return;

    setPublishMode((draft.mode === 2 || draft.mode === 3 ? draft.mode : 1) as 1 | 2 | 3);
    setHelpTitle(draft.helpTitle || '');
    if (draft.helpCategory) setHelpCategory(draft.helpCategory as HelpCategory);
    setHelpDesc(draft.helpDesc || '');
    setHelpLocationArea(draft.helpLocationArea || currentUser.community);
    setHelpDate(draft.helpDate || '明日 (周六)');
    setHelpTime(draft.helpTime || '09:00 - 11:30');
    setHelpDuration(Math.round(Number(draft.helpDuration) || 2));
    setHelpMedicalNotes(draft.helpMedicalNotes || '');
    setIsUrgent(Boolean(draft.isUrgent));
    setPostTitle(draft.postTitle || '');
    setPostContent(draft.postContent || '');
    if (draft.postCategory) setPostCategory(draft.postCategory as PostCategory);
    toast('已恢复上次未提交的发布草稿（敏感信息授权需重新勾选）');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => setActiveSubPage(null);

  const submitHelpOrder = (event: React.FormEvent) => {
    event.preventDefault();

    if (currentUser.verifyStatus !== 'verified') {
      sound.playSosAlert();
      toast('依据实名制法规要求，发布求助订单须先完成实名认证！正在打开认证界面…');
      setActiveSubPage('realname_verify');
      return;
    }

    const titleError = validateRequired(helpTitle, '求助标题', 4);
    if (titleError) {
      toast(titleError);
      return;
    }

    if (!consentSensitive && helpMedicalNotes.trim()) {
      toast('涉及老人病史与特殊健康说明，请先勾选敏感个人信息单独授权协议');
      return;
    }

    if (!promiseTruth) {
      toast('请先确认信息真实、不含真实个人敏感信息');
      return;
    }

    const audit = moderateContent(helpTitle, helpDesc, helpMedicalNotes);
    if (!audit.ok) {
      toast(audit.advice);
      return;
    }
    if (audit.severity === 'warn') toast(audit.advice);

    const category = CATEGORIES.find((item) => item.key === helpCategory);

    const submitted = createHelpOrder({
      title: helpTitle.trim(),
      category: helpCategory,
      categoryLabel: category ? category.label : '日常家务',
      description: helpDesc.trim() || '老人日常需求互助，希望附近热心志愿者协助。',
      locationArea: helpLocationArea,
      locationDetail: '',
      dateStr: helpDate,
      timeStr: helpTime,
      durationHours: helpDuration,
      timeCoinReward: Math.ceil(helpDuration),
      isUrgent: isUrgent || helpCategory === 'urgent_help',
      medicalNotes: helpMedicalNotes.trim(),
      consentSensitive: true,
      photos: [],
    });

    // 失败：具体原因已由 Context toast（未实名 / 校验失败 / 存档异常等）。
    // 草稿保留、弹层不关，用户改完可直接重试；成功才清草稿并回到首页。
    if (!submitted) return;

    clearDraft();
    close();
  };

  const submitPost = (event: React.FormEvent) => {
    event.preventDefault();
    const contentError = validateRequired(postContent, '正文内容', 5);
    if (contentError) {
      toast(contentError);
      return;
    }

    const audit = moderateContent(postTitle, postContent);
    if (!audit.ok) {
      toast(audit.advice);
      return;
    }
    if (audit.severity === 'warn') toast(audit.advice);

    const submitted = createPost({
      title: postTitle.trim(),
      content: postContent.trim(),
      category: publishMode === 2 ? 'story' : postCategory,
      categoryLabel:
        publishMode === 2 ? '志愿风采' : postCategory === 'idle' ? '闲置互助' : '求助交流',
      isAnonymous,
      images: [],
      locationTag: currentUser.community,
    });

    // 失败：原因已由 Context toast；草稿保留、弹层不关，改完可重试。
    if (!submitted) return;

    clearDraft();
    close();
  };

  const summary = useMemo(() => {
    const category = CATEGORIES.find((item) => item.key === helpCategory)?.label ?? '陪同就医';
    return `求助订单 · ${category} · ${helpDuration} 小时`;
  }, [helpCategory, helpDuration]);

  const modeItems = [
    { key: '1', label: '求助订单' },
    { key: '2', label: '志愿动态' },
    { key: '3', label: '邻里帖子' },
  ];

  return (
    <Modal
      title="发布"
      subtitle="不离开当前页面 · 提交后自动进入接单大厅"
      onClose={close}
      wide
      full
      footer={
        <>
          <p className="nl-publish__summary">
            {publishMode === 1 ? `已选：${summary}` : publishMode === 2 ? '已选：志愿动态' : '已选：邻里帖子'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={close}>
              取消
            </Button>
            {publishMode === 1 ? (
              <Button type="submit" form="publish-help-form" variant="primary">
                确认发布到接单大厅
              </Button>
            ) : (
              <Button type="submit" form="publish-post-form" variant="primary">
                发布并同步至社区
              </Button>
            )}
          </div>
        </>
      }
    >
      <Segmented
        label="发布类型"
        value={String(publishMode)}
        onChange={(key) => {
          sound.playTap();
          setPublishMode(Number(key) as 1 | 2 | 3);
        }}
        items={modeItems}
      />

      {publishMode === 1 ? (
        <div className="nl-publish mt-4">
          <form id="publish-help-form" className="grid gap-4" onSubmit={submitHelpOrder}>
            <h3 className="text-[12px] font-semibold text-ink">发布求助订单</h3>

            {currentUser.verifyStatus !== 'verified' ? (
              <div className="nl-alert">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <span>发布求助订单需先完成实名认证，未认证将无法提交。</span>
              </div>
            ) : null}
            <div>
              <label className="nl-label" htmlFor="help-title">
                求助标题
              </label>
              <input
                id="help-title"
                type="text"
                className="nl-field"
                value={helpTitle}
                onChange={(event) => setHelpTitle(event.target.value)}
                placeholder="例：陪同去市一医院复查，需搀扶上下车"
              />
            </div>

            <div>
              <span className="nl-label">需求类型（必选）</span>
              <div className="nl-pick" role="group" aria-label="需求类型">
                {CATEGORIES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="nl-pick__item"
                    aria-pressed={helpCategory === item.key}
                    onClick={() => {
                      sound.playTap();
                      setHelpCategory(item.key);
                      if (item.key === 'urgent_help') setIsUrgent(true);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="nl-form-2">
              <div>
                <label className="nl-label" htmlFor="help-location">
                  服务地点
                </label>
                <input
                  id="help-location"
                  type="text"
                  className="nl-field"
                  value={helpLocationArea}
                  onChange={(event) => setHelpLocationArea(event.target.value)}
                  placeholder="只填社区或小区，不需要门牌号"
                />
              </div>
              <div>
                <label className="nl-label" htmlFor="help-date">
                  服务日期
                </label>
                <input
                  id="help-date"
                  type="text"
                  className="nl-field"
                  value={helpDate}
                  onChange={(event) => setHelpDate(event.target.value)}
                />
              </div>
            </div>

            <div className="nl-form-2">
              <div>
                <label className="nl-label" htmlFor="help-time">
                  服务时间
                </label>
                <input
                  id="help-time"
                  type="text"
                  className="nl-field"
                  value={helpTime}
                  onChange={(event) => setHelpTime(event.target.value)}
                />
              </div>
              <div>
                <span className="nl-label">预估时长</span>
                <div className="nl-pick nl-pick--4" role="group" aria-label="预估时长">
                  {DURATIONS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      className="nl-pick__item"
                      aria-pressed={helpDuration === hour}
                      onClick={() => setHelpDuration(hour)}
                    >
                      {hour} 小时
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="nl-label" htmlFor="help-desc">
                具体需求描述
              </label>
              <textarea
                id="help-desc"
                className="nl-textarea"
                value={helpDesc}
                onChange={(event) => setHelpDesc(event.target.value)}
                placeholder="说明需要帮忙的具体事项、是否需要自备工具等；不要填写真实姓名与门牌号。"
                rows={3}
              />
            </div>

            <div>
              <label className="nl-label" htmlFor="help-notes">
                特殊注意事项（选填 · 单独授权）
              </label>
              <textarea
                id="help-notes"
                className="nl-textarea"
                value={helpMedicalNotes}
                onChange={(event) => setHelpMedicalNotes(event.target.value)}
                placeholder="如：行动不便需搀扶、有高血压需随身带药。仅接单后向志愿者展示。"
                rows={2}
              />
              <label className="nl-consent mt-2">
                <input
                  type="checkbox"
                  checked={consentSensitive}
                  onChange={(event) => setConsentSensitive(event.target.checked)}
                />
                <span>
                  老人已知情并单独授权：上述健康注意事项在接单后向志愿者展示，可随时撤回。
                </span>
              </label>
            </div>

            <div className="nl-switch-line">
              <span className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-danger" aria-hidden="true" />
                <span>
                  <span className="block text-[11.5px] font-semibold text-ink">加急求助</span>
                  <span className="block text-[9.5px] text-muted">置顶接单大厅，并优先提醒附近志愿者</span>
                </span>
              </span>
              <button
                type="button"
                className="nl-switch"
                role="switch"
                aria-checked={isUrgent}
                aria-label="加急求助"
                onClick={() => setIsUrgent((value) => !value)}
              />
            </div>

            <label className="nl-consent">
              <input
                type="checkbox"
                checked={promiseTruth}
                onChange={(event) => setPromiseTruth(event.target.checked)}
              />
              <span>我确认信息真实、不含真实个人敏感信息，并同意先审后发（待审核通过后才会公开）。</span>
            </label>
          </form>

          <aside className="nl-publish__aside">
            <div className="nl-publish__aside-card">
              <p className="nl-publish__aside-title">发布后会发生什么</p>
              <div className="nl-publish__steps">
                <span>1. 进入接单大厅，附近志愿者可以认领</span>
                <span>2. 被认领后会收到订单消息与上门签到提醒</span>
                <span>3. 服务确认完成后，时长自动计入时间存折</span>
              </div>
            </div>
            <div className="nl-alert nl-alert--info">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>本页不采集门牌号、手机号与身份证号；订单只写本机存档。</span>
            </div>
          </aside>
        </div>
      ) : (
        <div className="nl-publish mt-4">
          <form id="publish-post-form" className="grid gap-4" onSubmit={submitPost}>
            <div className="rounded-[12px] bg-page px-3.5 py-2.5">
              <p className="text-[12px] font-semibold text-ink">
                {publishMode === 2 ? '分享志愿服务感悟与陪护日常' : '发布邻里交流与闲置互助帖子'}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {publishMode === 2
                  ? '记录社区温暖点滴 · 发布后进入先审后发队列'
                  : '纯邻里互动 · 不生成订单 · 不计时长'}
              </p>
            </div>

            {publishMode === 3 ? (
              <div>
                <span className="nl-label">帖子分类</span>
                <div className="nl-pick" role="group" aria-label="帖子分类">
                  {[
                    { key: 'story', label: '邻里日常' },
                    { key: 'idle', label: '闲置互助' },
                    { key: 'help', label: '邻里求教' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="nl-pick__item"
                      aria-pressed={postCategory === item.key}
                      onClick={() => setPostCategory(item.key as PostCategory)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <label className="nl-label" htmlFor="post-title">
                标题
              </label>
              <input
                id="post-title"
                type="text"
                className="nl-field"
                value={postTitle}
                onChange={(event) => setPostTitle(event.target.value)}
                placeholder="一句话说清这条动态"
              />
            </div>

            <div>
              <label className="nl-label" htmlFor="post-content">
                正文内容
              </label>
              <textarea
                id="post-content"
                className="nl-textarea"
                value={postContent}
                onChange={(event) => setPostContent(event.target.value)}
                placeholder="分享今天在社区发生的美好瞬间、心得或互助经验…"
                rows={5}
              />
            </div>

            <div>
              <span className="nl-label">附加照片</span>
              <div className="flex items-center gap-3 rounded-[12px] bg-page px-3 py-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[10px] border border-dashed border-line-strong text-faint">
                  <Camera className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-[10px] leading-relaxed text-muted">
                  本轮不开放图片上传（无对象存储、无 EXIF 清除、无图片审核）。生产环境需先补齐这三项。
                </p>
              </div>
            </div>

            <div className="nl-switch-line">
              <span className="flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-text2" aria-hidden="true" />
                <span>
                  <span className="block text-[11.5px] font-semibold text-ink">匿名发布</span>
                  <span className="block text-[9.5px] text-muted">前台隐藏昵称，后台仍绑定实名存证</span>
                </span>
              </span>
              <button
                type="button"
                className="nl-switch"
                role="switch"
                aria-checked={isAnonymous}
                aria-label="匿名发布"
                onClick={() => setIsAnonymous((value) => !value)}
              />
            </div>

            <div className="nl-alert nl-alert--info">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>发布后进入先审后发队列，审核通过才会出现在社区信息流。</span>
            </div>
          </form>

          <aside className="nl-publish__aside">
            <div className="nl-publish__aside-card">
              <p className="nl-publish__aside-title">发布后会发生什么</p>
              <div className="nl-publish__steps">
                <span>1. 内容进入待审队列，只有审核通过才公开</span>
                <span>2. 通过后出现在社区信息流，可被点赞与评论</span>
                <span>3. 每条内容都可被举报，处置结果写回站内消息</span>
              </div>
            </div>
            <div className="nl-alert nl-alert--info">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>不要填写真实姓名、联系方式或门牌号；演示数据只存本机。</span>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  );
};
