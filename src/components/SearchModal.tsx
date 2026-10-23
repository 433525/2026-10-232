import React, { useState } from 'react';
import { Search, X, HeartHandshake, Users, BookOpen, FileText, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';

export const SearchModal: React.FC = () => {
  const { 
    orders, 
    volunteers, 
    posts, 
    eldercareArticles, 
    setActiveSubPage, 
    setSelectedOrderId, 
    setSelectedPostId, 
    setSelectedArticleId 
  } = useApp();

  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'volunteers' | 'posts' | 'articles'>('all');

  const q = keyword.trim().toLowerCase();

  const matchedOrders = orders.filter(o => 
    !q || o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || o.categoryLabel.includes(q)
  );

  const matchedVolunteers = volunteers.filter(v => 
    !q || v.name.toLowerCase().includes(q) || v.skills.some(s => s.toLowerCase().includes(q)) || v.bio.includes(q)
  );

  const matchedPosts = posts.filter(p => 
    !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || (p.tags && p.tags.some(t => t.includes(q)))
  );

  const matchedArticles = eldercareArticles.filter(a => 
    !q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.tag.includes(q)
  );

  const hotKeywords = ['陪同就医', '高血压', '修水龙头', '张大爷', '非遗剪纸', '助行器', '陈明'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Search Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索服务需求、附近志愿者、社区动态、养老科普..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800 text-white placeholder-slate-400 text-xs sm:text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setActiveSubPage(null);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hot Tags */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">热门搜索:</span>
          {hotKeywords.map(k => (
            <button
              key={k}
              onClick={() => {
                sound.playTap();
                setKeyword(k);
              }}
              className="px-2.5 py-0.5 rounded-full bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-xs border border-slate-200 whitespace-nowrap transition-colors"
            >
              {k}
            </button>
          ))}
        </div>

        {/* Categories Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 text-xs font-semibold text-slate-500 shrink-0">
          {[
            { key: 'all', label: '综合' },
            { key: 'orders', label: `求助订单 (${matchedOrders.length})` },
            { key: 'volunteers', label: `志愿者 (${matchedVolunteers.length})` },
            { key: 'posts', label: `社区动态 (${matchedPosts.length})` },
            { key: 'articles', label: `养老科普 (${matchedArticles.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => {
                sound.playTap();
                setActiveTab(t.key as typeof activeTab);
              }}
              className={`py-2.5 px-3 border-b-2 transition-colors ${
                activeTab === t.key ? 'border-emerald-600 text-emerald-800 font-bold' : 'border-transparent hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Orders Section */}
          {(activeTab === 'all' || activeTab === 'orders') && matchedOrders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                <span>求助订单</span>
              </div>
              <div className="space-y-1.5">
                {matchedOrders.slice(0, 3).map(order => (
                  <button
                    key={order.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedOrderId(order.id);
                      setActiveSubPage('order_detail');
                    }}
                    className="w-full p-2.5 text-left rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          {order.categoryLabel}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {order.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {order.locationArea} · +{order.timeCoinReward} 币
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Volunteers Section */}
          {(activeTab === 'all' || activeTab === 'volunteers') && matchedVolunteers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>认证志愿者</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchedVolunteers.map(vol => (
                  <div
                    key={vol.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5"
                  >
                    <img src={vol.avatar} alt={vol.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate">{vol.name}</span>
                        <span className="text-[10px] text-amber-600 font-bold">★ {vol.rating}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {vol.skills.join(' / ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {(activeTab === 'all' || activeTab === 'posts') && matchedPosts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>社区动态与帖子</span>
              </div>
              <div className="space-y-1.5">
                {matchedPosts.slice(0, 3).map(post => (
                  <button
                    key={post.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedPostId(post.id);
                      setActiveSubPage('post_detail');
                    }}
                    className="w-full p-2.5 text-left rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{post.title || post.content.slice(0, 30)}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{post.userName} · {post.categoryLabel}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Articles Section */}
          {(activeTab === 'all' || activeTab === 'articles') && matchedArticles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                <span>养老科普指南</span>
              </div>
              <div className="space-y-1.5">
                {matchedArticles.map(art => (
                  <button
                    key={art.id}
                    onClick={() => {
                      sound.playTap();
                      setSelectedArticleId(art.id);
                      setActiveSubPage('eldercare_detail');
                    }}
                    className="w-full p-2.5 text-left rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{art.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{art.categoryLabel} · {art.tag}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
