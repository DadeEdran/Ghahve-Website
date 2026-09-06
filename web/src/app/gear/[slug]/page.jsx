import ItemRoute, { itemMetadata } from '../../_item/itemRoute.jsx';

/* مسیر /gear/:slug — پیاده‌سازی مشترک در app/_item/ است.
   این فایل فقط می‌گوید کدام بخشِ آدرس. */

const SEGMENT = 'gear';

export const generateMetadata = (props) => itemMetadata(SEGMENT, props);

export default function Page(props) {
  return <ItemRoute segment={SEGMENT} {...props} />;
}
