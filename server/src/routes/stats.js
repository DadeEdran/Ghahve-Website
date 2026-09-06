import { Router } from 'express';
import { Order } from '../models/Order.js';
import { Item } from '../models/Item.js';

const router = Router();

/* ══════════════════════════════════════════════════
   پرفروش‌ها — از روی سفارش‌های واقعی.
   سفارش‌های لغوشده حساب نمی‌شوند. کالاهایی که مدیر
   «سنجاق» کرده همیشه اول می‌آیند، و «کنارگذاشته‌ها»
   هیچ‌وقت نمی‌آیند.
   ══════════════════════════════════════════════════ */
router.get('/top-sellers', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 24);

    /* ستون‌های $group عمداً هم‌ترازند */
    // prettier-ignore
    const rows = await Order.aggregate([
      { $match: { status: { $ne: 'canceled' } } },
      { $unwind: '$lines' },
      {
        $group: {
          _id: '$lines.slug',
          /* واحدها متفاوت‌اند، پس «تعداد دفعات سفارش» را
             ملاک می‌گیریم که بین وزنی و عددی قابل مقایسه است. */
          orders: { $sum: 1 },
          grams:  { $sum: '$lines.grams' },
          qty:    { $sum: '$lines.qty' },
          revenue:{ $sum: '$lines.lineTotal' }
        }
      },
      { $sort: { orders: -1, revenue: -1 } },
      { $limit: 60 }
    ]);

    const salesBySlug = new Map(rows.map((r) => [r._id, r]));

    /* فقط کالاهای فعال و کنارگذاشته‌نشده */
    const items = await Item.find({ active: true, excludeTop: { $ne: true } }).lean({
      virtuals: true
    });

    const scored = items
      .map((it) => {
        const s = salesBySlug.get(it.slug);
        return {
          ...it,
          sales: s ? { orders: s.orders, grams: s.grams, qty: s.qty, revenue: s.revenue } : null
        };
      })
      .filter((it) => it.pinnedTop || it.sales)
      .sort((a, b) => {
        /* سنجاق‌شده‌ها همیشه بالا */
        if (a.pinnedTop !== b.pinnedTop) return a.pinnedTop ? -1 : 1;
        const ao = a.sales?.orders || 0;
        const bo = b.sales?.orders || 0;
        if (bo !== ao) return bo - ao;
        return (a.rank || 999) - (b.rank || 999);
      })
      .slice(0, limit);

    res.json(scored);
  } catch (err) {
    next(err);
  }
});

/* «پیشنهاد ما» — انتخاب دستی مدیر */
router.get('/featured', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 24);
    const items = await Item.find({ active: true, featured: true })
      .sort({ rank: 1, name: 1 })
      .limit(limit)
      .lean({ virtuals: true });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

export default router;
