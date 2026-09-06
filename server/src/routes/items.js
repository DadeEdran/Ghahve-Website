import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { KINDS } from '@ghahve/shared/taxonomy.js';
import { Item } from '../models/Item.js';
import { requireAdmin } from '../middleware/auth.js';
import { upload, UPLOAD_DIR } from '../lib/upload.js';

const router = Router();

/* فیلدهایی که مدیر اجازهٔ نوشتن‌شان را دارد.
   هر چیز دیگری در بدنهٔ درخواست نادیده گرفته می‌شود. */
/* فیلدها بر اساس معنا گروه شده‌اند، نه الفبا */
// prettier-ignore
const WRITABLE = [
  'kind', 'slug', 'name', 'origin', 'spec', 'group', 'meter', 'price', 'stock',
  'notes', 'pairs', 'tag', 'shape', 'mat', 'tone', 'zoom', 'image', 'rank', 'active',
  /* معرفی کامل */
  'story', 'taste', 'recommend', 'tastes',
  /* میکس */
  'isBlend', 'house', 'customizable', 'components', 'pool', 'surcharge',
  /* ویترین */
  'featured', 'pinnedTop', 'excludeTop'
];

const BOOLEANS = [
  'active',
  'isBlend',
  'house',
  'customizable',
  'featured',
  'pinnedTop',
  'excludeTop'
];
const NUMBERS = ['meter', 'price', 'rank', 'zoom', 'surcharge'];
const LISTS = ['notes', 'pairs', 'tastes', 'pool'];

function pickBody(body) {
  const out = {};
  for (const key of WRITABLE) {
    if (body[key] === undefined) continue;
    out[key] = body[key];
  }

  /* فهرست‌ها ممکن است به‌صورت رشتهٔ خط‌به‌خط بیایند */
  for (const key of LISTS) {
    if (typeof out[key] === 'string') {
      out[key] = out[key]
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (Array.isArray(out[key])) {
      out[key] = out[key].map((s) => String(s).trim()).filter(Boolean);
    }
  }

  for (const key of NUMBERS) {
    if (out[key] !== undefined && out[key] !== '') out[key] = Number(out[key]);
  }

  for (const key of BOOLEANS) {
    if (out[key] !== undefined) out[key] = out[key] === true || out[key] === 'true';
  }

  /* موجودی جدا از بقیهٔ عددهاست، چون «خالی» معنای خودش
     را دارد: نامحدود (null)، نه صفر. اگر با NUMBERS
     حساب می‌شد، رشتهٔ خالی دست‌نخورده می‌ماند و مونگو
     موقع cast خطا می‌داد. */
  if (out.stock !== undefined) {
    const raw = out.stock === null ? '' : String(out.stock).trim();
    const n = raw === '' ? NaN : Number(raw);
    out.stock = Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
  }

  /* اجزای میکس */
  if (Array.isArray(out.components)) {
    out.components = out.components
      .map((c) => ({
        slug: String(c.slug || '')
          .trim()
          .toLowerCase(),
        percent: Math.round(Number(c.percent) || 0),
        min: Math.round(Number(c.min) || 0),
        max: c.max === undefined || c.max === '' ? 100 : Math.round(Number(c.max)),
        locked: c.locked === true || c.locked === 'true'
      }))
      .filter((c) => c.slug);
  }

  return out;
}

/* اجزای میکس باید به قهوه‌های واقعی و موجود اشاره کنند،
   وگرنه قیمت میکس قابل محاسبه نیست. */
async function checkBlend(data, selfSlug) {
  if (!data.isBlend) return null;

  const slugs = [...(data.components || []).map((c) => c.slug), ...(data.pool || [])];
  if (slugs.length === 0) return null;

  if (slugs.includes(selfSlug)) {
    return 'یک میکس نمی‌تواند خودش را به‌عنوان جزء داشته باشد';
  }

  const found = await Item.find({ slug: { $in: slugs }, kind: 'coffee' })
    .select('slug isBlend')
    .lean();
  const bySlug = new Map(found.map((f) => [f.slug, f]));

  for (const s of slugs) {
    const bean = bySlug.get(s);
    if (!bean) return `دانهٔ «${s}» پیدا نشد — فقط قهوه‌ها را می‌شود در میکس گذاشت`;
    if (bean.isBlend) return `«${s}» خودش یک میکس است و نمی‌تواند جزء میکس دیگری باشد`;
  }

  return null;
}

/* حذف فایل تصویر قبلی وقتی جایگزین یا پاک می‌شود */
function removeImageFile(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(imagePath));
  fs.promises.unlink(file).catch(() => {}); // نبودن فایل مشکلی نیست
}

/* ══════════ مسیرهای عمومی (فروشگاه) ══════════ */

/* GET /api/items?kind=coffee — فقط کالاهای روشن */
router.get('/', async (req, res, next) => {
  try {
    const filter = { active: true };
    if (req.query.kind) filter.kind = req.query.kind;

    const items = await Item.find(filter).sort({ rank: 1, name: 1 }).lean({ virtuals: true });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

/* ── یک کالای روشن، با شناسه‌اش ──
   تا پیش از این، تنها راهِ عمومیِ رسیدن به یک کالا گرفتنِ
   **کل فهرست** بود؛ فروشگاهِ تک‌صفحه‌ای هم دقیقاً همین را
   می‌کرد و بعد در مرورگر دنبال slug می‌گشت.

   با رندر سمت سرور (مورد ۲۶) این دیگر جواب نمی‌دهد:
   صفحهٔ /coffee/yirgacheffe باید برای ساختن یک صفحه صد و
   شش کالا را بخواند. پس این مسیر ساخته شد — همان
   پرس‌وجویی که پیش‌تر فقط برای ساختن تگ‌های <head> زده
   می‌شد، این بار به‌شکل یک مسیر عمومی.

   ── قاعده‌ها عوض نشده‌اند ──
   فقط کالای روشن. کالای خاموش از بیرون با شناسهٔ ناموجود
   فرقی ندارد و هر دو ۴۰۴ می‌گیرند — همان چیزی که
   sitemap.xml و صفحهٔ کالا هم می‌گویند.

   الگوی kind از خودِ taxonomy ساخته می‌شود، نه دستی: هم
   نوع تازه خودبه‌خود مسیر می‌گیرد، و هم این مسیر هیچ‌وقت
   با /api/items/admin/... اشتباه گرفته نمی‌شود. */
router.get(`/:kind(${KINDS.join('|')})/:slug`, async (req, res, next) => {
  try {
    const item = await Item.findOne({
      kind: req.params.kind,
      slug: String(req.params.slug || '')
        .trim()
        .toLowerCase(),
      active: true
    }).lean({ virtuals: true });

    if (!item) return res.status(404).json({ error: 'کالا پیدا نشد' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

/* ══════════ مسیرهای مدیریتی ══════════ */

/* فهرست کامل شامل کالاهای خاموش */
router.get('/admin/all', requireAdmin, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.kind) filter.kind = req.query.kind;

    const q = String(req.query.q || '').trim();
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { slug: rx }, { origin: rx }, { spec: rx }, { tag: rx }];
    }

    const items = await Item.find(filter)
      .sort({ kind: 1, rank: 1, name: 1 })
      .lean({ virtuals: true });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

/* یک کالا برای فرم ویرایش */
router.get('/admin/:id', requireAdmin, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).lean({ virtuals: true });
    if (!item) return res.status(404).json({ error: 'کالا پیدا نشد' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

/* افزودن کالا */
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const data = pickBody(req.body);

    const blendError = await checkBlend(data, data.slug);
    if (blendError) return res.status(400).json({ error: blendError });

    const item = await Item.create(data);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

/* ویرایش کالا */
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'کالا پیدا نشد' });

    const data = pickBody(req.body);

    const blendError = await checkBlend(data, data.slug ?? item.slug);
    if (blendError) return res.status(400).json({ error: blendError });

    /* اگر تصویر عوض شد، فایل قبلی را از دیسک پاک می‌کنیم
       تا پوشهٔ uploads پر از فایل بی‌استفاده نشود. */
    if (data.image !== undefined && data.image !== item.image) {
      removeImageFile(item.image);
    }

    Object.assign(item, data);
    await item.save();
    res.json(item);
  } catch (err) {
    next(err);
  }
});

/* روشن و خاموش کردن سریع */
router.patch('/:id/active', requireAdmin, async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'کالا پیدا نشد' });

    item.active = !item.active;
    await item.save();
    res.json(item);
  } catch (err) {
    next(err);
  }
});

/* حذف کالا */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'کالا پیدا نشد' });

    removeImageFile(item.image);
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

/* ── آپلود تصویر ──
   فایل ذخیره می‌شود و آدرسش برمی‌گردد؛ اتصالش به کالا
   موقع ذخیرهٔ فرم انجام می‌شود. */
router.post('/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
