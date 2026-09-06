/* ══════════════════════════════════════════════════
   حالت تصویری ساز میکس — ریاضی و زمان‌بندی.

   حالت تصویری فقط یک «نمای دیگر» از همان ترکیب است؛ هیچ
   درصدی اینجا حساب نمی‌شود. هرچه به درصدها مربوط است از
   applyPercent در lib/blend.js می‌آید و همان‌جا می‌ماند.

   آنچه اینجاست تصمیم‌های نمایشی‌اند: هر کیسه چقدر بریزد،
   قیف بعد از هر کیسه تا کجا پر شود، و کیسه‌ها کجای صحنه
   بایستند. همه تابع خالص‌اند تا بشود بدون مرورگر تستشان کرد
   و تا هیچ‌کدام لازم نباشد فریم‌به‌فریم در جاوااسکریپت
   حساب شوند — عددها یک بار درمی‌آیند و بقیه‌اش کار CSS است.
   ══════════════════════════════════════════════════ */

import { toFa } from './format.js';

/* چهار مرحله، به ترتیب. کلیدها انگلیسی‌اند چون در data-attribute
   و کلاس CSS می‌نشینند؛ هرچه کاربر می‌بیند فارسی است. */
export const STAGES = ['pick', 'pour', 'mix', 'done'];

export const STAGE_TITLE = {
  pick: 'چیدن کیسه‌ها',
  pour: 'ریختن در دستگاه',
  mix: 'کار دستگاه',
  done: 'میکس آماده است'
};

/* پیامی که برای صفحه‌خوان با لحن آرام خوانده می‌شود */
export const stageMessage = (stage, mix = []) => {
  const n = STAGES.indexOf(stage) + 1;
  const head = `مرحلهٔ ${toFa(n)} از ${toFa(STAGES.length)}`;
  const body = {
    pick: 'کیسه‌ها آمادهٔ چیدن‌اند؛ درصد هر دانه را تنظیم کنید',
    pour: 'کیسه‌ها یکی‌یکی در دستگاه خالی می‌شوند',
    mix: 'دستگاه در حال مخلوط کردن است',
    done: `میکس شما از ${toFa(mix.length)} دانه آماده شد`
  }[stage];
  return `${head} — ${body}`;
};

/* ── زمان‌بندی ──
   کل مرحلهٔ ریختن باید چند ثانیه باشد، نه چند ثانیه به‌ازای
   هر کیسه. پس یک بودجهٔ ثابت داریم که بین کیسه‌ها به نسبت
   سهمشان پخش می‌شود، با یک کفِ کوتاه تا کیسهٔ ۵٪ هم دیده شود. */
export const POUR_BUDGET = 2600; // میلی‌ثانیه، کل مرحلهٔ ۲
export const POUR_MIN = 320; // کوتاه‌ترین ریختنِ قابل‌دیدن
export const MIX_MS = 1700; // مرحلهٔ ۳ — کوتاه، با امکان رد کردن
export const SETTLE_MS = 420; // نشستن بستهٔ آماده روی زمین

/**
 * برنامهٔ ریختن: برای هر دانهٔ زنده، مدت ریختن و سطح قیف پیش و پس از آن.
 *
 * ترتیب همان ترتیب انتخاب مشتری است و عمداً مرتب نمی‌شود —
 * ردیف سبد هم از همین آرایه ساخته می‌شود.
 */
export function pourPlan(parts, budget = POUR_BUDGET, min = POUR_MIN) {
  const live = (parts || []).filter((p) => Number(p.percent) > 0);
  if (!live.length) return [];

  const sum = live.reduce((s, p) => s + Number(p.percent), 0);
  const share = live.length * min >= budget;
  const extra = budget - live.length * min;

  let done = 0;
  const plan = live.map((p, i) => {
    const percent = Number(p.percent);
    /* اگر بودجه حتی برای کفِ همهٔ کیسه‌ها هم نرسد، مساوی پخش می‌کنیم */
    const ms = share ? Math.round(budget / live.length) : Math.round(min + (percent / sum) * extra);
    const from = (done / sum) * 100;
    done += percent;
    return { slug: p.slug, percent, index: i, ms, from, to: (done / sum) * 100 };
  });

  /* باقیماندهٔ گِردکردن روی آخرین کیسه می‌نشیند تا جمعِ زمان
     دقیقاً همان بودجه باشد و مرحلهٔ ۲ کِش نیاید. */
  const drift = budget - plan.reduce((s, x) => s + x.ms, 0);
  const last = plan[plan.length - 1];
  last.ms = Math.max(120, last.ms + drift);

  return plan;
}

/** کل زمان مرحلهٔ ریختن — برای پیام و برای تست */
export const pourTotal = (plan) => plan.reduce((s, p) => s + p.ms, 0);

/* ── هندسهٔ صحنه ──
   صحنه یک SVG با دستگاهِ سمت چپ و کیسه‌های سمت راست است:
   جهت خواندن فارسی از راست به چپ است، پس قهوه هم از راست
   به سمت دستگاه می‌رود. */
export const SCENE = {
  w: 320,
  h: 176,
  floor: 150, // خطی که کیسه‌ها روی آن می‌ایستند
  hopper: { x: 72, y: 40 }, // جایی که دهانهٔ کیسه باید بایستد
  first: 296, // مرکز راست‌ترین کیسه (اولین انتخاب)
  last: 152, // چپ‌ترین جایی که کیسه‌ها اجازه دارند برسند
  slot: 50, // فاصلهٔ آرمانی دو کیسه
  mouth: 45, // فاصلهٔ دهانهٔ کیسه تا پایه‌اش
  /* کیسه باید از افق رد شود تا «ریختن» بخوانَد، نه «کج ایستادن»:
     با این زاویه دهانه به پایین‌چپ می‌افتد و ته کیسه بالا می‌رود. */
  tilt: -118
};

/** کیسه‌ها با جای ایستادن، بزرگی و جای کج‌شدنشان روی قیف */
export function sackLayout(parts, scene = SCENE) {
  const live = (parts || []).filter((p) => Number(p.percent) > 0);
  if (!live.length) return [];

  /* با دانهٔ زیاد، کیسه‌ها نزدیک‌تر می‌ایستند تا از قاب بیرون نزنند */
  const room = scene.first - scene.last;
  const slot = live.length > 1 ? Math.min(scene.slot, room / (live.length - 1)) : 0;

  /* کیسه حول پایه‌اش می‌چرخد، پس با چرخشِ tilt دهانه‌اش این‌قدر
     از پایه فاصله می‌گیرد. برای اینکه دهانهٔ *هر* کیسه — کوچک و
     بزرگ — دقیقاً سر قیف بایستد، پایه‌اش را به‌اندازهٔ همین بردار
     عقب می‌بریم. وگرنه کیسهٔ کوچک بالای هوا خالی می‌کرد. */
  const rad = (scene.tilt * Math.PI) / 180;
  const up = [Math.sin(rad), -Math.cos(rad)];

  return live.map((p, i) => {
    /* بزرگی کیسه با سهمش — ملایم، تا تفاوت دیده شود ولی
       کیسهٔ کوچک هم هنوز کیسه باشد */
    const scale = Number((0.72 + Math.min(1, Number(p.percent) / 100) * 0.46).toFixed(3));
    const reach = scene.mouth * scale;

    return {
      slug: p.slug,
      percent: Number(p.percent),
      index: i,
      x: scene.first - i * slot,
      y: scene.floor,
      scale,
      hx: Number((scene.hopper.x - reach * up[0]).toFixed(2)),
      hy: Number((scene.hopper.y - reach * up[1]).toFixed(2))
    };
  });
}

/* ── کم‌حرکتی ──
   اگر کاربر در سیستم‌عاملش «حرکت کمتر» را روشن کرده باشد، هیچ
   مرحله‌ای تایمر ندارد: با یک کلیک مستقیم به نتیجه می‌رسد. همان
   بسته، همان قیمت، همان ردیف سبد — فقط بدون نمایش. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** سطح قیف پس از خالی شدن k کیسهٔ اول — عددی بین ۰ و ۱ */
export function hopperLevel(plan, k) {
  if (!plan.length || k <= 0) return 0;
  const i = Math.min(k, plan.length) - 1;
  return Number((plan[i].to / 100).toFixed(4));
}
