import { Router } from 'express';
import { Item } from '../models/Item.js';
import { buildSitemap, buildRobots, itemSitemapEntries } from '@ghahve/shared/seo.js';
import { baseUrlFor } from '../lib/siteUrl.js';

/* ══════════════════════════════════════════════════
   sitemap.xml و robots.txt (مورد ۲۹).

   چرا اینجا و نه یک فایل ایستا کنار دارایی‌های سایت؟ چون
   نقشهٔ سایت باید فهرست **همین الانِ** کالاها باشد. فایل
   ایستا یعنی هر بار که مدیر کالایی اضافه یا خاموش می‌کند،
   یک نفر باید یادش باشد فایل را دستی به‌روز کند — و
   نخواهد بود.

   ── چرا این دو مسیر مالِ Express مانده‌اند ──
   صفحه‌ها را Next می‌سازد، ولی این دو نه: ساختنشان به
   پرس‌وجوی زندهٔ مونگو نیاز دارد و مونگو فقط اینجا در
   دسترس است.

   هر دو در ریشه می‌نشینند، نه زیر /api، چون ربات‌ها فقط
   همان‌جا دنبالشان می‌گردند. یعنی در تولید پراکسی باید
   همین دو آدرس را — کنار /api و /uploads — به Express
   بفرستد و بقیه را به Next. فهرستِ همین چهار مسیر در
   web/next.config.mjs هم هست.
   ══════════════════════════════════════════════════ */

const router = Router();

/* یک ساعت کش — نه آن‌قدر کوتاه که هر خزش یک پرس‌وجوی
   تازه بزند، نه آن‌قدر بلند که کالای امروز فردا دیده شود. */
const CACHE = 'public, max-age=3600';

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const baseUrl = baseUrlFor(req);

    /* فقط کالاهای روشن، و فقط سه فیلدی که لازم است —
       نقشهٔ سایت به قیمت و متن معرفی کاری ندارد. */
    const items = await Item.find({ active: true })
      .select('slug kind updatedAt')
      .sort({ kind: 1, slug: 1 })
      .lean();

    const xml = buildSitemap(
      [
        { path: '/', lastmod: new Date(), changefreq: 'daily', priority: 1 },
        ...itemSitemapEntries(items)
      ],
      { baseUrl }
    );

    res.type('application/xml').set('Cache-Control', CACHE).send(xml);
  } catch (err) {
    next(err);
  }
});

router.get('/robots.txt', (req, res) => {
  res
    .type('text/plain')
    .set('Cache-Control', CACHE)
    .send(buildRobots({ baseUrl: baseUrlFor(req) }));
});

export default router;
