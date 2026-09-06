/* نمودارهای دست‌نویس SVG — همه inline، بدون وابستگی بیرونی */

const C = {
  ink:    '#2B1D12',
  ink2:   '#5A4632',
  soft:   '#8A755A',
  line:   '#C9B79B',
  border: '#CBB79B',
  paper:  '#FBF5E9',
  paper2: '#F3E8D4',
  paper3: '#EADCC2',
  cherry: '#A8402F',
  brass:  '#B5822F',
  sage:   '#5E6E48',
  espresso: '#3B2A1B'
};

/* کمک‌کارهای پایه */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function box(x, y, w, h, opts = {}) {
  const fill = opts.fill || C.paper;
  const stroke = opts.stroke || C.border;
  const r = opts.r ?? 8;
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${opts.sw || 1.4}"${dash}/>`;
}

/* در یک برچسب راست‌به‌چپ، نشانه‌های خنثی که به تکهٔ لاتین چسبیده‌اند (@ و / و
   پرانتز و …) جهتشان را از متنِ دورشان می‌گیرند، نه از خودِ تکه؛ نتیجه‌اش
   `…//api` به‌جای `/api/…` و پرانتزِ جداافتاده است. هر تکهٔ لاتین را — با
   فاصله‌ها و نشانه‌های درونی‌اش، یک‌جا — در جداساز LRI…PDI می‌بندیم تا درونش
   چپ‌به‌راست بماند و بیرونش سر جای راست‌به‌چپ خودش بنشیند. */
const LRI = '⁦';
const PDI = '⁩';
const isolateLatin = (s) =>
  String(s).replace(/[^؀-ۿ‌]+/g, (seg) => {
    if (!/[A-Za-z0-9]/.test(seg)) return seg;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(seg);
    return m[1] + LRI + m[2] + PDI + m[3];
  });

/* متن؛ fa=فارسی (rtl) — هر بلوک متنی جهت خودش را دارد تا bidi خراب نشود */
function txt(x, y, s, opts = {}) {
  const size = opts.size || 12;
  const fill = opts.fill || C.ink;
  const weight = opts.weight || 400;
  const fam = opts.mono ? 'code' : 'fa';
  const dir = opts.ltr ? 'ltr' : 'rtl';
  /* text-anchor در SVG منطقی است، نه دیداری: در متن راست‌به‌چپ، start همان
     لبهٔ راست است و end لبهٔ چپ. همهٔ فراخوان‌های این فایل anchor را دیداری
     می‌خواهند (start=چپ، end=راست)، پس برای متن فارسی جایشان را عوض می‌کنیم؛
     وگرنه برچسب از لبهٔ نمودار بیرون می‌زند یا روی برچسب بغلی می‌افتد. */
  let anchor = opts.anchor || 'middle';
  if (dir === 'rtl') anchor = anchor === 'start' ? 'end' : anchor === 'end' ? 'start' : anchor;
  const body = esc(dir === 'rtl' ? isolateLatin(s) : s);
  return `<text x="${x}" y="${y}" class="d-${fam}" direction="${dir}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${body}</text>`;
}

function arrow(x1, y1, x2, y2, opts = {}) {
  const col = opts.color || C.soft;
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  const marker = opts.back ? 'url(#ahB)' : 'url(#ah)';
  return `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${col}" stroke-width="${opts.sw || 1.5}"${dash} marker-end="${marker}"/>`;
}

function wrap(w, h, body, caption) {
  return `<figure class="dia">
<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img">
<defs>
  <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="${C.soft}"/>
  </marker>
  <marker id="ahB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="${C.cherry}"/>
  </marker>
</defs>
${body}
</svg>
${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>`;
}

/* ═════════ ۱) نمودار ER ═════════ */
function erDiagram() {
  let s = '';

  // items
  s += box(196, 14, 300, 232, { fill: C.paper2, stroke: C.espresso, sw: 1.8 });
  s += `<rect x="196" y="14" width="300" height="30" rx="8" fill="${C.espresso}"/>`;
  s += `<rect x="196" y="34" width="300" height="10" fill="${C.espresso}"/>`;
  s += txt(346, 34, 'items  —  کالاها', { fill: '#F6EFE3', size: 13, weight: 700 });

  const itemRows = [
    ['_id', 'ObjectId · PK'],
    ['slug', 'String · UNIQUE'],
    ['kind', 'coffee | gear | powder'],
    ['name · origin · spec', 'String'],
    ['group · meter · price', 'دسته، سنجه، قیمت'],
    ['stock', 'موجودی · نامحدود اگر null باشد'],
    ['notes[] · pairs[] · tastes[]', 'آرایه'],
    ['shape · mat · tone · zoom', 'ظاهر تصویر'],
    ['active · featured · rank', 'ویترین'],
    ['isBlend · house · customizable', 'میکس'],
    ['surcharge', 'دستمزد میکس'],
    ['components[]  ·  pool[]', 'اجزای میکس']
  ];
  itemRows.forEach(([k, v], i) => {
    const y = 60 + i * 16;
    s += txt(486, y, k, { anchor: 'end', size: 9.5, ltr: true, mono: true, fill: C.ink });
    s += txt(206, y, v, { anchor: 'start', size: 9, fill: C.soft });
  });

  // components subdoc
  s += box(212, 262, 268, 96, { fill: C.paper, stroke: C.brass, dash: '5 3' });
  s += txt(346, 280, 'components[]  ·  زیرسند بدون ‎_id', { size: 11, weight: 700, fill: C.brass });
  [['slug', 'به یک قهوهٔ دیگر'], ['percent', '۰ تا ۱۰۰'], ['min · max · locked', 'بی‌استفاده']]
    .forEach(([k, v], i) => {
      const y = 300 + i * 17;
      s += txt(470, y, k, { anchor: 'end', size: 9.5, ltr: true, mono: true });
      s += txt(222, y, v, { anchor: 'start', size: 9, fill: C.soft });
    });
  s += `<path d="M346 246 V262" stroke="${C.brass}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  // self reference
  s += `<path d="M212 310 H150 V130 H196" fill="none" stroke="${C.cherry}" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#ahB)"/>`;
  s += txt(120, 216, 'ارجاع منطقی', { size: 9, fill: C.cherry, anchor: 'middle' });
  s += txt(120, 228, 'با slug', { size: 9, fill: C.cherry, anchor: 'middle' });

  // orders
  s += box(536, 14, 300, 150, { fill: C.paper2, stroke: C.espresso, sw: 1.8 });
  s += `<rect x="536" y="14" width="300" height="30" rx="8" fill="${C.espresso}"/>`;
  s += `<rect x="536" y="34" width="300" height="10" fill="${C.espresso}"/>`;
  s += txt(686, 34, 'orders  —  سفارش‌ها', { fill: '#F6EFE3', size: 13, weight: 700 });
  [['_id', 'ObjectId · PK'], ['code', 'UNIQUE · «P9PT-8412»'], ['status', 'new|processing|done|canceled'],
   ['customer', 'نام، تلفن، نشانی، توضیح'], ['totals', 'جمع، تخفیف، ارسال، پرداختی'], ['lines[]', 'ردیف‌های خرید']]
    .forEach(([k, v], i) => {
      const y = 62 + i * 17;
      s += txt(826, y, k, { anchor: 'end', size: 9.5, ltr: true, mono: true });
      s += txt(546, y, v, { anchor: 'start', size: 9, fill: C.soft });
    });

  // lines subdoc
  s += box(552, 186, 268, 112, { fill: C.paper, stroke: C.brass, dash: '5 3' });
  s += txt(686, 204, 'lines[]  ·  زیرسند بدون ‎_id', { size: 11, weight: 700, fill: C.brass });
  [['slug · name', 'عکس لحظه‌ای'], ['unitPrice · lineTotal', 'قیمت ثبت‌شده'],
   ['grams · qty', 'یکی همیشه صفر'], ['grind · grindLabel', 'نحوهٔ تحویل'], ['mix[]', 'ترکیب میکس']]
    .forEach(([k, v], i) => {
      const y = 224 + i * 17;
      s += txt(810, y, k, { anchor: 'end', size: 9.5, ltr: true, mono: true });
      s += txt(562, y, v, { anchor: 'start', size: 9, fill: C.soft });
    });
  s += `<path d="M686 164 V186" stroke="${C.brass}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  // mix subdoc
  s += box(576, 318, 220, 62, { fill: C.paper, stroke: C.brass, dash: '5 3' });
  s += txt(686, 336, 'mix[]  ·  slug · name · percent', { size: 10, weight: 700, fill: C.brass });
  s += txt(686, 356, 'نام دانه هم ذخیره می‌شود تا فاکتور خوانا بماند', { size: 8.5, fill: C.soft });
  s += `<path d="M686 298 V318" stroke="${C.brass}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  // loose ref from lines to items
  s += `<path d="M552 240 H510 V130 H496" fill="none" stroke="${C.cherry}" stroke-width="1.4" stroke-dasharray="3 4" marker-end="url(#ahB)"/>`;
  s += txt(524, 152, 'سست', { size: 8.5, fill: C.cherry });

  // three small collections
  const small = [
    [24, 400, 'admins', ['username · UNIQUE', 'passwordHash · select:false', 'tokenVersion']],
    [300, 400, 'contents', ['key · UNIQUE', 'data · Mixed', 'هفت کلید محتوا']],
    [576, 400, 'clubmembers', ['phone · UNIQUE', 'name · email · taste', 'active']]
  ];
  small.forEach(([x, y, title, rows]) => {
    s += box(x, y, 260, 96, { fill: C.paper, stroke: C.sage });
    s += `<rect x="${x}" y="${y}" width="260" height="26" rx="8" fill="${C.sage}"/>`;
    s += `<rect x="${x}" y="${y + 18}" width="260" height="8" fill="${C.sage}"/>`;
    s += txt(x + 130, y + 18, title, { fill: '#F6EFE3', size: 11.5, weight: 700, ltr: true, mono: true });
    rows.forEach((r, i) => {
      s += txt(x + 130, y + 45 + i * 15, r, { size: 9, fill: C.ink2 });
    });
  });

  // note
  s += txt(430, 516, 'در کل پروژه حتی یک ObjectId ref وجود ندارد — تنها پیوند، slug است.', { size: 10.5, fill: C.cherry, weight: 700 });

  return wrap(860, 530, s, 'نمودار ER — پنج مجموعه و پیوندهای منطقی با <code>slug</code>');
}

/* ═════════ ۲) معماری: مرورگر · Next · Express · MongoDB ═════════ */
function archDiagram() {
  let s = '';

  const band = (x, y, w, h, title, titleSize = 13.5) => {
    let o = box(x, y, w, h, { fill: C.paper2, stroke: C.espresso, sw: 1.8 });
    o += txt(x + w - 20, y + 24, title, {
      anchor: 'end', size: titleSize, weight: 700, fill: C.espresso
    });
    return o;
  };

  const cells = (rows) => {
    let o = '';
    for (const [x, y, w, h, t, sub] of rows) {
      o += box(x, y, w, h, { fill: C.paper, stroke: C.border });
      o += txt(x + w / 2, y + 18, t, { size: 10.5, weight: 700, mono: true, ltr: true });
      o += txt(x + w / 2, y + 33, sub, { size: 8.3, fill: C.soft });
    }
    return o;
  };

  const vline = (x, y1, y2, color, sw = 1.6, marker = 'ah') =>
    `<path d="M${x} ${y1} V${y2}" stroke="${color}" stroke-width="${sw}" marker-end="url(#${marker})"/>`;

  /* ── مرورگر ── */
  s += band(30, 12, 700, 108, 'مرورگر');
  s += cells([
    [56, 48, 150, 44, 'components/', 'کارت · کشوی سبد · فرم'],
    [222, 48, 150, 44, 'context/', 'Shop · Auth'],
    [388, 48, 150, 44, 'lib/api.js', 'تنها fetch مرورگر'],
    [554, 48, 150, 44, 'localStorage', 'سبد · توکن مدیر']
  ]);

  s += vline(380, 120, 150, C.cherry, 2, 'ahB');
  s += txt(392, 140, 'HTML آماده در پاسخ اول؛ بعد /api برای سبد، پیگیری و پنل', {
    anchor: 'start', size: 9.2, fill: C.cherry
  });

  /* ── Next ── */
  s += band(30, 150, 700, 138, 'Next.js  ·  پورت ۳۰۰۰');
  s += cells([
    [56, 186, 150, 44, 'app/**', 'صفحه‌ها روی سرور'],
    [222, 186, 150, 44, 'lib/data.js', 'fetch مطلق با API_URL'],
    [388, 186, 150, 44, 'proxy.js', 'CSP با nonce'],
    [554, 186, 150, 44, 'rewrites', 'api · uploads · sitemap']
  ]);
  s += box(56, 238, 648, 28, { fill: '#F7EEDC', stroke: C.brass, dash: '5 3' });
  s += txt(380, 257, 'force-dynamic — بهای nonce: هیچ صفحه‌ای از پیش ساخته و کش نمی‌شود', {
    size: 9.2, fill: C.ink2
  });

  /* ── بستهٔ مشترک ── */
  s += vline(380, 288, 300, C.brass);
  s += box(56, 300, 648, 34, { fill: '#F7EEDC', stroke: C.brass, dash: '5 3' });
  s += txt(380, 322, '@ghahve/shared → pricing.js · taxonomy.js · seo.js — هر دو طرف همین را import می‌کنند', {
    size: 9.2, fill: C.ink2
  });
  s += vline(380, 334, 346, C.brass);

  /* ── Express ── */
  s += band(30, 346, 700, 138, 'Express  ·  پورت ۴۰۰۰  ·  فقط API');
  s += cells([
    [56, 382, 150, 44, 'routes/', '۸ روتر · ۳۴ مسیر'],
    [222, 382, 150, 44, 'middleware/', 'requireAdmin · rateLimit'],
    [388, 382, 150, 44, 'models/', '۵ مدل Mongoose'],
    [554, 382, 150, 44, 'lib/', 'jalali · stock · track · cors']
  ]);
  s += box(56, 434, 648, 28, { fill: '#F7EEDC', stroke: C.brass, dash: '5 3' });
  s += txt(380, 453, 'sitemap.xml و robots.txt در ریشه‌اند، نه زیر /api — ربات‌ها آنجا می‌گردند', {
    size: 9.2, fill: C.ink2
  });

  /* ── پایگاه داده ── */
  s += vline(380, 484, 514, C.sage, 2);
  s += txt(392, 504, 'Mongoose', { anchor: 'start', size: 9.5, fill: C.sage, ltr: true, mono: true });

  s += box(210, 522, 340, 74, { fill: C.paper2, stroke: C.sage, sw: 1.8 });
  s += txt(380, 546, 'MongoDB  ·  پایگاه دادهٔ ghahve', { size: 12.5, weight: 700, fill: C.sage });
  s += txt(380, 568, 'items · orders · admins · contents · clubmembers', {
    size: 9.5, mono: true, ltr: true, fill: C.ink2
  });
  s += txt(380, 584, '۱۰۶ کالای اولیه  ·  ۷ کلید محتوا', { size: 9, fill: C.soft });

  return wrap(780, 610, s, 'چهار لایه و یک بستهٔ مشترک — مرورگر، Next، Express و MongoDB');
}

/* ═════════ ۳) توالی ثبت سفارش ═════════ */
function orderSeqDiagram() {
  const lanes = [
    { x: 690, t: 'CartDrawer' },
    { x: 545, t: 'lib/api.js' },
    { x: 385, t: 'routes/orders.js' },
    { x: 225, t: 'pricing.js' },
    { x: 80,  t: 'MongoDB' }
  ];
  let s = '';

  lanes.forEach((l) => {
    s += box(l.x - 62, 14, 124, 28, { fill: C.espresso, stroke: C.espresso, r: 6 });
    s += txt(l.x, 33, l.t, { fill: '#F6EFE3', size: 10.5, weight: 700, mono: true, ltr: true });
    s += `<path d="M${l.x} 42 V524" stroke="${C.border}" stroke-width="1.2" stroke-dasharray="3 4"/>`;
  });

  const steps = [
    [68,  690, 545, 'placeOrder({ lines, customer })', 'هیچ قیمتی فرستاده نمی‌شود', true],
    [100, 545, 385, 'POST /api/orders', '', false],
    [132, 385, 80,  'Item.find({ slug: $in, active: true })', 'یک کوئری برای همهٔ ردیف‌ها و دانه‌های میکس', false],
    [166, 80,  385, 'کالاهای واقعی', '', false],
    [192, 385, 80,  'Content.findOne({ key: "grinds" })', 'گزینه‌های آسیاب', false],
    [228, 80,  385, 'grindMap', '', false],
    [312, 385, 225, 'computeTotals(lines, lookup)', '', false],
    [344, 225, 385, 'totals  ·  جمع، تخفیف، ارسال', '', false],
    [378, 385, 80,  'reserveStock — findOneAndUpdate اتمی', 'کم آمدن ⇒ ۴۰۹ و پس دادن رزروها', false],
    [414, 385, 80,  'Order.create({ … })', 'pre(validate) شمارهٔ سفارش را می‌سازد', false],
    [450, 80,  385, 'سند ذخیره‌شده', '', false],
    [482, 385, 690, '۲۰۱ — رسید از روی سند ذخیره‌شده', '', true]
  ];

  /* کادر اعتبارسنجی پس‌زمینه است، پس باید پیش از گام‌ها کشیده شود؛ وگرنه
     روی برچسبِ گامِ بعدی می‌افتد و واژه را نصفه نشان می‌دهد. کمی هم بالاتر
     آمده تا با برچسب y=۳۳۰ حتی تماس هم پیدا نکند. */
  s += box(240, 238, 300, 56, { fill: '#F7EEDC', stroke: C.brass, dash: '5 3' });
  s += txt(390, 256, 'اعتبارسنجی هر ردیف', { size: 10.5, weight: 700, fill: C.brass });
  s += txt(390, 272, 'کالا موجود؟ · آسیاب معتبر؟ · میکس قهوه و غیرمیکس؟', { size: 8.4, fill: C.ink2 });
  s += txt(390, 286, 'مجموع ۱۰۰؟ · وزن ≥ کمینه؟ · تعداد ۱ تا ۹۹۹؟', { size: 8.4, fill: C.ink2 });

  steps.forEach(([y, from, to, label, note, hi]) => {
    const dir = to > from ? 1 : -1;
    s += arrow(from + dir * 4, y, to - dir * 4, y, { color: hi ? C.cherry : C.soft, back: hi });
    const mid = (from + to) / 2;
    s += txt(mid, y - 6, label, { size: 9.5, fill: hi ? C.cherry : C.ink2, weight: hi ? 700 : 400 });
    if (note) s += txt(mid, y + 12, note, { size: 8.2, fill: C.soft });
  });

  s += txt(690, 516, 'setDone(res) → clearCart() → رسید', { size: 9, fill: C.sage, weight: 700 });

  return wrap(770, 538, s, 'توالی ثبت سفارش — قیمت هرگز از مرورگر خوانده نمی‌شود، و انبار اتمی رزرو می‌شود');
}

/* ═════════ ۴) جریان ساز میکس ═════════ */
function blendDiagram() {
  let s = '';

  s += box(250, 12, 260, 46, { fill: C.espresso, stroke: C.espresso });
  s += txt(380, 32, 'BlendsSection', { fill: '#F6EFE3', size: 12, weight: 700, mono: true, ltr: true });
  s += txt(380, 48, 'houseBlends = isBlend && house', { fill: '#D9C7A6', size: 8.5, mono: true, ltr: true });

  s += `<path d="M380 58 V84" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  s += box(230, 84, 300, 52, { fill: C.paper2, stroke: C.border });
  s += txt(380, 104, 'startingMix(item)  ·  ترکیب پیشنهادی ما', { size: 11, weight: 700 });
  s += txt(380, 122, '[{ cerrado: ۷۰٪ }, { monsooned: ۳۰٪ }]', { size: 9, mono: true, ltr: true, fill: C.soft });

  // four actions
  const acts = [
    [30, 172, 'کشیدن اهرم', 'applyPercent(mix, slug, v)'],
    [212, 172, 'برداشتن دانه', 'removeBean(mix, slug)'],
    [394, 172, 'افزودن دانه', 'addBean(mix, slug, ۲۰)'],
    [576, 172, 'بازگشت', 'startingMix(item)']
  ];
  acts.forEach(([x, y, t, fn]) => {
    s += box(x, y, 164, 50, { fill: C.paper, stroke: C.brass });
    s += txt(x + 82, y + 20, t, { size: 11, weight: 700, fill: C.brass });
    s += txt(x + 82, y + 37, fn, { size: 8.4, mono: true, ltr: true, fill: C.ink2 });
    s += `<path d="M${x + 82} ${y - 22} V${y}" stroke="${C.soft}" stroke-width="1.3" marker-end="url(#ah)"/>`;
  });
  s += `<path d="M112 150 H658" stroke="${C.soft}" stroke-width="1.3"/>`;
  s += `<path d="M380 136 V150" stroke="${C.soft}" stroke-width="1.3"/>`;

  // core algorithm
  s += box(150, 250, 460, 96, { fill: '#F7EEDC', stroke: C.cherry, sw: 1.6 });
  s += txt(380, 272, 'هستهٔ الگوریتم — مجموع همیشه ۱۰۰ می‌ماند', { size: 12, weight: 700, fill: C.cherry });
  [
    'روم هر دانه: اگر این یکی زیاد شود، بقیه به‌اندازهٔ percent خود جا دارند',
    'need = min(|delta|, totalRoom)  →  اهرم زودتر متوقف می‌شود',
    'سهم هر دانه = floor(need × room / totalRoom) + پخش نوبتی باقیمانده'
  ].forEach((t, i) => s += txt(380, 296 + i * 17, t, { size: 9, fill: C.ink2 }));

  acts.forEach(([x]) => {
    s += `<path d="M${x + 82} 222 V236 H380 V250" fill="none" stroke="${C.cherry}" stroke-width="1.2"/>`;
  });

  s += `<path d="M380 346 V374" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  // price + validation
  s += box(60, 374, 300, 76, { fill: C.paper, stroke: C.sage });
  s += txt(210, 396, 'blendPrice(item, mix)', { size: 11, weight: 700, mono: true, ltr: true, fill: C.sage });
  s += txt(210, 414, 'Σ(price × pct) ÷ Σ(pct) + surcharge', { size: 9, mono: true, ltr: true });
  s += txt(210, 432, 'گرد به نزدیک‌ترین ۱۰۰۰ تومان', { size: 9, fill: C.soft });

  s += box(400, 374, 300, 76, { fill: C.paper, stroke: C.cherry });
  s += txt(550, 396, 'mixError(mix)', { size: 11, weight: 700, mono: true, ltr: true, fill: C.cherry });
  s += txt(550, 414, 'حداقل دو دانهٔ فعال', { size: 9 });
  s += txt(550, 432, 'مجموع ۱۰۰ با رواداری ±۱', { size: 9 });

  s += `<path d="M380 346 V360 H210 V374" fill="none" stroke="${C.soft}" stroke-width="1.3"/>`;
  s += `<path d="M380 360 H550 V374" fill="none" stroke="${C.soft}" stroke-width="1.3"/>`;

  s += box(230, 474, 300, 44, { fill: C.espresso, stroke: C.espresso });
  s += txt(380, 494, 'addWeighed(slug, grams, { grind, mix })', { fill: '#F6EFE3', size: 10, mono: true, ltr: true });
  s += txt(380, 509, 'کلید ردیف: slug | grind | mixSignature', { fill: '#D9C7A6', size: 8.5, mono: true, ltr: true });
  s += `<path d="M210 450 V462 H380 V474" fill="none" stroke="${C.sage}" stroke-width="1.4" marker-end="url(#ah)"/>`;
  s += `<path d="M550 450 V462 H380" fill="none" stroke="${C.cherry}" stroke-width="1.4"/>`;

  return wrap(760, 532, s, 'ساز میکس — از ترکیب پیشنهادی تا افزودن به سبد');
}

/* ═════════ ۵) خط لولهٔ قیمت ═════════ */
function pricingDiagram() {
  let s = '';
  const stages = [
    [560, 'ردیف‌های سبد', 'kind · grams · qty · mix', C.espresso, '#F6EFE3'],
    [380, 'قیمت هر واحد', 'میکس؟ blendPricePerKg : price', C.paper, C.ink],
    [200, 'قیمت هر ردیف', 'priceFor(perKg, grams)', C.paper, C.ink],
    [20,  'دو انباشتگر', 'weighedBase  ·  gearBase', C.paper2, C.ink]
  ];
  stages.forEach(([x, t, sub, fill, fg], i) => {
    s += box(x, 18, 160, 58, { fill, stroke: fill === C.paper ? C.border : fill });
    s += txt(x + 80, 42, t, { size: 11.5, weight: 700, fill: fg });
    s += txt(x + 80, 60, sub, { size: 8.2, mono: true, ltr: true, fill: fill === C.espresso ? '#D9C7A6' : C.soft });
    if (i < 3) s += arrow(x - 4, 47, x - 16, 47, { color: C.brass });
  });

  s += `<path d="M100 76 V104" stroke="${C.soft}" stroke-width="1.4" marker-end="url(#ah)"/>`;

  // three rules
  const rules = [
    [430, 104, 'قاعدهٔ تخفیف', [
      'tier = TIERS.find(t => grams >= t.min)',
      'فقط روی weighedBase — نه روی ابزار',
      'گرد به ۱۰۰۰ تومان'
    ], C.cherry],
    [220, 104, 'قاعدهٔ ارسال', [
      'سبد خالی → ۰',
      'grams ≥ ۱۰۰۰ → رایگان',
      'وگرنه ۶۵٬۰۰۰ تومان'
    ], C.sage],
    [10, 104, 'جمع پایه', [
      'base = weighedBase + gearBase',
      'pieces = مجموع تعداد ابزار',
      'grams = مجموع وزن'
    ], C.brass]
  ];
  rules.forEach(([x, y, t, lines, col]) => {
    s += box(x, y, 200, 92, { fill: C.paper, stroke: col });
    s += txt(x + 100, y + 22, t, { size: 11.5, weight: 700, fill: col });
    lines.forEach((l, i) => s += txt(x + 100, y + 42 + i * 16, l, { size: 8.5, fill: C.ink2, mono: /[A-Za-z(]/.test(l[0]), ltr: /[A-Za-z(]/.test(l[0]) }));
  });

  s += `<path d="M110 196 V220 H320 V240" fill="none" stroke="${C.soft}" stroke-width="1.4"/>`;
  s += `<path d="M320 196 V220" fill="none" stroke="${C.soft}" stroke-width="1.4"/>`;
  s += `<path d="M530 196 V220 H320" fill="none" stroke="${C.soft}" stroke-width="1.4"/>`;
  s += `<path d="M320 220 V240" stroke="${C.soft}" stroke-width="1.4" marker-end="url(#ah)"/>`;

  s += box(160, 240, 320, 56, { fill: C.espresso, stroke: C.espresso });
  s += txt(320, 264, 'total = base − discount + shipping', { fill: '#F6EFE3', size: 13, weight: 700, mono: true, ltr: true });
  s += txt(320, 283, 'یک فایل در @ghahve/shared — هم مرورگر و هم سرور همین را اجرا می‌کنند', { fill: '#D9C7A6', size: 8.6 });

  // tiers table
  const tiers = [['۵ کیلو به بالا', '۱۵٪'], ['۳ تا ۵ کیلو', '۱۰٪'], ['۱ تا ۳ کیلو', '۵٪'], ['زیر ۱ کیلو', '—']];
  s += box(500, 240, 200, 92, { fill: C.paper2, stroke: C.border });
  s += txt(600, 258, 'پله‌های تخفیف', { size: 10.5, weight: 700, fill: C.cherry });
  tiers.forEach(([a, b], i) => {
    s += txt(680, 278 + i * 15, a, { anchor: 'end', size: 8.8, fill: C.ink2 });
    s += txt(520, 278 + i * 15, b, { anchor: 'start', size: 8.8, weight: 700, fill: C.cherry });
  });

  return wrap(720, 344, s, 'خط لولهٔ محاسبهٔ قیمت — از ردیف سبد تا مبلغ پرداختی');
}

/* ═════════ ۶) ماشین حالت سفارش ═════════ */
function statusDiagram() {
  let s = '';
  s += box(292, 16, 156, 46, { fill: C.paper, stroke: C.soft, dash: '4 3' });
  s += txt(370, 44, 'ثبت سفارش از فروشگاه', { size: 10.5, fill: C.soft });
  s += `<path d="M370 62 V92" stroke="${C.soft}" stroke-width="1.6" marker-end="url(#ah)"/>`;

  s += box(292, 92, 156, 52, { fill: '#E7EDDC', stroke: C.sage, sw: 1.8 });
  s += txt(370, 116, 'new  ·  تازه', { size: 13, weight: 700, fill: C.sage });
  s += txt(370, 133, 'پیش‌فرض مدل', { size: 8.5, fill: C.soft });

  const states = [
    [70, 220, 'canceled  ·  لغو شده', C.cherry, '#F6E4E0', 'در فروش حساب نمی‌شود'],
    [292, 220, 'processing  ·  آماده‌سازی', C.brass, '#F7EEDC', 'کارگاه در حال رست'],
    [514, 220, 'done  ·  تحویل شده', C.sage, '#E7EDDC', 'پایان چرخه']
  ];
  states.forEach(([x, y, t, col, fill, sub]) => {
    s += box(x, y, 176, 56, { fill, stroke: col, sw: 1.8 });
    s += txt(x + 88, y + 24, t, { size: 12, weight: 700, fill: col });
    s += txt(x + 88, y + 42, sub, { size: 8.5, fill: C.soft });
  });

  s += `<path d="M330 144 V182 H158 V220" fill="none" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;
  s += `<path d="M370 144 V220" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;
  s += `<path d="M410 144 V182 H602 V220" fill="none" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;
  s += txt(370, 174, 'مدیر وضعیت را عوض می‌کند', { size: 9, fill: C.soft });

  s += `<path d="M292 248 H246 V300 H602 V276" fill="none" stroke="${C.border}" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ah)"/>`;
  s += `<path d="M468 248 H514" stroke="${C.border}" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#ah)"/>`;

  s += box(150, 318, 440, 68, { fill: C.paper2, stroke: C.border });
  s += txt(370, 340, 'هیچ محدودیت گذاری وجود ندارد', { size: 11, weight: 700, fill: C.cherry });
  s += txt(370, 358, 'مدیر می‌تواند از هر وضعیتی به هر وضعیت دیگری برود — حتی از done به new', { size: 9, fill: C.ink2 });
  s += txt(370, 374, 'تنها اثر واقعی: canceled از آمار فروش کنار گذاشته می‌شود، ولی در پشتیبان می‌ماند', { size: 9, fill: C.ink2 });

  return wrap(720, 400, s, 'وضعیت‌های سفارش و گذارهای ممکن');
}

/* ═════════ ۷) خط لولهٔ فهرست کالا ═════════ */
function catalogDiagram() {
  let s = '';
  const steps = [
    ['byKind[kind]', 'همهٔ کالاهای این نوع', C.espresso, '#F6EFE3'],
    ['فیلتر دسته', "filter === 'all' یا p.group === filter", C.paper, C.ink],
    ['جست‌وجو', 'debounce ۱۶۰ms روی ۶ منبع', C.paper, C.ink],
    ['مرتب‌سازی', '۶ گزینه · localeCompare fa', C.paper, C.ink],
    ['گروه‌بندی شرطی', "all && rank && !query", C.paper2, C.ink],
    ['ItemCard × n', 'useReveal → کلاس is-in', C.espresso, '#F6EFE3']
  ];
  steps.forEach(([t, sub, fill, fg], i) => {
    const y = 16 + i * 66;
    s += box(180, y, 360, 50, { fill, stroke: fill === C.paper ? C.border : (fill === C.paper2 ? C.brass : fill) });
    s += txt(360, y + 22, t, { size: 12, weight: 700, fill: fg });
    s += txt(360, y + 39, sub, { size: 8.6, fill: fill === C.espresso ? '#D9C7A6' : C.soft, mono: /[A-Za-z]/.test(sub[0]), ltr: /[A-Za-z]/.test(sub[0]) });
    if (i < 5) s += `<path d="M360 ${y + 50} V${y + 66}" stroke="${C.brass}" stroke-width="1.6" marker-end="url(#ah)"/>`;
  });

  /* حاشیه‌نویس‌ها در ناودان چپ می‌نشینند و فقط ۱۴۴ واحد جا دارند؛ متن بلند را
     خودمان دو خط می‌کنیم، وگرنه از لبهٔ viewBox بیرون می‌زند و بریده می‌شود. */
  const notes = [
    [148, ['name · origin · spec · notes', 'pairs · برچسب دسته']],
    [214, ['rank · price ↑↓ · meter ↑↓ · الفبا']],
    [280, ['فقط وقتی هیچ فیلتری فعال نیست،', 'زیر عنوان دسته چیده می‌شود']]
  ];
  notes.forEach(([y, lines]) => {
    s += `<path d="M180 ${y} H150" stroke="${C.border}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    const top = y + 4 - ((lines.length - 1) * 12) / 2;
    lines.forEach((t, k) => {
      s += txt(144, top + k * 12, t, { anchor: 'end', size: 8.6, fill: C.soft });
    });
  });

  s += `<path d="M540 82 H580 V346 H540" fill="none" stroke="${C.sage}" stroke-width="1.3" stroke-dasharray="4 3"/>`;
  s += txt(596, 218, 'همین یک کامپوننت', { anchor: 'start', size: 9.5, fill: C.sage, weight: 700 });
  s += txt(596, 234, 'برای قهوه، ابزار و پودر', { anchor: 'start', size: 9, fill: C.soft });

  return wrap(760, 424, s, 'خط لولهٔ نمایش فهرست کالا در <code>CatalogSection</code>');
}

/* ═════════ ۸) بارگذاری اولیه ═════════ */
function bootDiagram() {
  let s = '';
  const col = [
    [96, 'مرورگر'], [292, 'app/page.jsx'], [488, 'lib/data.js'], [672, 'Express']
  ];
  col.forEach(([x, t]) => {
    s += box(x - 76, 12, 152, 26, { fill: C.espresso, stroke: C.espresso, r: 6 });
    s += txt(x, 30, t, { fill: '#F6EFE3', size: 10.2, weight: 700 });
    s += `<path d="M${x} 38 V372" stroke="${C.border}" stroke-width="1.2" stroke-dasharray="3 4"/>`;
  });

  const steps = [
    [72, 96, 292, 'GET /', ''],
    [110, 292, 488, 'Promise.all([ getItems(), getContent() ])', 'روی سرور، نه در مرورگر'],
    [152, 488, 672, 'fetch مطلق با API_URL  ·  cache: no-store', ''],
    [186, 672, 488, 'کالاهای active + هفت کلید محتوا', ''],
    [224, 292, 96, 'HTML کامل: کارت‌ها، متن‌ها، <head> و JSON-LD', 'اولین قهوه در همین پاسخ دیده می‌شود']
  ];
  steps.forEach(([y, from, to, label, note]) => {
    const dir = to > from ? 1 : -1;
    s += arrow(from + dir * 4, y, to - dir * 4, y, { color: C.soft });
    const mid = (from + to) / 2;
    s += txt(mid, y - 6, label, { size: 9.2, fill: C.ink2 });
    if (note) s += txt(mid, y + 11, note, { size: 8.2, fill: C.soft });
  });

  s += box(150, 262, 500, 30, { fill: '#F7EEDC', stroke: C.brass, dash: '4 3' });
  s += txt(400, 282, 'hydrate — سبد خالی، مو به مو مثل HTML سرور', {
    size: 9.5, fill: C.brass, weight: 700
  });

  s += box(150, 302, 500, 30, { fill: '#F7EEDC', stroke: C.brass, dash: '4 3' });
  s += txt(400, 322, 'افکتِ یک‌باره: loadCart(browserStorage()) → hydrated = true', {
    size: 9.5, fill: C.brass, weight: 700
  });

  s += txt(400, 356, 'بهایش یک فریم است: تا اجرای آن افکت، شمارندهٔ سبد در هدر «۰ گرم» می‌ماند', {
    size: 8.8, fill: C.soft
  });

  return wrap(780, 384, s, 'بارگذاری اولیه — یک رفت‌وبرگشت تا اولین قهوه، و یک فریم تا سبد');
}

/* ═════════ ۹) بازه‌بندی شمسی ═════════ */
function jalaliDiagram() {
  let s = '';

  s += box(250, 12, 250, 44, { fill: C.espresso, stroke: C.espresso });
  s += txt(375, 32, 'لحظهٔ سفارش  ·  createdAt', { fill: '#F6EFE3', size: 11.5, weight: 700 });
  s += txt(375, 48, 'ذخیره‌شده به‌صورت UTC', { fill: '#D9C7A6', size: 8.5 });

  s += `<path d="M375 56 V84" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  s += box(210, 84, 330, 62, { fill: C.paper, stroke: C.sage });
  s += txt(375, 106, 'offsetMinAt(date)  ·  اختلاف واقعی همان لحظه', { size: 10.5, weight: 700, fill: C.sage });
  s += txt(375, 124, 'با Intl.DateTimeFormat و timeZone: Asia/Tehran', { size: 8.8, mono: true, ltr: true, fill: C.ink2 });
  s += txt(375, 139, 'پس ساعت تابستانی تاریخی ایران هم درست حساب می‌شود', { size: 8.5, fill: C.soft });

  s += `<path d="M375 146 V174" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  s += box(230, 174, 290, 48, { fill: C.paper2, stroke: C.border });
  s += txt(375, 194, 'اجزای تاریخ به وقت تهران', { size: 10.5, weight: 700 });
  s += txt(375, 211, 'gregorianToJalali(gy, gm, gd)', { size: 9, mono: true, ltr: true, fill: C.ink2 });

  s += `<path d="M375 222 V250" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  const buckets = [
    [30, 'day', 'روز', '۲۰ مرداد ۱۴۰۵'],
    [212, 'week', 'هفته', '۱۴ تا ۲۰ مرداد'],
    [394, 'month', 'ماه', 'مرداد ۱۴۰۵'],
    [576, 'year', 'سال', 'سال ۱۴۰۵']
  ];
  buckets.forEach(([x, key, fa, label]) => {
    s += box(x, 250, 164, 66, { fill: C.paper, stroke: C.brass });
    s += txt(x + 82, 270, fa, { size: 11.5, weight: 700, fill: C.brass });
    s += txt(x + 82, 286, key, { size: 8.6, mono: true, ltr: true, fill: C.soft });
    s += txt(x + 82, 305, label, { size: 9, fill: C.ink2 });
  });
  buckets.forEach(([x]) => {
    s += `<path d="M375 236 H${x + 82} V250" fill="none" stroke="${C.soft}" stroke-width="1.2"/>`;
  });
  s += `<path d="M112 236 H658" stroke="${C.soft}" stroke-width="1.2"/>`;

  s += box(150, 340, 450, 70, { fill: '#F7EEDC', stroke: C.cherry });
  s += txt(375, 362, 'هر سطل یک بازهٔ واقعی UTC می‌دهد', { size: 11.5, weight: 700, fill: C.cherry });
  s += txt(375, 380, 'Order.find({ createdAt: { $gte: start, $lt: end } })', { size: 9.2, mono: true, ltr: true, fill: C.ink2 });
  s += txt(375, 398, 'هفته از شنبه شروع می‌شود · بازه‌های خالی هم در فهرست می‌مانند', { size: 8.8, fill: C.soft });

  return wrap(740, 424, s, 'بازه‌بندی گزارش روی تقویم شمسی و وقت تهران');
}

/* ═════════ ۱۰) پنل مدیریت ═════════ */
function adminDiagram() {
  let s = '';

  s += box(240, 12, 240, 44, { fill: C.espresso, stroke: C.espresso });
  s += txt(360, 32, '/admin/login', { fill: '#F6EFE3', size: 12, weight: 700, mono: true, ltr: true });
  s += txt(360, 48, 'نام کاربری و رمز', { fill: '#D9C7A6', size: 8.5 });

  s += `<path d="M360 56 V86" stroke="${C.cherry}" stroke-width="1.6" marker-end="url(#ahB)"/>`;
  s += txt(372, 76, 'JWT در localStorage', { anchor: 'start', size: 8.6, fill: C.cherry });

  s += box(200, 86, 320, 52, { fill: C.paper2, stroke: C.espresso, sw: 1.6 });
  s += txt(360, 108, 'AdminLayout  ·  محافظ مسیر', { size: 12, weight: 700 });
  s += txt(360, 126, 'checking → پیام  ·  !admin → Navigate به login', { size: 8.6, fill: C.soft });

  const pages = [
    [10, 'کالاها', '/admin/items', 'فهرست · روشن‌وخاموش · حذف'],
    [186, 'فرم کالا', '/admin/items/:id', 'پیش‌نمایش زندهٔ همان کارت'],
    [362, 'سفارش‌ها', '/admin/orders', 'آکاردئون · تغییر وضعیت'],
    [538, 'گزارش‌ها', '/admin/reports', 'بازهٔ شمسی · CSV · JSON']
  ];
  const pages2 = [
    [98, 'محتوای سایت', '/admin/content', 'فرم از روی contentSchema'],
    [274, 'باشگاه', '/admin/club', 'اعضا · جست‌وجو · CSV'],
    [450, 'رمز عبور', '/admin/settings', 'tokenVersion += ۱']
  ];

  pages.forEach(([x, t, path, sub]) => {
    s += box(x, 178, 164, 62, { fill: C.paper, stroke: C.border });
    s += txt(x + 82, 198, t, { size: 11, weight: 700 });
    s += txt(x + 82, 214, path, { size: 8.2, mono: true, ltr: true, fill: C.brass });
    s += txt(x + 82, 230, sub, { size: 8, fill: C.soft });
    s += `<path d="M${x + 82} 160 V178" stroke="${C.soft}" stroke-width="1.2" marker-end="url(#ah)"/>`;
  });
  pages2.forEach(([x, t, path, sub]) => {
    s += box(x, 264, 164, 62, { fill: C.paper, stroke: C.border });
    s += txt(x + 82, 284, t, { size: 11, weight: 700 });
    s += txt(x + 82, 300, path, { size: 8.2, mono: true, ltr: true, fill: C.brass });
    s += txt(x + 82, 316, sub, { size: 8, fill: C.soft });
  });
  s += `<path d="M92 160 H620" stroke="${C.soft}" stroke-width="1.2"/>`;
  s += `<path d="M360 138 V160" stroke="${C.soft}" stroke-width="1.2"/>`;
  pages2.forEach(([x]) => {
    s += `<path d="M${x + 82} 248 V264" stroke="${C.soft}" stroke-width="1.2" marker-end="url(#ah)"/>`;
  });
  s += `<path d="M180 248 H532" stroke="${C.soft}" stroke-width="1.2"/>`;
  s += `<path d="M360 240 V248" stroke="${C.soft}" stroke-width="1.2"/>`;

  s += box(150, 350, 420, 52, { fill: '#F7EEDC', stroke: C.brass });
  s += txt(360, 370, 'هر تغییر → reloadShop()', { size: 11, weight: 700, fill: C.brass, mono: true, ltr: true });
  s += txt(360, 388, 'فروشگاه در همان تب بلافاصله به‌روز می‌شود', { size: 9, fill: C.ink2 });

  return wrap(720, 418, s, 'ساختار پنل مدیریت و محافظت از مسیرها');
}

/* ═════════ ۱۱) ورود مدیر و نشست ═════════ */
function loginDiagram() {
  let s = '';
  const lanes = [
    { x: 640, t: 'AdminLogin' },
    { x: 470, t: 'AuthContext' },
    { x: 300, t: 'routes/auth.js' },
    { x: 110, t: 'Admin model' }
  ];
  lanes.forEach((l) => {
    s += box(l.x - 68, 12, 136, 26, { fill: C.espresso, stroke: C.espresso, r: 6 });
    s += txt(l.x, 30, l.t, { fill: '#F6EFE3', size: 10, weight: 700, mono: true, ltr: true });
    s += `<path d="M${l.x} 38 V330" stroke="${C.border}" stroke-width="1.2" stroke-dasharray="3 4"/>`;
  });

  const steps = [
    [64, 640, 470, 'login(username, password)', ''],
    [98, 470, 300, 'POST /api/auth/login', ''],
    [132, 300, 110, "findOne().select('+passwordHash')", ''],
    [166, 110, 300, 'سند مدیر یا null', ''],
    [200, 300, 110, 'bcrypt.compare(plain, hash)', 'ضریب کار ۱۲'],
    [240, 300, 470, 'token + admin', 'یا ۴۰۱ با پیام یکسان'],
    [274, 470, 640, 'setToken → localStorage', ''],
    [308, 640, 470, "navigate('/admin/items')", '']
  ];
  steps.forEach(([y, from, to, label, note]) => {
    const dir = to > from ? 1 : -1;
    s += arrow(from + dir * 4, y, to - dir * 4, y, { color: C.soft });
    const mid = (from + to) / 2;
    s += txt(mid, y - 6, label, { size: 9, fill: C.ink2, mono: /[A-Za-z]/.test(label[0]), ltr: /[A-Za-z]/.test(label[0]) });
    if (note) s += txt(mid, y + 11, note, { size: 8.2, fill: C.soft });
  });

  s += box(150, 348, 460, 62, { fill: '#F7EEDC', stroke: C.cherry });
  s += txt(380, 368, 'ابطال نشست با یک عدد', { size: 11.5, weight: 700, fill: C.cherry });
  s += txt(380, 386, 'توکن حامل { sub, v } است  ·  requireAdmin بررسی می‌کند v === admin.tokenVersion', { size: 8.8, fill: C.ink2 });
  s += txt(380, 402, 'تغییر رمز → tokenVersion += ۱ → همهٔ توکن‌های قبلی باطل', { size: 8.8, fill: C.ink2 });

  return wrap(720, 424, s, 'ورود مدیر و سازوکار ابطال نشست');
}

/* ═════════ ۱۲) ویرایش کالا ═════════ */
function itemEditDiagram() {
  let s = '';

  s += box(240, 12, 240, 40, { fill: C.espresso, stroke: C.espresso });
  s += txt(360, 38, '/admin/items/:id', { fill: '#F6EFE3', size: 12, weight: 700, mono: true, ltr: true });

  s += `<path d="M360 52 V76" stroke="${C.soft}" stroke-width="1.4" marker-end="url(#ah)"/>`;

  s += box(30, 76, 300, 54, { fill: C.paper, stroke: C.border });
  s += txt(180, 96, 'api.adminItem(id)', { size: 10.5, weight: 700, mono: true, ltr: true });
  s += txt(180, 114, 'کالا برای پر کردن فرم', { size: 8.6, fill: C.soft });

  s += box(390, 76, 300, 54, { fill: C.paper, stroke: C.border });
  s += txt(540, 96, "api.adminItems({ kind: 'coffee' })", { size: 9.6, weight: 700, mono: true, ltr: true });
  s += txt(540, 114, 'دانه‌های میکس — شامل خاموش‌ها', { size: 8.6, fill: C.soft });

  s += `<path d="M300 60 H180 V76" fill="none" stroke="${C.soft}" stroke-width="1.2"/>`;
  s += `<path d="M420 60 H540 V76" fill="none" stroke="${C.soft}" stroke-width="1.2"/>`;
  s += `<path d="M180 60 H540" stroke="${C.soft}" stroke-width="1.2"/>`;

  s += box(30, 154, 300, 116, { fill: C.paper2, stroke: C.brass });
  s += txt(180, 176, 'فرم — شش fieldset', { size: 11.5, weight: 700, fill: C.brass });
  ['نوع و دسته', 'معرفی کالا', 'معرفی کامل و پروفایل طعمی', 'میکس (فقط قهوه)', 'ویترین · قیمت · تصویر']
    .forEach((t, i) => s += txt(180, 198 + i * 15, t, { size: 8.8, fill: C.ink2 }));

  s += box(390, 154, 300, 116, { fill: '#F7EEDC', stroke: C.sage, sw: 1.6 });
  s += txt(540, 176, 'پیش‌نمایش زنده', { size: 11.5, weight: 700, fill: C.sage });
  s += txt(540, 196, 'شیء preview → همان ItemCard واقعی سایت', { size: 8.8, fill: C.ink2 });
  s += txt(540, 214, 'پس واگرایی پیش‌نمایش و واقعیت', { size: 8.8, fill: C.ink2 });
  s += txt(540, 230, 'از نظر ساختاری غیرممکن است', { size: 8.8, fill: C.ink2 });
  s += txt(540, 252, 'هر تغییر فرم → کارت بلافاصله عوض می‌شود', { size: 8.4, fill: C.soft });

  s += `<path d="M330 212 H390" stroke="${C.sage}" stroke-width="1.5" marker-end="url(#ah)"/>`;
  s += `<path d="M180 130 V154" stroke="${C.soft}" stroke-width="1.2" marker-end="url(#ah)"/>`;
  s += `<path d="M540 130 V154" stroke="${C.soft}" stroke-width="1.2" marker-end="url(#ah)"/>`;

  s += `<path d="M180 270 V296" stroke="${C.soft}" stroke-width="1.4" marker-end="url(#ah)"/>`;

  s += box(30, 296, 300, 74, { fill: C.paper, stroke: C.cherry });
  s += txt(180, 316, 'بررسی زودهنگام در save()', { size: 10.5, weight: 700, fill: C.cherry });
  s += txt(180, 334, 'نام · slug · قیمت > ۰', { size: 8.8, fill: C.ink2 });
  s += txt(180, 350, 'اگر میکس: ≥ ۲ دانه و مجموع ۱۰۰', { size: 8.8, fill: C.ink2 });
  s += txt(180, 364, 'تا مدیر منتظر سرور نماند', { size: 8.2, fill: C.soft });

  s += `<path d="M330 333 H390" stroke="${C.soft}" stroke-width="1.4" marker-end="url(#ah)"/>`;

  s += box(390, 296, 300, 74, { fill: C.paper2, stroke: C.espresso });
  s += txt(540, 316, 'PUT /api/items/:id', { size: 10.5, weight: 700, mono: true, ltr: true });
  s += txt(540, 334, 'pickBody → checkBlend → removeImageFile', { size: 8.5, mono: true, ltr: true, fill: C.ink2 });
  s += txt(540, 350, 'Object.assign + save()  ← تا pre(validate) اجرا شود', { size: 8.5, fill: C.ink2 });
  s += txt(540, 364, 'سپس reloadShop() و بازگشت به فهرست', { size: 8.2, fill: C.soft });

  return wrap(720, 388, s, 'ویرایش کالا با پیش‌نمایش زنده و دو لایه اعتبارسنجی');
}

/* ═════════ ۱۳) گزارش و پشتیبان ═════════ */
function reportDiagram() {
  let s = '';

  /* سه ستون با فاصلهٔ ۲۰۰ کنار هم می‌نشینند، پس پهنایشان هم باید کمتر از ۲۰۰
     باشد؛ وگرنه کادر ستون بعدی روی متن ستون قبلی می‌افتد و واژه را نصفه
     می‌کند (پهن‌ترین سطر ۱۵۷ واحد است، ۱۹۰ با حاشیه کافی است). */
  const CW = 190, GAP = 10, CX = [55, 255, 455], MID = CX[1] + CW / 2;

  s += box(MID - 110, 12, 220, 40, { fill: C.espresso, stroke: C.espresso });
  s += txt(MID, 38, 'AdminReports', { fill: '#F6EFE3', size: 12, weight: 700, mono: true, ltr: true });

  s += `<path d="M${MID} 52 V72" stroke="${C.soft}" stroke-width="1.4"/>`;
  s += `<path d="M${CX[0] + CW / 2} 72 H${CX[2] + CW / 2}" stroke="${C.soft}" stroke-width="1.4"/>`;
  CX.forEach((x) => s += `<path d="M${x + CW / 2} 72 V88" stroke="${C.soft}" stroke-width="1.4" marker-end="url(#ah)"/>`);

  const cols = [
    [CX[0], 'خلاصهٔ دوره‌ای', 'GET /reports/summary', [
      'bucketSeries(period, count)',
      'projection سبک: createdAt، status، totals',
      'allTime با aggregate و $cond'
    ], C.sage],
    [CX[1], 'فهرست سفارش‌ها', 'GET /reports/orders', [
      'buildFilter: بازه + وضعیت + جست‌وجو',
      'find().skip().limit() و countDocuments',
      'topItems با aggregate'
    ], C.brass],
    [CX[2], 'خروجی و پشتیبان', 'GET /reports/export.*', [
      'CSV حالت orders یا lines',
      'JSON پشتیبان کامل',
      'استریم با cursor()'
    ], C.cherry]
  ];
  cols.forEach(([x, t, path, lines, col]) => {
    s += box(x, 88, CW, 116, { fill: C.paper, stroke: col });
    s += txt(x + CW / 2, 110, t, { size: 11.5, weight: 700, fill: col });
    s += txt(x + CW / 2, 128, path, { size: 8.6, mono: true, ltr: true, fill: C.soft });
    lines.forEach((l, i) => s += txt(x + CW / 2, 152 + i * 17, l, { size: 8.6, fill: C.ink2 }));
  });

  const BW = CX[2] + CW - CX[0] - 2 * GAP;
  s += box(CX[0] + GAP, 226, BW, 44, { fill: C.paper2, stroke: C.border });
  s += txt(MID, 246, 'کلیک روی یک بازه → range → هر سه بخش همان بازه را نشان می‌دهند', { size: 10, weight: 700 });
  s += txt(MID, 262, 'فایل خروجی هم دقیقاً همان فیلترهای صفحه را می‌گیرد', { size: 8.8, fill: C.soft });

  s += box(CX[0] + GAP, 288, BW, 60, { fill: '#F7EEDC', stroke: C.cherry });
  s += txt(MID, 308, 'دو محافظ در خروجی', { size: 11, weight: 700, fill: C.cherry });
  s += txt(MID, 326, 'csvCell — سلول‌های شروع‌شونده با = + - @ با آپاستروف امن می‌شوند', { size: 8.8, fill: C.ink2 });
  s += txt(MID, 342, 'BOM در ابتدای فایل — تا اکسل فارسی را درست باز کند', { size: 8.8, fill: C.ink2 });

  return wrap(700, 366, s, 'گزارش فروش و خروجی گرفتن');
}

/* ═════════ ۱۴) عضویت باشگاه ═════════ */
function clubDiagram() {
  let s = '';

  s += box(200, 12, 300, 46, { fill: C.espresso, stroke: C.espresso });
  s += txt(350, 34, 'ClubSection  ·  فرم صفحهٔ اصلی', { fill: '#F6EFE3', size: 11.5, weight: 700 });
  s += txt(350, 50, 'نام · موبایل · ایمیل و سلیقه (اختیاری)', { fill: '#D9C7A6', size: 8.4 });

  s += `<path d="M350 58 V84" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  s += box(180, 84, 340, 50, { fill: C.paper, stroke: C.border });
  s += txt(350, 104, 'اعتبارسنجی سمت مرورگر', { size: 10.5, weight: 700 });
  s += txt(350, 122, 'نام ≥ ۲ نویسه  ·  toLatinDigits سپس /^0\\d{10}$/', { size: 8.6, fill: C.soft });

  s += `<path d="M350 134 V160" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  s += box(180, 160, 340, 50, { fill: C.paper2, stroke: C.espresso });
  s += txt(350, 180, 'POST /api/club  ·  عمومی', { size: 10.5, weight: 700, mono: true, ltr: true });
  s += txt(350, 198, 'toLatin: رقم فارسی و عربی → لاتین، حذف فاصله و خط تیره', { size: 8.6, fill: C.soft });

  s += `<path d="M350 210 V232" stroke="${C.soft}" stroke-width="1.5"/>`;
  s += `<path d="M170 232 H530" stroke="${C.soft}" stroke-width="1.5"/>`;
  s += `<path d="M170 232 V254" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;
  s += `<path d="M530 232 V254" stroke="${C.soft}" stroke-width="1.5" marker-end="url(#ah)"/>`;

  s += box(30, 254, 280, 74, { fill: '#E7EDDC', stroke: C.sage });
  s += txt(170, 276, 'شماره قبلاً عضو بوده', { size: 11, weight: 700, fill: C.sage });
  s += txt(170, 294, 'اطلاعات به‌روز می‌شود، active = true', { size: 8.8, fill: C.ink2 });
  s += txt(170, 312, '{ ok: true, already: true }', { size: 8.8, mono: true, ltr: true, fill: C.soft });

  s += box(390, 254, 280, 74, { fill: C.paper, stroke: C.brass });
  s += txt(530, 276, 'عضو تازه', { size: 11, weight: 700, fill: C.brass });
  s += txt(530, 294, 'ClubMember.create — ۲۰۱', { size: 8.8, fill: C.ink2 });
  s += txt(530, 312, '{ ok: true, already: false }', { size: 8.8, mono: true, ltr: true, fill: C.soft });

  s += box(150, 348, 400, 44, { fill: '#F7EEDC', stroke: C.cherry });
  s += txt(350, 368, 'عضو تکراری هیچ‌وقت پیام خطا نمی‌بیند', { size: 10.5, weight: 700, fill: C.cherry });
  s += txt(350, 384, 'کلاینت با فیلد already پیام مناسب را انتخاب می‌کند', { size: 8.6, fill: C.ink2 });

  s += `<path d="M170 328 V340 H350 V348" fill="none" stroke="${C.cherry}" stroke-width="1.2"/>`;
  s += `<path d="M530 328 V340 H350" fill="none" stroke="${C.cherry}" stroke-width="1.2"/>`;

  return wrap(700, 410, s, 'عضویت در باشگاه — الگوی upsert کاربرپسند');
}


export default {
  er: erDiagram, arch: archDiagram, orderSeq: orderSeqDiagram,
  blend: blendDiagram, pricing: pricingDiagram, status: statusDiagram,
  catalog: catalogDiagram, boot: bootDiagram, jalali: jalaliDiagram,
  admin: adminDiagram, login: loginDiagram, itemEdit: itemEditDiagram,
  report: reportDiagram, club: clubDiagram
};
