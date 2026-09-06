import ItemModalRoute from '../../../_item/itemModalRoute.jsx';

/* رهگیریِ /coffee/:slug — کلیک از داخل سایت به‌جای صفحهٔ
   کامل، مودال را روی همان صفحه باز می‌کند. پیاده‌سازی
   مشترک در app/_item/ است. */

export default function Page(props) {
  return <ItemModalRoute segment="coffee" {...props} />;
}
