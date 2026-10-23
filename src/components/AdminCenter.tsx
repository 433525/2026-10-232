import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Coins, 
  FileText, 
  Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';

export const AdminCenter: React.FC = () => {
  const { 
    currentUser, 
    posts, 
    orders, 
    complaints, 
    users, 
    timeLedger, 
    adminApprovePost, 
    adminRejectPostWithReason, 
    adminResolveComplaint, 
    adminAdjustTimeCoin, 
    setActiveSubPage 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'audit' | 'complaints' | 'ledger' | 'users'>('audit');
  const [selectedUserForCoin, setSelectedUserForCoin] = useState<string>(users[0].id);
  const [adjustCoinAmount, setAdjustCoinAmount] = useState<number>(5);
  const [adjustCoinReason, setAdjustCoinReason] = useState<string>('年度邻里互助模范特别奖励');
  const [complaintReplyText, setComplaintReplyText] = useState<string>('已核对本机演练记录，按互助规则完成处置。');
  // 驳回必须给理由（R7）：按帖子 id 存草稿，未填理由时按钮禁用。
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const pendingPosts = posts.filter(p => p.status === 'pending');
  const pendingOrders = orders.filter(o => o.status === 'pending_audit');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Admin Header */}
        <div className="p-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg">
                  内容审核与举报处置（演练后台）
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  当前操作员: {currentUser.name}
                </span>
              </div>
              <p className="text-xs text-purple-200">
                先审后发 · 驳回必须填理由 · 举报处置留痕 · 时间账本只读
              </p>
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-600 shrink-0 overflow-x-auto">
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('audit');
            }}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'border-purple-600 text-purple-900 font-bold bg-white' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>内容审核队列（{pendingPosts.length + pendingOrders.length}）</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('complaints');
            }}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'complaints' ? 'border-purple-600 text-purple-900 font-bold bg-white' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>举报处置工单（{complaints.filter(c => c.status === 'pending').length}）</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('ledger');
            }}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ledger' ? 'border-purple-600 text-purple-900 font-bold bg-white' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>时间账本（只读·未结算）</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('users');
            }}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'users' ? 'border-purple-600 text-purple-900 font-bold bg-white' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>演练身份与志愿者</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* 1. 审核队列 */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  待审内容与求助单（先审后发）
                </h3>
                <span className="text-xs text-slate-500">
                  审核结论会写入审核日志；驳回必须填写理由
                </span>
              </div>

              {pendingPosts.length === 0 && pendingOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">当前没有积压的待审核内容</p>
                  <p className="text-xs text-slate-400 mt-1">等待新的发布提交；先审后发不会跳过队列</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPosts.map(post => (
                    <div key={post.id} className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                          待审内容 · {post.categoryLabel}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{post.createdAt}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">{post.title || '动态分享'}</p>
                      <p className="text-xs text-slate-600">{post.content}</p>
                      <div className="space-y-2 pt-2 border-t border-purple-100">
                        <label className="block text-[11px] font-semibold text-slate-500" htmlFor={`reject-${post.id}`}>
                          驳回理由（必填，会写入审核日志并通知发布者）
                        </label>
                        <input
                          id={`reject-${post.id}`}
                          type="text"
                          value={rejectReasons[post.id] ?? ''}
                          onChange={(e) =>
                            setRejectReasons((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder="例如：包含未脱敏的联系方式 / 与互助无关的推广内容"
                          className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => adminRejectPostWithReason(post.id, rejectReasons[post.id] ?? '')}
                            disabled={!((rejectReasons[post.id] ?? '').trim())}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px]"
                          >
                            驳回并记录理由
                          </button>
                          <button
                            onClick={() => adminApprovePost(post.id)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs min-h-[36px]"
                          >
                            审核通过并公开
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. 投诉维权工单 */}
          {activeTab === 'complaints' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  举报与处置（每条 UGC 都可举报，处置结果写入站内消息）
                </h3>
              </div>

              {complaints.map(ticket => (
                <div key={ticket.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-700">
                      工单编号：{ticket.ticketNo}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ticket.statusLabel}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-700 space-y-1">
                    <p><strong>举报人：</strong>{ticket.userName} | <strong>被举报内容：</strong>{ticket.orderTitle || '演练内容'}</p>
                    <p><strong>举报原因：</strong>{ticket.reason}</p>
                    <p className="p-2.5 rounded-lg bg-slate-50 border text-slate-600">{ticket.detail}</p>
                  </div>

                  {ticket.status === 'pending' ? (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-xs text-slate-500 font-semibold">处置结论（写入举报记录，留痕）：</label>
                      <input
                        type="text"
                        value={complaintReplyText}
                        onChange={(e) => setComplaintReplyText(e.target.value)}
                        className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => adminResolveComplaint(ticket.id, complaintReplyText)}
                          className="px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs"
                        >
                          确认办结（只写本机站内消息）
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-xs text-emerald-800 space-y-1">
                      <p><strong>经办人：</strong>{ticket.handlerName} ({ticket.resolvedAt})</p>
                      <p><strong>处理说明：</strong>{ticket.resolutionNote}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3. 时间币账本与调账 */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              {/* Manual Adjustment Form */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>人工调账（本演示禁用：账本只读）</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-600">目标居民/志愿者：</label>
                    <select
                      value={selectedUserForCoin}
                      onChange={(e) => setSelectedUserForCoin(e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.roleLabel} - 余额: {u.timeCoins}币)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600">调整额度（可正可负）：</label>
                    <input
                      type="number"
                      value={adjustCoinAmount}
                      onChange={(e) => setAdjustCoinAmount(Number(e.target.value))}
                      className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600">核准调账原因：</label>
                    <input
                      type="text"
                      value={adjustCoinReason}
                      onChange={(e) => setAdjustCoinReason(e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-amber-800 leading-relaxed">
                  时间账本在演示环境里是只读的：不存在结算、兑现或转让，也不伪造管理员流水（R18 / T11）。
                  生产环境若保留人工调账，必须双人复核 + 独立操作日志。
                </p>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      // 保留入口但禁用：让「缺能力」可见，而不是把 UI 删掉（需求 §8.4）。
                      adminAdjustTimeCoin(selectedUserForCoin, adjustCoinAmount, adjustCoinReason);
                      toast('演练数据只读：时间账本不支持调账、兑现或转让。');
                    }}
                    aria-disabled="true"
                    title="演示环境账本只读"
                    className="px-4 py-1.5 rounded-lg bg-slate-300 text-slate-600 text-xs font-bold shadow-none cursor-not-allowed"
                  >
                    调账不可用（演练只读）
                  </button>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  本机演练时间记录（只读 · 全部未结算）
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2.5">交易流水号</th>
                        <th className="p-2.5">事项说明</th>
                        <th className="p-2.5">变动分钟数</th>
                        <th className="p-2.5">交易时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {timeLedger.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-500">{tx.txHash}</td>
                          <td className="p-2.5 text-slate-800">{tx.description}</td>
                          <td className={`p-2.5 font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 分钟
                          </td>
                          <td className="p-2.5 text-slate-400">{tx.createdAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. 实名住户 */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">
                演练身份与派生志愿者（无真实手机号/身份证）
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map(u => (
                  <div key={u.id} className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold flex items-center justify-center ring-2 ring-purple-400 shrink-0"
                    >
                      {u.nickname.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm truncate">{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-medium">
                          {u.roleLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {u.address} | 未结算: <strong>{u.timeCoins}</strong> 币
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        身份信息：演练不采集（无身份证号、无手机号）
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
