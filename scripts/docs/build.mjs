/* ساخت documentation.html — تک‌فایل، خودبسنده */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import DIA from './diagrams.mjs';

/* همهٔ مسیرها از جای همین فایل حساب می‌شوند، نه از پوشهٔ جاری؛ پس اسکریپت
   از هر جایی (ریشهٔ مخزن، npm script، یا خودِ این پوشه) یک‌جور کار می‌کند. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DOCS = path.join(ROOT, 'docs');
const FONTS = path.join(HERE, 'fonts');

/* ───────── فونت‌ها ───────── */
const b64 = (f) => fs.readFileSync(path.join(FONTS, f)).toString('base64');
const face = (fam, file, weight) =>
  `@font-face{font-family:'${fam}';src:url(data:font/ttf;base64,${b64(file)}) format('truetype');font-weight:${weight};font-style:normal;font-display:block;}`;

const FONT_CSS = [
  face('Vazirmatn', 'Vazirmatn-Regular.ttf', 400),
  face('Vazirmatn', 'Vazirmatn-Medium.ttf', 500),
  face('Vazirmatn', 'Vazirmatn-Bold.ttf', 700),
  face('JBMono', 'JetBrainsMono-Regular.ttf', 400),
  face('JBMono', 'JetBrainsMono-Bold.ttf', 700)
].join('\n');

/* ───────── جایگزینی نمودارها ───────── */
const DIAGRAM_RULES = [
  { file: '03', sig: 'Express (پورت ۴۰۰۰)', dia: 'arch' },
  { file: '04', sig: 'lines[]  (زیرسند، بدون _id)', dia: 'er' },
  { file: '06', sig: 'app/page.jsx      lib/data.js', dia: 'boot' },
  { file: '06', sig: 'CatalogSection   │  kind="coffee"', dia: 'catalog' },
  { file: '06', sig: 'BlendCard(item)', dia: 'blend' },
  { file: '06', sig: 'CartDrawer          api.js', dia: 'orderSeq' },
  { file: '06', sig: 'AdminLogin        AuthContext', dia: 'login' },
  { file: '06', sig: 'کلیک «ویرایش»', dia: 'itemEdit' },
  { file: '06', sig: 'api.reportSummary(period, count)', dia: 'report' },
  { file: '06', sig: 'ClubSection (فرم)', dia: 'club' },
  { file: '06', sig: 'ثبت سفارش ────►', dia: 'status' }
];

function replaceDiagrams(md, fileKey) {
  const rules = DIAGRAM_RULES.filter((r) => r.file === fileKey);
  if (!rules.length) return md;
  return md.replace(/```[a-z]*\n([\s\S]*?)```/g, (whole, body) => {
    for (const r of rules) {
      if (body.includes(r.sig)) return `\n<!--DIAGRAM:${r.dia}-->\n`;
    }
    return whole;
  });
}

/* ───────── رنگ‌آمیزی کد ───────── */
const KW = new RegExp(
  '\\b(const|let|var|function|return|if|else|for|of|in|while|await|async|import|export|from|' +
  'default|new|class|extends|try|catch|finally|throw|typeof|instanceof|delete|void|' +
  'true|false|null|undefined|this|super|switch|case|break|continue|do|yield|static|get|set)\\b', 'g');

function highlight(code) {
  const marks = [];
  let s = code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* بلوک کد با unicode-bidi:plaintext کار می‌کند، یعنی جهتِ هر خط را از اولین
     حرفِ همان خط می‌گیرد. برای کامنت فارسیِ چندخطی این تله است: خطی که اتفاقاً
     با واژه‌ای لاتین شروع شود (مثلاً «UTC همیشه ۳:۳۰ است») چپ‌به‌راست می‌شود و
     آن واژه به ته جمله پرت می‌شود. پس کامنتِ فارسی را یک‌جا راست‌به‌چپ
     جدا می‌کنیم تا همهٔ خط‌هایش یک جهت داشته باشند. */
  const FA = /[؀-ۿ]/;

  const stash = (cls, txt) => {
    const isRtl = cls === 'c-cm' && FA.test(txt);
    const rtl = isRtl ? ' dir="rtl"' : '';
    /* نشانه‌های آغاز و پایان کامنت خنثی‌اند، پس در جزیرهٔ راست‌به‌چپ جابه‌جا
       می‌شوند و وارونه دیده می‌شوند. هر کدام را در جداساز چپ‌به‌راست
       می‌گذاریم تا شکل خودشان را نگه دارند، ولی سر جای درستِ راست‌به‌چپ
       بنشینند. */
    const body = isRtl
      ? txt
          .replace(/^(\s*)(\/\*|\/\/|#)/, (m, ws, mk) => ws + '⁦' + mk + '⁩')
          .replace(/(\*\/)(\s*)$/, (m, mk, ws) => '⁦' + mk + '⁩' + ws)
      : txt;
    marks.push(`<span class="${cls}"${rtl}>${body}</span>`);
    /* نشانک نباید رقم یا حرف داشته باشد؛ وگرنه قاعدهٔ «عدد» شمارهٔ داخل نشانک را
       می‌بلعد و بلوک کد به یک رقم فرومی‌پاشد. کاراکتری از ناحیهٔ استفادهٔ خصوصیِ
       یونیکد این خطر را می‌بندد، چون هیچ قاعده‌ای آن را نمی‌بیند. */
    return String.fromCharCode(0xe000 + marks.length - 1);
  };

  /* کامنت بلوکی و خطی */
  s = s.replace(/\/\*[\s\S]*?\*\//g, (m) => stash('c-cm', m));
  s = s.replace(/(^|[^:\\])\/\/[^\n]*/g, (m, p) => p + stash('c-cm', m.slice(p.length)));
  s = s.replace(/(^|\n)\s*#[^\n]*/g, (m) => stash('c-cm', m));
  /* رشته‌ها */
  s = s.replace(/`(?:[^`\\]|\\.)*`/g, (m) => stash('c-st', m));
  s = s.replace(/'(?:[^'\\\n]|\\.)*'/g, (m) => stash('c-st', m));
  s = s.replace(/"(?:[^"\\\n]|\\.)*"/g, (m) => stash('c-st', m));
  /* عدد */
  s = s.replace(/\b\d[\d_.]*\b/g, (m) => stash('c-nu', m));
  /* کلیدواژه */
  s = s.replace(KW, (m) => stash('c-kw', m));
  /* تابع */
  s = s.replace(/\b([A-Za-z_$][\w$]*)(?=\()/g, (m) => stash('c-fn', m));
  /* ویژگی CSS ساده */
  s = s.replace(/(^|\n)(\s*)([a-z-]+)(\s*:)/g, (m, a, b, c, d) => a + b + stash('c-pr', c) + d);

  /* بازگرداندن نشانک‌ها؛ چون یک نشانک می‌تواند داخل نشانک دیگری جا خوش کند،
     تا وقتی چیزی برای بازگرداندن مانده تکرار می‌کنیم. */
  for (let pass = 0; pass < 8 && /[\ue000-\uf8ff]/.test(s); pass++) {
    s = s.replace(/[\ue000-\uf8ff]/g, (ch) => marks[ch.charCodeAt(0) - 0xe000]);
  }
  return s;
}

/* ───────── تنظیم renderer ───────── */
const CALLOUTS = {
  'نکته': ['note', 'نکته'],
  'هشدار': ['warn', 'هشدار'],
  'بهترین‌روش': ['best', 'بهترین‌روش'],
  'صادقانه': ['warn', 'صادقانه'],
  'نکتهٔ صادقانه': ['warn', 'نکتهٔ صادقانه'],
  'هشدار امنیتی': ['warn', 'هشدار امنیتی'],
  'نکته: سه فیلد مرده': ['note', 'نکته'],
  'هشدار: یک لبهٔ تیز': ['warn', 'هشدار'],
  'این یک ضعف کارایی است:': ['warn', 'هشدار']
};

let headings = [];

/* شمارندهٔ مستقل برای شناسهٔ عنوان‌ها.
   پیش‌تر شناسه از طول همین آرایه ساخته می‌شد، ولی فقط عنوان‌های سطح ۱ و ۲
   داخلش می‌رفتند — پس هر h3 شناسه‌ای می‌گرفت که عنوان بعدیِ سطح ۲ هم همان
   را می‌گرفت. نتیجه‌اش شناسهٔ تکراری بود و شمارهٔ صفحه در فهرست مطالب به
   صفحهٔ همان h3 اشاره می‌کرد، نه به صفحهٔ عنوان اصلی — چند صفحه جلوتر. */
let headingSeq = 0;

function buildRenderer() {
  const r = new marked.Renderer();

  r.heading = function (token) {
    const level = token.depth;
    const text = this.parser.parseInline(token.tokens);
    const plain = String(text).replace(/<[^>]+>/g, '');
    const id = 'h' + ++headingSeq;
    if (level <= 2) headings.push({ id, level, text: plain });
    const cls = level === 1 ? ' class="ch"' : '';
    return `<h${level} id="${id}"${cls}>${text}</h${level}>`;
  };

  r.code = function (token) {
    const cls = token.lang ? ` data-lang="${token.lang}"` : '';
    return `<pre class="code" dir="ltr"${cls}><code>${highlight(token.text)}</code></pre>`;
  };

  r.codespan = function (token) {
    return `<code class="ic" dir="ltr">${String(token.text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`;
  };

  r.blockquote = function (token) {
    const quote = this.parser.parse(token.tokens);
    const m = /^<p><strong>([^<]+)<\/strong>/.exec(quote.trim());
    if (m) {
      const key = m[1].trim().replace(/[:：]$/, '');
      const hit = CALLOUTS[key] || (key.startsWith('هشدار') ? ['warn', key]
        : key.startsWith('نکته') ? ['note', key]
        : key.startsWith('بهترین') ? ['best', key] : null);
      if (hit) {
        const body = quote.replace(/^<p><strong>[^<]+<\/strong>\s*(<br\s*\/?>)?\s*/, '<p>');
        return `<div class="cal cal-${hit[0]}"><span class="cal-t">${hit[1]}</span>${body}</div>`;
      }
    }
    return `<blockquote class="qt">${quote}</blockquote>`;
  };

  r.table = function (token) {
    const cell = (c, tag) => {
      const align = c.align ? ` style="text-align:${c.align}"` : '';
      return `<${tag}${align}>${this.parser.parseInline(c.tokens)}</${tag}>`;
    };
    const head = `<tr>${token.header.map((c) => cell.call(this, c, 'th')).join('')}</tr>`;
    const body = token.rows
      .map((row) => `<tr>${row.map((c) => cell.call(this, c, 'td')).join('')}</tr>`)
      .join('');
    return `<div class="tw"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  };

  return r;
}

/* ───────── خواندن فصل‌ها ───────── */
const FILES = [
  '01-overview.md', '02-tech-stack.md', '03-architecture.md', '04-data-model.md',
  '05-file-by-file.md', '06-user-flows.md', '07-algorithms.md', '08-design-system.md',
  '09-decisions-why.md', '10-qa.md', '11-weaknesses.md', '12-glossary.md'
];

marked.setOptions({ renderer: buildRenderer(), gfm: true, breaks: false, mangle: false, headerIds: false });

let bodyHtml = '';
for (const f of FILES) {
  const key = f.slice(0, 2);
  let md = fs.readFileSync(path.join(DOCS, f), 'utf8');
  md = replaceDiagrams(md, key);
  let html = marked.parse(md);
  html = html.replace(/<!--DIAGRAM:(\w+)-->/g, (_, name) => {
    if (!DIA[name]) throw new Error('نمودار ناشناخته: ' + name);
    return DIA[name]();
  });
  bodyHtml += `<section class="chapter">${html}</section>\n`;
}

/* شمارش نمودارها */
const diaCount = (bodyHtml.match(/<figure class="dia">/g) || []).length;

/* ───────── فهرست مطالب ───────── */
const faNum = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const tocHtml = headings.map((h) =>
  `<li class="toc-${h.level}"><a href="#${h.id}" data-t="${h.id}"><span class="toc-x">${h.text}</span><span class="toc-d"></span><span class="toc-p" data-p="${h.id}"></span></a></li>`
).join('\n');

/* ───────── CSS ───────── */
const CSS = `
${FONT_CSS}

:root{
  --paper:#FBF5E9; --paper2:#F3E8D4; --paper3:#EFE2C9;
  --line:#D8C6A6; --line2:#C0A87F;
  --ink:#2B1D12; --ink2:#4A3826; --soft:#7C6849;
  --espresso:#332417; --cherry:#A8402F; --brass:#B5822F; --sage:#5E6E48;
  --pw:210mm; --ph:296.6mm;
  --mt:17mm; --mb:19mm; --mi:15mm;
}

*,*::before,*::after{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  background:#8d8070;
  font-family:'Vazirmatn',sans-serif;
  color:var(--ink);
  font-size:9.9pt;
  line-height:1.72;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}

#src{display:none;}

.pg{
  position:relative;
  width:var(--pw); height:var(--ph);
  margin:0 auto; overflow:hidden;
  background:var(--paper);
  page-break-after:always; break-after:page;
}
.pg:last-child{page-break-after:auto;break-after:auto;}
.pg-body{position:absolute;inset:var(--mt) var(--mi) var(--mb) var(--mi);overflow:hidden;}
/* لایهٔ ارتفاع‌آزاد؛ صفحه‌بند با همین اندازه می‌گیرد چقدر پر شده */
.pg-flow{display:flow-root;}
.pg-foot{
  position:absolute; inset-inline:var(--mi); bottom:10mm; height:9mm;
  display:flex; align-items:center; justify-content:space-between;
  font-size:7.6pt; color:var(--soft);
  border-top:.6pt solid var(--line);
  padding-top:2.4mm;
}
.pg-foot .fn{font-family:'Vazirmatn';font-weight:700;color:var(--brass);font-size:9pt;}
.pg-foot .ft{letter-spacing:.02em;}

/* ── نوار رنگی لبهٔ صفحه ── */
.pg::before{
  content:''; position:absolute; inset-block:0; inset-inline-start:0;
  width:5mm; background:linear-gradient(180deg,#4A3423,#332417 45%,#6B4A2E);
}
.pg-body,.pg-foot{margin-inline-start:2mm;}

/* ═══ جلد ═══ */
.cover{
  position:relative; width:var(--pw); height:var(--ph); margin:0 auto;
  background:radial-gradient(115% 85% at 80% 8%, #4B3524 0%, #332417 42%, #1F1610 100%);
  color:#F3E7D2; overflow:hidden;
  page-break-after:always; break-after:page;
}
.cover-in{position:absolute;inset:22mm 20mm;display:flex;flex-direction:column;}
.cv-rule{width:38mm;height:2.6pt;background:var(--brass);border-radius:2pt;}
.cv-eyebrow{margin-top:7mm;font-size:9.4pt;letter-spacing:.26em;color:#D6B984;}
.cv-title{
  font-size:37pt; font-weight:700; line-height:1.24; margin:9mm 0 0;
  color:#FBF3E4; letter-spacing:-.2pt;
}
.cv-title em{font-style:normal;color:var(--brass);display:block;font-size:26pt;margin-top:3mm;}
.cv-sub{margin-top:8mm;font-size:11.6pt;line-height:2;color:#DCCBAF;max-width:126mm;}
.cv-meta{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:8mm;}
.cv-facts{display:flex;gap:11mm;flex-wrap:wrap;}
.cv-facts div b{display:block;font-size:15pt;color:var(--brass);font-weight:700;line-height:1.3;}
.cv-facts div span{font-size:8.4pt;color:#BCA98C;}
.cv-date{font-size:9pt;color:#BCA98C;text-align:left;line-height:1.9;}
.cv-art{position:absolute;inset-block-start:-12mm;inset-inline-end:-22mm;width:126mm;opacity:.14;}
.cv-art2{position:absolute;bottom:-24mm;inset-inline-start:-16mm;width:96mm;opacity:.1;}

/* ═══ تیترها ═══ */
h1,h2,h3,h4{font-weight:700;margin:0;line-height:1.42;color:var(--espresso);}
h1.ch{
  font-size:20pt; margin:0 0 6mm; padding:0 0 3.4mm;
  border-bottom:2.2pt solid var(--brass); color:var(--espresso);
}
h2{
  font-size:13.6pt; margin:6.4mm 0 2.8mm; padding-inline-start:4mm;
  border-inline-start:3.4pt solid var(--cherry); color:#7A2C20;
}
h3{font-size:11.2pt;margin:4.8mm 0 2mm;color:#5A3E24;}
h4{font-size:10.1pt;margin:3.6mm 0 1.6mm;color:var(--ink2);}

p{margin:0 0 2.6mm;text-align:justify;}
ul,ol{margin:0 0 2.8mm;padding-inline-start:6mm;}
li{margin-bottom:1.1mm;}
li::marker{color:var(--brass);}
strong{font-weight:700;color:var(--espresso);}
hr{border:none;border-top:1pt dashed var(--line2);margin:7mm 0;}
a{color:inherit;text-decoration:none;}

/* ═══ کد ═══ */
/* JBMono حرف فارسی ندارد؛ اگر وزیرمتن را پشتش نگذاریم، کامنت‌های فارسیِ
   داخل کد با فونت پیش‌فرض و بدون اتصال حروف کشیده می‌شوند. */
code,pre,.mono{font-family:'JBMono','Vazirmatn','Courier New',monospace;font-variant-ligatures:none;}
/* کد درون‌خطیِ نشکن، در متنِ هم‌ترازشده دره‌های سفید می‌سازد؛ پس اجازه
   می‌دهیم تکه‌های بلند بشکنند و قاب رنگی روی هر تکه تکرار شود. */
.ic{
  direction:ltr; unicode-bidi:isolate; display:inline;
  background:var(--paper3); border:.6pt solid var(--line);
  border-radius:2.6pt; padding:.1mm 1.2mm; font-size:8.5pt;
  color:#6B3A22; overflow-wrap:anywhere;
  -webkit-box-decoration-break:clone; box-decoration-break:clone;
}
/* plaintext یعنی جهتِ هر خط از اولین حرفِ خودش گرفته شود: خط کد چپ‌به‌راست
   می‌ماند و کامنت فارسی راست‌به‌چپ، بی‌آنکه ترتیب کلمه‌ها به هم بریزد. */
pre.code{
  direction:ltr; text-align:left; unicode-bidi:plaintext;
  background:#F7EEDC; border:.8pt solid var(--line);
  border-inline-start:3pt solid var(--brass);
  border-radius:4pt; padding:2.6mm 3.4mm; margin:0 0 3.2mm;
  font-size:7.7pt; line-height:1.52; overflow:hidden;
  white-space:pre-wrap; word-break:break-word; overflow-wrap:anywhere;
  break-inside:avoid; page-break-inside:avoid;
}
pre.code code{background:none;border:none;padding:0;font-size:inherit;color:#3A2A1B;}
.c-cm{color:#8A7E5F;font-style:normal;}
/* کامنت فارسی جزیرهٔ راست‌به‌چپِ خودش است: نه جهتش را از خط کد می‌گیرد،
   نه جهت خط کد را به هم می‌زند. */
.c-cm[dir='rtl']{unicode-bidi:isolate;}
.c-st{color:#7A5B2A;}
.c-kw{color:#A8402F;font-weight:700;}
.c-nu{color:#4E6B3C;}
.c-fn{color:#3F5670;}
.c-pr{color:#6B4A7A;}

/* ═══ جدول ═══ */
.tw{margin:0 0 3.6mm;break-inside:avoid;page-break-inside:avoid;}
table{width:100%;border-collapse:collapse;font-size:8.2pt;line-height:1.55;}
thead th{
  background:var(--espresso); color:#F6EFE3; font-weight:700;
  padding:1.5mm 2mm; text-align:right; font-size:8.1pt;
  border:.5pt solid var(--espresso);
}
tbody td{
  padding:1.4mm 2mm; border:.5pt solid var(--line);
  vertical-align:top; background:#FDF9F0;
}
tbody tr:nth-child(even) td{background:var(--paper2);}
td code,th code{font-size:7.9pt;}
/* ستون اولِ جدول‌ها تقریباً همیشه نام است — متغیر، فایل، تابع — و با
   overflow-wrap:anywhere مرورگر آن را تا حد یک حرف تنگ می‌کرد:
   «NEXT_PUBLIC_SITE_URL» دو تکه می‌شد. فقط برای همین ستون شکستن را
   برمی‌داریم تا جا باز کند. بقیهٔ ستون‌ها دست‌نخورده‌اند، وگرنه مسیرهای
   بلند جدول را از عرض صفحه بیرون می‌بردند. */
td:first-child .ic,th:first-child .ic{overflow-wrap:normal;word-break:keep-all;}

/* ═══ کال‌اوت ═══ */
.cal{
  position:relative; margin:0 0 3.6mm; padding:2.6mm 3.4mm 1.2mm 3.4mm;
  border-radius:4pt; border:.8pt solid; font-size:9.2pt;
  break-inside:avoid; page-break-inside:avoid;
}
.cal p:last-child{margin-bottom:1.4mm;}
.cal-t{
  display:inline-block; font-weight:700; font-size:8.6pt;
  padding:.2mm 2.4mm; border-radius:20pt; margin-bottom:1.6mm;
}
.cal-note{background:#F1F3E6;border-color:#A9B78C;}
.cal-note .cal-t{background:var(--sage);color:#F4F7EC;}
.cal-warn{background:#FAEDE9;border-color:#DDA79A;}
.cal-warn .cal-t{background:var(--cherry);color:#FDF1EE;}
.cal-best{background:#FAF0DC;border-color:#DCBB80;}
.cal-best .cal-t{background:var(--brass);color:#FFF8EC;}

blockquote.qt{
  margin:0 0 3.2mm; padding:2mm 3.4mm; border-inline-start:2.6pt solid var(--line2);
  background:var(--paper2); border-radius:0 4pt 4pt 0; color:var(--ink2); font-size:9.3pt;
}
blockquote.qt p:last-child{margin-bottom:0;}

/* ═══ نمودار ═══ */
figure.dia{
  margin:1mm 0 4mm; padding:3mm 2.6mm 2mm;
  background:#FDFAF2; border:.8pt solid var(--line);
  border-radius:5pt; text-align:center;
  break-inside:avoid; page-break-inside:avoid;
}
figure.dia svg{display:block;width:100%;height:auto;}
figure.dia figcaption{
  margin-top:2.4mm; font-size:8.4pt; color:var(--soft);
  border-top:.5pt dashed var(--line); padding-top:1.8mm;
}
figure.dia figcaption code{font-size:7.9pt;background:var(--paper3);padding:0 1mm;border-radius:2pt;}
svg text.d-fa{font-family:'Vazirmatn',sans-serif;}
svg text.d-code{font-family:'JBMono',monospace;}

/* ═══ فهرست مطالب ═══ */
.toc h1{font-size:19pt;border-bottom:2.2pt solid var(--brass);padding-bottom:4mm;margin-bottom:6mm;}
ul.toc{list-style:none;padding:0;margin:0;font-size:9.6pt;}
ul.toc li{margin:0;}
ul.toc a{display:flex;align-items:baseline;gap:1.6mm;padding:.72mm 0;}
.toc-x{flex:none;}
.toc-d{flex:1;border-bottom:.7pt dotted var(--line2);transform:translateY(-1mm);}
.toc-p{flex:none;color:var(--brass);font-weight:700;font-size:9.4pt;}
li.toc-1{margin-top:2.6mm;}
li.toc-1 .toc-x{font-weight:700;font-size:11pt;color:var(--espresso);}
li.toc-2{padding-inline-start:5mm;}
li.toc-2 .toc-x{color:var(--ink2);font-size:9.5pt;}
li.toc-2 .toc-p{font-weight:400;color:var(--soft);}

.lead-note{
  margin-top:7mm;padding:3.4mm 4mm;background:var(--paper2);
  border:.8pt solid var(--line);border-radius:4pt;font-size:9.2pt;color:var(--ink2);
}

@page{size:210mm 297mm;margin:0;}
`;

/* ───────── اسکریپت صفحه‌بندی ───────── */
const PAGINATOR = fs.readFileSync(path.join(HERE, 'paginator.js'), 'utf8');

/* ───────── جلد ───────── */
const today = new Date();
const jDate = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(today);
const gDate = today.toISOString().slice(0, 10);

const beanSvg = () => `<svg class="cv-art" viewBox="0 0 200 200" aria-hidden="true">
  <g transform="translate(100 100) rotate(-24)">
    <ellipse rx="86" ry="60" fill="#C8963C"/>
    <path d="M-66 0c20-26 20 26 66-26" fill="none" stroke="#332417" stroke-width="9" stroke-linecap="round"/>
  </g></svg>`;

const cupSvg = `<svg class="cv-art2" viewBox="0 0 200 160" aria-hidden="true">
  <path d="M28 40h108v46a54 54 0 0 1-108 0Z" fill="none" stroke="#C8963C" stroke-width="7"/>
  <path d="M136 52h16a22 22 0 0 1 0 44h-16" fill="none" stroke="#C8963C" stroke-width="7"/>
  <path d="M18 146h130" stroke="#C8963C" stroke-width="7" stroke-linecap="round"/>
  <path d="M62 24c-8-10 8-16 0-24M92 24c-8-10 8-16 0-24" fill="none" stroke="#C8963C" stroke-width="5" stroke-linecap="round"/>
</svg>`;

const COVER = `
<div class="cover">
  ${beanSvg()}
  ${cupSvg}
  <div class="cover-in">
    <div class="cv-rule"></div>
    <p class="cv-eyebrow">مستندات فنی پروژه</p>
    <h1 class="cv-title">رُست‌خانهٔ دانه<em>فروشگاه قهوهٔ تخصصی با پنل مدیریت</em></h1>
    <p class="cv-sub">
      تحلیل کامل معماری، مدل داده، الگوریتم‌ها و تصمیم‌های مهندسیِ یک فروشگاه
      اینترنتی روی MongoDB و Express و Next.js — نوشته‌شده بر پایهٔ خودِ کد،
      نه بر پایهٔ حدس.
    </p>
    <div class="cv-meta">
      <div class="cv-facts">
        <div><b>Next · Express</b><span>پشتهٔ فناوری</span></div>
        <div><b>۱۲</b><span>فصل</span></div>
        <div><b>${faNum(diaCount)}</b><span>نمودار</span></div>
        <div><b>۱۰۶</b><span>کالای اولیه</span></div>
      </div>
      <div class="cv-date">${jDate}<br>${gDate}</div>
    </div>
  </div>
</div>`;

const TOC_PAGE = `
<section class="chapter toc">
  <h1 class="ch">فهرست مطالب</h1>
  <ul class="toc">
${tocHtml}
  </ul>
  <p class="lead-note">
    هر ارجاع در این سند به فایل و تابع واقعی مخزن اشاره می‌کند. تکه‌کدها عیناً از
    منبع برداشته شده‌اند و نمودارها همگی به‌صورت SVG درون‌خطی رسم شده‌اند.
  </p>
</section>`;

/* ───────── سند نهایی ───────── */
const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<title>رُست‌خانهٔ دانه — مستندات فنی</title>
<style>${CSS}</style>
</head>
<body>
${COVER}
<div id="src">
${TOC_PAGE}
${bodyHtml}
</div>
<div id="book"></div>
<script>${PAGINATOR}</script>
</body>
</html>`;

fs.writeFileSync(path.join(DOCS, 'documentation.html'), html, 'utf8');
console.log('OK documentation.html written');
console.log('   headings:', headings.length, '| diagrams:', diaCount, '| size:', (html.length / 1024 / 1024).toFixed(2), 'MB');
