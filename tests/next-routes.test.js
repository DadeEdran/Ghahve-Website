import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIND_SEGMENTS, SEGMENT_KIND } from '@ghahve/shared/seo.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'web', 'src', 'app');

/* ══════════════════════════════════════════════════
   هر نوع کالا باید مسیر خودش را داشته باشد.

   ── چرا این تست وجود دارد ──
   در نسخهٔ ویت، مسیرهای کالا با یک حلقه روی
   KIND_SEGMENTS ساخته می‌شدند: نوعِ تازه در
   shared/taxonomy.js خودبه‌خود آدرس هم می‌گرفت.

   App Router برای هر مسیر یک **پوشهٔ واقعی** می‌خواهد و
   چنین حلقه‌ای ممکن نیست. یعنی اگر روزی نوع چهارمی
   اضافه شود، هیچ‌چیز یادآوری نمی‌کند که پوشه‌اش هم لازم
   است — کالاهای آن نوع در sitemap می‌آمدند و آدرسشان
   ۴۰۴ می‌داد. دقیقاً همان دسته خطایی که یک بار شش کالا
   را بی‌لینک گذاشت.

   پس آن حلقه اینجا به یک سنجه تبدیل شده: taxonomy
   منبع حقیقت است و ساختار پوشه‌ها باید با آن جور باشد —
   در هر دو جهت.
   ══════════════════════════════════════════════════ */

const exists = (...p) => fs.existsSync(path.join(APP, ...p));

/* پوشه‌هایی که مسیر نیستند: _ یعنی خصوصی، ( یعنی گروه،
   @ یعنی مسیر موازی. */
const routeFolders = () =>
  fs
    .readdirSync(APP, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !/^[_(@.]/.test(e.name))
    .map((e) => e.name);

describe('مسیر اختصاصی هر نوع کالا', () => {
  it('برای هر segment یک صفحه هست', () => {
    for (const segment of KIND_SEGMENTS) {
      expect(exists(segment, '[slug]', 'page.jsx'), `صفحهٔ /${segment}/[slug] نیست`).toBe(true);
    }
  });

  it('هر segment صفحهٔ «پیدا نشد» خودش را دارد', () => {
    /* بدون این، notFound() به صفحهٔ عمومی می‌افتد و متنِ
       «این کالا پیدا نشد» جایش را به متن کلی می‌دهد. */
    for (const segment of KIND_SEGMENTS) {
      expect(exists(segment, '[slug]', 'not-found.jsx'), `not-found برای ${segment} نیست`).toBe(
        true
      );
    }
  });

  it('هیچ پوشهٔ کالایی بدون پشتوانه در taxonomy نمانده', () => {
    /* جهت برعکس: اگر نوعی از taxonomy حذف شود، پوشه‌اش
       نباید یتیم بماند و آدرسِ مرده بسازد. پوشه‌هایی که
       اصلاً کالا نیستند (مثل admin یا track) [slug]
       ندارند و کاری به این سنجه ندارند. */
    const itemLike = routeFolders().filter((name) => exists(name, '[slug]'));
    expect(itemLike.sort()).toEqual([...KIND_SEGMENTS].sort());
  });

  it('هر پوشه همان segment خودش را به پیاده‌سازی مشترک می‌دهد', () => {
    /* سه فایل تقریباً یکسان‌اند و کپی‌شدنی؛ اشتباهِ محتمل
       این است که segment یکی از آن‌ها عوض نشود و
       /gear/x محتوای قهوه را نشان بدهد. */
    for (const segment of KIND_SEGMENTS) {
      const src = fs.readFileSync(path.join(APP, segment, '[slug]', 'page.jsx'), 'utf8');
      expect(src, `${segment}/page.jsx باید segment خودش را داشته باشد`).toContain(
        `const SEGMENT = '${segment}'`
      );
      expect(SEGMENT_KIND[segment], `segment ناشناخته: ${segment}`).toBeTruthy();
    }
  });
});
