'use client';

import { useEffect, useState } from 'react';
import { useShop } from '../context/ShopContext.jsx';
import SiteHeader from './SiteHeader.jsx';
import Hero from './Hero.jsx';
import CatalogSection from './CatalogSection.jsx';
import BlendsSection from './BlendsSection.jsx';
import {
  Strip,
  BrewSection,
  StorySection,
  BulkSection,
  GuideSection,
  CafeSection,
  Footer
} from './StaticSections.jsx';
import {
  WhyUsSection,
  SuggestSection,
  PicksSections,
  ClubSection,
  AboutSection
} from './ContentSections.jsx';

/* ══════════════════════════════════════════════════
   بدنهٔ صفحهٔ اصلی.

   ── چرا این فایل هست و چرا 'use client' دارد ──
   در نسخهٔ ویت این همان pages/Home.jsx بود. اینجا به دو
   نیم تقسیم شده:

   • app/page.jsx (سروری) — داده را می‌خواند، تگ‌های
     <head> و JSON-LD را می‌سازد.
   • این فایل (مشتری) — چیدمان و حالت‌های تعاملی.

   دلیلش یک قید واقعی است، نه سلیقه: فیلترهای دسته
   (coffeeFilter و همتاهایش) بالای چند بخش زندگی می‌کنند،
   چون کارت‌های «روش دم‌آوری» و «راهنمای رست» هم عوضشان
   می‌کنند. هر کامپوننتی که چنین حالتی داشته باشد باید
   مشتری باشد، و همه‌چیزِ درونش هم مشتری می‌شود.

   ── این به معنای «سمت مشتری رندر شدن» نیست ──
   کامپوننت مشتری هم روی سرور رندر می‌شود؛ متن همهٔ این
   بخش‌ها داخل خودِ HTML می‌آید. تفاوت فقط این است که
   جاوااسکریپتشان هم برای مرورگر فرستاده می‌شود — همان
   چیزی که در نسخهٔ ویت هم بود. پس نسبت به امروز چیزی از
   دست نرفته و متنِ صفحه، برخلاف امروز، در پاسخ اول هست.

   ── سبد ──
   دکمهٔ سبد و کشویش در SiteHeader اند، نه اینجا؛ پس هر
   صفحه‌ای که هدر دارد سبد هم دارد.
   ══════════════════════════════════════════════════ */

export default function HomeShell() {
  const { loading, loadError, reload } = useShop();
  /* فیلترها اینجا نگه داشته می‌شوند چون کارت‌های «روش دم‌آوری»
     و «راهنمای رست» هم آن‌ها را عوض می‌کنند. */
  const [coffeeFilter, setCoffeeFilter] = useState('all');
  const [gearFilter, setGearFilter] = useState('all');
  const [powderFilter, setPowderFilter] = useState('all');

  /* اگر آدرس با لنگر باز شده باشد (مثل /#cafe)، مرورگر همان اول
     صفحه را جابه‌جا می‌کند. در نسخهٔ ویت آن لحظه هنوز فهرست
     کالاها نیامده بود و بخش‌ها کوتاه‌تر بودند، پس جای اشتباهی
     می‌ایستاد و بعد از آمدن داده‌ها یک بار دیگر باید می‌رفت.

     حالا داده از همان اول در HTML است و بخش‌ها ارتفاع نهایی
     خودشان را دارند — ولی تصویرها ممکن است هنوز نرسیده باشند،
     پس همان یک فریم صبر سر جایش می‌ماند. */
  useEffect(() => {
    if (loading || loadError) return;

    const id = window.location.hash.slice(1);
    if (!id) return;

    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'auto' });
    }, 60);

    return () => clearTimeout(t);
  }, [loading, loadError]);

  return (
    <>
      <a className="skip-link" href="#products">
        رفتن به فهرست قهوه‌ها
      </a>

      <SiteHeader />

      <main>
        <Hero />
        <Strip />

        {/* چرا از ما بخرید — متنش فقط به محتوا وابسته است،
            پس منتظر آمدن فهرست کالاها نمی‌ماند. */}
        <WhyUsSection />

        {loadError ? (
          <section className="section">
            <div className="wrap">
              <div className="load-error" role="alert">
                <h2>فهرست کالاها خوانده نشد</h2>
                <p>{loadError}</p>
                <button className="btn btn-primary" onClick={reload}>
                  تلاش دوباره
                </button>
              </div>
            </div>
          </section>
        ) : loading ? (
          <section className="section">
            <div className="wrap">
              <p className="loading-note">در حال خواندن فهرست از پایگاه داده…</p>
            </div>
          </section>
        ) : (
          <>
            {/* پیشنهاد روز و پرفروش‌ها، پیش از فهرست بلند */}
            <PicksSections />

            <CatalogSection
              kind="coffee"
              id="products"
              className="section"
              eyebrow="فهرست این هفته"
              title="میز قهوه‌ها"
              desc="قیمت‌ها بر پایهٔ کیلو محاسبه می‌شود. وزن هر قهوه را جدا انتخاب کنید."
              searchPlaceholder="جست‌وجو: کنیا، کارامل، هانی…"
              emptyText="با این فیلتر قهوه‌ای پیدا نشد. فیلتر «همه» را بزنید یا جست‌وجو را پاک کنید."
              countWord="قهوه"
              filter={coffeeFilter}
              setFilter={setCoffeeFilter}
            />

            {/* بعد از دیدن فهرست: کمک به انتخاب، و بعد میکس‌ها */}
            <SuggestSection />

            <BlendsSection />

            <BrewSection setCoffeeFilter={setCoffeeFilter} setGearFilter={setGearFilter} />

            <CatalogSection
              kind="gear"
              id="gear"
              className="section"
              eyebrow="قفسهٔ ابزار"
              title="ابزار دم‌آوری"
              desc="از فنجان اسپرسو تا آسیاب و اسپرسوساز. قیمت این‌ها به ازای هر عدد است و تخفیف پلکانی فقط روی کالاهای وزنی (قهوه و پودر) اعمال می‌شود."
              searchPlaceholder="جست‌وجو: تمپر، گردن‌غازی، ماگ…"
              emptyText="با این فیلتر ابزاری پیدا نشد. فیلتر «همه» را بزنید یا جست‌وجو را پاک کنید."
              countWord="ابزار"
              filter={gearFilter}
              setFilter={setGearFilter}
            />

            <CatalogSection
              kind="powder"
              id="powders"
              className="section soft"
              eyebrow="غیر از قهوه"
              title="میز پودرها"
              desc="شکلات داغ، ماچا، ماسالا و ادویه — این‌ها هم مثل قهوه به گرم فروخته می‌شوند و در تخفیف وزنی سبد حساب می‌شوند. از ۵۰ گرم برای امتحان کردن."
              searchPlaceholder="جست‌وجو: ماچا، دارچین، کارامل…"
              emptyText="با این فیلتر پودری پیدا نشد. فیلتر «همه» را بزنید یا جست‌وجو را پاک کنید."
              countWord="پودر"
              filter={powderFilter}
              setFilter={setPowderFilter}
            />
          </>
        )}

        <StorySection />
        <BulkSection />
        <GuideSection setCoffeeFilter={setCoffeeFilter} />
        <ClubSection />
        <AboutSection />
        <CafeSection />
        <Footer />
      </main>
    </>
  );
}
