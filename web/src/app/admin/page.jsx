import { redirect } from 'next/navigation';

/* /admin خودش صفحه‌ای ندارد؛ همان کاری را می‌کند که
   <Route index element={<Navigate to="/admin/items" />} />
   در نسخهٔ ویت می‌کرد. */

export default function AdminIndex() {
  redirect('/admin/items');
}
