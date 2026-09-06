import ItemRoute, { itemMetadata } from '../../_item/itemRoute.jsx';

/* مسیر /coffee/:slug — پیاده‌سازی مشترک در app/_item/ است.
   این فایل فقط می‌گوید کدام بخشِ آدرس. */

const SEGMENT = 'coffee';

export const generateMetadata = (props) => itemMetadata(SEGMENT, props);

export default function Page(props) {
  return <ItemRoute segment={SEGMENT} {...props} />;
}
