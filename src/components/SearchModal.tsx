import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, FileText, Search, Users, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sound } from '../utils/audio';
import { toast } from '../utils/toast';
import { Modal } from '../ui/Modal';
import { Tag } from '../ui/Tag';
import { Avatar } from '../ui/Avatar';

const HOT_KEYWORDS = ['陪同就医', '高血压', '修水龙头', '非遗剪纸', '助行器'];

const TABS = [
  { key: 'all', label: '综合' },
  { key: 'orders', label: '求助' },
  { key: 'volunteers', label: '志愿者' },
  { key: 'posts', label: '动态' },
  { key: 'articles', label: '科普' },
];

export const SearchModal: React.FC = () => {
  const {
    orders,
    volunteers,
    posts,
    eldercareArticles,
    setActiveSubPage,
    setSelectedOrderId,
    setSelectedPostId,
    setSelectedArticleId,
    setActiveTab,
  } = useApp();

  const [keyword, setKeyword] = useState('');
  const [tab, setTab] = useState<'all' | 'orders' | 'volunteers' | 'posts' | 'articles'>('all');

  const q = keyword.trim().toLowerCase();

  const matchedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          !q ||
          order.title.toLowerCase().includes(q) ||
          order.description.toLowerCase().includes(q) ||
          order.categoryLabel.includes(q),
      ),
    [orders, q],
  );

  const matchedVolunteers = useMemo(
    () =>
      volunteers.filter(
        (vol) =>
          !q ||
          vol.name.toLowerCase().includes(q) ||
          vol.skills.some((skill) => skill.toLowerCase().includes(q)) ||
          vol.bio.includes(q),
      ),
    [volunteers, q],
  );

  const matchedPosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          !q ||
          post.title.toLowerCase().includes(q) ||
          post.content.toLowerCase().includes(q) ||
          post.tags?.some((tag) => tag.includes(q)),
      ),
    [posts, q],
  );

  const matchedArticles = useMemo(
    () =>
      eldercareArticles.filter(
        (article) =>
          !q ||
          article.title.toLowerCase().includes(q) ||
          article.summary.toLowerCase().includes(q) ||
          article.tag.includes(q),
      ),
    [eldercareArticles, q],
  );

  const counts: Record<string, number> = {
    all: matchedOrders.length + matchedVolunteers.length + matchedPosts.length + matchedArticles.length,
    orders: matchedOrders.length,
    volunteers: matchedVolunteers.length,
    posts: matchedPosts.length,
    articles: matchedArticles.length,
  };

  return (
    <Modal
      title="搜索"
      subtitle="服务、志愿者、社区动态与养老科普"
      onClose={() => setActiveSubPage(null)}
      wide
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          autoFocus
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索服务需求、附近志愿者、社区动态、养老科普…"
          className="nl-field nl-field--icon nl-field--lg pr-9"
          aria-label="搜索关键词"
        />
        {keyword ? (
          <button
            type="button"
            onClick={() => setKeyword('')}
            className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-page hover:text-ink"
            aria-label="清空搜索"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto">
        <span className="shrink-0 text-[9.5px] text-muted">热门搜索</span>
        {HOT_KEYWORDS.map((word) => (
          <button
            key={word}
            type="button"
            className="nl-chip h-7 shrink-0 px-2.5 text-[10.5px]"
            onClick={() => {
              sound.playTap();
              setKeyword(word);
            }}
          >
            {word}
          </button>
        ))}
      </div>

      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto border-b border-line pb-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nl-chip h-8 shrink-0 px-3 text-[11px]${tab === item.key ? ' nl-chip--active' : ''}`}
            aria-pressed={tab === item.key}
            onClick={() => {
              sound.playTap();
              setTab(item.key as typeof tab);
            }}
          >
            {item.label}
            <span className={`nl-num text-[9.5px] ${tab === item.key ? 'text-white/80' : 'text-muted'}`}>
              {counts[item.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-4">
        {counts.all === 0 ? (
          <div className="nl-empty">
            <p className="nl-empty__title">没有找到匹配内容</p>
            <p className="nl-empty__hint">试试更短的关键词，或换一个分类。</p>
          </div>
        ) : null}

        {(tab === 'all' || tab === 'orders') && matchedOrders.length > 0 ? (
          <section className="grid gap-1.5">
            <h3 className="text-[10px] font-semibold tracking-wide text-muted">求助订单</h3>
            {matchedOrders.slice(0, 4).map((order) => (
              <button
                key={order.id}
                type="button"
                className="nl-row rounded-[12px] border border-line bg-white"
                onClick={() => {
                  sound.playTap();
                  setSelectedOrderId(order.id);
                  setActiveSubPage('order_detail');
                }}
              >
                <div className="nl-row__main">
                  <span className="nl-row__title">
                    <Tag tone={order.isUrgent ? 'danger' : 'neutral'}>{order.categoryLabel}</Tag>
                    <span className="truncate">{order.title}</span>
                  </span>
                  <span className="nl-row__sub">
                    {order.locationArea} · +{order.timeCoinReward} 时间币
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
              </button>
            ))}
          </section>
        ) : null}

        {(tab === 'all' || tab === 'volunteers') && matchedVolunteers.length > 0 ? (
          <section className="grid gap-1.5">
            <h3 className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted">
              <Users className="h-3 w-3" aria-hidden="true" />
              志愿者
            </h3>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {matchedVolunteers.map((vol) => (
                <div
                  key={vol.id}
                  className="flex items-center gap-2.5 rounded-[12px] border border-line bg-white px-3 py-2.5"
                >
                  <Avatar name={vol.name} size="sm" tone="accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-semibold text-ink">{vol.name}</p>
                    <p className="mt-0.5 truncate text-[9.5px] text-muted">{vol.skills.join(' / ')}</p>
                  </div>
                  <span className="nl-tag nl-tag--accent shrink-0">{vol.badge}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {(tab === 'all' || tab === 'posts') && matchedPosts.length > 0 ? (
          <section className="grid gap-1.5">
            <h3 className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted">
              <FileText className="h-3 w-3" aria-hidden="true" />
              社区动态
            </h3>
            {matchedPosts.slice(0, 4).map((post) => (
              <button
                key={post.id}
                type="button"
                className="nl-row rounded-[12px] border border-line bg-white"
                onClick={() => {
                  sound.playTap();
                  setSelectedPostId(post.id);
                  setActiveSubPage(null);
                  setActiveTab('community');
                  toast('已跳到社区信息流；演示不提供单帖详情页。');
                }}
              >
                <div className="nl-row__main">
                  <span className="nl-row__title truncate">{post.title || post.content.slice(0, 30)}</span>
                  <span className="nl-row__sub">
                    {post.userName} · {post.categoryLabel}
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
              </button>
            ))}
          </section>
        ) : null}

        {(tab === 'all' || tab === 'articles') && matchedArticles.length > 0 ? (
          <section className="grid gap-1.5">
            <h3 className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted">
              <BookOpen className="h-3 w-3" aria-hidden="true" />
              养老科普
            </h3>
            {matchedArticles.map((article) => (
              <button
                key={article.id}
                type="button"
                className="nl-row rounded-[12px] border border-line bg-white"
                onClick={() => {
                  sound.playTap();
                  setSelectedArticleId(article.id);
                  setActiveSubPage('eldercare_detail');
                }}
              >
                <div className="nl-row__main">
                  <span className="nl-row__title truncate">{article.title}</span>
                  <span className="nl-row__sub">
                    {article.categoryLabel} · {article.tag}
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
              </button>
            ))}
          </section>
        ) : null}
      </div>
    </Modal>
  );
};
