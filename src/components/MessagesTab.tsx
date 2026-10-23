import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  FileText, 
  MessageSquare, 
  AlertCircle, 
  Send, 
  MapPin, 
  Image as ImageIcon, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck, 
  PhoneCall
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';

export const MessagesTab: React.FC = () => {
  const { 
    messages, 
    chatMessages, 
    complaints, 
    sendChatMessage, 
    submitComplaint, 
    setActiveSubPage, 
    setSelectedOrderId, 
    elderlyMode 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'system' | 'order' | 'chat' | 'complaint'>('order');
  const [chatInput, setChatInput] = useState('');
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintReason, setComplaintReason] = useState('服务未按约定时间到达');
  const [complaintDetail, setComplaintDetail] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const systemMessages = messages.filter(m => m.type === 'system');
  // 会话来自 mvp 的 order 线程；没有数据时给空态，而不是回落到假订单号。
  const activeConversationId = chatMessages[0]?.conversationId ?? null;
  const activeChatMessages = activeConversationId
    ? chatMessages.filter((chat) => chat.conversationId === activeConversationId)
    : [];
  const orderMessages = messages.filter(m => m.type === 'order');

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (!activeConversationId) {
      toast('当前没有可留言的订单会话。');
      return;
    }
    sendChatMessage(activeConversationId, chatInput.trim(), 'text');
    setChatInput('');
  };

  const handleSendQuickReply = (text: string) => {
    if (!activeConversationId) {
      toast('当前没有可留言的订单会话。');
      return;
    }
    sendChatMessage(activeConversationId, text, 'text');
  };

  // 定位与图片都不在本轮范围（§1.4）：按钮保留但禁用，并说明原因。
  const explainUnavailable = (feature: string) => {
    toast(`${feature}不在本轮演示范围：没有定位授权、没有对象存储，也不会采集门牌号。`);
  };

  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDetail.trim()) {
      toast('请填写具体投诉事实说明');
      return;
    }
    submitComplaint({
      reason: complaintReason,
      detail: complaintDetail.trim(),
      orderTitle: '社区互助服务订单'
    });
    setComplaintDetail('');
    setShowComplaintForm(false);
    toast('举报已记录在本机演练中（未通知任何机构）', 'success');
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* 4 Tabs Header */}
      <div className="p-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs grid grid-cols-4 gap-1 text-center font-bold text-xs sm:text-sm">
        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('order');
          }}
          className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            activeTab === 'order' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>订单进度</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('chat');
          }}
          className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 relative ${
            activeTab === 'chat' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>订单留言</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-1.5 ring-1 ring-white" />
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('system');
          }}
          className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            activeTab === 'system' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>系统通知</span>
        </button>

        <button
          onClick={() => {
            sound.playTap();
            setActiveTab('complaint');
          }}
          className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
            activeTab === 'complaint' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>投诉反馈</span>
        </button>
      </div>

      {/* Tab 1: 订单进度消息 */}
      {activeTab === 'order' && (
        <div className="space-y-3">
          {orderMessages.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border">
              暂无订单变动消息
            </div>
          ) : (
            orderMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => {
                  sound.playTap();
                  if (msg.orderId) {
                    setSelectedOrderId(msg.orderId);
                    setActiveSubPage('order_detail');
                  }
                }}
                className="cursor-pointer p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {msg.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {msg.timestamp}
                  </span>
                </div>

                <p className={`text-slate-600 leading-relaxed ${elderlyMode ? 'text-base' : 'text-xs sm:text-sm'}`}>
                  {msg.content}
                </p>

                {msg.extra && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
                      {msg.extra.statusBadge}
                    </span>
                    <span className="text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
                      {msg.extra.actionText || '查看订单'} <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: 订单内留言 / 互动私信 */}
      {activeTab === 'chat' && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[520px]">
          {/* Chat Target Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                aria-hidden="true"
                className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold flex items-center justify-center ring-2 ring-emerald-500 shrink-0"
              >
                邻
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <span>订单内留言（演练）</span>
                  <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded">
                    非实时
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  会话：{activeConversationId ?? '暂无订单会话'}
                </div>
              </div>
            </div>

            <span
              className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 text-[10px] font-bold"
              title="演练不采集手机号，无法拨打"
            >
              <PhoneCall className="w-4 h-4 inline" />
            </span>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 bg-white/80 px-2 py-0.5 rounded-full border shadow-2xs">
                留言只保存在本机浏览器 · 未加密、未上传、不会通知任何人
              </span>
            </div>

            {activeChatMessages.length === 0 && (
              <p className="text-center text-[11px] text-slate-400 py-6">
                暂无订单留言。先在「接单大厅」认领一条求助，或由发布者模拟接单后即可留言。
              </p>
            )}
            {activeChatMessages.map((chat) => (
              <div
                key={chat.id}
                className={`flex items-start gap-2 ${chat.isMe ? 'flex-row-reverse' : ''}`}
              >
                <div
                  aria-hidden="true"
                  className={`w-8 h-8 rounded-full shrink-0 mt-0.5 ring-1 ring-slate-200 flex items-center justify-center text-[11px] font-bold text-white ${
                    chat.isMe ? 'bg-emerald-600' : 'bg-slate-400'
                  }`}
                >
                  {chat.isMe ? '我' : '邻'}
                </div>
                <div className={`space-y-1 max-w-[78%] ${chat.isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`text-[10px] text-slate-400 ${chat.isMe ? 'text-right' : ''}`}>
                    {chat.senderName} · {chat.timestamp}
                  </div>
                  
                  {chat.type === 'location' ? (
                    <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 text-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                        <MapPin className="w-4 h-4" />
                        <span>{chat.locationInfo?.name || '实时位置共享'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {chat.locationInfo?.address}
                      </p>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      chat.isMe
                        ? 'bg-emerald-600 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                    }`}>
                      {chat.text}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Fast Response Chips */}
          <div className="p-2 bg-white border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="text-[10px] text-slate-400 font-bold shrink-0">快捷语:</span>
            {[
              '老人已准备好，门虚掩着',
              '我带好维修工具了，马上到达',
              '身体感觉如何？随身药带了吗？',
              '已到达楼下，请确认'
            ].map((text, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuickReply(text)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 text-[11px] border border-slate-200 whitespace-nowrap transition-colors"
              >
                {text}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendText} className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => explainUnavailable('发送定位')}
              className="p-2 rounded-xl text-slate-300 hover:bg-slate-100 transition-colors"
              title="本轮不含定位"
            >
              <MapPin className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => explainUnavailable('发送图片')}
              className="p-2 rounded-xl text-slate-300 hover:bg-slate-100 transition-colors"
              title="本轮不含图片上传"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="输入沟通留言..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>发送</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: 系统通知 */}
      {activeTab === 'system' && (
        <div className="space-y-3">
          {systemMessages.map((msg) => (
            <div key={msg.id} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {msg.title}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{msg.timestamp}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{msg.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: 投诉反馈工单 */}
      {activeTab === 'complaint' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-amber-950 text-xs sm:text-sm">
                遇到服务纠纷或不合规行为？
              </h3>
              <p className="text-[11px] text-amber-800 mt-0.5">
                可对具体内容提交举报；本演示只写本机记录，不会通知任何机构，也没有处置时限承诺。
              </p>
            </div>
            <button
              onClick={() => setShowComplaintForm(!showComplaintForm)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shadow-xs shrink-0"
            >
              {showComplaintForm ? '收起表单' : '提交申诉'}
            </button>
          </div>

          {/* Complaint Submission Form */}
          {showComplaintForm && (
            <form onSubmit={handleCreateComplaint} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">投诉纠纷类型：</label>
                <select
                  value={complaintReason}
                  onChange={(e) => setComplaintReason(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="服务未按约定时间到达">服务未按约定时间到达（爽约）</option>
                  <option value="服务态度不佳或存在安全隐患">服务态度不佳或存在安全隐患</option>
                  <option value="时间币结算争议">时间币结算争议 / 恶意记账</option>
                  <option value="线下涉及违规收费">线下涉及违规收费 / 违规变现</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">具体事实说明：</label>
                <textarea
                  value={complaintDetail}
                  onChange={(e) => setComplaintDetail(e.target.value)}
                  placeholder="请详细描述发生的时间、经过以及您的诉求..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowComplaintForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs"
                >
                  确认提交演练复核
                </button>
              </div>
            </form>
          )}

          {/* Existing Complaints */}
          <div className="space-y-3">
            {complaints.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-800">
                    工单：{item.ticketNo}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                    {item.statusLabel}
                  </span>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <p><strong>事由：</strong>{item.reason}</p>
                  <p className="text-slate-600">{item.detail}</p>
                </div>

                {item.resolutionNote && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-xs text-emerald-900 border border-emerald-200 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      演练复核办结记录 ({item.handlerName})：
                    </p>
                    <p>{item.resolutionNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
