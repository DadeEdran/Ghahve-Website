// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { ShopProvider, useShop } from '../web/src/context/ShopContext.jsx';
import { CART_KEY } from '../web/src/lib/cartStorage.js';
import { lineKey } from '../web/src/lib/cartLine.js';

/* ══════════════════════════════════════════════════
   سبدِ ذخیره‌شده باید از یک چرخهٔ کاملِ
   «رندر سرور ← hydrate» دست‌نخورده بیرون بیاید.

   ── چرا این تست از همهٔ تست‌های این مهاجرت مهم‌تر است ──
   بقیهٔ چیزهایی که ممکن بود بشکنند، اگر بشکنند دیده
   می‌شوند: عنوان غلط، صفحهٔ ۴۰۴، تگ گم‌شده. این یکی
   دیده نمی‌شود. مشتری سبدش را پر می‌کند، صفحه‌ای را باز
   می‌کند، و سبد خالی است — بدون هیچ خطایی، بدون هیچ
   نشانه‌ای در لاگ. تنها کسی که می‌فهمد خودِ مشتری است و
   او هم چیزی نمی‌گوید، فقط نمی‌خرد.

   سه راهِ شکستنش هست و هر سه با رندر سمت سرور تازه‌اند:

   ۱) خواندن سبد در همان اولین رندر (`useState(loadCart)`)
      — روی سرور localStorage نیست، و اگر باشد HTML سرور
      با اولین رندر مرورگر جور درنمی‌آید.
   ۲) نوشتنِ سبد پیش از خواندنش — آرایهٔ خالیِ اولیه روی
      سبد ذخیره‌شده می‌نشیند.
   ۳) پاک‌سازیِ «ردیف‌های نامعتبر» پیش از خواندن سبد، یا
      روی صفحه‌ای که فهرست کالاهایش ناقص است.

   پس تست هر سه را جدا می‌سنجد، و روی یک چرخهٔ واقعی:
   renderToString برای سرور، hydrateRoot برای مرورگر.
   ══════════════════════════════════════════════════ */

const COFFEE = {
  _id: '1',
  slug: 'yirgacheffe',
  kind: 'coffee',
  name: 'یرگاچف',
  origin: 'اتیوپی',
  spec: '',
  group: 'light',
  meter: 2,
  price: 1850000,
  notes: [],
  pairs: [],
  tastes: [],
  grindable: true
};

const GEAR = {
  _id: '2',
  slug: 'v60-02',
  kind: 'gear',
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
};

/* سبدی که مشتری قبلاً ساخته: نیم کیلو قهوهٔ آسیاب اسپرسو */
const SAVED = [
  { slug: 'yirgacheffe', kind: 'coffee', grams: 500, qty: 0, grind: 'espresso', mix: [] }
];

/* پنجرهٔ کوچکی به حالت سبد — تنها راهِ دیدنش از بیرون */
function Probe() {
  const { cart, totals, hydrated } = useShop();
  return (
    <div
      id="probe"
      data-count={String(cart.length)}
      data-grams={String(totals.grams)}
      data-hydrated={String(hydrated)}
    >
      {cart.map((l) => l.key).join('|')}
    </div>
  );
}

const stored = () => JSON.parse(window.localStorage.getItem(CART_KEY) || 'null');

/** یک چرخهٔ کامل: رشتهٔ سرور، بعد hydrate روی همان رشته */
async function serverThenHydrate(props = {}) {
  const tree = (
    <ShopProvider initialItems={[COFFEE, GEAR]} {...props}>
      <Probe />
    </ShopProvider>
  );

  /* ۱) همان کاری که Next روی سرور می‌کند */
  const html = renderToString(tree);

  /* ۲) همان کاری که مرورگر با آن HTML می‌کند */
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);

  await act(async () => {
    hydrateRoot(host, tree);
  });

  return { html, probe: host.querySelector('#probe'), host };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('سبدِ ذخیره‌شده و چرخهٔ hydration', () => {
  it('سبد ذخیره‌شده پس از hydrate سر جایش است', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(SAVED));

    const { probe } = await serverThenHydrate();

    expect(probe.dataset.count).toBe('1');
    expect(probe.dataset.grams).toBe('500');
    expect(probe.textContent).toBe(lineKey('yirgacheffe', 'espresso', []));
  });

  it('حافظه هم دست‌نخورده مانده — آرایهٔ خالی رویش نوشته نشده', async () => {
    /* شکستِ شمارهٔ ۲: افکتِ نوشتن پیش از افکتِ خواندن. */
    window.localStorage.setItem(CART_KEY, JSON.stringify(SAVED));

    await serverThenHydrate();

    expect(stored()).toHaveLength(1);
    expect(stored()[0].slug).toBe('yirgacheffe');
    expect(stored()[0].grams).toBe(500);
  });

  it('HTML سرور سبد را **خالی** نشان می‌دهد — وگرنه hydration جور درنمی‌آید', async () => {
    /* شکستِ شمارهٔ ۱: سرور سبدی ندارد و نباید ادعا کند
       که دارد. یکی بودنِ این دو، شرطِ سالم ماندن درخت است. */
    window.localStorage.setItem(CART_KEY, JSON.stringify(SAVED));

    const { html } = await serverThenHydrate();

    expect(html).toContain('data-count="0"');
    expect(html).toContain('data-grams="0"');
    expect(html).toContain('data-hydrated="false"');
  });

  it('در طول کل چرخه، حتی یک بار سبدِ خالی روی حافظه نوشته نمی‌شود', async () => {
    /* ── چرا نگاه کردن به حالت پایانی کافی نیست ──
       بدون نگهبانِ hydrated، افکتِ نوشتن روی mount اجرا
       می‌شود و آرایهٔ خالیِ اولیه را روی سبد می‌نویسد؛ بعد
       افکتِ خواندن سبد را برمی‌گرداند و نوشتنِ دوم درستش
       می‌کند. یعنی نتیجهٔ نهایی سالم است و شکست **دیده
       نمی‌شود** — ولی پنجره‌ای هست که در آن سبدِ مشتری در
       حافظه پاک شده است. اگر همان لحظه تب بسته شود، سفارش
       رفته.

       پس به‌جای حالت پایانی، **دنبالهٔ نوشتن‌ها** سنجیده
       می‌شود. */
    window.localStorage.setItem(CART_KEY, JSON.stringify(SAVED));

    /* ── چرا روی prototype، نه روی خودِ localStorage ──
       شیء localStorage در jsdom یک Proxy است و
       جای‌گذاریِ متد روی خودش بی‌اثر می‌ماند — بی هیچ
       خطایی. یعنی نسخهٔ اولِ همین تست، هیچ نوشتنی را
       نمی‌دید و همیشه سبز بود. متدِ prototype واقعاً
       رهگیری می‌شود. */
    const writes = [];
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === CART_KEY) writes.push(value);
      return real.call(this, key, value);
    };

    try {
      await serverThenHydrate();
    } finally {
      Storage.prototype.setItem = real;
    }

    /* اگر رهگیری کار نکند تست باید بشکند، نه اینکه
       بی‌صدا سبز بماند. */
    expect(writes.length, 'هیچ نوشتنی رهگیری نشد — سنجه بی‌دندان است').toBeGreaterThan(0);

    expect(
      writes.every((w) => w !== '[]'),
      `نوشته‌ها: ${JSON.stringify(writes)}`
    ).toBe(true);
  });

  it('پرچم hydrated بعد از خواندن بالا می‌رود', async () => {
    const { probe } = await serverThenHydrate();
    expect(probe.dataset.hydrated).toBe('true');
  });

  it('سبد خالی، حافظهٔ خالی — چیزی از هوا ساخته نمی‌شود', async () => {
    const { probe } = await serverThenHydrate();
    expect(probe.dataset.count).toBe('0');
    expect(stored()).toEqual([]);
  });
});

describe('پاک‌سازی ردیف‌های نامعتبر', () => {
  it('روی فهرست ناقص (صفحهٔ یک کالا) سبد را پاک نمی‌کند', async () => {
    /* شکستِ شمارهٔ ۳، و همان چیزی که در گام سوم پیدا شد:
       صفحهٔ کالا فقط خودِ کالا را به Provider می‌دهد. بدون
       نگهبان، همین یک بازدید کل سبد را می‌بُرد.

       اینجا شبکه عمداً بدل نشده، پس کامل‌کردنِ فهرست شکست
       می‌خورد — و سبد باید **باز هم** سالم بماند. */
    window.localStorage.setItem(CART_KEY, JSON.stringify(SAVED));

    const { probe } = await serverThenHydrate({
      initialItems: [GEAR], // قهوهٔ داخل سبد اینجا نیست
      fullCatalogue: false
    });

    expect(probe.dataset.count).toBe('1');
    expect(stored()).toHaveLength(1);
  });

  it('روی فهرست ناقص، ردیف‌ها در جمع سبد هم می‌مانند — نه فقط در حافظه', async () => {
    /* ── باگی که در گام چهارم پیدا شد ──
       نگه داشتنِ ردیف در سبد کافی نیست. `resolved` ردیف‌ها
       را با سند کالا جفت می‌کند و هر ردیفِ بی‌سند را کنار
       می‌گذارد؛ و **بدنهٔ سفارش از همان resolved ساخته
       می‌شود**. پس روی صفحهٔ یک کالا، سبد در حافظه سالم بود
       ولی سفارش با ردیف‌های کمتر ثبت می‌شد — بی‌صدا.

       حالا Provider خودش فهرست را کامل می‌کند. این تست
       همان را می‌سنجد: وزنِ جمع باید کاملِ سبد باشد. */
    window.localStorage.setItem(CART_KEY, JSON.stringify(SAVED));

    /* شبکهٔ بدلی: همان چیزی که /api/items و /api/content
       واقعی می‌دهند. */
    const realFetch = global.fetch;
    global.fetch = async (url) => {
      const u = String(url);
      const body = u.includes('/api/items') ? JSON.stringify([COFFEE, GEAR]) : '{}';
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    };

    try {
      const { probe } = await serverThenHydrate({
        initialItems: [GEAR],
        fullCatalogue: false
      });

      /* یک نوبت دیگر تا پاسخِ کامل‌کردنِ فهرست بنشیند */
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(probe.dataset.count).toBe('1');
      expect(probe.dataset.grams, 'قهوهٔ سبد باید در جمع بیاید').toBe('500');
    } finally {
      global.fetch = realFetch;
    }
  });

  it('ولی روی فهرست کامل، کالای برداشته‌شده را حذف می‌کند', async () => {
    /* رفتار درست باید بماند: اگر مدیر کالایی را خاموش کند،
       ردیفش باید برود — وگرنه ثبت سفارش خطا می‌گیرد. */
    window.localStorage.setItem(CART_KEY, JSON.stringify(SAVED));

    const { probe } = await serverThenHydrate({
      initialItems: [GEAR], // فهرست کامل است و قهوه در آن نیست
      fullCatalogue: true
    });

    expect(probe.dataset.count).toBe('0');
    expect(stored()).toEqual([]);
  });

  it('ردیفِ میکسی که یکی از دانه‌هایش رفته هم حذف می‌شود', async () => {
    const blendLine = [
      {
        slug: 'espresso-70-30',
        kind: 'coffee',
        grams: 250,
        qty: 0,
        grind: 'espresso',
        mix: [
          { slug: 'cerrado', percent: 70 },
          { slug: 'gone', percent: 30 }
        ]
      }
    ];
    window.localStorage.setItem(CART_KEY, JSON.stringify(blendLine));

    const blend = { ...COFFEE, _id: '3', slug: 'espresso-70-30', isBlend: true };
    const cerrado = { ...COFFEE, _id: '4', slug: 'cerrado' };

    const { probe } = await serverThenHydrate({
      initialItems: [blend, cerrado], // «gone» نیست
      fullCatalogue: true
    });

    expect(probe.dataset.count).toBe('0');
  });
});
