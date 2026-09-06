import { Router } from 'express';
import { Content, loadContent } from '../models/Content.js';
import { requireAdmin } from '../middleware/auth.js';
import { DEFAULT_CONTENT } from '../data/default-content.js';

const router = Router();

/* کلیدهایی که مدیر اجازهٔ نوشتن‌شان را دارد */
const KEYS = Object.keys(DEFAULT_CONTENT);

/* ── خواندن همهٔ محتوا (عمومی) ──
   اگر بخشی هنوز در پایگاه داده نباشد، پیش‌فرضش برگردانده
   می‌شود تا سایت هیچ‌وقت با بخش خالی بالا نیاید. */
router.get('/', async (_req, res, next) => {
  try {
    const stored = await loadContent();
    const out = {};
    for (const key of KEYS) {
      out[key] = stored[key] !== undefined ? stored[key] : DEFAULT_CONTENT[key];
    }
    res.json(out);
  } catch (err) {
    next(err);
  }
});

/* ── ذخیرهٔ یک بخش ── */
router.put('/:key', requireAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!KEYS.includes(key)) {
      return res.status(400).json({ error: 'این بخش محتوا وجود ندارد' });
    }

    const data = req.body?.data;
    if (data === undefined || data === null || typeof data !== 'object') {
      return res.status(400).json({ error: 'محتوای ارسالی درست نیست' });
    }

    const doc = await Content.findOneAndUpdate(
      { key },
      { key, data },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ ok: true, key, data: doc.data });
  } catch (err) {
    next(err);
  }
});

/* ── بازگرداندن یک بخش به حالت اولیه ── */
router.post('/:key/reset', requireAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!KEYS.includes(key)) {
      return res.status(400).json({ error: 'این بخش محتوا وجود ندارد' });
    }

    await Content.findOneAndUpdate({ key }, { key, data: DEFAULT_CONTENT[key] }, { upsert: true });

    res.json({ ok: true, key, data: DEFAULT_CONTENT[key] });
  } catch (err) {
    next(err);
  }
});

export default router;
