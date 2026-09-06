// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { itemPath } from '@ghahve/shared/seo.js';

/* ══════════════════════════════════════════════════
   تنها تست کامپوننتیِ پروژه — و عمداً تنها.

   بقیهٔ تست‌ها روی توابع خالص‌اند (قاعدهٔ تست بدون پایگاه داده) و
   همین‌طور هم باید بمانند. ولی یک چیز هست که هیچ تابع
   خالصی نگهش نمی‌دارد: **اینکه کارت کالا واقعاً لینکی به
   صفحهٔ خودش رندر کند.**

   این یک بار شکست: در گذر اول فقط دکمهٔ «دربارهٔ این قهوه»
   لینک شده بود و آن دکمه پشت شرطِ hasStory بود، پس هر
   کالای بدون معرفی — یعنی همهٔ ابزارها و پودرها — هیچ
   لینکی به صفحهٔ خودش نداشت. مسیرها کار می‌کردند، sitemap
   درست بود، تست‌ها سبز بودند، و کالاها از داخل سایت
   دست‌نیافتنی بودند.

   پس دامنهٔ این فایل دقیقاً همین است و بیشتر نمی‌شود:
   هر نوع کالا، با متن و بی‌متن، باید <a href> به مسیر
   خودش داشته باشد.

   ── چه چیزی با مهاجرت به Next عوض شد (مورد ۲۶) ──
   سه چیز، و هیچ‌کدام دامنهٔ تست را عوض نکرد:

   • act از خودِ react می‌آید. در ری‌اکت ۱۹ صادرکردنش از
     react-dom/test-utils برداشته شده.
   • جای MemoryRouter، مسیر جاری با بدل‌کردن usePathname
     تعیین می‌شود؛ next/link خودش <a href> ساده رندر
     می‌کند، پس همهٔ سنجه‌ها سر جایشان‌اند.
   • ItemBody به‌جای کانتکست پارامتر می‌گیرد، پس بدلِ
     ShopContext کوچک‌تر شد.
   ══════════════════════════════════════════════════ */

/* ── مسیر جاری ──
   کارت روی صفحهٔ خودِ کالا نباید به خودش لینک بدهد، و این
   را از usePathname می‌فهمد. اینجا همان را کنترل می‌کنیم. */
let pathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname
}));

/* ── حداقلِ لازم برای رندر ──
   ShopContext واقعی موقع mount از سرور می‌خواند. اینجا
   فقط همان چند چیزی که ItemCard صدا می‌زند بدل می‌شود؛
   بدون شبکه، بدون مونگو. */
vi.mock('../web/src/context/ShopContext.jsx', () => ({
  useShop: () => ({
    addWeighed: () => {},
    addPiece: () => {},
    grind: 'whole',
    grindOptions: [{ value: 'whole', label: 'دانهٔ کامل' }],
    blendPrice: () => 0,
    bySlug: new Map()
  })
}));

const { default: ItemCard } = await import('../web/src/components/ItemCard.jsx');

/* نمونه‌ها: یکی از هر نوع، همه **بدون** story/taste/recommend —
   یعنی همان حالتی که قبلاً هیچ لینکی نمی‌ساخت. */
const BARE = [
  {
    kind: 'coffee',
    slug: 'brazil-santos',
    name: 'برزیل سانتوس',
    origin: 'برزیل',
    spec: '',
    group: 'medium',
    meter: 3,
    price: 900000,
    notes: [],
    pairs: [],
    tastes: [],
    grindable: true
  },
  {
    kind: 'gear',
    slug: 'v60-02',
    name: 'قیف وی۶۰',
    origin: 'سرامیک',
    spec: '',
    group: 'pourover',
    meter: 2,
    price: 980000,
    notes: [],
    pairs: [],
    tastes: [],
    grindable: false
  },
  {
    kind: 'powder',
    slug: 'mocha-powder',
    name: 'پودر موکا',
    origin: '',
    spec: '',
    group: 'chocolate',
    meter: 3,
    price: 700000,
    notes: [],
    pairs: [],
    tastes: [],
    grindable: false
  }
];

const WITH_STORY = { ...BARE[0], slug: 'yirgacheffe', name: 'یرگاچف', story: 'از گدئو می‌آید.' };

let host;
let root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function render(item, at = '/') {
  pathname = at;
  act(() => {
    root.render(
      <StrictMode>
        <ItemCard item={item} grams={250} onWeight={() => {}} />
      </StrictMode>
    );
  });
  return host;
}

describe('ItemCard — رسیدن به صفحهٔ کالا', () => {
  for (const item of BARE) {
    it(`«${item.name}» (${item.kind}، بدون معرفی) لینک صفحهٔ خودش را دارد`, () => {
      const el = render(item);
      const link = el.querySelector('h3 a');

      expect(link, 'نام کالا باید لینک باشد').not.toBeNull();
      expect(link.getAttribute('href')).toBe(itemPath(item));
      expect(link.textContent).toBe(item.name);
    });
  }

  it('هر سه نوع کالا مسیر نوعِ خودشان را می‌گیرند', () => {
    const hrefs = BARE.map((item) => render(item).querySelector('h3 a').getAttribute('href'));
    expect(hrefs).toEqual(['/coffee/brazil-santos', '/gear/v60-02', '/powder/mocha-powder']);
  });

  it('کالای بدون معرفی، لینک فرعی «دربارهٔ این…» ندارد — ولی بی‌لینک هم نمی‌ماند', () => {
    const el = render(BARE[1]);
    expect(el.querySelector('.card-more')).toBeNull();
    expect(el.querySelectorAll(`a[href="${itemPath(BARE[1])}"]`).length).toBeGreaterThan(0);
  });

  it('کالای دارای معرفی، هر دو لینک را دارد و هر دو به یک آدرس می‌روند', () => {
    const el = render(WITH_STORY);
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(el.querySelector('.card-more')).not.toBeNull();
    expect(hrefs.filter((h) => h === itemPath(WITH_STORY)).length).toBe(2);
  });

  it('روی صفحهٔ خودِ کالا، نام دیگر به خودش لینک نمی‌دهد', () => {
    const el = render(BARE[0], itemPath(BARE[0]));
    expect(el.querySelector('h3 a')).toBeNull();
    expect(el.querySelector('h3').textContent).toBe(BARE[0].name);
  });

  it('کارت به‌جز لینک‌ها هیچ عنصر کلیک‌پذیرِ ناوبری ندارد', () => {
    /* تصویر و زمینهٔ کارت عمداً کلیک‌پذیر نیستند: کنترل‌های
       داخل کارت را می‌بلعیدند. */
    const el = render(BARE[0]);
    expect(el.querySelector('.card-media a')).toBeNull();
    expect(el.querySelector('article').getAttribute('onclick')).toBeNull();
  });
});

/* ══════════════════════════════════════════════════
   دکمهٔ هم‌رسانی روی کارت.

   منطقش (ساختن آدرس و کپی) در tests/share.test.js
   سنجیده می‌شود. آنچه اینجا می‌ماند چیزی است که فقط در
   DOM دیده می‌شود: اینکه دکمهٔ واقعی باشد، نام کالا را
   در برچسبش داشته باشد، و — مهم‌تر از همه — کلیکش
   بازدیدکننده را از فهرست به صفحهٔ کالا نبرد.
   ══════════════════════════════════════════════════ */
describe('ItemCard — دکمهٔ هم‌رسانی', () => {
  for (const item of BARE) {
    it(`«${item.name}» (${item.kind}) دکمهٔ هم‌رسانی دارد`, () => {
      const btn = render(item).querySelector('.share-btn');

      expect(btn, 'هر سه نوع کالا باید دکمه داشته باشند').not.toBeNull();
      expect(btn.tagName).toBe('BUTTON');
      /* type=button یعنی هیچ فرمی را نمی‌فرستد */
      expect(btn.getAttribute('type')).toBe('button');
      expect(btn.getAttribute('aria-label')).toContain(item.name);
    });
  }

  it('دکمه لینک نیست و href ندارد — کلیکش صفحه را عوض نمی‌کند', () => {
    const el = render(BARE[0]);
    const btn = el.querySelector('.share-btn');

    expect(btn.closest('a')).toBeNull();
    expect(btn.getAttribute('href')).toBeNull();

    /* کلیک نباید رفتار پیش‌فرض داشته باشد — همان چیزی
       که اگر کارت روزی داخل لینکی بنشیند، ناوبری را
       جلو می‌گیرد. */
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      btn.dispatchEvent(ev);
    });

    expect(ev.defaultPrevented).toBe(true);
  });

  it('کلیک به هیچ کنترلِ بالادستی نمی‌رسد', () => {
    /* کارت امروز داخل چیز کلیک‌پذیری نیست، ولی روزی
       ممکن است باشد؛ آن روز نباید کلیکِ «بفرست» صفحه را
       عوض کند. سنجه در سطح ری‌اکت است، چون ری‌اکت
       رویدادها را از ریشه پخش می‌کند. */
    let outer = 0;
    pathname = '/';
    act(() => {
      root.render(
        <StrictMode>
          <div onClick={() => (outer += 1)}>
            <ItemCard item={BARE[0]} grams={250} onWeight={() => {}} />
          </div>
        </StrictMode>
      );
    });

    act(() => {
      host
        .querySelector('.share-btn')
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(outer).toBe(0);
  });

  it('روی صفحهٔ خودِ کالا هم هست — همان کارت، همان دکمه', () => {
    const el = render(BARE[0], itemPath(BARE[0]));
    expect(el.querySelector('.share-btn')).not.toBeNull();
  });

  it('بازخوردش را به توستِ سراسری می‌دهد، نه به کانتکست', () => {
    /* ShopContext اینجا بدل شده و **توست ندارد**. اگر
       دکمه دوباره سراغ کانتکست برود، همین‌جا می‌ترکد —
       و مهم‌تر: در مودال هم می‌ترکید، جایی که اصلاً
       Provider ای نیست (tests/item-detail.test.jsx). */
    const el = render(BARE[0]);

    act(() => {
      el.querySelector('.share-btn').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    /* خودِ نتیجهٔ کپی ناهمگام است و اینجا سنجیده نمی‌شود
       (جایش tests/share.test.js است)؛ آنچه اینجا مهم است
       این است که کلیک بدون کانتکست هم اجرا شد. */
    expect(el.querySelector('.share-btn')).not.toBeNull();
  });

  it('کنترل‌های خرید سر جایشان‌اند و دکمه بینشان ننشسته', () => {
    const el = render(BARE[0]);

    /* دکمهٔ هم‌رسانی در سرِ کارت است، نه داخل گروه وزن،
       نه داخل انتخاب آسیاب، نه پای کارت کنار «افزودن» */
    expect(el.querySelector('.weights .share-btn')).toBeNull();
    expect(el.querySelector('.card-grind .share-btn')).toBeNull();
    expect(el.querySelector('.card-foot .share-btn')).toBeNull();
    expect(el.querySelector('.card-top .share-btn')).not.toBeNull();

    expect(el.querySelectorAll('.weights .weight-btn').length).toBeGreaterThan(0);
    expect(el.querySelector('.card-grind select')).not.toBeNull();
    expect(el.querySelector('.card-foot .btn-primary').textContent).toBe('افزودن');
  });
});
