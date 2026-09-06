import { Router } from 'express';
import { Item } from '../models/Item.js';
import { Order } from '../models/Order.js';
import { Content } from '../models/Content.js';
import { requireAdmin } from '../middleware/auth.js';
import { orderLimiter, trackLimiter } from '../middleware/rateLimit.js';
import { findOrderForTracking } from '../lib/track.js';
import { computeTotals, lineTotal, unitPriceFor } from '@ghahve/shared/pricing.js';
import { reserveStock, releaseStock } from '../lib/stock.js';
import { DEFAULT_GRINDS } from '@ghahve/shared/taxonomy.js';

const router = Router();

const MIN_GRAMS = { coffee: 100, powder: 50 };

/* گزینه‌های آسیاب ممکن است در پنل عوض شده باشند */
async function grindMap() {
  const doc = await Content.findOne({ key: 'grinds' }).lean();
  const options =
    Array.isArray(doc?.data?.options) && doc.data.options.length
      ? doc.data.options
      : DEFAULT_GRINDS;
  return new Map(options.map((o) => [o.value, o.label]));
}

/* ══════════ ثبت سفارش (عمومی) ══════════ */
/* این مسیر عمداً requireAdmin ندارد؛ محدودیت نرخ تنها
   چیزی است که جلوی سیل سفارش جعلی را می‌گیرد. */
router.post('/', orderLimiter, async (req, res, next) => {
  try {
    const raw = Array.isArray(req.body.lines) ? req.body.lines : [];
    if (raw.length === 0) {
      return res.status(400).json({ error: 'سبد خرید خالی است' });
    }
    if (raw.length > 100) {
      return res.status(400).json({ error: 'تعداد ردیف‌های سبد بیش از حد مجاز است' });
    }

    /* کالاها را از پایگاه داده می‌خوانیم — قیمت ارسالی از
       مرورگر اصلاً استفاده نمی‌شود. */
    const wanted = new Set(raw.map((l) => String(l.slug || '')));
    /* اجزای میکس هم لازم‌اند تا قیمت را دوباره حساب کنیم */
    for (const l of raw) {
      if (Array.isArray(l.mix)) for (const m of l.mix) wanted.add(String(m.slug || ''));
    }

    const items = await Item.find({ slug: { $in: [...wanted] }, active: true });
    const bySlug = new Map(items.map((i) => [i.slug, i]));
    const lookup = (slug) => bySlug.get(slug);

    const grinds = await grindMap();

    const lines = [];
    for (const l of raw) {
      const item = bySlug.get(String(l.slug || ''));
      if (!item) {
        return res
          .status(400)
          .json({ error: `کالای «${l.slug}» دیگر موجود نیست. سبد را به‌روز کنید.` });
      }

      /* ── نحوهٔ آسیاب، فقط برای قهوه ── */
      let grind = '';
      if (item.grindable) {
        grind = String(l.grind || 'whole');
        if (!grinds.has(grind)) {
          return res.status(400).json({ error: `نحوهٔ تحویل «${item.name}» نامعتبر است` });
        }
      }

      /* ── ترکیب میکس ── */
      let mix = [];
      if (item.isBlend) {
        const sent = Array.isArray(l.mix) && l.mix.length ? l.mix : item.components;

        if (!item.customizable) {
          /* مشتری اجازهٔ تغییر ندارد — ترکیب رسمی خودمان را می‌گذاریم */
          mix = item.components.map((c) => ({ slug: c.slug, percent: c.percent }));
        } else {
          const seen = new Set();
          let sum = 0;

          for (const m of sent) {
            const slug = String(m.slug || '');
            const bean = bySlug.get(slug);
            if (!bean) {
              return res.status(400).json({ error: `دانهٔ «${slug}» در میکس موجود نیست` });
            }
            if (seen.has(slug)) {
              return res.status(400).json({ error: 'یک دانه دو بار در میکس آمده است' });
            }
            /* مشتری هر قهوه‌ای را می‌تواند در میکس بگذارد؛ ترکیبِ
               ما فقط پیشنهاد است. تنها شرط این است که واقعاً قهوه
               باشد و خودش میکس نباشد — وگرنه قیمتش قابل محاسبه نیست. */
            if (bean.kind !== 'coffee') {
              return res.status(400).json({ error: `«${bean.name}» قهوه نیست و در میکس نمی‌آید` });
            }
            if (bean.isBlend) {
              return res
                .status(400)
                .json({ error: `«${bean.name}» خودش یک میکس است و جزء میکس دیگری نمی‌شود` });
            }

            const percent = Math.round(Number(m.percent));
            if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
              return res.status(400).json({ error: 'درصدهای میکس نامعتبرند' });
            }
            if (percent === 0) continue; // دانهٔ برداشته‌شده

            seen.add(slug);
            sum += percent;
            mix.push({ slug, percent });
          }

          if (mix.length < 2) {
            return res.status(400).json({ error: 'میکس باید دست‌کم دو دانه داشته باشد' });
          }
          if (Math.abs(sum - 100) > 1) {
            return res
              .status(400)
              .json({ error: `مجموع درصدهای میکس باید ۱۰۰ باشد، الان ${sum} است` });
          }
        }
      }

      if (item.kind === 'gear') {
        const qty = Math.floor(Number(l.qty));
        if (!Number.isFinite(qty) || qty < 1 || qty > 999) {
          return res.status(400).json({ error: `تعداد «${item.name}» نامعتبر است` });
        }
        lines.push({ kind: 'gear', item, qty, grams: 0, grind: '', mix: [] });
      } else {
        const grams = Math.round(Number(l.grams));
        const min = MIN_GRAMS[item.kind] || 50;
        if (!Number.isFinite(grams) || grams < min || grams > 100000) {
          return res.status(400).json({ error: `وزن «${item.name}» نامعتبر است` });
        }
        lines.push({ kind: item.kind, item, grams, qty: 0, grind, mix });
      }
    }

    const totals = computeTotals(lines, lookup);

    /* ── رزرو موجودی ──
       آخرین کاری است که پیش از ثبت انجام می‌شود: تا اینجا
       هر خطای اعتبارسنجی بدون لمس انبار برگشته است، پس
       چیزی برای پس دادن نمی‌ماند. جزئیاتش در lib/stock.js. */
    const { error: stockError, taken } = await reserveStock(lines, Item);
    if (stockError) return res.status(409).json({ error: stockError });

    let order;
    try {
      order = await Order.create({
        lines: lines.map((l) => ({
          kind: l.kind,
          slug: l.item.slug,
          name: l.item.name,
          unitPrice: unitPriceFor(l, lookup),
          grams: l.grams,
          qty: l.qty,
          lineTotal: lineTotal(l, lookup),
          grind: l.grind,
          grindLabel: l.grind ? grinds.get(l.grind) || '' : '',
          mix: l.mix.map((m) => ({
            slug: m.slug,
            name: bySlug.get(m.slug)?.name || m.slug,
            percent: m.percent
          }))
        })),
        /* ستون‌های هم‌تراز، عمدی */
        // prettier-ignore
        customer: {
          name:    String(req.body.customer?.name || '').trim(),
          phone:   String(req.body.customer?.phone || '').trim(),
          address: String(req.body.customer?.address || '').trim(),
          note:    String(req.body.customer?.note || '').trim()
        },
        totals
      });
    } catch (err) {
      /* ثبت سفارش شکست خورد — انبار نباید بی‌دلیل کم بماند */
      await releaseStock(taken, Item);
      throw err;
    }

    /* رسید را از روی سفارشِ ذخیره‌شده برمی‌گردانیم، نه از
       روی چیزی که مرورگر فرستاده — تا مشتری دقیقاً همان
       چیزی را ببیند که ثبت شده و بعداً آماده می‌شود. */
    res.status(201).json({
      ok: true,
      code: order.code,
      createdAt: order.createdAt,
      lines: order.lines,
      customer: order.customer,
      totals: order.totals
    });
  } catch (err) {
    next(err);
  }
});

/* ══════════ پیگیری سفارش (عمومی) ══════════ */
/* این مسیر هم مثل ثبت سفارش عمداً requireAdmin ندارد —
   مشتری حساب کاربری ندارد که با آن وارد شود. جای توکن،
   جفتِ «شمارهٔ سفارش + شمارهٔ موبایل» مالکیت را ثابت
   می‌کند، و trackLimiter جلوی حدس زدن کد را می‌گیرد.

   باید **پیش از** مسیر /:id بنشیند: express اولین مسیرِ
   جوردرآمده را برمی‌دارد، و /:id همه‌چیز را می‌گیرد.
   اگر جابه‌جا شوند، /track پشت requireAdmin گیر می‌کند.

   منطقش در lib/track.js است تا بدون مونگو تست شود. */
router.get('/track', trackLimiter, async (req, res, next) => {
  try {
    const result = await findOrderForTracking(
      { code: req.query.code, phone: req.query.phone },
      Order
    );

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.order);
  } catch (err) {
    next(err);
  }
});

/* ══════════ مدیریت سفارش‌ها ══════════ */

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    const counts = await Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);

    res.json({
      orders,
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n]))
    });
  } catch (err) {
    next(err);
  }
});

/* یک سفارش مشخص — تا سفارش‌های قدیمی هم که در فهرست
   نیامده‌اند با شناسه باز شوند. */
router.get('/:id', requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: 'سفارش پیدا نشد' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['new', 'processing', 'done', 'canceled'];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'سفارش پیدا نشد' });

    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'سفارش پیدا نشد' });
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
