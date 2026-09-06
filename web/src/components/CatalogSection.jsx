'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { KINDS } from '../lib/groups.js';
import { toFa } from '../lib/format.js';
import { useShop } from '../context/ShopContext.jsx';
import { useReveal } from '../lib/useReveal.js';
import ItemCard from './ItemCard.jsx';

/* ══════════════════════════════════════════════════
   یک بخش فهرست کالا: فیلتر دسته، جست‌وجو، ترتیب و
   شبکهٔ کارت‌ها. هر سه بخش سایت (قهوه، ابزار، پودر)
   همین کامپوننت‌اند با kind متفاوت.
   ══════════════════════════════════════════════════ */

export default function CatalogSection({
  kind,
  id,
  className,
  eyebrow,
  title,
  desc,
  searchPlaceholder,
  emptyText,
  countWord,
  filter,
  setFilter
}) {
  const { byKind } = useShop();
  const meta = KINDS[kind];
  const all = byKind[kind] || [];

  const [sort, setSort] = useState('rank');
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [weights, setWeights] = useState({});

  /* جست‌وجو با کمی تأخیر، مثل نسخهٔ اولیه */
  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuery(queryInput), 160);
    return () => clearTimeout(timer.current);
  }, [queryInput]);

  /* وزن پیش‌فرض هر کارت */
  const gramsFor = (slug) => weights[slug] ?? meta.defaultWeight;
  const setWeight = (slug, w) => setWeights((prev) => ({ ...prev, [slug]: w }));

  const counts = useMemo(() => {
    const map = {};
    for (const it of all) map[it.group] = (map[it.group] || 0) + 1;
    return map;
  }, [all]);

  const visible = useMemo(() => {
    const q = query.trim();
    let list = all.filter((p) => filter === 'all' || p.group === filter);

    if (q) {
      const hay = (p) =>
        [p.name, p.origin, p.spec, ...p.notes, ...p.pairs, meta.groups[p.group]?.label || ''].join(
          ' '
        );
      list = list.filter((p) => hay(p).includes(q));
    }

    /* جدول مرتب‌سازی — نام‌ها زیر هم */
    // prettier-ignore
    const by = {
      rank:         (a, b) => a.rank - b.rank,
      'price-asc':  (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      'meter-asc':  (a, b) => a.meter - b.meter || a.rank - b.rank,
      'meter-desc': (a, b) => b.meter - a.meter || a.rank - b.rank,
      name:         (a, b) => a.name.localeCompare(b.name, 'fa')
    };
    return [...list].sort(by[sort] || by.rank);
  }, [all, filter, query, sort, meta]);

  /* وقتی همه‌چیز نمایش داده می‌شود و ترتیب پیشنهادی است،
     کالاها دسته‌بندی‌شده نشان داده می‌شوند. */
  const grouped = filter === 'all' && sort === 'rank' && !query.trim();

  useReveal([visible, grouped]);

  const renderCard = (item) => (
    <ItemCard
      key={item._id || item.slug}
      item={item}
      grams={gramsFor(item.slug)}
      onWeight={setWeight}
    />
  );

  return (
    <section className={className} id={id}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <p className="section-desc">{desc}</p>
        </div>

        <div className="toolbar">
          <div className="filters" role="group" aria-label={`فیلتر بر اساس دسته`}>
            <button
              type="button"
              className={`chip ${filter === 'all' ? 'is-active' : ''}`.trim()}
              onClick={() => setFilter('all')}
            >
              همه <b>{toFa(all.length)}</b>
            </button>
            {meta.order.map((g) => (
              <button
                key={g}
                type="button"
                className={`chip ${filter === g ? 'is-active' : ''}`.trim()}
                onClick={() => setFilter(g)}
              >
                {meta.groups[g].label} <b>{toFa(counts[g] || 0)}</b>
              </button>
            ))}
          </div>

          <div className="tools">
            <label className="search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m16 16 4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="search"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
            </label>

            <label className="sortbox">
              <span>ترتیب</span>
              <select
                className="select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="ترتیب نمایش"
              >
                <option value="rank">پیشنهاد ما</option>
                <option value="price-asc">ارزان‌ترین</option>
                <option value="price-desc">گران‌ترین</option>
                <option value="meter-asc">{meta.sortLow}</option>
                <option value="meter-desc">{meta.sortHigh}</option>
                <option value="name">حروف الفبا</option>
              </select>
            </label>

            <span className="result-count">
              {visible.length ? `${toFa(visible.length)} ${countWord}` : 'بدون نتیجه'}
            </span>
          </div>
        </div>

        <div>
          {grouped ? (
            meta.order.map((g) => {
              const list = visible.filter((p) => p.group === g);
              if (!list.length) return null;
              return (
                <section className="cat" key={g}>
                  <div className="cat-head">
                    <h3>
                      {meta.groups[g].label}
                      <span>
                        {toFa(list.length)} {countWord}
                      </span>
                    </h3>
                    <p>{meta.groups[g].desc}</p>
                  </div>
                  <div className="grid-inner">{list.map(renderCard)}</div>
                </section>
              );
            })
          ) : (
            <div className="grid-inner">{visible.map(renderCard)}</div>
          )}
        </div>

        {visible.length === 0 ? <p className="empty">{emptyText}</p> : null}
      </div>
    </section>
  );
}
