'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShop } from '../context/ShopContext.jsx';

const LINKS = [
  ['#products', 'قهوه‌ها'],
  ['#blends', 'میکس‌ها'],
  ['#suggest', 'پیشنهاد طعم'],
  ['#bestsellers', 'پرفروش‌ها'],
  ['#gear', 'ابزار'],
  ['#powders', 'پودرها'],
  ['#bulk', 'خرید کیلویی'],
  ['#club', 'باشگاه'],
  ['#about', 'دربارهٔ ما'],
  ['#contact', 'تماس']
];

export default function Header({ onOpenCart }) {
  const { cartSummary } = useShop();
  const [navOpen, setNavOpen] = useState(false);

  /* ── لنگرها بیرون از صفحهٔ اصلی ──
     همهٔ این لینک‌ها به بخش‌های صفحهٔ اصلی اشاره می‌کنند.
     روی خود صفحهٔ اصلی، لنگر ساده درست‌ترین کار است:
     مرورگر خودش نرم اسکرول می‌کند و تاریخچه شلوغ نمی‌شود.
     ولی روی صفحهٔ اختصاصی کالا (مورد ۲۷) لنگرِ تنها روی
     همان صفحه می‌ماند و هیچ اتفاقی نمی‌افتد — پس آنجا
     باید اول به صفحهٔ اصلی رفت. Home خودش بعد از آمدن
     داده‌ها به لنگر می‌پرد. */
  const onHome = usePathname() === '/';

  return (
    <header className="site-header" id="top">
      <div className="wrap header-inner">
        <a className="logo" href={onHome ? '#top' : '/'}>
          <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
            <path
              d="M20 6c6 0 9 4 9 9s-4 6-4 10a5 5 0 0 1-10 0c0-4-4-5-4-10s3-9 9-9Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M20 8v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 33h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="logo-text">
            رُست‌خانهٔ دانه<em>قهوهٔ تخصصی</em>
          </span>
        </a>

        <nav className={`nav ${navOpen ? 'is-open' : ''}`.trim()} id="nav" aria-label="منوی اصلی">
          {LINKS.map(([href, label]) =>
            onHome ? (
              <a key={href} href={href} onClick={() => setNavOpen(false)}>
                {label}
              </a>
            ) : (
              <Link key={href} href={`/${href}`} onClick={() => setNavOpen(false)}>
                {label}
              </Link>
            )
          )}
        </nav>

        <div className="header-actions">
          {/* ── پیگیری سفارش، کنارِ سبد ──
              تا پیش از این فقط فوتر و خودِ رسید به اینجا
              راه داشتند؛ مشتریِ برگشته باید تا ته صفحه
              اسکرول می‌کرد تا سفارشش را پیدا کند. حالا
              همان‌جایی است که چشم دنبال کارِ حساب می‌گردد.
              لینکِ فوتر سر جایش ماند: کسی که به ته صفحه
              رسیده هم نباید برگردد بالا. */}
          {/* aria-label لازم است چون در موبایل برچسبِ متنی
              display:none می‌شود و از درختِ دسترس‌پذیری هم
              بیرون می‌رود — آن‌وقت لینک بی‌نام می‌ماند. */}
          <Link className="btn-track" href="/track" aria-label="پیگیری سفارش">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
              <path
                d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M4 7.5 12 11l8-3.5M12 11v9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            <span>پیگیری سفارش</span>
          </Link>

          <button className="btn-cart" onClick={onOpenCart} aria-haspopup="dialog">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
              <path
                d="M4 6h16l-1.5 11.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5L4 6Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M9 9V6a3 3 0 0 1 6 0v3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
            <span>سبد</span>
            <b>{cartSummary(true)}</b>
          </button>

          <button
            className="btn-burger"
            aria-label="باز و بسته کردن منو"
            aria-expanded={navOpen}
            aria-controls="nav"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}
