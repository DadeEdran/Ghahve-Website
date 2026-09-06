import { describe, it, expect } from 'vitest';
import {
  buildSitemap,
  buildRobots,
  itemSitemapEntries,
  escapeXml,
  lastmodOf,
  headTags
} from '@ghahve/shared/seo.js';
import { baseUrlFor } from '../server/src/lib/siteUrl.js';

/* ══════════════════════════════════════════════════
   مورد ۲۹ — نقشهٔ سایت، robots و پیش‌نمایش لینک.

   نقشهٔ سایت را سرور از فهرست زندهٔ کالاها می‌سازد، پس
   چیزی که اینجا سنجیده می‌شود سازندهٔ خالص است: شکل XML،
   escape شدن، و اینکه کالای خاموش وارد نشود.
   ══════════════════════════════════════════════════ */

const BASE = 'https://daneh.coffee';

const items = [
  { slug: 'yirgacheffe', kind: 'coffee', updatedAt: '2026-08-12T01:38:18.203Z' },
  { slug: 'hario-v60', kind: 'gear', updatedAt: new Date('2026-07-01T10:00:00Z') },
  { slug: 'matcha', kind: 'powder' }
];

describe('escapeXml', () => {
  it('هر پنج نویسهٔ خطرناک XML را می‌بندد', () => {
    expect(escapeXml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&apos;');
  });

  it('مقدار نبود را به رشتهٔ خالی تبدیل می‌کند', () => {
    expect(escapeXml(undefined)).toBe('');
    expect(escapeXml(null)).toBe('');
  });
});

describe('lastmodOf', () => {
  it('تاریخ را به شکل YYYY-MM-DD می‌دهد', () => {
    expect(lastmodOf('2026-08-12T01:38:18.203Z')).toBe('2026-08-12');
    expect(lastmodOf(new Date('2026-07-01T10:00:00Z'))).toBe('2026-07-01');
  });

  it('تاریخ نامعتبر یا نبود، رشتهٔ خالی می‌دهد — نه تاریخ غلط', () => {
    expect(lastmodOf('نه یک تاریخ')).toBe('');
    expect(lastmodOf(undefined)).toBe('');
    expect(lastmodOf(null)).toBe('');
  });
});

describe('itemSitemapEntries', () => {
  it('برای هر کالا مسیر درست همان نوع را می‌سازد', () => {
    const entries = itemSitemapEntries(items);
    expect(entries.map((e) => e.path)).toEqual([
      '/coffee/yirgacheffe',
      '/gear/hario-v60',
      '/powder/matcha'
    ]);
  });

  it('کالای بی‌شناسه یا با نوع ناشناخته کنار گذاشته می‌شود', () => {
    const entries = itemSitemapEntries([
      ...items,
      { kind: 'coffee' },
      { slug: 'x', kind: 'mystery' },
      null
    ]);
    expect(entries).toHaveLength(3);
  });

  it('تاریخ ویرایش کالا به lastmod می‌رسد', () => {
    expect(itemSitemapEntries(items)[0].lastmod).toBe(items[0].updatedAt);
  });
});

describe('buildSitemap', () => {
  const xml = buildSitemap(
    [
      { path: '/', lastmod: '2026-08-16T00:00:00Z', changefreq: 'daily', priority: 1 },
      ...itemSitemapEntries(items)
    ],
    { baseUrl: BASE }
  );

  it('سرآیند و namespace استاندارد دارد', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('به تعداد ردیف‌ها <url> دارد', () => {
    expect(xml.match(/<url>/g)).toHaveLength(4);
    expect(xml.match(/<\/url>/g)).toHaveLength(4);
  });

  it('همهٔ آدرس‌ها مطلق‌اند و روی آدرس پایه', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([
      `${BASE}/`,
      `${BASE}/coffee/yirgacheffe`,
      `${BASE}/gear/hario-v60`,
      `${BASE}/powder/matcha`
    ]);
    expect(locs.every((u) => u.startsWith('https://'))).toBe(true);
  });

  it('هیچ آدرسی دو اسلش پشت‌سرهم ندارد', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.every((u) => !u.slice('https://'.length).includes('//'))).toBe(true);
  });

  it('lastmod فقط برای کالایی می‌آید که تاریخ دارد', () => {
    expect(xml).toContain('<lastmod>2026-08-12</lastmod>');
    /* «matcha» تاریخ ندارد، پس نباید lastmod خالی بگیرد */
    expect(xml).not.toContain('<lastmod></lastmod>');
    expect(xml.match(/<lastmod>/g)).toHaveLength(3);
  });

  it('priority با یک رقم اعشار نوشته می‌شود', () => {
    expect(xml).toContain('<priority>1.0</priority>');
    expect(xml).toContain('<priority>0.8</priority>');
  });

  it('آدرس پایه هرچه باشد escape می‌شود', () => {
    const dirty = buildSitemap([{ path: '/x' }], { baseUrl: 'https://a.test/?q=1&r=2' });
    expect(dirty).toContain('&amp;');
    expect(dirty).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  });

  it('نقشهٔ خالی هم XML معتبری است', () => {
    const empty = buildSitemap([], { baseUrl: BASE });
    expect(empty).toContain('<urlset');
    expect(empty).not.toContain('<url>');
  });

  it('اسلش اضافهٔ آدرس پایه دو بار نمی‌شود', () => {
    const x = buildSitemap([{ path: '/coffee/a' }], { baseUrl: 'https://daneh.coffee/' });
    expect(x).toContain(`<loc>https://daneh.coffee/coffee/a</loc>`);
  });
});

describe('buildRobots', () => {
  const txt = buildRobots({ baseUrl: BASE });

  it('پنل مدیریت و API بسته‌اند', () => {
    expect(txt).toContain('Disallow: /admin');
    expect(txt).toContain('Disallow: /api/');
  });

  it('صفحهٔ پیگیری ایندکس نمی‌شود', () => {
    expect(txt).toContain('Disallow: /track');
  });

  it('/uploads باز است — عکس کالاها باید در جست‌وجوی تصویر پیدا شود', () => {
    expect(txt).not.toContain('Disallow: /uploads');
  });

  it('به نقشهٔ سایت اشاره می‌کند', () => {
    expect(txt).toContain(`Sitemap: ${BASE}/sitemap.xml`);
  });

  it('بدون آدرس پایه، خط Sitemap ساخته نمی‌شود — نه آدرس نسبی', () => {
    const bare = buildRobots({});
    expect(bare).not.toContain('Sitemap:');
    expect(bare).toContain('User-agent: *');
  });

  it('با یک خط خالی تمام می‌شود، مثل هر robots.txt', () => {
    expect(txt.endsWith('\n')).toBe(true);
  });
});

describe('baseUrlFor — آدرس پایهٔ سرور', () => {
  const req = { protocol: 'http', get: (h) => (h === 'host' ? 'localhost:4000' : '') };

  it('SITE_URL اولویت دارد', () => {
    expect(baseUrlFor(req, { SITE_URL: BASE })).toBe(BASE);
  });

  it('بدون SITE_URL از خودِ درخواست ساخته می‌شود', () => {
    expect(baseUrlFor(req, {})).toBe('http://localhost:4000');
  });

  it('SITE_URL خالی یا فاصله‌ای نادیده گرفته می‌شود', () => {
    expect(baseUrlFor(req, { SITE_URL: '   ' })).toBe('http://localhost:4000');
  });
});

describe('headTags — تگ‌های Open Graph و کارت توییتر', () => {
  const state = {
    title: 'یرگاچف — رُست‌خانهٔ دانه',
    description: 'اتیوپی · گدئو',
    canonical: `${BASE}/coffee/yirgacheffe`,
    ogType: 'product',
    siteName: 'رُست‌خانهٔ دانه',
    locale: 'fa_IR',
    image: `${BASE}/img/og-default.png`,
    imageAlt: 'یرگاچف',
    jsonLd: ['{"@type":"Product"}']
  };

  const tags = headTags(state);
  const find = (tag, attr, key) =>
    tags.find((t) => t.tag === tag && t.attrs[attr] === key)?.attrs.content;

  it('عنوان، توضیح، نوع و آدرس در OG هستند', () => {
    expect(find('meta', 'property', 'og:title')).toBe(state.title);
    expect(find('meta', 'property', 'og:description')).toBe(state.description);
    expect(find('meta', 'property', 'og:type')).toBe('product');
    expect(find('meta', 'property', 'og:url')).toBe(state.canonical);
    expect(find('meta', 'property', 'og:image')).toBe(state.image);
    expect(find('meta', 'property', 'og:locale')).toBe('fa_IR');
  });

  it('کارت توییتر با تصویر، بزرگ می‌شود', () => {
    expect(find('meta', 'name', 'twitter:card')).toBe('summary_large_image');
  });

  it('بدون تصویر، کارت توییتر ساده می‌شود', () => {
    const t = headTags({ ...state, image: '' });
    expect(t.find((x) => x.attrs.name === 'twitter:card').attrs.content).toBe('summary');
    expect(t.some((x) => x.attrs.name === 'twitter:image')).toBe(false);
  });

  it('canonical یک تگ link است، نه meta', () => {
    const link = tags.find((t) => t.tag === 'link');
    expect(link.attrs).toEqual({ rel: 'canonical', href: state.canonical });
  });

  it('JSON-LD در یک script با نوع درست می‌نشیند', () => {
    const script = tags.find((t) => t.tag === 'script');
    expect(script.attrs.type).toBe('application/ld+json');
    expect(script.text).toBe(state.jsonLd[0]);
  });

  it('تگ خالی ساخته نمی‌شود', () => {
    const bare = headTags({ title: 'فقط عنوان' });
    expect(bare.every((t) => t.tag !== 'link')).toBe(true);
    expect(bare.some((t) => t.attrs.name === 'description')).toBe(false);
    /* og:title از title پر می‌شود، حتی وقتی ogTitle نداده‌ایم */
    expect(bare.find((t) => t.attrs.property === 'og:title').attrs.content).toBe('فقط عنوان');
  });

  it('robots فقط وقتی می‌آید که خواسته باشیم', () => {
    expect(tags.some((t) => t.attrs.name === 'robots')).toBe(false);
    const noindex = headTags({ title: 'x', robots: 'noindex, follow' });
    expect(noindex.find((t) => t.attrs.name === 'robots').attrs.content).toBe('noindex, follow');
  });
});
