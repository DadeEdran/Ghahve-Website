import { SITE_NAME } from '@ghahve/shared/seo.js';
import { AuthProvider } from '../../context/AuthContext.jsx';

/* ══════════════════════════════════════════════════
   ریشهٔ پنل مدیریت.

   دو کار می‌کند و هر دو باید اینجا باشند:

   • نشست مدیر را در دسترس همهٔ زیرمسیرها می‌گذارد —
     **از جمله صفحهٔ ورود**، که خودش پشت دروازه نیست ولی
     برای فهمیدنِ «آیا از قبل وارد شده‌ام؟» به همان
     کانتکست نیاز دارد.
   • تگ‌های <head> پنل را می‌نویسد.

   خودش کامپوننت سروری است (وگرنه metadata نمی‌شد صادر
   کرد) و AuthProvider را که مشتری است رندر می‌کند.

   دروازهٔ ورود یک لایه پایین‌تر است: (panel)/layout.jsx.
   این تقسیم عیناً همان چیزی است که در نسخهٔ ویت بود —
   /admin/login بیرون از AdminLayout می‌نشست.
   ══════════════════════════════════════════════════ */

export const metadata = {
  title: `پنل مدیریت — ${SITE_NAME}`,
  /* robots.txt هم /admin را بسته، ولی آن فقط خزیدن را
     منع می‌کند نه ایندکس شدنِ آدرسی که از جای دیگری پیدا
     شده باشد. این تگ صریح‌تر است. */
  robots: { index: false, follow: false }
};

export default function AdminRootLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
