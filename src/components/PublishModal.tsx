import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  Sparkles, 
  MessageSquare, 
  Camera, 
  MapPin, 
  Lock, 
  EyeOff, 
  Flame,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { moderateContent, validateRequired } from '../utils/moderation';
import { loadDraft, saveDraft, clearDraft } from '../utils/draft';
import { HelpCategory, PostCategory } from '../types';

export const PublishModal: React.FC = () => {
  const { 
    currentUser, 
    createHelpOrder, 
    createPost, 
    setActiveTab, 
    setActiveSubPage, 
    elderlyMode 
  } = useApp();

  // Mode: 1: Help Order, 2: Volunteer Story, 3: Neighborhood Post
  const [publishMode, setPublishMode] = useState<1 | 2 | 3>(1);

  // Form states for Help Order
  const [helpTitle, setHelpTitle] = useState('');
  const [helpCategory, setHelpCategory] = useState<HelpCategory>('medical_escort');
  const [helpDesc, setHelpDesc] = useState('');
  const [helpLocationArea, setHelpLocationArea] = useState('翠湖花园3期');
  const [helpLocationDetail, setHelpLocationDetail] = useState(currentUser.address || '8号楼2单元601');
  const [helpDate, setHelpDate] = useState('明日 (周六)');
  const [helpTime, setHelpTime] = useState('09:00 - 11:30');
  const [helpDuration, setHelpDuration] = useState(2.5);
  const [helpMedicalNotes, setHelpMedicalNotes] = useState('');
  const [consentSensitive, setConsentSensitive] = useState(true);
  const [isUrgent, setIsUrgent] = useState(false);
  const [photos] = useState<string[]>([
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=400&q=80'
  ]);

  // Form states for Volunteer Story / Post
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [postCategory, setPostCategory] = useState<PostCategory>('story');

  const categories = [
    { key: 'daily_chores', label: '日常家务', icon: '🧹' },
    { key: 'medical_escort', label: '陪同就医', icon: '🏥' },
    { key: 'chat_companion', label: '聊天陪伴', icon: '🍵' },
    { key: 'childcare_guide', label: '隔代育儿', icon: '👶' },
    { key: 'urgent_help', label: '紧急求助', icon: '🚨' },
  ];

  // 发布草稿自动暂存：误刷新/误返回不再丢失长者的长段输入
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDraft({
        mode: publishMode,
        helpTitle,
        helpCategory,
        helpDesc,
        helpLocationArea,
        helpLocationDetail,
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
    helpLocationDetail,
    helpDate,
    helpTime,
    helpDuration,
    helpMedicalNotes,
    isUrgent,
    postTitle,
    postContent,
    postCategory,
  ]);

  // 首次进入恢复草稿（合规勾选不恢复，需用户重新确认）
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    const hasContent =
      Boolean(draft.helpTitle || draft.helpDesc || draft.postTitle || draft.postContent);
    if (!hasContent) return;

    setPublishMode((draft.mode === 2 || draft.mode === 3 ? draft.mode : 1) as 1 | 2 | 3);
    setHelpTitle(draft.helpTitle || '');
    if (draft.helpCategory) setHelpCategory(draft.helpCategory as HelpCategory);
    setHelpDesc(draft.helpDesc || '');
    setHelpLocationArea(draft.helpLocationArea || '翠湖花园3期');
    setHelpLocationDetail(draft.helpLocationDetail || '');
    setHelpDate(draft.helpDate || '明日 (周六)');
    setHelpTime(draft.helpTime || '09:00 - 11:30');
    setHelpDuration(Number(draft.helpDuration) || 2.5);
    setHelpMedicalNotes(draft.helpMedicalNotes || '');
    setIsUrgent(Boolean(draft.isUrgent));
    setPostTitle(draft.postTitle || '');
    setPostContent(draft.postContent || '');
    if (draft.postCategory) setPostCategory(draft.postCategory as PostCategory);
    toast('已恢复上次未提交的发布草稿（敏感信息授权需重新勾选）');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitHelpOrder = (e: React.FormEvent) => {
    e.preventDefault();

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

    // 内容安全预检：先审后发的第一道闸门（对应合规雷点 R7）
    const audit = moderateContent(helpTitle, helpDesc, helpMedicalNotes);
    if (!audit.ok) {
      toast(audit.advice);
      return;
    }
    if (audit.severity === 'warn') {
      toast(audit.advice);
    }

    const catObj = categories.find(c => c.key === helpCategory);

    createHelpOrder({
      title: helpTitle.trim(),
      category: helpCategory,
      categoryLabel: catObj ? catObj.label : '日常家务',
      description: helpDesc.trim() || '老人日常需求互助，希望附近热心志愿者协助。',
      locationArea: helpLocationArea,
      locationDetail: helpLocationDetail,
      dateStr: helpDate,
      timeStr: helpTime,
      durationHours: helpDuration,
      timeCoinReward: Math.ceil(helpDuration),
      isUrgent: isUrgent || helpCategory === 'urgent_help',
      medicalNotes: helpMedicalNotes.trim(),
      consentSensitive: true,
      photos
    });

    clearDraft();
    toast('求助订单已发布至接单大厅，附近认证志愿者将收到派单提醒', 'success');
    setActiveTab('home');
  };

  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    const contentError = validateRequired(postContent, '正文内容', 5);
    if (contentError) {
      toast(contentError);
      return;
    }

    // 内容安全预检：先审后发的第一道闸门
    const audit = moderateContent(postTitle, postContent);
    if (!audit.ok) {
      toast(audit.advice);
      return;
    }
    if (audit.severity === 'warn') {
      toast(audit.advice);
    }

    createPost({
      title: postTitle.trim(),
      content: postContent.trim(),
      category: publishMode === 2 ? 'story' : postCategory,
      categoryLabel: publishMode === 2 ? '志愿风采' : (postCategory === 'idle' ? '闲置互助' : '求助交流'),
      isAnonymous,
      images: [
        'https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=600&q=80'
      ],
      locationTag: currentUser.community
    });

    clearDraft();
    toast('动态已发布并同步至社区信息流', 'success');
    setActiveTab('community');
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150 max-w-2xl mx-auto">
      {/* Top 3 Publish Options Switcher */}
      <div className="p-1.5 rounded-2xl bg-slate-200/80 grid grid-cols-3 gap-1 text-center font-bold text-xs sm:text-sm">
        <button
          onClick={() => {
            sound.playTap();
            setPublishMode(1);
          }}
          className={`py-2.5 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            publishMode === 1
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-emerald-600" />
          <span>发布求助订单</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setPublishMode(2);
          }}
          className={`py-2.5 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            publishMode === 2
              ? 'bg-white text-amber-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>发布志愿风采</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setPublishMode(3);
          }}
          className={`py-2.5 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            publishMode === 3
              ? 'bg-white text-blue-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>普通邻里贴</span>
        </button>
      </div>

      {/* Mode 1: 发布求助订单 */}
      {publishMode === 1 && (
        <form onSubmit={handleSubmitHelpOrder} className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                填写长者求助需求单（生成时间银行订单）
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                长者本人或家属代办均可发布 · 提交后入驻接单大厅
              </p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shrink-0">
              需实名核验
            </span>
          </div>

          {/* Service Category Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">需求服务类型 (必选其一)：</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => {
                    sound.playTap();
                    setHelpCategory(c.key as HelpCategory);
                    if (c.key === 'urgent_help') setIsUrgent(true);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    helpCategory === c.key
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-xs">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">求助标题：</label>
            <input
              type="text"
              value={helpTitle}
              onChange={(e) => setHelpTitle(e.target.value)}
              placeholder="如：周六上午陪同去中医院配降压药 / 卧室换灯泡"
              className={`w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none ${elderlyMode ? 'text-base font-medium' : 'text-xs sm:text-sm'}`}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">具体需求描述：</label>
            <textarea
              value={helpDesc}
              onChange={(e) => setHelpDesc(e.target.value)}
              placeholder="请详细说明老人目前身体状况、需要帮忙的具体事项、是否需要自备工具等..."
              rows={3}
              className={`w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none ${elderlyMode ? 'text-base font-medium' : 'text-xs sm:text-sm'}`}
            />
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">服务日期：</label>
              <input
                type="text"
                value={helpDate}
                onChange={(e) => setHelpDate(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">服务时间段：</label>
              <input
                type="text"
                value={helpTime}
                onChange={(e) => setHelpTime(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">预估时长 (小时)：</label>
              <select
                value={helpDuration}
                onChange={(e) => setHelpDuration(Number(e.target.value))}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
              >
                <option value={1}>1.0 小时 (结算 1 币)</option>
                <option value={1.5}>1.5 小时 (结算 2 币)</option>
                <option value={2}>2.0 小时 (结算 2 币)</option>
                <option value={3}>3.0 小时 (结算 3 币)</option>
                <option value={4}>4.0 小时 (结算 4 币)</option>
              </select>
            </div>
          </div>

          {/* Location Area & Privacy Address */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                服务地点与隐私分级管理
              </span>
              <span className="text-[10px] text-emerald-700 font-normal">
                公开区域脱敏 / 接单凭证解密
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">公开展示区域 (如小区期数)：</label>
                <input
                  type="text"
                  value={helpLocationArea}
                  onChange={(e) => setHelpLocationArea(e.target.value)}
                  className="w-full mt-0.5 p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500">详细门牌号 (接单前保密)：</label>
                <input
                  type="text"
                  value={helpLocationDetail}
                  onChange={(e) => setHelpLocationDetail(e.target.value)}
                  className="w-full mt-0.5 p-2 rounded-lg border border-slate-200 text-xs bg-emerald-50/50"
                />
              </div>
            </div>
          </div>

          {/* Medical Notes & Sensitive Consent */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>长者既往病史与特殊健康说明（选填，单独加密授权）</span>
            </div>
            <textarea
              value={helpMedicalNotes}
              onChange={(e) => setHelpMedicalNotes(e.target.value)}
              placeholder="例如：行动不便需坐轮椅、有高血压二期需随身带降压含片、对花粉过敏等..."
              rows={2}
              className="w-full p-2 rounded-lg border border-amber-200 text-xs text-slate-800 bg-white"
            />
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="consentCheck"
                checked={consentSensitive}
                onChange={(e) => setConsentSensitive(e.target.checked)}
                className="rounded text-emerald-600 w-4 h-4"
              />
              <label htmlFor="consentCheck" className="text-[11px] text-slate-600">
                我已确认老人知情并单独授权平台在接单后向志愿者提供上述健康照护注意事项。
              </label>
            </div>
          </div>

          {/* Urgent Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-200">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-600" />
              <div>
                <div className="text-xs font-bold text-rose-900">加急求助标识</div>
                <div className="text-[10px] text-rose-600">置顶接单大厅并优先推送附近空闲志愿者</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="w-5 h-5 text-rose-600 rounded"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>确认发布到接单大厅</span>
          </button>
        </form>
      )}

      {/* Mode 2 & 3: 发布志愿风采 / 普通邻里帖 */}
      {(publishMode === 2 || publishMode === 3) && (
        <form onSubmit={handleSubmitPost} className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {publishMode === 2 ? '分享志愿服务感悟与陪护日常' : '发布邻里交流与闲置互助帖子'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {publishMode === 2 
                ? '支持上传实拍照片 · 记录社区温暖点滴' 
                : '纯邻里互动交流 · 不生成订单 · 0时间币纯公益'}
            </p>
          </div>

          {publishMode === 3 && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">帖子分类：</label>
              <div className="flex gap-2">
                {[
                  { key: 'story', label: '邻里日常' },
                  { key: 'idle', label: '闲置互助 (0币借用/转赠)' },
                  { key: 'help', label: '邻里求教' },
                ].map(c => (
                  <button
                    type="button"
                    key={c.key}
                    onClick={() => setPostCategory(c.key as PostCategory)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      postCategory === c.key
                        ? 'bg-blue-50 border-blue-500 text-blue-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">标题：</label>
            <input
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="请输入标题..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">正文内容：</label>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="分享今天在社区发生的美好瞬间、心得感悟或互助经验..."
              rows={4}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Photo Attachment preview */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">附加照片：</label>
            <div className="flex items-center gap-2">
              <img 
                src="https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=200&q=80" 
                alt="配图" 
                className="w-16 h-16 rounded-lg object-cover border border-slate-200 shadow-xs"
              />
              <button
                type="button"
                onClick={() => toast('已自动选取本地照片并完成压缩与定位信息清除', 'success')}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">加图</span>
              </button>
            </div>
          </div>

          {/* Anonymous Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-slate-600" />
              <div>
                <div className="text-xs font-bold text-slate-800">匿名发布动态</div>
                <div className="text-[10px] text-slate-500">前台对外隐藏昵称，后台仍严格绑定实名合规存证</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>发布并同步至社区信息流</span>
          </button>
        </form>
      )}
    </div>
  );
};
