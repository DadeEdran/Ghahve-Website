import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import { Item } from './models/Item.js';
import { Admin } from './models/Admin.js';
import { Content } from './models/Content.js';
import { SEED_ITEMS } from './data/seed-items.js';
import { DEFAULT_CONTENT } from './data/default-content.js';
import { TASTE_TAGS, STORIES, BLENDS } from './data/seed-enrich.js';

/* ══════════════════════════════════════════════════
   پر کردن اولیهٔ پایگاه داده.
   بدون سوییچ، فقط چیزهایی را اضافه می‌کند که نیستند
   و به ویرایش‌های شما دست نمی‌زند.
   با  --reset  همه‌چیز پاک و از نو ساخته می‌شود.
   ══════════════════════════════════════════════════ */

const RESET = process.argv.includes('--reset');

async function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'change-me';

  const existing = await Admin.findOne({ username });

  if (existing && !RESET) {
    console.log(`.  Admin account "${username}" already exists - left untouched`);
    return;
  }

  if (existing) await Admin.deleteOne({ _id: existing._id });

  const admin = new Admin({ username });
  await admin.setPassword(password);
  await admin.save();

  console.log(`OK Admin account created -> username: ${username} | password: ${password}`);
}

async function seedItems() {
  if (RESET) {
    const { deletedCount } = await Item.deleteMany({});
    console.log(`.  Removed ${deletedCount} existing items`);
  }

  let added = 0,
    skipped = 0,
    failed = 0;

  for (const data of SEED_ITEMS) {
    const exists = await Item.exists({ slug: data.slug });
    if (exists) {
      skipped++;
      continue;
    }

    try {
      /* متن معرفی و برچسب طعمی را همین‌جا می‌چسبانیم */
      /* «پیشنهاد ما» را اینجا تعیین نمی‌کنیم — مدیر خودش
         در بخش «ویترین» فرم کالا انتخابش می‌کند. */
      await Item.create({
        ...data,
        ...(STORIES[data.slug] || {}),
        tastes: TASTE_TAGS[data.slug] || []
      });
      added++;
    } catch (err) {
      failed++;
      console.error(`   X  "${data.slug}" not saved: ${err.message}`);
    }
  }

  console.log(
    `OK ${added} items added` +
      (skipped ? ` . ${skipped} already present` : '') +
      (failed ? ` . ${failed} failed` : '')
  );

  const byKind = await Item.aggregate([{ $group: { _id: '$kind', n: { $sum: 1 } } }]);
  const map = Object.fromEntries(byKind.map((k) => [k._id, k.n]));
  console.log(
    `   Now in database: ${map.coffee || 0} coffees, ${map.gear || 0} gear, ${map.powder || 0} powders`
  );
}

/* کالاهایی که از قبل در پایگاه داده بودند، فیلدهای تازه
   (متن معرفی، برچسب طعمی، پیشنهاد ما) را ندارند.
   این‌ها را فقط وقتی پر می‌کنیم که خالی باشند، تا چیزی
   که مدیر خودش نوشته پاک نشود. */
async function enrichExisting() {
  let touched = 0;

  for (const [slug, story] of Object.entries(STORIES)) {
    const item = await Item.findOne({ slug });
    if (!item) continue;

    let changed = false;
    for (const field of ['story', 'taste', 'recommend']) {
      if (!item[field] && story[field]) {
        item[field] = story[field];
        changed = true;
      }
    }
    if (changed) {
      await item.save();
      touched++;
    }
  }

  for (const [slug, tastes] of Object.entries(TASTE_TAGS)) {
    const item = await Item.findOne({ slug });
    if (!item || item.tastes.length) continue;
    item.tastes = tastes;
    await item.save();
    touched++;
  }

  /* «پیشنهاد ما» و «پرفروش‌ها» را seed تعیین نمی‌کند.
     این‌ها انتخاب مدیرند و فقط در فرم خود کالا (بخش «ویترین»)
     روشن می‌شوند — وگرنه هر بار seed، سلیقهٔ مدیر را بازنویسی
     می‌کرد و کالاها خودبه‌خود سر از پیشنهادها درمی‌آوردند. */

  if (touched)
    console.log(`OK ${touched} existing items filled in with descriptions and taste tags`);
}

/* میکس‌ها بعد از ساخته شدن همهٔ قهوه‌ها تنظیم می‌شوند،
   چون اجزای‌شان باید از قبل وجود داشته باشند. */
async function seedBlends() {
  let done = 0,
    skipped = 0;

  for (const [slug, blend] of Object.entries(BLENDS)) {
    const item = await Item.findOne({ slug });
    if (!item) continue;

    /* اگر مدیر خودش قبلاً ترکیبی تعریف کرده، دست نمی‌زنیم */
    if (item.isBlend && item.components.length && !RESET) {
      skipped++;
      continue;
    }

    const beans = await Item.find({
      slug: { $in: [...blend.components.map((c) => c.slug), ...(blend.pool || [])] }
    })
      .select('slug')
      .lean();
    const have = new Set(beans.map((b) => b.slug));

    const components = blend.components.filter((c) => have.has(c.slug));
    if (components.length < 2) continue;

    Object.assign(item, {
      isBlend: true,
      house: blend.house,
      customizable: blend.customizable,
      surcharge: blend.surcharge,
      components,
      pool: (blend.pool || []).filter((s) => have.has(s))
    });

    try {
      await item.save();
      done++;
    } catch (err) {
      console.error(`   X  blend "${slug}" not configured: ${err.message}`);
    }
  }

  console.log(`OK ${done} blends configured` + (skipped ? ` . ${skipped} already configured` : ''));
}

async function seedContent() {
  let added = 0,
    skipped = 0;

  for (const [key, data] of Object.entries(DEFAULT_CONTENT)) {
    const exists = await Content.exists({ key });

    if (exists && !RESET) {
      skipped++;
      continue;
    }

    await Content.findOneAndUpdate({ key }, { key, data }, { upsert: true });
    added++;
  }

  console.log(
    `OK ${added} content sections written` + (skipped ? ` . ${skipped} already present` : '')
  );
}

async function main() {
  await connectDB();

  if (RESET) console.log('!  Reset mode: everything will be rebuilt from scratch\n');

  await seedItems();
  await enrichExisting();
  await seedBlends();
  await seedContent();
  await seedAdmin();

  await mongoose.disconnect();
  console.log('\nOK Done.');
}

main().catch(async (err) => {
  console.error('\nX  Seeding failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
