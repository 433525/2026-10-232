import React, { useState } from 'react';
import { 
  FileText, 
  MapPin, 
  Clock, 
  Coins, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles,
  Lock,
  Flag
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { SmartImage } from './SmartImage';
import { useDialog } from '../hooks/useDialog';

export const OrderDetailModal: React.FC = () => {
  const { 
    orders, 
    selectedOrderId, 
    setActiveSubPage, 
    currentUser, 
    acceptOrder, 
    clockInOrder, 
    completeOrder, 
    cancelOrder,
    setActiveTab,
    elderlyMode,
    submitComplaint
  } = useApp();

  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('服务非常准时细心，老人非常满意，感谢志愿者付出！');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // 评价与取消确认弹层：Esc 关闭 + 焦点管理
  useDialog(showRatingModal, () => setShowRatingModal(false));
  useDialog(showCancelModal, () => setShowCancelModal(false));
  const [cancelReason, setCancelReason] = useState('时间安排冲突');

  const order = orders.find(o => o.id === selectedOrderId);

  if (!order) return null;

  const isMyOrder = order.userId === currentUser.id;
  const isMyClaimed = order.volunteerId === currentUser.id;
  const canClaim = currentUser.role === 'volunteer' && order.status === 'published';

  const handleStartChat = () => {
    sound.playTap();
    setActiveSubPage(null);
    setActiveTab('messages');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base">
                互助求助订单详情
              </span>
              <span className="text-[11px] text-slate-400 ml-2 font-mono">
                #{order.id}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage(null);
            }}
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            order.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
            order.status === 'in_progress' ? 'bg-blue-50 border-blue-200 text-blue-900 animate-pulse' :
            order.status === 'accepted' ? 'bg-amber-50 border-amber-200 text-amber-900' :
            order.status === 'cancelled' ? 'bg-slate-100 border-slate-300 text-slate-600' :
            'bg-teal-50 border-teal-200 text-teal-900'
          }`}>
            <div className="flex items-center gap-2.5">
              {order.status === 'completed' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : order.status === 'in_progress' ? (
                <Clock className="w-6 h-6 text-blue-600 animate-spin" />
              ) : (
                <Sparkles className="w-6 h-6 text-amber-600" />
              )}
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  {order.status === 'published' && '正在接单大厅公示 · 等待志愿者认领'}
                  {order.status === 'accepted' && '志愿者已认领 · 待上门签到服务'}
                  {order.status === 'in_progress' && `志愿服务进行中 (签到时间: ${order.clockInTime})`}
                  {order.status === 'completed' && '服务已圆满完成 · 时间币已入账'}
                  {order.status === 'cancelled' && '订单已取消'}
                </h3>
                <p className="text-xs opacity-80 mt-0.5">
                  {order.isUrgent ? '【置顶紧急需求】' : '【普通互助】'} · 发布时间：{order.createdAt}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white shadow-xs border">
                +{order.timeCoinReward} 时长币
              </span>
            </div>
          </div>

          {/* Title & Core Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className={`font-bold text-slate-900 leading-snug ${elderlyMode ? 'text-xl' : 'text-base sm:text-lg'}`}>
                {order.title}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium shrink-0">
                {order.categoryLabel}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {order.description}
            </p>

            {/* Photos */}
            {order.photos && order.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {order.photos.map((img, i) => (
                  <SmartImage
                    key={i}
                    src={img}
                    alt="现场参考"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border border-slate-200 shadow-xs"
                    fallbackLabel="现场参考"
                  />
                ))}
              </div>
            )}

            {/* Key Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-slate-600 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>服务时间：{order.dateStr} {order.timeStr}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>预估时长：{order.durationHours} 小时（结算 {order.timeCoinReward} 币）</span>
              </div>
            </div>
          </div>

          {/* Address & Privacy Desensitization Box */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                服务地点与脱敏保护
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Lock className="w-3 h-3" />
                敏感隐私受控加密
              </span>
            </div>

            <div className="text-sm font-bold text-slate-800">
              {order.locationArea}
            </div>

            {/* Reveal detail address only to parties */}
            {isMyOrder || isMyClaimed || currentUser.role === 'admin' ? (
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm text-emerald-950 font-medium flex items-center justify-between">
                <span>门牌详细地址：<strong>{order.locationDetail}</strong></span>
                <span className="text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded shadow-xs">
                  接单后凭证可见
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-500 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>详细单元及门牌号已脱敏隐藏，志愿者成功认领后方可解锁查看。</span>
              </div>
            )}
          </div>

          {/* Medical Notes (Sensitive health information) */}
          {order.medicalNotes && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>长者健康与照护注意事项（单独授权）</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {order.medicalNotes}
              </p>
            </div>
          )}

          {/* Parties Information: Help Requester & Volunteer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Requester Box */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                求助居民信息
              </div>
              <div className="flex items-center gap-2.5">
                <div
                  aria-hidden="true"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold flex items-center justify-center ring-2 ring-emerald-500 shrink-0"
                >
                  {order.userName.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                    {order.userName}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {isMyOrder || isMyClaimed || currentUser.role === 'admin' ? order.userPhoneReal : order.userPhoneMasked}
                  </div>
                </div>
              </div>
            </div>

            {/* Volunteer Box */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                认领志愿者信息
              </div>
              {order.volunteerName ? (
                <div className="flex items-center gap-2.5">
                  <div
                    aria-hidden="true"
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white font-bold flex items-center justify-center ring-2 ring-amber-500 shrink-0"
                  >
                    {order.volunteerName.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 font-bold text-slate-800 text-xs sm:text-sm truncate">
                      <span>{order.volunteerName}</span>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1 py-0.2 rounded">
                        {order.volunteerRating ? `★ ${order.volunteerRating}` : '暂无评分（演练）'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {order.volunteerPhone || '未提供（演练不采集手机号）'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>暂无志愿者认领</span>
                </div>
              )}
            </div>
          </div>

          {/* Rating Comment Display if completed */}
          {order.status === 'completed' && order.ratingScore && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">长者服务评价与反馈</span>
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-3.5 h-3.5 ${i < (order.ratingScore || 5) ? 'fill-amber-400' : 'text-slate-300'}`} 
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                “{order.ratingComment}”
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Start Chat Button */}
            {(isMyOrder || isMyClaimed) && (
              <button
                onClick={handleStartChat}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>订单内沟通留言</span>
              </button>
            )}

            {/* Cancel Button */}
            {(isMyOrder || currentUser.role === 'admin') && order.status === 'published' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-medium transition-colors"
              >
                取消订单
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Claim Order */}
            {canClaim && (
              <button
                onClick={() => {
                  acceptOrder(order.id);
                  setActiveSubPage(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs sm:text-sm hover:from-emerald-700 hover:to-teal-800 shadow-md hover:shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>认领并提供志愿服务</span>
              </button>
            )}

            {/* Volunteer Clock-in */}
            {isMyClaimed && order.status === 'accepted' && (
              <button
                onClick={() => clockInOrder(order.id)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>上门签到（本机记录）</span>
              </button>
            )}

            {/* Complete Order Confirmation */}
            {(isMyOrder || isMyClaimed) && order.status === 'in_progress' && (
              <button
                onClick={() => setShowRatingModal(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>双方确认完成（本机演练，不结算）</span>
              </button>
            )}

            {/* 举报入口：订单也是 UGC，同样必须可举报（R7） */}
            <button
              onClick={() => {
                sound.playTap();
                submitComplaint({
                  orderId: order.id,
                  orderTitle: order.title,
                  reason: '接单大厅内容举报（演练）',
                  detail: '对当前查看的求助订单发起举报；只写本机记录，不通知任何机构。',
                });
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5"
            >
              <Flag className="w-4 h-4" />
              <span>举报该内容</span>
            </button>
          </div>
        </div>

        {/* Rating / Complete Modal */}
        {showRatingModal && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-base font-bold text-slate-900">
                服务完成确认与长者满意度评价
              </h3>
              
              <div className="space-y-2">
                <label className="text-xs text-slate-500">服务打分：</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRatingScore(s)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-7 h-7 ${s <= ratingScore ? 'fill-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-700 ml-2">
                    {ratingScore} 星好评
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500">评价评语：</label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    completeOrder(order.id, ratingScore, ratingComment);
                    setShowRatingModal(false);
                    setActiveSubPage(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                >
                  提交确认并记账（未结算 {order.timeCoinReward} 币）
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900">
                确认取消该求助订单？
              </h3>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="时间安排冲突">时间安排冲突</option>
                <option value="已通过其他途径解决">已通过其他途径解决</option>
                <option value="需求内容填写有误">需求内容填写有误</option>
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                >
                  再想想
                </button>
                <button
                  onClick={() => {
                    cancelOrder(order.id, cancelReason);
                    setShowCancelModal(false);
                    setActiveSubPage(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  确认取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
