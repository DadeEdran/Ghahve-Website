'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useShop } from '../context/ShopContext.jsx';

/* بخش‌های ثابت صفحه — متن و طرح‌شان عیناً همان نسخهٔ اولیه است */

export function Strip() {
  return (
    <div className="strip">
      <div className="wrap strip-inner">
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3 3 7v6c0 5 4 7.5 9 8 5-.5 9-3 9-8V7Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M8.5 12.5 11 15l5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>{' '}
          تاریخ رست روی هر بسته
        </span>
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 16V8l7-4 7 4v8l-7 4Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M10 12 3 8m7 4 7-4m-7 4v8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>{' '}
          ارسال رایگان از ۱ کیلو
        </span>
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 21s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="11" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>{' '}
          کارگاه رست در کریم‌خان
        </span>
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 4h12v5a6 6 0 0 1-12 0Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M18 5h2a2 2 0 0 1 0 4h-2M8 20h8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>{' '}
          آسیاب رایگان بر اساس روش دم شما
        </span>
      </div>
    </div>
  );
}

const BREW_CARDS = [
  {
    grind: 'v60',
    filter: 'light',
    gear: 'pourover',
    img: 'm-v60.svg',
    alt: 'قیف وی۶۰ روی سرور شیشه‌ای',
    title: 'وی۶۰ و کمکس',
    text: 'آب داغ، ریزش آرام و فنجانی شفاف. اسیدیته و نوت‌های میوه‌ای اینجا بیدار می‌شوند.',
    tag: 'آسیاب متوسط · رست روشن'
  },
  {
    grind: 'espresso',
    filter: 'espresso',
    gear: 'stovetop',
    img: 'm-espresso.svg',
    alt: 'پرتافیلتر اسپرسو و دو فنجان',
    title: 'اسپرسو',
    text: 'نُه بار فشار و بیست‌وپنج ثانیه. برای کرمای پایدار و شات متعادل ساخته شده‌اند.',
    tag: 'آسیاب ریز · میکس اسپرسو'
  },
  {
    grind: 'moka',
    filter: 'dark',
    gear: 'stovetop',
    img: 'm-moka.svg',
    alt: 'موکاپات روی شعله',
    title: 'موکاپات',
    text: 'قهوهٔ غلیظ خانگی با بدنهٔ سنگین. رست تیره اینجا شکلاتی و گرم می‌شود.',
    tag: 'آسیاب متوسطِ ریز · رست تیره'
  },
  {
    grind: 'french',
    filter: 'medium',
    gear: 'pourover',
    img: 'm-french.svg',
    alt: 'فرنچ‌پرس',
    title: 'فرنچ‌پرس',
    text: 'ساده‌ترین راه برای فنجانی پرحجم و بی‌دردسر؛ چهار دقیقه صبر، تمام.',
    tag: 'آسیاب درشت · رست متوسط'
  }
];

export function BrewSection({ setCoffeeFilter, setGearFilter }) {
  const { setGrind, grindLabel, toast } = useShop();

  /* این آسیاب، پیش‌فرضِ کارت‌هاست؛ روی هر قهوه جداگانه
     هم می‌شود عوضش کرد — چه روی کارت، چه داخل سبد. */
  const pick = (card) => {
    setGrind(card.grind);
    toast(`آسیاب پیش‌فرض روی «${grindLabel(card.grind)}» تنظیم شد`);
    setCoffeeFilter(card.filter);
    setGearFilter(card.gear);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="section soft" id="brew">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">قهوه را چطور دم می‌کنید؟</p>
            <h2>روش دم، رست را انتخاب می‌کند</h2>
          </div>
          <p className="section-desc">
            روی هر روش بزنید تا هم آسیاب پیش‌فرض تنظیم شود، هم قهوه‌های مناسبش را ببینید.
          </p>
        </div>

        <div className="brew-grid">
          {BREW_CARDS.map((c) => (
            <button className="brew-card" key={c.grind} onClick={() => pick(c)}>
              <img src={`/img/${c.img}`} alt={c.alt} loading="lazy" />
              <h3>{c.title}</h3>
              <p>{c.text}</p>
              <span className="brew-tag">{c.tag}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorySection() {
  return (
    <section className="section band" id="story">
      <div className="wrap story-inner">
        <figure className="story-photo">
          <img
            src="/img/roastery.svg"
            alt="دستگاه رست قهوه در کارگاه، همراه با گونی‌های دانهٔ خام"
            loading="lazy"
          />
          <figcaption>رست دوشنبه و چهارشنبه · درام ۱۵ کیلویی</figcaption>
        </figure>

        <div>
          <p className="eyebrow">پشت شیشهٔ کارگاه</p>
          <h2>هفته‌ای دو بار رست می‌کنیم، نه بیشتر</h2>
          <p className="lead">
            هر پروفایل رست را روی نمونهٔ کوچک می‌چشیم، بعد روی درام پانزده کیلویی می‌بریم. دانه‌ای
            که به دست شما می‌رسد حداکثر سه روز از سینی خنک‌کننده فاصله دارد.
          </p>
          <ul className="check">
            <li>کاپینگ هفتگی روی همهٔ خاستگاه‌ها، پیش از رفتن به فهرست</li>
            <li>دانهٔ خام مستقیم از واردکننده، با شناسنامهٔ مزرعه</li>
            <li>بسته‌بندی سوپاپ‌دار تا رایحه سر جایش بماند</li>
          </ul>
          <a className="btn btn-primary" href="#products">
            دیدن فهرست تازه‌رست
          </a>
        </div>
      </div>
    </section>
  );
}

export function BulkSection() {
  return (
    <section className="section" id="bulk">
      <div className="wrap bulk-inner">
        <div>
          <p className="eyebrow">برای کافه‌ها و مصرف خانگی پرحجم</p>
          <h2>هرچه کیلو بیشتر، قیمت هر کیلو کمتر</h2>
          <p className="lead">
            تخفیف روی مجموع وزن سبد اعمال می‌شود، نه روی تک‌تک قهوه‌ها. یعنی می‌توانید ۵۰۰ گرم از سه
            خاستگاه بردارید و باز هم پلهٔ ۱.۵ کیلو را بگیرید.
          </p>
          <ul className="check dark">
            <li>ارسال رایگان از ۱ کیلوگرم به بالا</li>
            <li>امکان تحویل دانه کامل یا آسیاب‌شده بر اساس روش دم‌آوری</li>
            <li>برای سفارش بالای ۵ کیلو، پروفایل رست اختصاصی می‌گیریم</li>
          </ul>
        </div>

        <div className="bulk-side">
          <img
            className="bulk-photo"
            src="/img/beans-sack.svg"
            alt="گونی دانهٔ قهوه و شاخهٔ گیلاس قهوه"
            loading="lazy"
          />
          <table className="tiers">
            <caption>پله‌های تخفیف وزنی</caption>
            <thead>
              <tr>
                <th scope="col">مجموع وزن سبد</th>
                <th scope="col">تخفیف</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>زیر ۱ کیلوگرم</td>
                <td>—</td>
              </tr>
              <tr>
                <td>۱ تا ۳ کیلوگرم</td>
                <td>۵٪</td>
              </tr>
              <tr>
                <td>۳ تا ۵ کیلوگرم</td>
                <td>۱۰٪</td>
              </tr>
              <tr>
                <td>۵ کیلوگرم به بالا</td>
                <td>۱۵٪</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const GUIDE_CARDS = [
  {
    filter: 'light',
    level: '1',
    fill: '#D3A468',
    stroke: '#8E5C2A',
    title: 'روشن',
    text: 'اسیدیتهٔ زنده، نوت‌های میوه و گل. بهترین حالت در وی۶۰، کمکس و ایروپرس.',
    link: 'دیدن قهوه‌های رست روشن'
  },
  {
    filter: 'medium',
    level: '3',
    fill: '#9C6B3C',
    stroke: '#C79763',
    title: 'متوسط',
    text: 'تعادل شیرینی و اسیدیته، بدنهٔ متوسط. اگر مطمئن نیستید، از اینجا شروع کنید.',
    link: 'دیدن قهوه‌های رست متوسط'
  },
  {
    filter: 'dark',
    level: '5',
    fill: '#3B2213',
    stroke: '#84543A',
    title: 'تیره',
    text: 'بدنهٔ سنگین، کاکائو و ادویه. برای موکاپات، فرنچ‌پرس و قهوهٔ با شیر.',
    link: 'دیدن قهوه‌های رست تیره'
  },
  {
    filter: 'decaf',
    level: 'd',
    fill: '#7E8A63',
    stroke: '#E4EBD2',
    title: 'بدون کافئین',
    text: 'کافئین‌زدایی با آب، بدون حلال شیمیایی. برای فنجان بعد از شام.',
    link: 'دیدن قهوه‌های بدون کافئین'
  }
];

export function GuideSection({ setCoffeeFilter }) {
  const pick = (f) => {
    setCoffeeFilter(f);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="section soft" id="guide">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">قبل از خرید</p>
            <h2>کدام رست به شما می‌خورد؟</h2>
          </div>
          <p className="section-desc">
            روی هر کارت بزنید تا فهرست قهوه‌ها همان درجه رست را نشان بدهد.
          </p>
        </div>

        <div className="guide-grid">
          {GUIDE_CARDS.map((c) => (
            <button className="guide-card" key={c.filter} onClick={() => pick(c.filter)}>
              <span className="roast-swatch" data-level={c.level}>
                <svg viewBox="0 0 60 44" aria-hidden="true">
                  <g transform="translate(30 22) rotate(-18)">
                    <ellipse rx="25" ry="17" fill={c.fill} />
                    <path
                      d="M-19 0c6-7 6 7 19-7"
                      fill="none"
                      stroke={c.stroke}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
              </span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
              <span className="guide-link">{c.link}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const SHOTS = [
  {
    img: 'shopfront.svg',
    alt: 'نمای بیرونی کافه با سایبان راه‌راه و میز پیاده‌رو',
    cap: 'ورودی کافه، کریم‌خان',
    wide: true
  },
  { img: 'latte.svg', alt: 'فنجان لاته با نقش برگ روی میز چوبی', cap: 'لاتهٔ صبح با میکس شب‌نشین' },
  { img: 'brew-bar.svg', alt: 'میز دم‌آوری با کتری گردن‌غازی و وی۶۰', cap: 'بار دم‌آوری دستی' },
  {
    img: 'hero-cafe.svg',
    alt: 'فضای داخلی کافه با پنجرهٔ قوسی و چراغ‌های آویز',
    cap: 'سالن، ساعت ده صبح'
  },
  {
    img: 'beans-sack.svg',
    alt: 'گونی دانهٔ قهوه و دانه‌های ریخته‌شده',
    cap: 'گونی تازه‌رسیده از انبار'
  }
];

export function CafeSection() {
  const [shot, setShot] = useState(null);

  /* بستن با Escape */
  const onKey = (e) => {
    if (e.key === 'Escape') setShot(null);
  };

  return (
    <>
      <section className="section" id="cafe">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">حال‌وهوای اینجا</p>
              <h2>سری هم به کافه بزنید</h2>
            </div>
            <p className="section-desc">
              کارگاه رست و کافه در یک ساختمان‌اند؛ بوی رست را از در ورودی می‌شنوید.
            </p>
          </div>

          <div className="gallery">
            {SHOTS.map((s) => (
              <figure
                className={`shot ${s.wide ? 'shot-wide' : ''}`.trim()}
                key={s.img + s.cap}
                onClick={() => setShot(s)}
              >
                <img src={`/img/${s.img}`} alt={s.alt} loading="lazy" />
                <figcaption>{s.cap}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {shot ? (
        <div
          className="lightbox is-open"
          onClick={() => setShot(null)}
          onKeyDown={onKey}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <figure>
            <img src={`/img/${shot.img}`} alt={shot.alt} />
            <figcaption>{shot.cap}</figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}

export function Footer() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({ text: '', error: false });

  const subscribe = () => {
    const val = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
      setMsg({ text: 'ایمیل را کامل وارد کنید، مثل name@mail.com', error: true });
      return;
    }
    setMsg({ text: 'عضو شدید. پنجشنبه فهرست تازه‌ها را می‌فرستیم.', error: false });
    setEmail('');
  };

  return (
    <footer className="footer" id="contact">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <span className="logo-text">
            <b>رُست‌خانهٔ دانه</b>
            <em>از سال ۱۳۹۶</em>
          </span>
          <p>کارگاه رست و فروشگاه: تهران، خیابان کریم‌خان، کوچهٔ نیلوفر، پلاک ۱۲</p>
          <p>شنبه تا چهارشنبه ۱۰ تا ۲۰ · پنجشنبه ۱۰ تا ۱۶</p>
        </div>

        <div className="footer-col">
          <h4>تماس</h4>
          <p>
            <a href="tel:+982188000000">۰۲۱-۸۸۰۰۰۰۰۰</a>
          </p>
          <p>
            <a href="mailto:hello@daneh.coffee">hello@daneh.coffee</a>
          </p>
          {/* تنها راهی که مشتری بعد از بستن رسید سفارشش
              را پیدا می‌کند، پس در فوتر هر صفحه هست. */}
          <p>
            <Link href="/track">پیگیری سفارش</Link>
          </p>
        </div>

        <div className="footer-col newsletter">
          <h4>خبر رست هفتگی</h4>
          <p>هر پنجشنبه فهرست دانه‌های تازه‌رست را می‌فرستیم.</p>
          <div className="nl-row">
            <input
              type="email"
              className="input"
              placeholder="ایمیل شما"
              aria-label="ایمیل برای خبرنامه"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && subscribe()}
            />
            <button className="btn btn-primary" onClick={subscribe}>
              عضو می‌شوم
            </button>
          </div>
          <p className="nl-msg" role="status" style={msg.error ? { color: '#B23A2B' } : undefined}>
            {msg.text}
          </p>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© ۱۴۰۵ رُست‌خانهٔ دانه</span>
        <span>ساخته‌شده برای دوستداران قهوهٔ تازه</span>
      </div>
    </footer>
  );
}
