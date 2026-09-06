/* ══════════════════════════════════════════════════
   تولید تصویر محصولات — عیناً از نسخهٔ اولیهٔ سایت
   هر محصول بر پایهٔ شناسه‌اش یک طرح ثابت می‌گیرد.
   ══════════════════════════════════════════════════ */

import { GROUPS, GEAR_GROUPS, POWDER_GROUPS } from './groups.js';
import { toFa } from './format.js';

/* ── بی‌خطرسازی متنِ کالا پیش از رفتن داخل SVG ──
   خروجی این فایل یک **رشته** است، نه گرهٔ React، و CardArt آن را با
   dangerouslySetInnerHTML تزریق می‌کند — یعنی React هیچ‌چیز را برایمان
   escape نمی‌کند و مرورگر هرچه اینجا نوشتیم را همان‌طور نشانه‌گذاری
   می‌خواند. نام کالا را مدیر می‌نویسد؛ بدون این تابع نامی مثل
   `" onload="alert(1)` از aria-label بیرون می‌زد و به صفتِ اجراشدنی
   تبدیل می‌شد. پس هر متنی که از پایگاه داده می‌آید از اینجا رد می‌شود. */
const ESCAPES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };

export const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ESCAPES[c]);

/* عددهای کالا (فعلاً فقط zoom) هم داخل صفت transform می‌نشینند و
   همان خطر را دارند. عددِ نامعتبر اصلاً وارد نمی‌شود؛ پیش‌فرض می‌گیرد. */
const numOr = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/* هر درجهٔ رست: [رنگ روشن دانه، رنگ تیره دانه، رنگ شیار میانی] */
const ROAST_TONE = {
  1: ['#D3A468', '#A9743A', '#EBC894'],
  2: ['#BE8B4C', '#8E5C2A', '#DEB47F'],
  3: ['#9C6B3C', '#66401F', '#C79763'],
  4: ['#77492A', '#442715', '#A5734A'],
  5: ['#523020', '#26150B', '#84543A']
};

/* ── رنگ دانه، بیرون از این فایل ──
   تا حالا فقط productArt این جدول را می‌خواند. حالت تصویری ساز میکس
   هم به همین رنگ‌ها نیاز دارد: رنگ هر کیسه از درجهٔ رست دانه‌اش
   می‌آید و رنگ میکس از میانگین وزنیِ همان‌ها. باید *همین* جدول باشد،
   نه یک کپیِ دوم؛ وگرنه یک دانه در کارت یک رنگ می‌شد و در ساز میکس
   رنگی دیگر. */
export const roastTone = (meter) => ROAST_TONE[meter] || ROAST_TONE[3];

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (rgb) =>
  '#' +
  rgb
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

/**
 * رنگ یک ترکیب: میانگین وزنیِ رنگِ رستِ دانه‌ها.
 * parts: [{ meter, percent }] — دانه‌های صفر کنار گذاشته می‌شوند.
 *
 * میانگین در همان فضای رنگی sRGB گرفته می‌شود؛ چون هر پنج رنگِ رست
 * روی یک طیفِ قهوه‌ایِ نزدیک‌به‌هم‌اند، میانگینِ ساده هم رنگِ باورپذیری
 * می‌دهد و نتیجه‌اش قابل پیش‌بینی و تست‌پذیر است.
 */
export function mixTone(parts) {
  const live = (parts || []).filter((p) => Number(p.percent) > 0);
  if (!live.length) return roastTone(3);

  const sum = live.reduce((s, p) => s + Number(p.percent), 0);
  const acc = [0, 1, 2].map(() => [0, 0, 0]);

  for (const p of live) {
    const tone = roastTone(p.meter);
    const w = Number(p.percent) / sum;
    tone.forEach((hex, slot) => {
      hexToRgb(hex).forEach((v, ch) => {
        acc[slot][ch] += v * w;
      });
    });
  }

  return acc.map(rgbToHex);
}

/* پس‌زمینهٔ تصویر هر دسته: [رنگ بالا، رنگ پایین، رنگ تأکید] —
   روشن نگه داشته می‌شوند تا دانه‌های تیره روی‌شان خوانا بمانند. */
/* جدول رنگ — سه ستون رنگ باید زیر هم بمانند */
// prettier-ignore
const GROUP_SCENE = {
  light:    ['#F9EFDB', '#E4D2AE', '#6E7F57'],
  medium:   ['#F3E2C7', '#D8BC8E', '#A9713C'],
  dark:     ['#EFDCBB', '#C6A276', '#5E3A1C'],
  espresso: ['#EEDAC4', '#BE9776', '#4A2C18'],
  decaf:    ['#EDF1E0', '#CCD8B7', '#6E7F57']
};

/** مولد عدد شبه‌تصادفی با بذر ثابت (تا طرح هر قهوه تغییر نکند) */
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h ^= h >>> 13;
    return ((h >>> 0) % 100000) / 100000;
  };
}

function motifFor(group, accent) {
  if (group === 'light' || group === 'decaf') {
    return `<g fill="${accent}" opacity=".22">
      <path d="M250 22c-20-14-46-8-58 8 18 14 44 12 58-8Z"/>
      <path d="M262 34c-24 2-40 22-40 42 24-4 40-22 40-42Z"/>
    </g>`;
  }
  if (group === 'espresso') {
    return `<g fill="none" stroke="${accent}" stroke-opacity=".28" stroke-width="3">
      <circle cx="238" cy="34" r="26"/><circle cx="238" cy="34" r="15"/>
    </g>`;
  }
  if (group === 'dark') {
    return `<g fill="none" stroke="${accent}" stroke-opacity=".3" stroke-width="3.5" stroke-linecap="round">
      <path d="M232 60c-12-16 12-26 0-44"/><path d="M256 54c-10-13 10-21 0-36"/>
    </g>`;
  }
  return `<g fill="none" stroke="${accent}" stroke-opacity=".26" stroke-width="3">
    <path d="M222 58c14-26 40-34 60-30" stroke-linecap="round"/>
  </g>`;
}

export function productArt(p) {
  const rnd = seeded(p.slug);
  const [bg1, bg2, accent] = GROUP_SCENE[p.group] || GROUP_SCENE.medium;
  const [c1, c2, crease] = ROAST_TONE[p.meter] || ROAST_TONE[3];
  /* uid به esc نیاز ندارد: هرچه حرف و رقم نباشد حذف می‌شود — که هم
     شناسهٔ معتبر می‌سازد و هم سختگیرانه‌تر از escape است. */
  const uid = 'k' + p.slug.replace(/[^a-z0-9]/gi, '');

  // چیدمان پایه؛ هر دانه کمی جابه‌جا و چرخانده می‌شود
  const spots = [
    [140, 78, 1.75],
    [64, 44, 1.0],
    [212, 92, 1.05],
    [50, 112, 0.82],
    [196, 34, 0.78],
    [104, 122, 0.7],
    [246, 126, 0.62]
  ];

  const beans = spots
    .map(([x, y, s]) => {
      const rot = Math.round(rnd() * 160 - 80);
      const sc = (s * (0.9 + rnd() * 0.22)).toFixed(2);
      const dx = Math.round(rnd() * 18 - 9);
      const dy = Math.round(rnd() * 14 - 7);
      const op = (0.72 + rnd() * 0.28).toFixed(2);
      return `<g transform="translate(${x + dx} ${y + dy}) rotate(${rot}) scale(${sc})" opacity="${op}">
      <ellipse rx="25" ry="17.5" fill="url(#b${uid})"/>
      <path d="M-19 0c6-7.5 6 7.5 19-7.5" fill="none" stroke="${crease}" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="-7" cy="-7" rx="7" ry="3.4" fill="#FFFFFF" opacity=".16"/>
    </g>`;
    })
    .join('');

  return `
  <svg class="card-art" viewBox="0 0 280 150" preserveAspectRatio="xMidYMid slice" role="img"
       aria-label="دانه‌های ${esc(p.name)} با ${esc(GROUPS[p.group]?.label || '')}">
    <defs>
      <linearGradient id="s${uid}" x1="0" y1="0" x2=".7" y2="1">
        <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
      </linearGradient>
      <linearGradient id="b${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <radialGradient id="g${uid}" cx=".28" cy=".2" r=".85">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity=".38"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="280" height="150" fill="url(#s${uid})"/>
    <circle cx="46" cy="128" r="72" fill="${accent}" opacity=".13"/>
    <circle cx="252" cy="16" r="52" fill="${accent}" opacity=".10"/>
    ${motifFor(p.group, accent)}
    ${beans}
    <rect width="280" height="150" fill="url(#g${uid})"/>
  </svg>`;
}

/* ---------- ۵.۵) تصویر ابزار دم‌آوری ----------
   همان زبان تصویری کارت‌های قهوه: پس‌زمینهٔ کاغذی، دو دایرهٔ محو،
   نقش‌مایهٔ دسته و چند دانهٔ کوچک گوشهٔ قاب — ولی به‌جای دانه‌ها،
   خودِ ابزار کشیده می‌شود. رنگ طرح از «جنس» ابزار می‌آید. */

/* هر جنس: main = رنگ اصلی، dk = سایه، lt = روشنایی */
/* جدول رنگ — سه ستون رنگ باید زیر هم بمانند */
// prettier-ignore
const MATERIAL = {
  steel:   { main:'#C3CAD0', dk:'#8A939B', lt:'#EFF3F6' },
  alu:     { main:'#D2CFC7', dk:'#9C978C', lt:'#F3F1EC' },
  black:   { main:'#3D3833', dk:'#1E1B18', lt:'#6A625A' },
  copper:  { main:'#C8874E', dk:'#8E5729', lt:'#E8B683' },
  brass:   { main:'#D3A957', dk:'#A07A2C', lt:'#F0D69C' },
  ceramic: { main:'#F6F0E5', dk:'#D4C6AE', lt:'#FFFFFF' },
  clay:    { main:'#C77A55', dk:'#96513A', lt:'#E7A582' },
  glass:   { main:'#DCE9E7', dk:'#A6BCBA', lt:'#F5FAF9' },
  sage:    { main:'#AEBB92', dk:'#6E7F57', lt:'#D8E0C7' },
  wood:    { main:'#B98B57', dk:'#8A6236', lt:'#DCBB8B' },
  paper:   { main:'#F1E5CE', dk:'#CBB68F', lt:'#FCF5E6' }
};

const COFFEE_LIQ = '#5B3218'; // رنگ قهوهٔ داخل ظرف‌ها
const MILK_LIQ = '#F6EFE1';

/* پس‌زمینهٔ هر دستهٔ ابزار: [بالا، پایین، تأکید] */
/* جدول رنگ — سه ستون رنگ باید زیر هم بمانند */
// prettier-ignore
const GEAR_SCENE = {
  pourover: ['#F4F0DF', '#DCDAB9', '#6E7F57'],
  stovetop: ['#F8E9D4', '#DEBB8F', '#8E5729'],
  grinder:  ['#F1E9DC', '#D1C2AC', '#4A3A2C'],
  kettle:   ['#EBF1F0', '#C7D5D3', '#4F6E6B'],
  cups:     ['#FBF1E5', '#E5CDB4', '#B23A2B'],
  barista:  ['#F1EDE4', '#D1C9B8', '#2E241A']
};

/* طرح هر ابزار در دستگاه مختصات محلی (تقریباً ۹۰×۹۰، مرکز ۰،۰) */
const SHAPES = {
  /* ── دم‌آور دستی ── */
  dripper: (c) => `
    <path d="M-40 -26 L40 -26 L11 24 L-11 24 Z" fill="${c.main}"/>
    <path d="M-40 -26 L0 -26 L0 24 L-11 24 Z" fill="${c.dk}" opacity=".18"/>
    <path d="M-25 -22 L-7 22 M0 -25 L0 24 M25 -22 L7 22" fill="none" stroke="${c.dk}" stroke-width="2.2" opacity=".5"/>
    <ellipse cx="0" cy="-26" rx="40" ry="9" fill="${c.lt}"/>
    <ellipse cx="0" cy="-26" rx="31" ry="6.4" fill="${c.dk}" opacity=".38"/>
    <path d="M39 -22c13 3 13 21 1 25" fill="none" stroke="${c.main}" stroke-width="7" stroke-linecap="round"/>
    <rect x="-17" y="23" width="34" height="8" rx="3.5" fill="${c.dk}"/>`,

  chemex: (c) => `
    <path d="M-29 -40 L-8 -6 L-8 2 C-25 9 -31 20 -31 29 C-31 40 31 40 31 29 C31 20 25 9 8 2 L8 -6 L29 -40 Z"
          fill="${c.main}" opacity=".82" stroke="${c.dk}" stroke-width="2"/>
    <path d="M-29 24 C-18 34 18 34 29 24 C30 37 -30 37 -29 24 Z" fill="${COFFEE_LIQ}" opacity=".72"/>
    <ellipse cx="0" cy="-40" rx="29" ry="7" fill="${c.lt}"/>
    <rect x="-13" y="-10" width="26" height="14" rx="5" fill="#B98B57"/>
    <path d="M-13 -3 h26" stroke="#8A6236" stroke-width="2"/>`,

  wave: (c) => `
    <path d="M-35 -22 L35 -22 L19 22 L-19 22 Z" fill="${c.main}"/>
    <path d="M-24 -20 q4 10 -2 20 M-8 -21 q4 11 -2 21 M8 -21 q-4 11 2 21 M24 -20 q-4 10 2 20"
          fill="none" stroke="${c.dk}" stroke-width="2" opacity=".45"/>
    <ellipse cx="0" cy="-22" rx="35" ry="8.5" fill="${c.lt}"/>
    <ellipse cx="0" cy="-22" rx="27" ry="6" fill="${c.dk}" opacity=".35"/>
    <rect x="-21" y="21" width="42" height="7" rx="3" fill="${c.dk}"/>`,

  aeropress: (c) => `
    <rect x="-17" y="-45" width="34" height="13" rx="5" fill="${c.dk}"/>
    <rect x="-6" y="-34" width="12" height="16" fill="${c.dk}" opacity=".9"/>
    <rect x="-21" y="-19" width="42" height="46" rx="7" fill="${c.main}" opacity=".9" stroke="${c.dk}" stroke-width="2"/>
    <path d="M-14 -8 h10 M-14 0 h10 M-14 8 h10 M-14 16 h10" stroke="${c.dk}" stroke-width="2" opacity=".55"/>
    <rect x="-21" y="12" width="42" height="15" rx="4" fill="${COFFEE_LIQ}" opacity=".55"/>
    <rect x="-16" y="27" width="32" height="8" rx="3" fill="${c.dk}"/>`,

  frenchpress: (c) => `
    <path d="M-21 -20 h42 v44 c0 6 -42 6 -42 0 Z" fill="${c.main}" opacity=".82" stroke="${c.dk}" stroke-width="2"/>
    <path d="M-20 2 h40 v22 c0 5 -40 5 -40 0 Z" fill="${COFFEE_LIQ}" opacity=".75"/>
    <rect x="-24" y="-30" width="48" height="11" rx="5" fill="#C3CAD0"/>
    <path d="M0 -30 v-11" stroke="#8A939B" stroke-width="4"/>
    <circle cx="0" cy="-45" r="6" fill="#C3CAD0" stroke="#8A939B" stroke-width="1.5"/>
    <rect x="-20" y="-4" width="40" height="6" rx="2" fill="#8A939B"/>
    <path d="M21 -12c15 3 15 22 0 25" fill="none" stroke="#3D3833" stroke-width="6" stroke-linecap="round"/>`,

  immersion: (c) => `
    <path d="M-33 -24 L33 -24 L13 20 L-13 20 Z" fill="${c.main}" opacity=".92"/>
    <path d="M-33 -24 L0 -24 L0 20 L-13 20 Z" fill="${c.dk}" opacity=".16"/>
    <ellipse cx="0" cy="-24" rx="33" ry="8" fill="${c.lt}"/>
    <ellipse cx="0" cy="-24" rx="25" ry="6" fill="${COFFEE_LIQ}" opacity=".6"/>
    <path d="M32 -20c12 3 12 19 1 22" fill="none" stroke="${c.main}" stroke-width="6.5" stroke-linecap="round"/>
    <rect x="-13" y="19" width="26" height="10" rx="4" fill="${c.dk}"/>
    <ellipse cx="0" cy="38" rx="4.5" ry="6" fill="${COFFEE_LIQ}" opacity=".8"/>`,

  siphon: (c) => `
    <rect x="-16" y="-47" width="32" height="30" rx="7" fill="${c.main}" opacity=".8" stroke="${c.dk}" stroke-width="2"/>
    <rect x="-13" y="-34" width="26" height="15" rx="3" fill="${COFFEE_LIQ}" opacity=".65"/>
    <rect x="-5" y="-19" width="10" height="18" fill="${c.main}" opacity=".8" stroke="${c.dk}" stroke-width="1.5"/>
    <ellipse cx="0" cy="16" rx="26" ry="24" fill="${c.main}" opacity=".78" stroke="${c.dk}" stroke-width="2"/>
    <path d="M-22 24 a26 26 0 0 0 44 0 a26 24 0 0 1 -44 0Z" fill="${COFFEE_LIQ}" opacity=".5"/>
    <path d="M-16 42 h32" stroke="#8A939B" stroke-width="4" stroke-linecap="round"/>
    <path d="M0 40 c-6 -6 6 -9 0 -16 c8 7 -3 11 0 16Z" fill="#D3A957" opacity=".9"/>`,

  tower: (c) => `
    <rect x="-16" y="-48" width="32" height="24" rx="6" fill="${c.main}" opacity=".8" stroke="${c.dk}" stroke-width="2"/>
    <rect x="-13" y="-40" width="26" height="14" rx="3" fill="#BFD8E0" opacity=".7"/>
    <rect x="-13" y="-20" width="26" height="18" rx="4" fill="${c.dk}" opacity=".35"/>
    <rect x="-11" y="-17" width="22" height="12" rx="3" fill="${COFFEE_LIQ}" opacity=".75"/>
    <rect x="-17" y="2" width="34" height="34" rx="7" fill="${c.main}" opacity=".8" stroke="${c.dk}" stroke-width="2"/>
    <path d="M-15 20 h30 v12 c0 4 -30 4 -30 0Z" fill="${COFFEE_LIQ}" opacity=".7"/>
    <path d="M-26 -48 v88 M26 -48 v88" stroke="#B98B57" stroke-width="5" stroke-linecap="round"/>
    <path d="M-30 40 h60" stroke="#8A6236" stroke-width="6" stroke-linecap="round"/>`,

  /* ── موکاپات و اسپرسو ── */
  moka: (c) => `
    <path d="M-26 -34 L26 -34 L30 -8 L-30 -8 Z" fill="${c.main}"/>
    <path d="M-26 -34 L0 -34 L0 -8 L-30 -8 Z" fill="${c.lt}" opacity=".35"/>
    <path d="M-15 -46 h30 l5 12 h-40 Z" fill="${c.main}"/>
    <circle cx="0" cy="-48" r="5" fill="#3D3833"/>
    <rect x="-31" y="-9" width="62" height="7" rx="2.5" fill="${c.dk}"/>
    <path d="M-30 -2 L30 -2 L24 34 L-24 34 Z" fill="${c.main}"/>
    <path d="M-30 -2 L0 -2 L0 34 L-24 34 Z" fill="${c.lt}" opacity=".3"/>
    <path d="M-26 -40 l-9 -3" stroke="${c.dk}" stroke-width="3" stroke-linecap="round"/>
    <path d="M30 -6 c19 3 19 26 -3 29" fill="none" stroke="#3D3833" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="0" cy="34" rx="24" ry="5" fill="${c.dk}" opacity=".7"/>`,

  cezve: (c) => `
    <path d="M-19 -16 C-19 20 -12 32 0 32 C12 32 19 20 19 -16 Z" fill="${c.main}"/>
    <path d="M-19 -16 C-19 20 -12 32 0 32 L0 -16 Z" fill="${c.lt}" opacity=".35"/>
    <ellipse cx="0" cy="-16" rx="19" ry="6.5" fill="${c.lt}"/>
    <ellipse cx="0" cy="-16" rx="14" ry="4.6" fill="${COFFEE_LIQ}"/>
    <path d="M-19 -15 l-11 -5 l7 10" fill="${c.main}"/>
    <path d="M19 -12 L47 -26" stroke="#8A6236" stroke-width="7" stroke-linecap="round"/>`,

  lever: (c) => `
    <rect x="-32" y="33" width="64" height="10" rx="5" fill="${c.dk}"/>
    <rect x="-7" y="-6" width="14" height="40" rx="3" fill="${c.main}"/>
    <circle cx="0" cy="-12" r="14" fill="${c.main}"/>
    <circle cx="0" cy="-12" r="7" fill="${c.dk}"/>
    <path d="M4 -20 L46 -38" stroke="${c.main}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="48" cy="-39" r="6" fill="${c.dk}"/>
    <path d="M-11 8 h22 l-3 12 h-16 Z" fill="#C3CAD0"/>
    <path d="M-9 22 h18 l-2 10 c0 3 -14 3 -14 0Z" fill="#F6F0E5"/>
    <path d="M-6 22 h12 l-1 4 h-10Z" fill="${COFFEE_LIQ}" opacity=".8"/>`,

  machine: (c) => `
    <rect x="-36" y="-36" width="64" height="64" rx="9" fill="${c.main}"/>
    <rect x="-36" y="-36" width="64" height="15" rx="7" fill="${c.dk}"/>
    <rect x="-36" y="-36" width="24" height="64" rx="9" fill="${c.lt}" opacity=".28"/>
    <circle cx="-20" cy="-29" r="3.6" fill="${c.lt}"/>
    <circle cx="-9" cy="-29" r="3.6" fill="#B23A2B" opacity=".85"/>
    <rect x="-24" y="-6" width="34" height="9" rx="3" fill="${c.dk}"/>
    <path d="M-19 3 h24 l-3 9 h-18 Z" fill="${c.dk}"/>
    <rect x="4" y="4" width="26" height="6" rx="3" fill="#3D3833"/>
    <rect x="-16" y="14" width="17" height="12" rx="2.5" fill="#F6F0E5"/>
    <rect x="-16" y="14" width="17" height="4" rx="2" fill="${COFFEE_LIQ}" opacity=".75"/>
    <path d="M30 -12 v16 c0 4 -4 5 -4 9" fill="none" stroke="${c.dk}" stroke-width="3.4" stroke-linecap="round"/>
    <rect x="-36" y="28" width="64" height="7" rx="3" fill="${c.dk}"/>`,

  /* ── آسیاب ── */
  grinderHand: (c) => `
    <path d="M0 -30 v-14 h18" fill="none" stroke="#8A939B" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="20" cy="-44" r="6" fill="#B98B57"/>
    <rect x="-19" y="-30" width="38" height="9" rx="4" fill="${c.dk}"/>
    <rect x="-17" y="-21" width="34" height="40" rx="7" fill="${c.main}"/>
    <rect x="-17" y="-21" width="13" height="40" rx="7" fill="${c.lt}" opacity=".3"/>
    <rect x="-14" y="19" width="28" height="18" rx="5" fill="#DCE9E7" opacity=".85" stroke="${c.dk}" stroke-width="1.6"/>
    <ellipse cx="0" cy="30" rx="10" ry="4" fill="${COFFEE_LIQ}" opacity=".6"/>`,

  grinderElectric: (c) => `
    <path d="M-21 -46 L21 -46 L13 -24 L-13 -24 Z" fill="#DCE9E7" opacity=".85" stroke="${c.dk}" stroke-width="1.8"/>
    <ellipse cx="-5" cy="-33" rx="5" ry="3.4" fill="${COFFEE_LIQ}" opacity=".8" transform="rotate(-20 -5 -33)"/>
    <ellipse cx="6" cy="-30" rx="5" ry="3.4" fill="${COFFEE_LIQ}" opacity=".8" transform="rotate(24 6 -30)"/>
    <rect x="-19" y="-25" width="38" height="34" rx="7" fill="${c.main}"/>
    <rect x="-19" y="-25" width="14" height="34" rx="7" fill="${c.lt}" opacity=".3"/>
    <circle cx="10" cy="-8" r="4.4" fill="#B23A2B" opacity=".85"/>
    <rect x="-9" y="9" width="18" height="10" fill="${c.dk}"/>
    <rect x="-17" y="19" width="34" height="16" rx="5" fill="${c.dk}" opacity=".85"/>
    <ellipse cx="0" cy="21" rx="14" ry="4" fill="${COFFEE_LIQ}" opacity=".7"/>`,

  sieve: (c) => `
    <path d="M-36 -14 v20 c0 13 72 13 72 0 v-20" fill="${c.main}"/>
    <path d="M-36 -14 v20 c0 7 15 10 15 10 v-22Z" fill="${c.lt}" opacity=".4"/>
    <ellipse cx="0" cy="-14" rx="36" ry="13" fill="${c.lt}"/>
    <ellipse cx="0" cy="-14" rx="29" ry="10.5" fill="#7C6535" opacity=".55"/>
    <path d="M-23 -20 h46 M-28 -14 h56 M-23 -8 h46" stroke="${c.lt}" stroke-width="1.6" opacity=".75"/>
    <path d="M-20 -21 v14 M-10 -24 v20 M0 -24.5 v21 M10 -24 v20 M20 -21 v14" stroke="${c.lt}" stroke-width="1.6" opacity=".55"/>
    <ellipse cx="0" cy="-14" rx="29" ry="10.5" fill="none" stroke="${c.dk}" stroke-width="2"/>
    <ellipse cx="0" cy="18" rx="30" ry="9" fill="${c.dk}" opacity=".3"/>
    <ellipse cx="16" cy="32" rx="9" ry="4.5" fill="${COFFEE_LIQ}" opacity=".5" transform="rotate(15 16 32)"/>`,

  /* ── کتری و اندازه‌گیری ── */
  kettle: (c) => `
    <path d="M-27 -8 C-27 26 -17 35 0 35 C17 35 27 26 27 -8 Z" fill="${c.main}"/>
    <path d="M-27 -8 C-27 26 -17 35 0 35 L0 -8 Z" fill="${c.lt}" opacity=".32"/>
    <ellipse cx="0" cy="-8" rx="27" ry="8" fill="${c.lt}"/>
    <ellipse cx="0" cy="-8" rx="19" ry="5.4" fill="${c.dk}" opacity=".4"/>
    <circle cx="0" cy="-16" r="4.6" fill="${c.dk}"/>
    <path d="M-22 4 C-42 8 -46 -20 -31 -34" fill="none" stroke="${c.main}" stroke-width="7.5" stroke-linecap="round"/>
    <path d="M-22 4 C-40 8 -43 -18 -31 -32" fill="none" stroke="${c.lt}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
    <path d="M24 0 C44 3 44 26 24 28" fill="none" stroke="${c.dk}" stroke-width="6" stroke-linecap="round"/>`,

  kettleBase: (c) => `
    <path d="M-25 -12 C-25 18 -16 26 0 26 C16 26 25 18 25 -12 Z" fill="${c.main}"/>
    <path d="M-25 -12 C-25 18 -16 26 0 26 L0 -12 Z" fill="${c.lt}" opacity=".22"/>
    <ellipse cx="0" cy="-12" rx="25" ry="7.5" fill="${c.lt}" opacity=".9"/>
    <circle cx="0" cy="-19" r="4.4" fill="${c.dk}"/>
    <path d="M-21 0 C-40 4 -43 -22 -29 -35" fill="none" stroke="${c.main}" stroke-width="7" stroke-linecap="round"/>
    <path d="M22 -4 C40 -1 40 20 22 22" fill="none" stroke="${c.dk}" stroke-width="6" stroke-linecap="round"/>
    <rect x="-30" y="26" width="60" height="14" rx="6" fill="${c.dk}"/>
    <rect x="-16" y="30" width="20" height="7" rx="2" fill="#8FD3C7" opacity=".85"/>
    <circle cx="14" cy="33" r="3.4" fill="#B23A2B" opacity=".9"/>`,

  scale: (c) => `
    <rect x="-18" y="-42" width="36" height="26" rx="5" fill="#DCE9E7" opacity=".85" stroke="#A6BCBA" stroke-width="1.6"/>
    <path d="M-16 -26 h32 v8 c0 3 -32 3 -32 0Z" fill="${COFFEE_LIQ}" opacity=".7"/>
    <path d="M18 -38 c11 2 11 16 0 18" fill="none" stroke="#A6BCBA" stroke-width="4"/>
    <rect x="-42" y="-14" width="84" height="10" rx="5" fill="${c.lt}" opacity=".55"/>
    <rect x="-42" y="-8" width="84" height="26" rx="8" fill="${c.main}"/>
    <rect x="-28" y="0" width="34" height="13" rx="3" fill="${c.dk}"/>
    <path d="M-24 7 h6 M-15 7 h6 M-6 7 h4" stroke="#8FD3C7" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="20" cy="7" r="5" fill="${c.dk}"/>
    <circle cx="32" cy="7" r="5" fill="${c.dk}" opacity=".6"/>`,

  thermo: (c) => `
    <rect x="-11" y="-44" width="22" height="28" rx="5" fill="${c.main}"/>
    <rect x="-7.5" y="-39" width="15" height="11" rx="2.5" fill="${c.dk}"/>
    <path d="M-5 -33 h4 M0 -33 h4" stroke="${c.lt}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="0" cy="-21" r="3.2" fill="${c.dk}" opacity=".7"/>
    <path d="M0 -16 v52" stroke="#C3CAD0" stroke-width="4" stroke-linecap="round"/>
    <path d="M0 -16 v52" stroke="#EFF3F6" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>
    <circle cx="0" cy="38" r="3" fill="#8A939B"/>
    <path d="M11 -30 c10 0 10 12 0 12" fill="none" stroke="${c.dk}" stroke-width="3"/>`,

  refracto: (c) => `
    <rect x="-18" y="-36" width="36" height="62" rx="11" fill="${c.main}"/>
    <rect x="-18" y="-36" width="14" height="62" rx="11" fill="${c.lt}" opacity=".35"/>
    <rect x="-12" y="-28" width="24" height="16" rx="3" fill="#3D3833"/>
    <path d="M-8 -20 h6 M0 -20 h5" stroke="#8FD3C7" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="0" cy="2" r="10" fill="#DCE9E7" stroke="${c.dk}" stroke-width="2"/>
    <circle cx="0" cy="2" r="4.5" fill="${COFFEE_LIQ}" opacity=".7"/>
    <rect x="-6" y="16" width="12" height="6" rx="3" fill="${c.dk}"/>
    <rect x="-14" y="26" width="28" height="7" rx="3" fill="${c.dk}" opacity=".55"/>`,

  /* ── فنجان و ماگ ── */
  demitasse: (c) => `
    <ellipse cx="0" cy="30" rx="41" ry="11" fill="${c.main}"/>
    <ellipse cx="0" cy="28" rx="41" ry="10" fill="${c.lt}"/>
    <ellipse cx="0" cy="28" rx="26" ry="6.5" fill="${c.dk}" opacity=".28"/>
    <path d="M-19 -10 L19 -10 L13 18 C12 24 -12 24 -13 18 Z" fill="${c.main}"/>
    <path d="M-19 -10 L0 -10 L0 22 C-8 22 -12 21 -13 18 Z" fill="${c.dk}" opacity=".12"/>
    <ellipse cx="0" cy="-10" rx="19" ry="6.4" fill="${c.lt}"/>
    <ellipse cx="0" cy="-10" rx="14" ry="4.6" fill="${COFFEE_LIQ}"/>
    <ellipse cx="0" cy="-10" rx="14" ry="4.6" fill="#C08A4E" opacity=".55"/>
    <path d="M19 -4 c13 0 13 15 0 15" fill="none" stroke="${c.main}" stroke-width="5.5" stroke-linecap="round"/>`,

  cup: (c) => `
    <ellipse cx="0" cy="32" rx="44" ry="11" fill="${c.main}"/>
    <ellipse cx="0" cy="30" rx="44" ry="10" fill="${c.lt}"/>
    <path d="M-27 -14 L27 -14 L19 20 C18 26 -18 26 -19 20 Z" fill="${c.main}"/>
    <path d="M-27 -14 L0 -14 L0 24 C-10 24 -18 23 -19 20 Z" fill="${c.dk}" opacity=".12"/>
    <ellipse cx="0" cy="-14" rx="27" ry="9" fill="${c.lt}"/>
    <ellipse cx="0" cy="-14" rx="21" ry="6.8" fill="#C08A4E"/>
    <path d="M0 -20 c-7 2 -10 6 -6 9 c3 2 5 -1 6 -3 c1 2 3 5 6 3 c4 -3 1 -7 -6 -9Z" fill="${MILK_LIQ}" opacity=".92"/>
    <path d="M0 -11 v6" stroke="${MILK_LIQ}" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
    <path d="M27 -8 c15 0 15 17 0 17" fill="none" stroke="${c.main}" stroke-width="6" stroke-linecap="round"/>`,

  mug: (c) => `
    <path d="M-21 -26 h42 v46 c0 7 -6 9 -21 9 s-21 -2 -21 -9 Z" fill="${c.main}"/>
    <path d="M-21 -26 h11 v55 c-8 -1 -11 -3 -11 -9 Z" fill="${c.lt}" opacity=".38"/>
    <ellipse cx="0" cy="-26" rx="21" ry="7.5" fill="${c.lt}"/>
    <ellipse cx="0" cy="-26" rx="15.5" ry="5.4" fill="${COFFEE_LIQ}"/>
    <path d="M21 -14 c17 0 17 24 0 24" fill="none" stroke="${c.main}" stroke-width="7.5" stroke-linecap="round"/>
    <path d="M-8 -38 c5 -6 -4 -9 1 -15 M8 -38 c5 -6 -4 -9 1 -15" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>`,

  glass: (c) => `
    <path d="M-17 -30 h34 l-4 54 c-1 5 -25 5 -26 0 Z" fill="${c.main}" opacity=".75" stroke="${c.dk}" stroke-width="2"/>
    <path d="M-14 -4 h28 l-2 28 c-1 4 -23 4 -24 0 Z" fill="${COFFEE_LIQ}" opacity=".8"/>
    <path d="M-15.5 -14 h31 l-1 12 h-29 Z" fill="#D8B187" opacity=".85"/>
    <path d="M-16 -26 h32 l-1 10 h-30 Z" fill="${MILK_LIQ}" opacity=".8"/>
    <ellipse cx="0" cy="-30" rx="17" ry="5.5" fill="${c.lt}"/>
    <path d="M-11 -24 l-2 44" stroke="#FFFFFF" stroke-width="3" opacity=".4" stroke-linecap="round"/>`,

  /* لیوان دوجداره: جدارهٔ بیرونی صاف، ظرف داخلی کمی تو رفته */
  glassDouble: (c) => `
    <path d="M-21 -32 h42 l-3 58 c-1 5 -35 5 -36 0 Z" fill="${c.main}" opacity=".55" stroke="${c.dk}" stroke-width="2"/>
    <path d="M-15 -26 h30 l-3 44 c-1 4 -23 4 -24 0 Z" fill="${c.lt}" opacity=".8" stroke="${c.dk}" stroke-width="1.4"/>
    <path d="M-13 -6 h26 l-2 24 c-1 4 -21 4 -22 0 Z" fill="${COFFEE_LIQ}" opacity=".8"/>
    <path d="M-14.5 -18 h29 l-1 12 h-27 Z" fill="${MILK_LIQ}" opacity=".9"/>
    <ellipse cx="0" cy="-32" rx="21" ry="6" fill="${c.lt}"/>
    <ellipse cx="0" cy="-26" rx="15" ry="4.4" fill="${c.dk}" opacity=".28"/>
    <path d="M-16 -22 l-2 44" stroke="#FFFFFF" stroke-width="3" opacity=".45" stroke-linecap="round"/>`,

  tumbler: (c) => `
    <rect x="-18" y="-34" width="36" height="60" rx="7" fill="${c.main}"/>
    <rect x="-18" y="-34" width="13" height="60" rx="7" fill="${c.lt}" opacity=".38"/>
    <rect x="-20" y="-46" width="40" height="13" rx="5" fill="${c.dk}"/>
    <rect x="2" y="-43" width="12" height="6" rx="3" fill="${c.lt}" opacity=".8"/>
    <rect x="-18" y="-6" width="36" height="12" fill="${c.dk}" opacity=".22"/>
    <rect x="-18" y="20" width="36" height="6" rx="3" fill="${c.dk}" opacity=".5"/>`,

  bowl: (c) => `
    <path d="M-29 -8 C-29 18 -18 29 0 29 C18 29 29 18 29 -8 Z" fill="${c.main}"/>
    <path d="M-29 -8 C-29 18 -18 29 0 29 L0 -8 Z" fill="${c.dk}" opacity=".1"/>
    <ellipse cx="0" cy="-8" rx="29" ry="9.5" fill="${c.lt}"/>
    <ellipse cx="0" cy="-8" rx="23" ry="7.4" fill="${COFFEE_LIQ}"/>
    <ellipse cx="-6" cy="-9" rx="7" ry="2.6" fill="#C08A4E" opacity=".6"/>
    <ellipse cx="0" cy="31" rx="17" ry="4.5" fill="${c.dk}" opacity=".35"/>
    <path d="M22 -34 L38 4" stroke="#C3CAD0" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="20" cy="-37" rx="10" ry="6.5" fill="#C3CAD0" transform="rotate(-22 20 -37)"/>`,

  server: (c) => `
    <path d="M-21 -32 h42 l4 40 c1 9 -10 14 -25 14 s-26 -5 -25 -14 Z" fill="${c.main}" opacity=".78" stroke="${c.dk}" stroke-width="2"/>
    <path d="M-21 6 h44 l1 2 c1 9 -10 14 -24 14 s-25 -5 -24 -14 Z" fill="${COFFEE_LIQ}" opacity=".78"/>
    <ellipse cx="0" cy="-32" rx="21" ry="7" fill="${c.lt}"/>
    <path d="M-18 -14 h9 M-18 -4 h9 M-19 6 h10" stroke="${c.dk}" stroke-width="2" opacity=".7"/>
    <path d="M21 -20 c15 3 15 21 3 25" fill="none" stroke="${c.dk}" stroke-width="5" stroke-linecap="round"/>`,

  /* ── ابزار بار و نگهداری ── */
  tamper: (c) => `
    <path d="M-10 -42 h20 v24 c0 4 -20 4 -20 0 Z" fill="${c.main}"/>
    <path d="M-10 -42 h7 v28 h-7 Z" fill="${c.lt}" opacity=".4"/>
    <ellipse cx="0" cy="-42" rx="10" ry="4" fill="${c.lt}"/>
    <path d="M-17 -18 h34 l-3 9 h-28 Z" fill="#8A939B"/>
    <rect x="-21" y="-9" width="42" height="11" rx="3" fill="#C3CAD0"/>
    <ellipse cx="0" cy="2" rx="21" ry="5.5" fill="#8A939B"/>
    <ellipse cx="0" cy="22" rx="26" ry="9" fill="${COFFEE_LIQ}" opacity=".85"/>
    <ellipse cx="0" cy="20" rx="26" ry="9" fill="#6B4023"/>`,

  leveler: (c) => `
    <path d="M-10 -40 h20 v22 c0 4 -20 4 -20 0 Z" fill="${c.main}"/>
    <ellipse cx="0" cy="-40" rx="10" ry="4" fill="${c.lt}" opacity=".6"/>
    <ellipse cx="0" cy="-16" rx="27" ry="8" fill="${c.lt}" opacity=".5"/>
    <path d="M-27 -16 v8 c0 8 54 8 54 0 v-8" fill="${c.main}"/>
    <ellipse cx="0" cy="-8" rx="27" ry="8" fill="${c.dk}"/>
    <path d="M-16 -9 l32 0 M-12 -3 l24 0" stroke="${c.lt}" stroke-width="2" opacity=".45"/>
    <ellipse cx="0" cy="16" rx="27" ry="9" fill="#6B4023"/>
    <path d="M-27 16 v-4 a27 9 0 0 0 54 0 v4 a27 9 0 0 1 -54 0Z" fill="${COFFEE_LIQ}" opacity=".6"/>`,

  wdt: (c) => `
    <path d="M-11 -44 h22 l-3 20 h-16 Z" fill="${c.main}"/>
    <path d="M-11 -44 h8 l-2 20 h-6 Z" fill="${c.lt}" opacity=".45"/>
    <rect x="-15" y="-25" width="30" height="9" rx="4" fill="#C3CAD0"/>
    <path d="M-11 -16 v30 M-5.5 -16 v32 M0 -16 v33 M5.5 -16 v32 M11 -16 v30"
          stroke="#8A939B" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="0" cy="26" rx="26" ry="9" fill="#6B4023"/>
    <ellipse cx="0" cy="24" rx="26" ry="9" fill="${COFFEE_LIQ}" opacity=".9"/>`,

  pitcher: (c) => `
    <path d="M-22 -24 h40 l6 40 c1 7 -11 12 -26 12 s-22 -5 -21 -12 Z" fill="${c.main}"/>
    <path d="M-22 -24 h13 l-3 52 c-6 -1 -10 -3 -10 -6 Z" fill="${c.lt}" opacity=".4"/>
    <ellipse cx="-2" cy="-24" rx="20" ry="7" fill="${c.lt}"/>
    <ellipse cx="-2" cy="-23" rx="15" ry="5" fill="${MILK_LIQ}"/>
    <path d="M-22 -22 l-13 -8 l7 13" fill="${c.main}"/>
    <path d="M20 -10 c17 4 17 25 2 29" fill="none" stroke="${c.dk}" stroke-width="6" stroke-linecap="round"/>`,

  knockbox: (c) => `
    <rect x="-32" y="-4" width="64" height="34" rx="9" fill="${c.main}"/>
    <rect x="-32" y="-4" width="22" height="34" rx="9" fill="${c.lt}" opacity=".28"/>
    <ellipse cx="0" cy="-4" rx="32" ry="11" fill="${c.dk}"/>
    <ellipse cx="0" cy="-4" rx="25" ry="8" fill="#1E1B18"/>
    <rect x="-24" y="-14" width="48" height="8" rx="4" fill="#C3CAD0"/>
    <circle cx="-24" cy="-10" r="5" fill="#8A939B"/><circle cx="24" cy="-10" r="5" fill="#8A939B"/>
    <ellipse cx="6" cy="-26" rx="11" ry="4.5" fill="${COFFEE_LIQ}" transform="rotate(-16 6 -26)"/>
    <rect x="-28" y="30" width="56" height="6" rx="3" fill="${c.dk}" opacity=".8"/>`,

  filters: (c) => `
    <path d="M-26 -22 L34 -22 L10 30 L-2 30 Z" fill="${c.dk}" opacity=".45"/>
    <path d="M-30 -22 L30 -22 L6 30 L-6 30 Z" fill="${c.main}"/>
    <path d="M-30 -22 L0 -22 L0 30 L-6 30 Z" fill="${c.lt}" opacity=".5"/>
    <ellipse cx="0" cy="-22" rx="30" ry="7.5" fill="${c.lt}"/>
    <path d="M-24 -16 L2 28" fill="none" stroke="${c.dk}" stroke-width="2" stroke-dasharray="4 4" opacity=".8"/>
    <path d="M-14 34 h30 l-3 8 h-24 Z" fill="${c.dk}" opacity=".3"/>`,

  canister: (c) => `
    <rect x="-25" y="-18" width="50" height="46" rx="8" fill="${c.main}"/>
    <rect x="-25" y="-18" width="17" height="46" rx="8" fill="${c.lt}" opacity=".38"/>
    <rect x="-28" y="-33" width="56" height="16" rx="7" fill="#3D3833"/>
    <circle cx="0" cy="-25" r="5.5" fill="${c.lt}" opacity=".85"/>
    <rect x="-16" y="-4" width="32" height="20" rx="4" fill="#2E241A" opacity=".55"/>
    <ellipse cx="-6" cy="4" rx="6" ry="4" fill="${COFFEE_LIQ}" transform="rotate(-20 -6 4)"/>
    <ellipse cx="6" cy="9" rx="6" ry="4" fill="${COFFEE_LIQ}" transform="rotate(18 6 9)"/>
    <rect x="-25" y="24" width="50" height="6" rx="3" fill="${c.dk}" opacity=".55"/>`,

  tablets: (c) => `
    <rect x="-17" y="-30" width="34" height="56" rx="9" fill="${c.main}"/>
    <rect x="-17" y="-30" width="12" height="56" rx="9" fill="${c.lt}" opacity=".45"/>
    <rect x="-19" y="-42" width="38" height="14" rx="6" fill="${c.dk}"/>
    <rect x="-12" y="-14" width="24" height="26" rx="4" fill="${c.lt}" opacity=".9"/>
    <circle cx="0" cy="-1" r="7" fill="${c.dk}" opacity=".45"/>
    <circle cx="30" cy="24" r="9" fill="${c.lt}" stroke="${c.dk}" stroke-width="2"/>
    <circle cx="30" cy="24" r="3.4" fill="${c.dk}" opacity=".4"/>`
};

/* نقش‌مایهٔ گوشهٔ قاب برای هر دستهٔ ابزار */
function gearMotif(group, accent) {
  if (group === 'kettle') {
    return `<g fill="none" stroke="${accent}" stroke-opacity=".3" stroke-width="3.5" stroke-linecap="round">
      <path d="M232 62c-12-16 12-26 0-44"/><path d="M256 56c-10-13 10-21 0-36"/>
    </g>`;
  }
  if (group === 'cups') {
    return `<g fill="none" stroke="${accent}" stroke-opacity=".24" stroke-width="3">
      <circle cx="240" cy="34" r="27"/><circle cx="240" cy="34" r="16"/>
    </g>`;
  }
  if (group === 'grinder') {
    return `<g fill="none" stroke="${accent}" stroke-opacity=".26" stroke-width="3">
      <path d="M216 26h48M222 38h36M228 50h24" stroke-linecap="round"/>
    </g>`;
  }
  if (group === 'stovetop') {
    return `<g fill="${accent}" opacity=".2">
      <path d="M250 20c-12 10-12 24 0 34 12-10 12-24 0-34Z"/>
    </g>`;
  }
  if (group === 'barista') {
    return `<g fill="none" stroke="${accent}" stroke-opacity=".24" stroke-width="3">
      <rect x="216" y="18" width="46" height="34" rx="8"/>
    </g>`;
  }
  return `<g fill="${accent}" opacity=".2">
    <path d="M252 20c-20-13-46-7-58 9 18 14 44 12 58-9Z"/>
    <path d="M264 32c-24 2-40 22-40 42 24-4 40-22 40-42Z"/>
  </g>`;
}

export function gearArt(it) {
  const rnd = seeded(it.slug);
  const [bg1, bg2, accent] = GEAR_SCENE[it.group] || GEAR_SCENE.pourover;
  const c = MATERIAL[it.mat] || MATERIAL.steel;
  const uid = 'v' + it.slug.replace(/[^a-z0-9]/gi, '');
  const z = numOr(it.zoom, 1);

  /* چند دانهٔ کوچک کف قاب، تا کارت ابزار با کارت قهوه هم‌خانواده بماند */
  const beans = [
    [34, 128, 0.5],
    [60, 136, 0.4],
    [244, 124, 0.46]
  ]
    .map(([x, y, s]) => {
      const rot = Math.round(rnd() * 150 - 75);
      return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity=".5">
      <ellipse rx="25" ry="17.5" fill="${accent}" opacity=".55"/>
      <path d="M-19 0c6-7.5 6 7.5 19-7.5" fill="none" stroke="${bg1}" stroke-width="3.4" stroke-linecap="round"/>
    </g>`;
    })
    .join('');

  const draw = (SHAPES[it.shape] || SHAPES.mug)(c, accent);

  return `
  <svg class="card-art" viewBox="0 0 280 150" preserveAspectRatio="xMidYMid slice" role="img"
       aria-label="${esc(it.name)} — ${esc(GEAR_GROUPS[it.group]?.label || '')}">
    <defs>
      <linearGradient id="s${uid}" x1="0" y1="0" x2=".7" y2="1">
        <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
      </linearGradient>
      <radialGradient id="g${uid}" cx=".28" cy=".2" r=".85">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity=".38"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="280" height="150" fill="url(#s${uid})"/>
    <circle cx="46" cy="128" r="72" fill="${accent}" opacity=".13"/>
    <circle cx="252" cy="16" r="52" fill="${accent}" opacity=".10"/>
    ${gearMotif(it.group, accent)}
    ${beans}
    <ellipse cx="140" cy="136" rx="66" ry="9" fill="#1E1710" opacity=".1"/>
    <g transform="translate(140 76) scale(${z})">${draw}</g>
    <rect width="280" height="150" fill="url(#g${uid})"/>
  </svg>`;
}

/* ---------- ۵.۷) تصویر پودرها ----------
   باز هم همان قاب: پس‌زمینهٔ کاغذی، دو دایرهٔ محو، نقش‌مایه و چند دانه.
   این‌بار یک تپهٔ پودر با رنگ خودِ محصول کشیده می‌شود و کنارش
   ظرف یا ادویهٔ مربوط به همان پودر می‌نشیند. */

/* رنگ هر پودر: [اصلی، سایه، روشن] */
/* جدول رنگ — سه ستون رنگ باید زیر هم بمانند */
// prettier-ignore
const POWDER_TONE = {
  cocoa:      ['#7B4A2B', '#4E2B16', '#A5713F'],
  darkcocoa:  ['#4A2B1B', '#2A160D', '#71482B'],
  white:      ['#E7D6B4', '#C0A67C', '#FAF1DF'],
  matcha:     ['#7FA83F', '#54762A', '#A8C96B'],
  matchaLight:['#9BBF5C', '#6E9235', '#C3DA92'],
  hojicha:    ['#A9603A', '#79391F', '#C98A5E'],
  masala:     ['#C08A4E', '#8E5B2A', '#DDB07A'],
  cinnamon:   ['#B4643A', '#82401F', '#D68C5F'],
  ginger:     ['#D8B57A', '#A88645', '#EBD2A5'],
  turmeric:   ['#E0A93B', '#AF7A18', '#F2CB74'],
  cardamom:   ['#93A86A', '#6A7C46', '#B8C994'],
  nutmeg:     ['#A9713F', '#77461F', '#C79463'],
  vanilla:    ['#E4D6B8', '#BFA57E', '#F7EFDD'],
  milk:       ['#EBE1CD', '#C6BAA1', '#FFFFFF'],
  sugar:      ['#E2CDA4', '#BC9F72', '#F6ECD8'],
  caramel:    ['#C98A45', '#96601F', '#E3B27B']
};

/* پس‌زمینهٔ هر دستهٔ پودر: [بالا، پایین، تأکید] */
/* جدول رنگ — سه ستون رنگ باید زیر هم بمانند */
// prettier-ignore
const POWDER_SCENE = {
  chocolate: ['#F7EAD9', '#DCBB94', '#5B3218'],
  matcha:    ['#F0F4E3', '#CDDBB0', '#54762A'],
  masala:    ['#FAECD5', '#E2C395', '#A9601F'],
  spice:     ['#F8EDDB', '#E0C59E', '#8E4B22'],
  milk:      ['#FBF5EB', '#E4DAC8', '#8B8577'],
  sweet:     ['#FCF1DD', '#E8D2A9', '#B23A2B']
};

/* تپهٔ پودر — پایهٔ همهٔ طرح‌ها */
function heap(t, w = 44) {
  const [main, dk, lt] = t;
  return `
    <ellipse cx="0" cy="26" rx="${w}" ry="9" fill="${dk}" opacity=".35"/>
    <path d="M-${w} 26 C-${w - 10} 2 -16 -18 0 -18 C16 -18 ${w - 10} 2 ${w} 26 Z"
          fill="${main}" stroke="${dk}" stroke-opacity=".3" stroke-width="1.5"/>
    <path d="M-${w} 26 C-${w - 10} 2 -16 -18 0 -18 C-6 -6 -14 8 -${w - 6} 26 Z" fill="${lt}" opacity=".45"/>
    <ellipse cx="0" cy="26" rx="${w}" ry="8" fill="${lt}" opacity=".22"/>
    <circle cx="-14" cy="12" r="2" fill="${lt}" opacity=".55"/>
    <circle cx="9" cy="6" r="1.6" fill="${lt}" opacity=".5"/>
    <circle cx="18" cy="17" r="2.2" fill="${dk}" opacity=".4"/>
    <circle cx="-24" cy="20" r="1.8" fill="${dk}" opacity=".35"/>`;
}

const POWDER_SHAPES = {
  /* پیمانهٔ چوبی پر از پودر، کنار تپه */
  scoop: (t) => `
    ${heap(t, 40)}
    <g transform="translate(24 -14) rotate(18)">
      <path d="M-13 0 a13 13 0 0 0 26 0 Z" fill="#B98B57"/>
      <ellipse cx="0" cy="0" rx="13" ry="5" fill="${t[0]}"/>
      <ellipse cx="0" cy="-1.5" rx="13" ry="5" fill="${t[2]}" opacity=".55"/>
      <rect x="11" y="-3" width="26" height="5.5" rx="2.6" fill="#8A6236"/>
    </g>`,

  /* کاسهٔ ماچا با هم‌زن بامبو */
  chasen: (t) => `
    ${heap(t, 30)}
    <g transform="translate(-30 -6)">
      <path d="M-24 -6 C-24 14 -14 22 0 22 C14 22 24 14 24 -6 Z" fill="#F6F0E5"/>
      <ellipse cx="0" cy="-6" rx="24" ry="8" fill="#FFFFFF"/>
      <ellipse cx="0" cy="-6" rx="18" ry="6" fill="${t[0]}"/>
      <ellipse cx="-5" cy="-7" rx="7" ry="2.4" fill="${t[2]}" opacity=".7"/>
    </g>
    <g transform="translate(26 -26) rotate(12)">
      <rect x="-9" y="-16" width="18" height="20" rx="4" fill="#E4C88E"/>
      <path d="M-9 4 l-4 22 M-4 4 l-2 24 M1 4 l1 24 M6 4 l4 22 M9 4 l6 20"
            stroke="#D6B575" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <rect x="-9" y="-22" width="18" height="8" rx="3" fill="#C9A65E"/>
    </g>`,

  /* الک کوچک که پودر را روی تپه می‌بیزد */
  sifterSmall: (t) => `
    ${heap(t, 38)}
    <g transform="translate(20 -30)">
      <path d="M-18 -6 v8 c0 8 36 8 36 0 v-8" fill="#C3CAD0"/>
      <ellipse cx="0" cy="-6" rx="18" ry="6.5" fill="#EFF3F6"/>
      <ellipse cx="0" cy="-6" rx="13" ry="4.6" fill="${t[1]}" opacity=".7"/>
      <rect x="16" y="-9" width="20" height="4.5" rx="2.2" fill="#8A939B"/>
      <path d="M-9 6 v10 M-3 7 v13 M4 6 v11 M10 5 v9" stroke="${t[0]}" stroke-width="2" opacity=".55" stroke-linecap="round"/>
    </g>`,

  /* فنجان نوشیدنی آماده، پشت تپه */
  mug: (t) => `
    ${heap(t, 34)}
    <g transform="translate(-26 -18)">
      <path d="M-18 -16 h36 v28 c0 6 -5 8 -18 8 s-18 -2 -18 -8 Z" fill="#F6F0E5"/>
      <ellipse cx="0" cy="-16" rx="18" ry="6.5" fill="#FFFFFF"/>
      <ellipse cx="0" cy="-16" rx="13" ry="4.6" fill="${t[0]}"/>
      <path d="M18 -8 c14 0 14 18 0 18" fill="none" stroke="#F6F0E5" stroke-width="6" stroke-linecap="round"/>
      <path d="M-7 -28 c5 -6 -4 -9 1 -14 M7 -28 c5 -6 -4 -9 1 -14"
            fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>
    </g>`,

  /* قوطی شیشه‌ای با درِ فلزی */
  jar: (t) => `
    ${heap(t, 32)}
    <g transform="translate(-24 -12)">
      <rect x="-19" y="-26" width="38" height="44" rx="7" fill="#DCE9E7" opacity=".55" stroke="#A6BCBA" stroke-width="1.8"/>
      <path d="M-16 -6 h32 v18 c0 3 -32 3 -32 0 Z" fill="${t[0]}"/>
      <path d="M-16 -6 h11 v21 h-11 Z" fill="${t[2]}" opacity=".45"/>
      <rect x="-21" y="-34" width="42" height="11" rx="5" fill="#8A939B"/>
      <rect x="-12" y="-2" width="24" height="9" rx="3" fill="#FBF6EA" opacity=".8"/>
    </g>`,

  /* ساشهٔ باز که پودر از آن می‌ریزد */
  sachet: (t) => `
    ${heap(t, 34)}
    <g transform="translate(24 -22) rotate(14)">
      <path d="M-13 -24 h26 v42 h-26 Z" fill="${t[2]}"/>
      <path d="M-13 -24 h11 v42 h-11 Z" fill="#FFFFFF" opacity=".35"/>
      <path d="M-13 -24 l4 -5 l5 5 l4 -5 l5 5 l4 -5 l4 5" fill="none" stroke="${t[1]}" stroke-width="2.4"/>
      <rect x="-9" y="-12" width="18" height="16" rx="3" fill="${t[1]}" opacity=".55"/>
      <path d="M-8 18 c2 8 14 10 16 18" fill="none" stroke="${t[0]}" stroke-width="4.5" stroke-linecap="round" opacity=".8"/>
    </g>`,

  /* تخته‌شکلات کنار تپه */
  bar: (t) => `
    ${heap(t, 36)}
    <g transform="translate(26 -8) rotate(-10)">
      <rect x="-16" y="-26" width="32" height="42" rx="4" fill="${t[1]}"/>
      <rect x="-16" y="-26" width="32" height="42" rx="4" fill="${t[0]}" opacity=".55"/>
      <path d="M0 -26 v42 M-16 -12 h32 M-16 2 h32" stroke="${t[1]}" stroke-width="2.6"/>
      <rect x="-16" y="-26" width="32" height="6" rx="3" fill="${t[2]}" opacity=".5"/>
    </g>`,

  /* چوب‌های دارچین */
  cinnamonSticks: (t) => `
    ${heap(t, 38)}
    <g transform="translate(24 -6) rotate(-24)">
      <rect x="-7" y="-30" width="14" height="46" rx="7" fill="${t[0]}"/>
      <rect x="-7" y="-30" width="6" height="46" rx="3" fill="${t[2]}" opacity=".6"/>
      <ellipse cx="0" cy="-30" rx="7" ry="3" fill="${t[1]}"/>
    </g>
    <g transform="translate(38 4) rotate(16)">
      <rect x="-6" y="-24" width="12" height="38" rx="6" fill="${t[1]}"/>
      <ellipse cx="0" cy="-24" rx="6" ry="2.6" fill="${t[2]}"/>
    </g>`,

  /* غلاف‌های هل */
  podsGreen: (t) => `
    ${heap(t, 38)}
    <g transform="translate(26 -18) rotate(-18)">
      <ellipse rx="10" ry="17" fill="${t[2]}"/>
      <path d="M0 -17 v34" stroke="${t[1]}" stroke-width="2" opacity=".6"/>
      <path d="M0 -17 l0 -7" stroke="${t[1]}" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g transform="translate(42 6) rotate(24)">
      <ellipse rx="8" ry="13" fill="${t[0]}"/>
      <path d="M0 -13 v26" stroke="${t[1]}" stroke-width="1.8" opacity=".6"/>
    </g>`,

  /* دانهٔ جوز هندی */
  nutmegSeed: (t) => `
    ${heap(t, 38)}
    <g transform="translate(26 -12) rotate(-14)">
      <ellipse rx="16" ry="21" fill="${t[0]}"/>
      <ellipse rx="16" ry="21" fill="${t[2]}" opacity=".35"/>
      <path d="M-9 -12 c8 8 8 16 2 26 M4 -16 c6 10 4 20 -2 28" fill="none" stroke="${t[1]}" stroke-width="2" opacity=".7"/>
    </g>`,

  /* ریشهٔ زنجبیل */
  gingerRoot: (t) => `
    ${heap(t, 38)}
    <g transform="translate(26 -6) rotate(-12)">
      <path d="M-14 -18 c10 -8 20 -2 18 8 c-2 10 6 10 8 18 c2 9 -10 14 -18 8 c-8 -6 -18 -4 -20 -12 c-2 -9 4 -16 12 -22 Z" fill="${t[0]}"/>
      <path d="M-10 -14 c8 -5 14 -1 12 6" fill="none" stroke="${t[2]}" stroke-width="3" stroke-linecap="round"/>
      <path d="M6 6 c6 4 6 12 0 14" fill="none" stroke="${t[1]}" stroke-width="2.4"/>
    </g>`,

  /* بادیان ستاره‌ای */
  starAnise: (t) => `
    ${heap(t, 38)}
    <g transform="translate(26 -14)">
      ${[0, 45, 90, 135, 180, 225, 270, 315]
        .map(
          (a) =>
            `<ellipse rx="6" ry="15" fill="${t[0]}" transform="rotate(${a}) translate(0 -13)"/>`
        )
        .join('')}
      <circle r="7" fill="${t[1]}"/>
      <circle r="3" fill="${t[2]}"/>
    </g>`,

  /* غلاف وانیل */
  vanillaPod: (t) => `
    ${heap(t, 38)}
    <g transform="translate(26 -10) rotate(20)">
      <path d="M-4 -30 c8 6 8 48 0 58 c-8 -10 -8 -52 0 -58 Z" fill="#3A2A1E"/>
      <path d="M-1 -26 c4 6 4 42 0 50" fill="none" stroke="#6B5442" stroke-width="1.8"/>
    </g>
    <g transform="translate(42 12) rotate(-16)">
      <path d="M-3 -18 c6 4 6 30 0 36 c-6 -6 -6 -32 0 -36 Z" fill="#4A3628"/>
    </g>`,

  /* حبه‌های شکر */
  cubes: (t) => `
    ${heap(t, 36)}
    <g transform="translate(26 -4)">
      <rect x="-16" y="-14" width="20" height="20" rx="3" fill="${t[2]}"/>
      <path d="M-16 -14 h20 l-4 -5 h-20 Z" fill="#FFFFFF" opacity=".7"/>
      <path d="M4 -14 l4 -5 v20 l-4 5 Z" fill="${t[1]}" opacity=".45"/>
      <rect x="2" y="2" width="18" height="18" rx="3" fill="${t[0]}"/>
      <path d="M2 2 h18 l4 -4 h-18 Z" fill="#FFFFFF" opacity=".55"/>
    </g>`
};

function powderMotif(group, accent) {
  if (group === 'matcha') {
    return `<g fill="${accent}" opacity=".2">
      <path d="M254 18c-22 4-34 24-32 46 22-6 34-24 32-46Z"/>
      <path d="M222 64c8-16 20-28 32-34" fill="none" stroke="${accent}" stroke-width="2.6" opacity=".5"/>
    </g>`;
  }
  if (group === 'chocolate') {
    return `<g fill="none" stroke="${accent}" stroke-opacity=".24" stroke-width="3">
      <rect x="214" y="16" width="48" height="38" rx="6"/><path d="M238 16v38M214 35h48"/>
    </g>`;
  }
  if (group === 'spice' || group === 'masala') {
    return `<g fill="${accent}" opacity=".2">
      ${[0, 45, 90, 135].map((a) => `<ellipse cx="240" cy="36" rx="5" ry="22" transform="rotate(${a} 240 36)"/>`).join('')}
    </g>`;
  }
  if (group === 'milk') {
    return `<g fill="${accent}" opacity=".18">
      <path d="M240 12c-12 16-18 26-18 34a18 18 0 0 0 36 0c0-8-6-18-18-34Z"/>
    </g>`;
  }
  return `<g fill="none" stroke="${accent}" stroke-opacity=".24" stroke-width="3">
    <circle cx="240" cy="34" r="24"/><path d="M228 34h24M240 22v24"/>
  </g>`;
}

export function powderArt(p) {
  const rnd = seeded(p.slug);
  const [bg1, bg2, accent] = POWDER_SCENE[p.group] || POWDER_SCENE.chocolate;
  const t = POWDER_TONE[p.tone] || POWDER_TONE.cocoa;
  const uid = 'p' + p.slug.replace(/[^a-z0-9]/gi, '');

  const beans = [
    [36, 130, 0.46],
    [248, 126, 0.42]
  ]
    .map(([x, y, s]) => {
      const rot = Math.round(rnd() * 150 - 75);
      return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity=".45">
      <ellipse rx="25" ry="17.5" fill="${accent}" opacity=".5"/>
      <path d="M-19 0c6-7.5 6 7.5 19-7.5" fill="none" stroke="${bg1}" stroke-width="3.4" stroke-linecap="round"/>
    </g>`;
    })
    .join('');

  const draw = (POWDER_SHAPES[p.shape] || POWDER_SHAPES.scoop)(t);

  return `
  <svg class="card-art" viewBox="0 0 280 150" preserveAspectRatio="xMidYMid slice" role="img"
       aria-label="${esc(p.name)} — ${esc(POWDER_GROUPS[p.group]?.label || '')}">
    <defs>
      <linearGradient id="s${uid}" x1="0" y1="0" x2=".7" y2="1">
        <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
      </linearGradient>
      <radialGradient id="g${uid}" cx=".28" cy=".2" r=".85">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity=".38"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="280" height="150" fill="url(#s${uid})"/>
    <circle cx="46" cy="128" r="72" fill="${accent}" opacity=".13"/>
    <circle cx="252" cy="16" r="52" fill="${accent}" opacity=".10"/>
    ${powderMotif(p.group, accent)}
    ${beans}
    <g transform="translate(140 84)">${draw}</g>
    <rect width="280" height="150" fill="url(#g${uid})"/>
  </svg>`;
}

/* ---------- ۶) بستهٔ میکسِ ساخته‌شده ----------
   خروجی مرحلهٔ چهارمِ حالت تصویری: بسته‌ای با نشان خودمان که
   دستگاه تحویل می‌دهد. برخلاف کارت‌ها اینجا طرح از slug نمی‌آید —
   ترکیب هر لحظه عوض می‌شود — پس رنگش از میانگین وزنیِ رستِ همان
   دانه‌هاست و نامِ دانه‌ها روی خودِ بسته چاپ می‌شود.

   blend: { name, parts: [{ name, percent, meter }] }

   نکتهٔ امنیتی: هر متنی اینجا از پایگاه داده می‌آید و خروجی این تابع
   رشته است، نه گرهٔ React. پس بی‌استثنا از esc رد می‌شود. */

const BAG_LINES = 4; // بیش از این روی بسته جا نمی‌شود

export function blendBagArt(blend) {
  const parts = (blend?.parts || []).filter((p) => Number(p.percent) > 0);
  const [c1, c2, crease] = mixTone(parts);

  /* شناسهٔ گرادیان باید در کل صفحه یکتا باشد: چند میکس می‌توانند
     هم‌زمان بستهٔ خودشان را نشان بدهند و اگر شناسه‌ها یکی باشد، رنگِ
     اولی روی همه می‌نشیند. همان قاعدهٔ uid کارت‌ها. */
  const uid = 'g' + String(blend?.slug || 'mix').replace(/[^a-z0-9]/gi, '');

  const shown = parts.slice(0, BAG_LINES);
  const rest = parts.length - shown.length;

  const lines = shown
    .map(
      (p, i) => `
      <text class="bag-part" x="100" y="${118 + i * 15}" text-anchor="middle"
            >${esc(p.name)} · ٪${toFa(Math.round(Number(p.percent)))}</text>`
    )
    .join('');

  const more = rest
    ? `<text class="bag-part bag-more" x="100" y="${118 + shown.length * 15}" text-anchor="middle"
             >و ${toFa(rest)} دانهٔ دیگر</text>`
    : '';

  return `
  <svg class="bag-art" viewBox="0 0 200 200" role="img"
       aria-label="بستهٔ ${esc(blend?.name)} با ${toFa(parts.length)} دانه">
    <defs>
      <linearGradient id="body${uid}" x1="0" y1="0" x2=".85" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <linearGradient id="shine${uid}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity=".22"/>
        <stop offset=".45" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset="1" stop-color="#000000" stop-opacity=".12"/>
      </linearGradient>
    </defs>

    <ellipse cx="100" cy="185" rx="62" ry="8" fill="#1E1710" opacity=".16"/>

    <!-- بدنهٔ بسته -->
    <path d="M46 40 h108 a10 10 0 0 1 10 10 v122 a8 8 0 0 1 -8 8 h-112 a8 8 0 0 1 -8 -8 v-122 a10 10 0 0 1 10 -10Z"
          fill="url(#body${uid})"/>
    <path d="M46 40 h108 a10 10 0 0 1 10 10 v122 a8 8 0 0 1 -8 8 h-112 a8 8 0 0 1 -8 -8 v-122 a10 10 0 0 1 10 -10Z"
          fill="url(#shine${uid})"/>
    <!-- لبهٔ تاخوردهٔ بالا -->
    <path d="M52 40 h96 l-8 -14 h-80Z" fill="${crease}"/>
    <rect x="58" y="18" width="84" height="10" rx="5" fill="${crease}" opacity=".85"/>
    <!-- سوپاپِ هوای بسته‌های قهوه -->
    <circle cx="150" cy="60" r="7" fill="#1E1710" opacity=".22"/>

    <!-- برچسبِ کاغذی -->
    <rect x="30" y="62" width="140" height="88" rx="10" fill="#FBF6EA" opacity=".95"/>
    <rect x="30" y="62" width="140" height="88" rx="10" fill="none" stroke="${crease}" stroke-width="1.5" opacity=".6"/>

    <text class="bag-brand" x="100" y="80" text-anchor="middle">رُست‌خانهٔ دانه</text>
    <text class="bag-name" x="100" y="100" text-anchor="middle">${esc(blend?.name)}</text>
    <path d="M56 87 h88" stroke="${crease}" stroke-width="1" opacity=".45"/>
    ${lines}${more}

    <!-- دانه‌ای به رنگ همین میکس -->
    <g transform="translate(100 165) scale(.62)">
      <ellipse rx="25" ry="17.5" fill="${c2}"/>
      <path d="M-19 0c6-7.5 6 7.5 19-7.5" fill="none" stroke="${crease}" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="-7" cy="-7" rx="7" ry="3.4" fill="#FFFFFF" opacity=".18"/>
    </g>
  </svg>`;
}
