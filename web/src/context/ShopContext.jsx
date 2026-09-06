'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback
} from 'react';
import { api } from '../lib/api.js';
import { KINDS, DEFAULT_GRINDS } from '../lib/groups.js';
import {
  computeTotals,
  priceFor,
  unitPriceFor,
  blendPricePerKg,
  TIERS
} from '@ghahve/shared/pricing.js';
import { formatWeight, toFa } from '../lib/format.js';
import { mixSignature, lineKey, buildLine } from '../lib/cartLine.js';
import { loadCart, saveCart, browserStorage } from '../lib/cartStorage.js';
import { toast as showToast } from '../lib/toastStore.js';

const ShopContext = createContext(null);
export const useShop = () => useContext(ShopContext);

/* شکلِ ردیف سبد در lib/cartLine.js است تا هر دو حالتِ ساز میکس
   (اهرم‌های ساده و حالت تصویری) از یک تابع رد شوند و بشود بدون
   مرورگر تستش کرد. اینجا فقط دوباره صادر می‌شود. */
export { mixSignature, lineKey };

/* ══════════════════════════════════════════════════
   حالت سراسری فروشگاه.

   ── تفاوت بنیادی با نسخهٔ ویت ──
   آنجا این Provider موقع mount خودش از سرور می‌خواند:
   یک useEffect که api.items() و api.content() را صدا
   می‌زد و تا آمدنشان `loading` روشن بود. یعنی مرورگر
   اول یک صفحهٔ خالی می‌گرفت، بعد جاوااسکریپت اجرا
   می‌شد، بعد درخواست می‌رفت، و بعد کالاها می‌آمدند:
   سه رفت‌وبرگشت تا دیدنِ اولین قهوه.

   حالا داده از **سرور** می‌آید و به‌شکل پارامتر تحویل
   می‌شود. `loading` از همان اول false است و شاخه‌های
   «در حال خواندن…» عملاً هیچ‌وقت دیده نمی‌شوند — ولی
   حذف نشده‌اند، چون reload() همچنان وجود دارد و پس از
   آن ممکن است لازم شوند.

   ── سبد و hydration: حساس‌ترین جای این مهاجرت ──
   نسخهٔ ویت سبد را در همان اولین رندر می‌خواند:
   `useState(loadCart)`. با رندر سمت سرور این یک خط سه
   مسئله می‌سازد، و هر سه‌شان به یک نتیجه می‌رسند —
   **پاک شدن سبدِ مشتری**:

   ۱) روی سرور localStorage وجود ندارد.
   ۲) اگر سرور سبد خالی بفرستد و مرورگر در همان رندر اول
      سبد پُر بسازد، ری‌اکت ناسازگاری می‌بیند و می‌تواند
      درخت را دور بریزد.
   ۳) افکتِ ذخیره اگر پیش از افکتِ خواندن اجرا شود، آرایهٔ
      خالیِ اولیه را روی سبدِ ذخیره‌شده می‌نویسد.

   جواب، یک پرچم است: `hydrated`.

   • سبد همیشه با آرایهٔ خالی شروع می‌شود — پس HTML سرور
     و اولین رندر مرورگر مو به مو یکی‌اند.
   • یک افکت، **فقط یک بار**، سبد ذخیره‌شده را می‌خواند و
     بعد پرچم را بالا می‌برد.
   • نوشتن، و پاک‌سازیِ ردیف‌های نامعتبر، هر دو پشت همین
     پرچم‌اند.

   بهایش یک فریم است: تا وقتی افکت اجرا نشده، شمارندهٔ
   سبد در هدر «۰ گرم» است. این تفاوت واقعی با امروز است
   و عمداً با suppressHydrationWarning پنهان نشده — آن
   پرچم هشدار را خاموش می‌کند، نه مسئله را.

   tests/web/cart-hydration.test.jsx یک چرخهٔ کاملِ
   «رندر سرور ← hydrate» را اجرا می‌کند و می‌سنجد که
   سبدِ ذخیره‌شده دست‌نخورده بماند.
   ══════════════════════════════════════════════════ */

export function ShopProvider({
  children,
  initialItems = [],
  initialContent = {},
  /* ── آیا این فهرست، **همهٔ** کالاهاست؟ ──
     صفحهٔ اصلی بله؛ صفحهٔ یک کالا نه — آنجا فقط خودِ کالا
     و (اگر میکس باشد) دانه‌هایش تحویل داده می‌شوند، چون
     خواندن صد و شش کالا برای نشان دادن یکی بی‌معنی است.

     دو جا به این تفاوت حساس‌اند و هر دو می‌توانستند سفارشِ
     مشتری را از بین ببرند:

     • افکتِ پاک‌سازیِ سبد، که ردیفِ «کالایش در فهرست نیست»
       را حذف می‌کند — روی فهرست ناقص یعنی پاک شدن کل سبد.
     • جفت‌کردنِ ردیف‌ها با سند کالا (`resolved`)، که مبنای
       شمارندهٔ هدر و **بدنهٔ سفارش** است.

     پس فهرستِ ناقص فقط یک حالتِ گذراست: به‌محض اینکه سبد
     به کالایی بی‌رد اشاره کند، فهرست کامل می‌شود. جزئیاتش
     پای افکتِ «کامل کردن فهرست» پایین آمده. */
  fullCatalogue = true,

  /* ── تنها مصرف‌کننده‌ای که داده از سرور نمی‌گیرد: پنل ──
     صفحه‌های فروشگاه فهرست کالاها را روی سرور می‌خوانند و
     به‌شکل پارامتر می‌دهند. پنل مدیریت اما تماماً سمت
     مشتری است و صفحه‌هایش سروری نیستند، پس کسی نیست که
     فهرست را برایش آماده کند.

     پنل به این فهرست نیاز **دارد**: فرم کالا کنار خودش
     پیش‌نمایش زندهٔ همان کارتی را نشان می‌دهد که مشتری
     می‌بیند، و آن کارت برای میکس‌ها قیمت را از میانگین
     وزنیِ دانه‌ها حساب می‌کند. با فهرست خالی، پیش‌نمایشِ
     میکس قیمتِ پایه را نشان می‌داد — یعنی عددی که در سایت
     دیده نمی‌شود.

     این همان کاری است که ShopContext در نسخهٔ ویت برای
     **همهٔ** صفحه‌ها می‌کرد؛ حالا فقط برای پنل. */
  loadOnMount = false
}) {
  const [items, setItems] = useState(initialItems);
  const [content, setContent] = useState(initialContent);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  /* آیا فهرست فعلی کامل است؟ با مقدارِ پارامتر شروع
     می‌شود و پس از یک reload موفق کامل حساب می‌شود —
     چون reload همیشه کل فهرست را می‌آورد. */
  const [catalogueComplete, setCatalogueComplete] = useState(fullCatalogue);

  /* سبد **همیشه** خالی شروع می‌شود — دلیلش بالای فایل.
     خواندنِ واقعی در افکتِ پایین است. */
  const [cart, setCart] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  /* آسیاب پیش‌فرض — کارت‌های «روش دم‌آوری» این را عوض
     می‌کنند و کالاهای تازه با همین به سبد می‌روند. هر ردیف
     بعداً می‌تواند آسیاب خودش را داشته باشد. */
  const [grind, setGrind] = useState('whole');

  /* ---------- خواندن دوبارهٔ کالاها و متن‌ها ----------
     دیگر موقع mount صدا زده نمی‌شود؛ فقط وقتی چیزی در
     مرورگر لازم شد فهرست را تازه کند. */
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      /* متن‌ها نباید فهرست کالاها را زمین بزنند؛ اگر نیامدند
         بخش‌های متنی رندر نمی‌شوند ولی فروشگاه کار می‌کند. */
      const [data, texts] = await Promise.all([api.items(), api.content().catch(() => ({}))]);
      setItems(Array.isArray(data) ? data : []);
      setContent(texts && typeof texts === 'object' ? texts : {});
      setCatalogueComplete(true);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------- خواندن فهرست در مرورگر، فقط برای پنل ----------
     دلیلش پای پارامتر loadOnMount آمده. برای صفحه‌های
     فروشگاه هیچ‌وقت اجرا نمی‌شود. */
  useEffect(() => {
    if (loadOnMount) reload();
  }, [loadOnMount, reload]);

  /* ---------- خواندن سبدِ ذخیره‌شده، یک بار ----------
     تا این افکت اجرا نشود هیچ‌چیز در حافظه نوشته نمی‌شود.
     ترتیب مهم است، نه اینکه چه زمانی اجرا می‌شود. */
  useEffect(() => {
    const saved = loadCart(browserStorage());
    if (saved.length) setCart(saved);
    setHydrated(true);
  }, []);

  /* ---------- نوشتن سبد ----------
     نگهبان: پیش از خواندن، هیچ‌وقت ننویس. بدون این شرط،
     همان آرایهٔ خالیِ اولیه روی سبد ذخیره‌شده می‌نشست و
     سفارشِ نیمه‌کارهٔ مشتری با یک رفرش از بین می‌رفت. */
  useEffect(() => {
    if (!hydrated) return;
    saveCart(browserStorage(), cart);
  }, [cart, hydrated]);

  /* ---------- نگاشت سریع شناسه به کالا ---------- */
  const bySlug = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);
  const lookup = useCallback((slug) => bySlug.get(slug), [bySlug]);

  const byKind = useMemo(() => {
    const out = { coffee: [], gear: [], powder: [] };
    for (const it of items) if (out[it.kind]) out[it.kind].push(it);
    return out;
  }, [items]);

  /* میکس‌های ویژهٔ خانه — بخش جداگانهٔ خودشان را دارند */
  const houseBlends = useMemo(
    () => (byKind.coffee || []).filter((c) => c.isBlend && c.house).sort((a, b) => a.rank - b.rank),
    [byKind]
  );

  /* ---------- گزینه‌های آسیاب ---------- */
  /* مدیر می‌تواند از پنل عوض‌شان کند؛ تا آمدن پاسخ سرور
     همان فهرست پیش‌فرض نشان داده می‌شود. */
  const grindOptions = useMemo(() => {
    const opts = content?.grinds?.options;
    return Array.isArray(opts) && opts.length ? opts : DEFAULT_GRINDS;
  }, [content]);

  const grindLabel = useCallback(
    (value) => grindOptions.find((o) => o.value === value)?.label || '',
    [grindOptions]
  );

  /* اگر مدیر گزینه‌ای را که آسیاب پیش‌فرض بود حذف کند،
     به اولین گزینهٔ موجود برمی‌گردیم. */
  useEffect(() => {
    if (!grindOptions.some((o) => o.value === grind)) {
      setGrind(grindOptions[0]?.value || 'whole');
    }
  }, [grindOptions, grind]);

  /* ---------- کامل کردن فهرست به‌خاطر سبد ----------
     ── مسئله‌ای که این افکت حل می‌کند ──
     صفحهٔ یک کالا عمداً فهرست ناقص می‌گیرد. سبد اما مالِ
     کل سایت است: مشتری می‌تواند دو قهوه در سبد داشته باشد
     و بعد صفحهٔ یک ابزار را باز کند.

     آن‌وقت `resolved` — که ردیف‌ها را با سند کالا جفت
     می‌کند — ردیف‌هایی را که کالایشان در فهرست نیست کنار
     می‌گذارد. نتیجه‌اش دو چیز بود، هر دو خطرناک:

     • شمارندهٔ هدر کمتر از واقع نشان می‌داد.
     • و بدتر: CartDrawer سفارش را از همین `resolved`
       می‌سازد، پس ثبت سفارش از صفحهٔ یک کالا **بی‌صدا**
       بقیهٔ ردیف‌ها را می‌انداخت.

     پس اگر سبد به کالایی اشاره کند که نداریم، همان‌جا
     فهرست کامل می‌شود. برای بازدیدکنندهٔ بی‌سبد — یعنی
     بیشترشان — این افکت هیچ کاری نمی‌کند و صفحهٔ کالا
     سبک می‌ماند.

     حلقه نمی‌سازد: بعد از reload فهرست کامل حساب می‌شود و
     شرط دیگر برقرار نیست. ردیفی که کالایش واقعاً حذف شده
     را افکتِ پاک‌سازیِ پایین برمی‌دارد. */
  const fillTried = useRef(false);

  useEffect(() => {
    if (!hydrated || catalogueComplete || fillTried.current || cart.length === 0) return;

    const missing = cart.some(
      (l) => !bySlug.has(l.slug) || (l.mix || []).some((m) => !bySlug.has(m.slug))
    );
    if (!missing) return;

    fillTried.current = true;
    reload();
  }, [hydrated, catalogueComplete, cart, bySlug, reload]);

  /* ---------- پاک‌سازی سبد از کالاهای حذف‌شده ----------
     اگر مدیر کالایی را پاک یا خاموش کند، ردیفش از سبد
     کاربر هم برداشته می‌شود تا موقع ثبت سفارش خطا نگیرد.
     دانه‌های میکس هم باید هنوز موجود باشند، وگرنه قیمت
     میکس قابل محاسبه نیست.

     دو نگهبان دارد و هر دو لازم‌اند:

     • catalogueComplete — روی فهرست ناقص، «کالا در فهرست
       نیست» دلیلی برای حذف نیست؛ بدون این شرط دیدنِ صفحهٔ
       یک قهوه کل سبد را پاک می‌کرد.
     • hydrated — پیش از خوانده شدنِ سبد، «ردیفِ نامعتبر»
       معنایی ندارد؛ سبد هنوز خالی است. */
  useEffect(() => {
    if (!hydrated || !catalogueComplete || loading || items.length === 0) return;
    setCart((prev) => {
      const kept = prev.filter(
        (l) => bySlug.has(l.slug) && (l.mix || []).every((m) => bySlug.has(m.slug))
      );
      return kept.length === prev.length ? prev : kept;
    });
  }, [hydrated, catalogueComplete, loading, items.length, bySlug]);

  /* ---------- پیام کوتاه ----------
     خودِ توست دیگر حالتِ این کانتکست نیست و در
     lib/toastStore.js زندگی می‌کند — تا مودالِ کالا هم،
     که بیرون از این Provider رندر می‌شود، بتواند پیام
     بدهد. اینجا فقط پوششی می‌ماند تا ده صداکنندهٔ فعلی
     دست نخورند. */
  const toast = useCallback((msg) => showToast(msg), []);

  /* ---------- عملیات سبد ---------- */

  /* ردیف تازه را اضافه می‌کند، و اگر دقیقاً همان ردیف
     (همان کالا، همان آسیاب، همان ترکیب) از قبل باشد
     وزنش را زیاد می‌کند. */
  const addWeighed = useCallback(
    (slug, grams, opts = {}) => {
      const item = bySlug.get(slug);
      if (!item) return;

      const line = buildLine(item, grams, opts, grind);

      setCart((prev) => {
        const i = prev.findIndex((l) => l.key === line.key);
        if (i === -1) {
          return [...prev, line];
        }
        const next = [...prev];
        next[i] = { ...next[i], grams: next[i].grams + grams };
        return next;
      });

      toast(`${formatWeight(grams)} ${item.name} به سبد اضافه شد`);
    },
    [bySlug, grind, toast]
  );

  const addPiece = useCallback(
    (slug, qty = 1) => {
      const item = bySlug.get(slug);
      if (!item) return;
      const key = lineKey(slug, '', []);
      setCart((prev) => {
        const i = prev.findIndex((l) => l.key === key);
        if (i === -1) {
          return [...prev, { key, slug, kind: 'gear', grams: 0, qty, grind: '', mix: [] }];
        }
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      });
      toast(`${item.name} به سبد اضافه شد`);
    },
    [bySlug, toast]
  );

  const changeWeight = useCallback((key, delta) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const min = KINDS[l.kind]?.minWeight ?? 100;
        return { ...l, grams: Math.max(min, l.grams + delta) };
      })
    );
  }, []);

  const changeQty = useCallback((key, delta) => {
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, l.qty + delta) } : l))
    );
  }, []);

  /* عوض کردن آسیاب یک ردیف — شناسهٔ ردیف را هم عوض می‌کند.
     اگر بعد از تغییر، ردیف با ردیف دیگری یکی شود، دو ردیف
     در هم ادغام می‌شوند تا سبد ردیف تکراری نداشته باشد. */
  const setLineGrind = useCallback((key, nextGrind) => {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.key === key);
      if (i === -1) return prev;

      const line = prev[i];
      const newKey = lineKey(line.slug, nextGrind, line.mix);
      if (newKey === line.key) return prev;

      const updated = { ...line, key: newKey, grind: nextGrind };
      const twin = prev.findIndex((l, idx) => idx !== i && l.key === newKey);

      if (twin === -1) {
        const next = [...prev];
        next[i] = updated;
        return next;
      }

      /* ادغام: وزن‌ها جمع می‌شوند و ردیف تکراری حذف */
      return prev
        .map((l, idx) =>
          idx === twin ? { ...l, grams: l.grams + line.grams, qty: l.qty + line.qty } : l
        )
        .filter((_, idx) => idx !== i);
    });
  }, []);

  const removeLine = useCallback(
    (key) => {
      const line = cart.find((l) => l.key === key);
      const item = line ? bySlug.get(line.slug) : null;
      setCart((prev) => prev.filter((l) => l.key !== key));
      const what = { gear: 'ابزار', powder: 'پودر', coffee: 'قهوه' }[item?.kind] || 'کالا';
      toast(`${what} از سبد حذف شد`);
    },
    [cart, bySlug, toast]
  );

  const clearCart = useCallback(() => setCart([]), []);

  /* ---------- جمع سبد ---------- */
  /* ردیف‌ها را با سند کالا جفت می‌کنیم و از همان تابعی که
     سرور استفاده می‌کند عبور می‌دهیم. */
  const resolved = useMemo(
    () => cart.map((l) => ({ ...l, item: bySlug.get(l.slug) })).filter((l) => l.item),
    [cart, bySlug]
  );

  const totals = useMemo(() => computeTotals(resolved, lookup), [resolved, lookup]);

  /* قیمت هر کیلوی یک ردیف — برای نمایش در سبد */
  const unitPrice = useCallback((line) => unitPriceFor(line, lookup), [lookup]);

  /* قیمت هر کیلوی یک میکس با نسبت دلخواه — برای ساز میکس */
  const blendPrice = useCallback((item, mix) => blendPricePerKg(item, mix, lookup), [lookup]);

  /* «۵۰۰ گرم» یا «۲ قلم» یا «۵۰۰ گرم + ۲ قلم» */
  const cartSummary = useCallback(
    (short = false) => {
      const parts = [];
      if (totals.grams) parts.push(formatWeight(totals.grams));
      if (totals.pieces) parts.push(`${toFa(totals.pieces)} ${short ? 'قلم' : 'قلم ابزار'}`);
      return parts.length ? parts.join(' + ') : formatWeight(0);
    },
    [totals]
  );

  const nextTier = useMemo(() => {
    if (totals.grams <= 0) return null;
    return [...TIERS].reverse().find((t) => t.min > totals.grams) || null;
  }, [totals.grams]);

  const value = {
    items,
    byKind,
    bySlug,
    lookup,
    houseBlends,
    content,
    loading,
    loadError,
    reload,
    cart,
    /* برای رابط کاربری: آیا سبدِ ذخیره‌شده خوانده شده؟
       هرچه به سبد بستگی دارد تا این لحظه حالت خنثی نشان
       می‌دهد. */
    hydrated,
    catalogueComplete,
    resolved,
    totals,
    cartSummary,
    nextTier,
    addWeighed,
    addPiece,
    changeWeight,
    changeQty,
    removeLine,
    clearCart,
    setLineGrind,
    grind,
    setGrind,
    grindOptions,
    grindLabel,
    unitPrice,
    blendPrice,
    toast,
    priceFor
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
