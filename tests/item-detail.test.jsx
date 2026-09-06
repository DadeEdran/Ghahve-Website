// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { getToast, toast } from '../web/src/lib/toastStore.js';

/* ══════════════════════════════════════════════════
   مودالِ کالا — و اینکه دکمهٔ هم‌رسانی‌اش **بدون
   Provider** کار می‌کند.

   ── چرا این فایل هست، برخلاف عادتِ پروژه ──
   قاعدهٔ ۹ می‌گوید تست‌ها روی توابع خالص‌اند و تست
   کامپوننتی استثناست. این سومین استثناست و دقیقاً به
   همان دلیل دو تای قبلی: چیزی را نگه می‌دارد که هیچ
   تابع خالصی نمی‌تواند.

   این پنجره در شکافِ @modal رندر می‌شود، یعنی **بیرون**
   از ShopProvider صفحه (دلیلش پای app/_item/ItemModal.jsx
   نوشته شده). اگر روزی ShareButton دوباره سراغ
   useShop برود، همه‌چیز در صفحهٔ اصلی و صفحهٔ کالا سبز
   می‌ماند و فقط **مودال** — یعنی راهی که بیشترِ
   بازدیدکننده‌ها کالا را از آن می‌بینند — موقع باز شدن
   می‌ترکد. هیچ تست دیگری آن را نمی‌گیرد.

   پس دامنهٔ این فایل همین یک چیز است: مودال باید بدون
   هیچ Provider ای رندر شود و دکمهٔ هم‌رسانی‌اش کار کند.
   ══════════════════════════════════════════════════ */

const { default: ItemDetail } = await import('../web/src/components/ItemDetail.jsx');

const ITEM = {
  kind: 'coffee',
  slug: 'yirgacheffe',
  name: 'یرگاچف',
  origin: 'اتیوپی',
  spec: 'فرآوری شسته',
  group: 'light',
  meter: 2,
  price: 1850000,
  notes: [],
  pairs: [],
  tastes: [],
  story: 'از گدئو می‌آید.'
};

let host;
let root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  toast('');
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

/* هیچ Provider ای اینجا نیست — همان شرایط شکافِ @modal. */
function open(item = ITEM) {
  act(() => {
    root.render(
      <StrictMode>
        <ItemDetail item={item} onClose={() => {}} beanName={(s) => s} grindLabel={() => ''} />
      </StrictMode>
    );
  });
  return host;
}

describe('ItemDetail — دکمهٔ هم‌رسانی داخل مودال', () => {
  it('بدون ShopProvider رندر می‌شود و نمی‌ترکد', () => {
    const el = open();
    expect(el.querySelector('.sheet')).not.toBeNull();
    expect(el.querySelector('#sheetTitle').textContent).toBe(ITEM.name);
  });

  it('دکمهٔ هم‌رسانی هست، دکمهٔ واقعی است و نام کالا را در برچسبش دارد', () => {
    const btn = open().querySelector('.share-btn');

    expect(btn).not.toBeNull();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.getAttribute('aria-label')).toContain(ITEM.name);
  });

  it('کنار دکمهٔ بستن می‌نشیند و جایش را نمی‌گیرد', () => {
    const el = open();
    const actions = el.querySelector('.sheet-actions');

    expect(actions.querySelector('.share-btn')).not.toBeNull();
    expect(actions.querySelector('.btn-close')).not.toBeNull();
    expect(el.querySelector('.btn-close').getAttribute('aria-label')).toBe('بستن');
  });

  it('کلیکش مودال را نمی‌بندد و به پس‌زمینه نمی‌رسد', () => {
    /* پس‌زمینهٔ مودال onClick={onClose} دارد؛ اگر کلیکِ
       دکمه بالا برود، پنجره همان لحظه بسته می‌شود. */
    let closed = 0;
    act(() => {
      root.render(
        <StrictMode>
          <ItemDetail
            item={ITEM}
            onClose={() => (closed += 1)}
            beanName={(s) => s}
            grindLabel={() => ''}
          />
        </StrictMode>
      );
    });

    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      host.querySelector('.share-btn').dispatchEvent(ev);
    });

    expect(closed).toBe(0);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('توستِ سراسری از بیرونِ هر Provider ای هم پیام می‌گیرد', () => {
    /* همان مسیری که ShareButton بعد از کپی می‌رود */
    open();
    act(() => toast('لینک این کالا کپی شد'));
    expect(getToast()).toBe('لینک این کالا کپی شد');
  });
});
