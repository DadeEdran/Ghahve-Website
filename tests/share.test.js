import { describe, it, expect, vi } from 'vitest';
import { itemPath, itemUrl, itemHeadState } from '@ghahve/shared/seo.js';
import {
  itemShareUrl,
  shareItem,
  copyText,
  isTouchDevice,
  SHARE_COPIED,
  SHARE_FAILED
} from '../web/src/lib/share.js';

/* ══════════════════════════════════════════════════
   دکمهٔ هم‌رسانی کالا.

   دو چیز اینجا سنجیده می‌شود و هر دو یک بار می‌توانستند
   بی‌صدا خراب باشند:

   ۱. **آدرسی که فرستاده می‌شود.** لینکی که مشتری برای
      دوستش می‌فرستد باید همان canonical صفحه باشد. اگر
      کسی روزی آدرس را دستی بسازد (`/coffee/` + slug)،
      روزِ عوض‌شدن مسیرها یا آدرس پایه، لینک‌های فرستاده‌شده
      به ۴۰۴ می‌رسند و هیچ تستی خبردار نمی‌شود. پس اینجا
      صریحاً با خروجی itemHeadState سنجیده می‌شود.

   ۲. **کدام راه، روی کدام دستگاه.** روی دسکتاپ — یعنی
      بیشتر بازدیدها — کپی تنها راهِ عملیِ دکمه است. اگر
      بی‌صدا شکست بخورد، کاربر یک توست می‌بیند و هیچ
      لینکی ندارد.

      و یک دامِ مشخص که این فایل نگهبانش است: کرومِ
      ویندوز navigator.share **دارد**، ولی برگه‌ای که باز
      می‌کند بی‌کار بسته می‌شود و لینک هیچ‌جا کپی
      نمی‌شود. پس صرفِ بودنِ share نباید ما را به آن راه
      ببرد؛ ملاک لمسی‌بودنِ دستگاه است.

   همه‌چیز تزریق می‌شود (navigator و document پارامترند)
   پس این فایل به مرورگر نیاز ندارد — قاعدهٔ ۹.
   ══════════════════════════════════════════════════ */

const ITEMS = {
  coffee: { kind: 'coffee', slug: 'yirgacheffe', name: 'یرگاچف' },
  gear: { kind: 'gear', slug: 'v60-02', name: 'قیف وی۶۰' },
  powder: { kind: 'powder', slug: 'matcha-ceremonial', name: 'ماچا تشریفاتی' }
};

const ENV = { NEXT_PUBLIC_SITE_URL: 'https://daneh.example' };

describe('itemShareUrl — همان نشانی متعارف صفحه', () => {
  for (const [kind, item] of Object.entries(ITEMS)) {
    it(`${kind}: دقیقاً canonicalِ خودِ صفحه است`, () => {
      const canonical = itemHeadState(item, { baseUrl: 'https://daneh.example' }).canonical;

      expect(itemShareUrl(item, ENV)).toBe(canonical);
      /* و همان چیزی که sitemap می‌سازد */
      expect(itemShareUrl(item, ENV)).toBe(itemUrl('https://daneh.example', item));
    });
  }

  it('آدرس مطلق است و مسیرِ نوعِ خودش را دارد', () => {
    expect(itemShareUrl(ITEMS.coffee, ENV)).toBe('https://daneh.example/coffee/yirgacheffe');
    expect(itemShareUrl(ITEMS.gear, ENV)).toBe('https://daneh.example/gear/v60-02');
    expect(itemShareUrl(ITEMS.powder, ENV)).toBe('https://daneh.example/powder/matcha-ceremonial');
  });

  it('اسلشِ اضافه در آدرس پایه، آدرسِ دواسلشه نمی‌سازد', () => {
    const url = itemShareUrl(ITEMS.coffee, { NEXT_PUBLIC_SITE_URL: 'https://daneh.example/' });
    expect(url).toBe('https://daneh.example/coffee/yirgacheffe');
    expect(url).not.toContain('//coffee');
  });

  it('بدون آدرس پایه، مسیر نسبیِ درست می‌ماند — نه آدرسِ حدسی', () => {
    /* روی سرور و بدون SITE_URL، siteBaseUrl رشتهٔ خالی
       می‌دهد؛ مسیر نسبی بهتر از آدرس غلط است. */
    expect(itemShareUrl(ITEMS.coffee, {})).toBe(itemPath(ITEMS.coffee));
  });
});

/* ── بدل‌ها ──
   کمترین چیزی که کد واقعاً صدا می‌زند. */
const clipboardNav = () => {
  const writes = [];
  return {
    writes,
    nav: { clipboard: { writeText: (t) => (writes.push(t), Promise.resolve()) } }
  };
};

/* window بدلی، فقط برای همان یک پرسش: نشانگر اصلی انگشت
   است یا ماوس؟ همان چیزی که isTouchDevice می‌پرسد. */
const touchWin = { matchMedia: (q) => ({ matches: q === '(pointer: coarse)' }) };
const mouseWin = { matchMedia: () => ({ matches: false }) };

/* document بدلی برای راهِ execCommand — همان چند متدی که
   copyText لمس می‌کند. */
const fakeDoc = (ok = true) => {
  const el = { value: '', style: {}, setAttribute: () => {}, select: () => {} };
  const doc = {
    made: 0,
    added: [],
    removed: [],
    copied: null,
    createElement: () => (doc.made++, el),
    execCommand: () => ((doc.copied = el.value), ok),
    body: {
      appendChild: (n) => doc.added.push(n),
      removeChild: (n) => doc.removed.push(n)
    }
  };
  return doc;
};

describe('shareItem — برگهٔ سیستم، وقتی هست', () => {
  it('navigator.share را با نام کالا و نشانی متعارفش صدا می‌زند', async () => {
    const share = vi.fn(() => Promise.resolve());
    const res = await shareItem(ITEMS.coffee, {
      nav: { share },
      win: touchWin,
      url: 'https://daneh.example/coffee/yirgacheffe'
    });

    expect(share).toHaveBeenCalledWith({
      title: 'یرگاچف',
      url: 'https://daneh.example/coffee/yirgacheffe'
    });
    expect(res.mode).toBe('shared');
  });

  it('نشانی را خودش از canonical می‌سازد اگر داده نشود', async () => {
    const share = vi.fn(() => Promise.resolve());
    await shareItem(ITEMS.gear, { nav: { share }, win: touchWin, env: ENV });

    expect(share.mock.calls[0][0].url).toBe('https://daneh.example/gear/v60-02');
  });

  it('بستنِ برگه توسط کاربر خطا نیست و به کپی نمی‌افتد', async () => {
    const { nav, writes } = clipboardNav();
    nav.share = () => Promise.reject(Object.assign(new Error('canceled'), { name: 'AbortError' }));

    const res = await shareItem(ITEMS.coffee, { nav, win: touchWin, url: 'u' });

    expect(res.mode).toBe('canceled');
    expect(writes).toEqual([]);
  });

  it('اگر share به دلیل دیگری شکست بخورد، دستِ مشتری خالی نمی‌ماند', async () => {
    const { nav, writes } = clipboardNav();
    nav.share = () => Promise.reject(new Error('NotAllowedError'));

    const res = await shareItem(ITEMS.coffee, {
      nav,
      win: touchWin,
      url: 'https://daneh.example/coffee/x'
    });

    expect(res.mode).toBe('copied');
    expect(writes).toEqual(['https://daneh.example/coffee/x']);
  });
});

describe('isTouchDevice — نشانگر اصلی، نه صرفِ لمس‌پذیری', () => {
  it('نشانگر درشت یعنی لمسی', () => {
    expect(isTouchDevice({ nav: {}, win: touchWin })).toBe(true);
  });

  it('نشانگر ظریف یعنی دسکتاپ، حتی با انگشتِ در دسترس', () => {
    /* لپ‌تاپ لمسی: صفحه لمس می‌شود ولی نشانگر اصلی ماوس
       است. آنجا کپی به کار کاربر می‌آید. */
    expect(isTouchDevice({ nav: { maxTouchPoints: 10 }, win: mouseWin })).toBe(false);
  });

  it('بی matchMedia، maxTouchPoints تکیه‌گاه آخر است', () => {
    expect(isTouchDevice({ nav: { maxTouchPoints: 5 }, win: {} })).toBe(true);
    expect(isTouchDevice({ nav: { maxTouchPoints: 0 }, win: {} })).toBe(false);
    expect(isTouchDevice({ nav: {}, win: {} })).toBe(false);
  });

  it('بدون هیچ‌کدام هم نمی‌ترکد', () => {
    expect(isTouchDevice({ nav: undefined, win: undefined })).toBe(false);
  });
});

describe('shareItem — دسکتاپی که navigator.share دارد', () => {
  /* همان دامِ کرومِ ویندوز: share هست، ولی برگه‌اش بی‌کار
     است. این چهار تست تنها چیزی‌اند که جلوی برگشتنِ آن
     رفتار را می‌گیرند. */
  it('برگهٔ سیستم را باز نمی‌کند، حتی وقتی share هست', async () => {
    const share = vi.fn(() => Promise.resolve());
    const { nav, writes } = clipboardNav();
    nav.share = share;

    const res = await shareItem(ITEMS.coffee, { nav, win: mouseWin, env: ENV });

    expect(share).not.toHaveBeenCalled();
    expect(res.mode).toBe('copied');
    expect(writes).toEqual(['https://daneh.example/coffee/yirgacheffe']);
  });

  it('صفحهٔ لمسیِ وصل به دسکتاپ هم گولش نمی‌زند', async () => {
    const share = vi.fn(() => Promise.resolve());
    const nav = {
      share,
      maxTouchPoints: 10,
      clipboard: { writeText: () => Promise.resolve() }
    };

    const res = await shareItem(ITEMS.coffee, { nav, win: mouseWin, env: ENV });

    expect(share).not.toHaveBeenCalled();
    expect(res.mode).toBe('copied');
  });

  it('روی موبایل همچنان برگهٔ سیستم را ترجیح می‌دهد', async () => {
    const share = vi.fn(() => Promise.resolve());
    const { nav, writes } = clipboardNav();
    nav.share = share;

    const res = await shareItem(ITEMS.coffee, { nav, win: touchWin, env: ENV });

    expect(share).toHaveBeenCalledOnce();
    expect(res.mode).toBe('shared');
    /* برگهٔ سیستم که باز شد، کلیپ‌بورد دست نمی‌خورد */
    expect(writes).toEqual([]);
  });

  it('پیش‌فرضِ بی‌win روی نود، به کپی می‌رود نه به share', async () => {
    /* nod نه matchMedia دارد نه maxTouchPoints — یعنی
       «لمسی نیست»، که برای رندر سروری هم پاسخ درستی است. */
    const share = vi.fn(() => Promise.resolve());
    const { nav } = clipboardNav();
    nav.share = share;

    const res = await shareItem(ITEMS.coffee, { nav, env: ENV });

    expect(share).not.toHaveBeenCalled();
    expect(res.mode).toBe('copied');
  });
});

describe('shareItem — راه دوم: کپی در کلیپ‌بورد', () => {
  it('بدون navigator.share، همان نشانی کپی می‌شود', async () => {
    const { nav, writes } = clipboardNav();

    const res = await shareItem(ITEMS.powder, { nav, env: ENV });

    expect(res.mode).toBe('copied');
    expect(res.url).toBe('https://daneh.example/powder/matcha-ceremonial');
    expect(writes).toEqual(['https://daneh.example/powder/matcha-ceremonial']);
  });

  it('نشانیِ کپی‌شده همان canonical است، نه چیزی که دستی ساخته شده', async () => {
    const { nav, writes } = clipboardNav();
    await shareItem(ITEMS.coffee, { nav, env: ENV });

    expect(writes[0]).toBe(
      itemHeadState(ITEMS.coffee, { baseUrl: 'https://daneh.example' }).canonical
    );
  });

  it('روی http ساده که clipboard نیست، راهِ execCommand می‌گیردش', async () => {
    const doc = fakeDoc(true);

    const res = await shareItem(ITEMS.coffee, { nav: {}, doc, env: ENV });

    expect(res.mode).toBe('copied');
    expect(doc.copied).toBe('https://daneh.example/coffee/yirgacheffe');
    /* textarea موقت باید برداشته شود، وگرنه هر کلیک یکی
       به صفحه اضافه می‌کند */
    expect(doc.added.length).toBe(1);
    expect(doc.removed.length).toBe(1);
  });

  it('اگر clipboard اجازه ندهد، باز هم راه دوم امتحان می‌شود', async () => {
    const nav = { clipboard: { writeText: () => Promise.reject(new Error('denied')) } };
    const doc = fakeDoc(true);

    const res = await shareItem(ITEMS.coffee, { nav, doc, env: ENV });

    expect(res.mode).toBe('copied');
    expect(doc.copied).toBe('https://daneh.example/coffee/yirgacheffe');
  });

  it('وقتی هیچ راهی نیست، شکست را صادقانه اعلام می‌کند', async () => {
    const res = await shareItem(ITEMS.coffee, { nav: {}, doc: undefined, env: ENV });
    expect(res.mode).toBe('failed');
  });

  it('execCommand ناموفق هم شکست است، نه موفقیتِ ساختگی', async () => {
    const res = await shareItem(ITEMS.coffee, { nav: {}, doc: fakeDoc(false), env: ENV });
    expect(res.mode).toBe('failed');
  });
});

describe('copyText — به‌تنهایی', () => {
  it('اول clipboard را امتحان می‌کند و سراغ راه منسوخ نمی‌رود', async () => {
    const { nav, writes } = clipboardNav();
    const doc = fakeDoc(true);

    expect(await copyText('سلام', { nav, doc })).toBe(true);
    expect(writes).toEqual(['سلام']);
    expect(doc.made).toBe(0);
  });
});

describe('پیام‌های فارسیِ توست', () => {
  it('هر دو حالت پیام دارند و با هم فرق می‌کنند', () => {
    expect(SHARE_COPIED).toMatch(/کپی شد/);
    expect(SHARE_FAILED).not.toBe(SHARE_COPIED);
  });
});
