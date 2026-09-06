import { Router } from 'express';
import { Order } from '../models/Order.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  bucketOf,
  bucketSeries,
  isPeriod,
  jalaliDateString,
  jalaliTimeString
} from '../lib/jalali.js';

/* ══════════════════════════════════════════════════
   گزارش فروش و پشتیبان‌گیری.

   همهٔ بازه‌ها روی تقویم شمسی و به وقت تهران بسته
   می‌شوند، چون مدیر همین تقویم را می‌بیند.

   سفارش لغوشده در «فروش» حساب نمی‌شود ولی در فهرست
   و در فایل پشتیبان می‌ماند — پشتیبان باید کامل باشد.
   ══════════════════════════════════════════════════ */

const router = Router();

const STATUSES = ['new', 'processing', 'done', 'canceled'];
const STATUS_FA = {
  new: 'تازه',
  processing: 'در حال آماده‌سازی',
  done: 'تحویل شده',
  canceled: 'لغو شده'
};

/* چند بازه به عقب، اگر مدیر چیزی نخواسته باشد */
const DEFAULT_COUNT = { day: 30, week: 12, month: 12, year: 6 };
const MAX_COUNT = { day: 366, week: 260, month: 120, year: 40 };

const KIND_FA = { coffee: 'قهوه', gear: 'ابزار', powder: 'پودر' };

/* ── کمک‌کارها ── */

function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : null;
}

/* فیلتر مشترکِ بازه و وضعیت و جست‌وجو */
function buildFilter(query) {
  const filter = {};

  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lt = to;
  }

  if (query.status && query.status !== 'all') {
    if (!STATUSES.includes(query.status)) {
      const err = new Error('وضعیت نامعتبر است');
      err.status = 400;
      throw err;
    }
    filter.status = query.status;
  }

  const q = String(query.q || '').trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { code: rx },
      { 'customer.name': rx },
      { 'customer.phone': rx },
      { 'lines.name': rx }
    ];
  }

  return filter;
}

const emptyStats = () => ({
  orders: 0,
  canceled: 0,
  revenue: 0,
  grams: 0,
  pieces: 0,
  discount: 0,
  shipping: 0
});

/* یک سفارش را روی یک کاسهٔ آمار می‌ریزد */
function addOrder(stats, o) {
  if (o.status === 'canceled') {
    stats.canceled += 1;
    return;
  }
  stats.orders += 1;
  stats.revenue += o.totals?.total || 0;
  stats.grams += o.totals?.grams || 0;
  stats.pieces += o.totals?.pieces || 0;
  stats.discount += o.totals?.discount || 0;
  stats.shipping += o.totals?.shipping || 0;
}

/* ══════════ خلاصهٔ دوره‌ای ══════════ */

router.get('/summary', requireAdmin, async (req, res, next) => {
  try {
    const period = String(req.query.period || 'day');
    if (!isPeriod(period)) {
      return res.status(400).json({ error: 'بازهٔ گزارش نامعتبر است' });
    }

    const asked = Number(req.query.count);
    const count = Math.min(
      Number.isFinite(asked) && asked > 0 ? Math.floor(asked) : DEFAULT_COUNT[period],
      MAX_COUNT[period]
    );

    const series = bucketSeries(period, count);
    const windowStart = series[0].start;

    /* فقط فیلدهای لازم — سبک می‌ماند حتی با هزاران سفارش */
    const rows = await Order.find(
      { createdAt: { $gte: windowStart } },
      { createdAt: 1, status: 1, totals: 1 }
    ).lean();

    const byKey = new Map(series.map((b) => [b.key, { ...b, ...emptyStats() }]));
    for (const o of rows) {
      const b = byKey.get(bucketOf(new Date(o.createdAt), period).key);
      if (b) addOrder(b, o);
    }

    const buckets = [...byKey.values()].map((b) => ({
      key: b.key,
      label: b.label,
      from: b.start.toISOString(),
      to: b.end.toISOString(),
      orders: b.orders,
      canceled: b.canceled,
      revenue: b.revenue,
      grams: b.grams,
      pieces: b.pieces,
      discount: b.discount,
      shipping: b.shipping
    }));

    /* جمع همین پنجره */
    const windowTotals = emptyStats();
    for (const b of buckets) {
      windowTotals.orders += b.orders;
      windowTotals.canceled += b.canceled;
      windowTotals.revenue += b.revenue;
      windowTotals.grams += b.grams;
      windowTotals.pieces += b.pieces;
      windowTotals.discount += b.discount;
      windowTotals.shipping += b.shipping;
    }

    /* جمع کل، از اولین سفارش تا امروز */
    /* ستون‌های $group عمداً هم‌ترازند */
    // prettier-ignore
    const [allTime] = await Order.aggregate([
      {
        $group: {
          _id: null,
          all:      { $sum: 1 },
          canceled: { $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 1, 0] } },
          orders:   { $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 0, 1] } },
          revenue:  { $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 0, '$totals.total'] } },
          grams:    { $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 0, '$totals.grams'] } },
          pieces:   { $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 0, '$totals.pieces'] } }
        }
      }
    ]);

    const first = await Order.findOne({}, { createdAt: 1 }).sort({ createdAt: 1 }).lean();

    res.json({
      period,
      buckets,
      windowTotals,
      allTime: allTime
        ? {
            all: allTime.all,
            orders: allTime.orders,
            canceled: allTime.canceled,
            revenue: allTime.revenue,
            grams: allTime.grams,
            pieces: allTime.pieces
          }
        : { all: 0, orders: 0, canceled: 0, revenue: 0, grams: 0, pieces: 0 },
      firstOrderAt: first ? new Date(first.createdAt).toISOString() : null
    });
  } catch (err) {
    next(err);
  }
});

/* ══════════ فهرست سفارش‌های یک بازه ══════════ */

router.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const page = Math.max(Number(req.query.page) || 1, 1);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter)
    ]);

    /* پرفروش‌های همین بازه.
       اگر مدیر خودش وضعیتی انتخاب کرده، همان را نگه
       می‌داریم؛ وگرنه لغوشده‌ها را کنار می‌گذاریم. */
    const topFilter = filter.status ? filter : { ...filter, status: { $ne: 'canceled' } };

    /* ستون‌های $group عمداً هم‌ترازند */
    // prettier-ignore
    const topItems = await Order.aggregate([
      { $match: topFilter },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.slug',
          name:    { $first: '$lines.name' },
          kind:    { $first: '$lines.kind' },
          times:   { $sum: 1 },
          grams:   { $sum: '$lines.grams' },
          qty:     { $sum: '$lines.qty' },
          revenue: { $sum: '$lines.lineTotal' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      orders,
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      topItems: topItems.map((t) => ({ slug: t._id, ...t, _id: undefined }))
    });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

/* ══════════ خروجی گرفتن ══════════ */

/* اکسل هر سلولی را که با = + - @ شروع شود «فرمول» حساب
   می‌کند. نشانی و توضیحِ مشتری را خود مشتری نوشته، پس
   ابتدایش یک آپاستروف می‌گذاریم تا متن بماند. */
function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

const csvRow = (arr) => arr.map(csvCell).join(',') + '\r\n';

const mixText = (l) =>
  Array.isArray(l.mix) && l.mix.length
    ? l.mix.map((m) => `${m.name || m.slug} ${m.percent}%`).join(' + ')
    : '';

const linesSummary = (o) =>
  (o.lines || [])
    .map((l) => {
      const amount = l.kind === 'gear' ? `${l.qty} عدد` : `${l.grams} گرم`;
      return `${l.name} (${amount})`;
    })
    .join(' | ');

/* ستون‌های CSV به ترتیب و گروه‌به‌گروه */
// prettier-ignore
const ORDER_HEAD = [
  'شمارهٔ سفارش', 'تاریخ شمسی', 'ساعت', 'تاریخ میلادی (ISO)', 'وضعیت',
  'نام مشتری', 'تلفن', 'نشانی', 'توضیح مشتری',
  'کالاها', 'تعداد ردیف', 'وزن کل (گرم)', 'تعداد قلم',
  'جمع کالا (تومان)', 'تخفیف (تومان)', 'عنوان تخفیف', 'ارسال (تومان)', 'مبلغ پرداختی (تومان)'
];

const orderRow = (o) => {
  const d = new Date(o.createdAt);
  return [
    o.code,
    jalaliDateString(d),
    jalaliTimeString(d),
    d.toISOString(),
    STATUS_FA[o.status] || o.status,
    o.customer?.name || '',
    o.customer?.phone || '',
    o.customer?.address || '',
    o.customer?.note || '',
    linesSummary(o),
    (o.lines || []).length,
    o.totals?.grams || 0,
    o.totals?.pieces || 0,
    o.totals?.base || 0,
    o.totals?.discount || 0,
    o.totals?.discountLabel || '',
    o.totals?.shipping || 0,
    o.totals?.total || 0
  ];
};

/* ستون‌های CSV به ترتیب و گروه‌به‌گروه */
// prettier-ignore
const LINE_HEAD = [
  'شمارهٔ سفارش', 'تاریخ شمسی', 'ساعت', 'وضعیت سفارش',
  'نام مشتری', 'تلفن',
  'ردیف', 'کالا', 'شناسهٔ کالا', 'نوع', 'نحوهٔ تحویل', 'ترکیب میکس',
  'وزن (گرم)', 'تعداد', 'قیمت واحد (تومان)', 'جمع ردیف (تومان)',
  'مبلغ کل سفارش (تومان)'
];

const lineRows = (o) => {
  const d = new Date(o.createdAt);
  const jd = jalaliDateString(d);
  const jt = jalaliTimeString(d);
  return (o.lines || []).map((l, i) => [
    o.code,
    jd,
    jt,
    STATUS_FA[o.status] || o.status,
    o.customer?.name || '',
    o.customer?.phone || '',
    i + 1,
    l.name,
    l.slug,
    KIND_FA[l.kind] || l.kind,
    l.grindLabel || '',
    mixText(l),
    l.grams || 0,
    l.qty || 0,
    l.unitPrice || 0,
    l.lineTotal || 0,
    o.totals?.total || 0
  ]);
};

/* نامِ فایل با تاریخ، تا چند نسخهٔ پشتیبان قاطی نشوند */
function stamp() {
  return jalaliDateString(new Date()).replace(/\//g, '-');
}

/* فایل‌ها را تکه‌تکه می‌فرستیم تا حافظهٔ سرور با
   پشتیبانِ بزرگ پر نشود. */
function sendAttachment(res, name, type) {
  res.setHeader('Content-Type', type);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`
  );
  res.setHeader('Cache-Control', 'no-store');
}

router.get('/export.csv', requireAdmin, async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    const mode = req.query.mode === 'lines' ? 'lines' : 'orders';

    sendAttachment(
      res,
      `ghahve-orders-${mode === 'lines' ? 'detail-' : ''}${stamp()}.csv`,
      'text/csv; charset=utf-8'
    );

    /* BOM تا اکسل فارسی را درست باز کند */
    res.write('﻿');
    res.write(csvRow(mode === 'lines' ? LINE_HEAD : ORDER_HEAD));

    const cursor = Order.find(filter).sort({ createdAt: -1 }).lean().cursor();
    for await (const o of cursor) {
      if (mode === 'lines') {
        for (const row of lineRows(o)) res.write(csvRow(row));
      } else {
        res.write(csvRow(orderRow(o)));
      }
    }
    res.end();
  } catch (err) {
    if (res.headersSent) return res.destroy(err);
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

/* پشتیبان کامل: عیناً همان چیزی که در پایگاه داده هست */
router.get('/export.json', requireAdmin, async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);

    sendAttachment(res, `ghahve-orders-backup-${stamp()}.json`, 'application/json; charset=utf-8');

    res.write('{\n');
    res.write(`  "exportedAt": ${JSON.stringify(new Date().toISOString())},\n`);
    res.write(`  "source": "ghahve",\n`);
    res.write(`  "collection": "orders",\n`);
    res.write('  "orders": [\n');

    const cursor = Order.find(filter).sort({ createdAt: 1 }).lean().cursor();
    let n = 0;
    for await (const o of cursor) {
      res.write((n ? ',\n' : '') + '    ' + JSON.stringify(o));
      n += 1;
    }

    res.write(`\n  ],\n  "count": ${n}\n}\n`);
    res.end();
  } catch (err) {
    if (res.headersSent) return res.destroy(err);
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

export default router;
