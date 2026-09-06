import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toast,
  subscribeToast,
  getToast,
  getServerToast,
  TOAST_LIFETIME
} from '../web/src/lib/toastStore.js';

/* ══════════════════════════════════════════════════
   انبارهٔ پیام کوتاه.

   این تکه از ShopContext بیرون آمد چون مودالِ کالا —
   جایی که بیشترِ بازدیدکننده‌ها کالا را می‌بینند — در
   شکافِ @modal رندر می‌شود و هیچ Provider ای بالای سرش
   نیست. حالا که حالتِ سراسری و ماژولی است، دو چیز
   می‌توانند بی‌صدا خراب شوند و هیچ‌کدام در رابط کاربری
   فوراً دیده نمی‌شوند:

   • پیام پاک نشود و تا ابد روی صفحه بماند.
   • پیام دوم، شمارشِ پیام اول را به ارث ببرد و زودتر
     از موعد برود.

   ── چرا snapshot سرور جدا سنجیده می‌شود ──
   متغیرهای این ماژول روی سرور بین درخواست‌ها مشترک‌اند.
   getServerToast باید **همیشه** رشتهٔ خالی بدهد، وگرنه
   روزی پیامِ یک بازدیدکننده داخل HTML بازدیدکنندهٔ بعدی
   می‌نشیند و hydrate هم به‌هم می‌ریزد.
   ══════════════════════════════════════════════════ */

beforeEach(() => {
  vi.useFakeTimers();
  /* هر تست با تختهٔ پاک شروع شود */
  toast('');
  vi.advanceTimersByTime(TOAST_LIFETIME + 1);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toastStore', () => {
  it('پیام را نشان می‌دهد و مشترک‌ها را خبر می‌کند', () => {
    const seen = [];
    const off = subscribeToast(() => seen.push(getToast()));

    toast('لینک این کالا کپی شد');

    expect(getToast()).toBe('لینک این کالا کپی شد');
    expect(seen).toEqual(['لینک این کالا کپی شد']);
    off();
  });

  it('بعد از عمرِ پیام، خودش پاک می‌شود', () => {
    toast('به سبد اضافه شد');

    vi.advanceTimersByTime(TOAST_LIFETIME - 1);
    expect(getToast()).toBe('به سبد اضافه شد');

    vi.advanceTimersByTime(1);
    expect(getToast()).toBe('');
  });

  it('پیام دوم شمارشِ تازه می‌گیرد، نه بازماندهٔ اولی', () => {
    toast('اولی');
    vi.advanceTimersByTime(TOAST_LIFETIME - 100);

    toast('دومی');
    /* اگر شمارش اول زنده مانده بود، اینجا پاک می‌شد */
    vi.advanceTimersByTime(200);
    expect(getToast()).toBe('دومی');

    vi.advanceTimersByTime(TOAST_LIFETIME);
    expect(getToast()).toBe('');
  });

  it('پاک شدنِ خودکار هم به مشترک‌ها خبر می‌دهد', () => {
    const seen = [];
    const off = subscribeToast(() => seen.push(getToast()));

    toast('چیزی');
    vi.advanceTimersByTime(TOAST_LIFETIME);

    expect(seen).toEqual(['چیزی', '']);
    off();
  });

  it('لغو اشتراک واقعاً قطع می‌کند', () => {
    let calls = 0;
    const off = subscribeToast(() => calls++);
    off();

    toast('کسی نباید بشنود');
    expect(calls).toBe(0);
  });

  it('چند مشترک هم‌زمان — هر دو خبر می‌شوند', () => {
    const a = [];
    const b = [];
    const offA = subscribeToast(() => a.push(getToast()));
    const offB = subscribeToast(() => b.push(getToast()));

    toast('همه بشنوند');

    expect(a).toEqual(['همه بشنوند']);
    expect(b).toEqual(['همه بشنوند']);
    offA();
    offB();
  });

  it('مقدارِ غیررشته‌ای هم رشته می‌شود، و nullـی چاپ نمی‌کند', () => {
    toast(undefined);
    expect(getToast()).toBe('');
  });

  it('snapshot سرور همیشه خالی است، حتی وقتی پیامی روی میز باشد', () => {
    toast('چیزی که فقط مالِ مرورگر است');

    expect(getToast()).toBe('چیزی که فقط مالِ مرورگر است');
    expect(getServerToast()).toBe('');
  });
});
