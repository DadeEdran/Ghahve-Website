/* ══════════════════════════════════════════════════
   لایهٔ ارتباط با سرور.
   توکن مدیر در localStorage نگه داشته می‌شود و اگر سرور
   بگوید نشست منقضی شده، خودکار پاک می‌شود.
   ══════════════════════════════════════════════════ */

const TOKEN_KEY = 'ghahve.admin.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/* وقتی توکن باطل می‌شود، لایهٔ بالاتر باید کاربر را به
   صفحهٔ ورود ببرد. این قلاب همان اطلاع‌رسانی است. */
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(url, { method = 'GET', body, auth = false, raw = false } = {}) {
  const headers = {};
  if (!raw && body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body)
    });
  } catch {
    /* سرور خاموش است یا شبکه قطع است */
    throw new Error('ارتباط با سرور برقرار نشد. مطمئن شوید سرور روشن است.');
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearToken();
      onUnauthorized();
    }
    throw new Error(data?.error || `خطای سرور (${res.status})`);
  }

  return data;
}

export const api = {
  /* ── فروشگاه ── */
  items: () => request('/api/items'),
  placeOrder: (payload) => request('/api/orders', { method: 'POST', body: payload }),

  /* پیگیری سفارش — عمومی است، ولی جفت کد و شماره باید
     با هم جور باشند وگرنه سرور چیزی نمی‌دهد. */
  trackOrder: (code, phone) =>
    request(
      `/api/orders/track?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`
    ),

  /* متن‌های سایت — عمومی، چون خود فروشگاه هم می‌خواندشان */
  content: () => request('/api/content'),

  /* ویترین */
  topSellers: (limit = 8) => request(`/api/stats/top-sellers?limit=${limit}`),
  featured: (limit = 8) => request(`/api/stats/featured?limit=${limit}`),

  /* ── باشگاه مشتریان ── */
  joinClub: (payload) => request('/api/club', { method: 'POST', body: payload }),

  /* ── ورود و رمز ── */
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/api/auth/me', { auth: true }),
  changePassword: (payload) =>
    request('/api/auth/change-password', { method: 'POST', body: payload, auth: true }),

  /* ── مدیریت کالاها ── */
  adminItems: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return request(`/api/items/admin/all${qs ? '?' + qs : ''}`, { auth: true });
  },
  adminItem: (id) => request(`/api/items/admin/${id}`, { auth: true }),
  createItem: (body) => request('/api/items', { method: 'POST', body, auth: true }),
  updateItem: (id, body) => request(`/api/items/${id}`, { method: 'PUT', body, auth: true }),
  toggleItem: (id) => request(`/api/items/${id}/active`, { method: 'PATCH', auth: true }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE', auth: true }),

  uploadImage: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return request('/api/items/upload', { method: 'POST', body: fd, auth: true, raw: true });
  },

  /* ── مدیریت سفارش‌ها ── */
  orders: (status) =>
    request(`/api/orders${status && status !== 'all' ? '?status=' + status : ''}`, { auth: true }),
  setOrderStatus: (id, status) =>
    request(`/api/orders/${id}/status`, { method: 'PATCH', body: { status }, auth: true }),
  deleteOrder: (id) => request(`/api/orders/${id}`, { method: 'DELETE', auth: true }),

  /* ── مدیریت متن‌های سایت ── */
  saveContent: (key, data) =>
    request(`/api/content/${key}`, { method: 'PUT', body: { data }, auth: true }),
  resetContent: (key) => request(`/api/content/${key}/reset`, { method: 'POST', auth: true }),

  /* ── مدیریت باشگاه ── */
  clubMembers: (q = '') =>
    request(`/api/club${q ? '?q=' + encodeURIComponent(q) : ''}`, { auth: true }),
  deleteClubMember: (id) => request(`/api/club/${id}`, { method: 'DELETE', auth: true }),

  /* خروجی CSV با هدر ورود — نمی‌شود با لینک ساده گرفتش،
     پس فایل را می‌گیریم و در مرورگر ذخیره می‌کنیم. */
  clubCsv: () => download('/api/club/export.csv', 'club-members.csv'),

  /* ── گزارش‌ها ── */
  reportSummary: (period, count) =>
    request(`/api/reports/summary?period=${period}${count ? '&count=' + count : ''}`, {
      auth: true
    }),

  reportOrders: (params = {}) => request(`/api/reports/orders${qs(params)}`, { auth: true }),

  order: (id) => request(`/api/orders/${id}`, { auth: true }),

  reportCsv: (params = {}) => download(`/api/reports/export.csv${qs(params)}`),
  reportJson: (params = {}) => download(`/api/reports/export.json${qs(params)}`)
};

/* پارامترهای خالی را نمی‌فرستیم تا آدرس تمیز بماند */
function qs(params) {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null && v !== 'all')
  ).toString();
  return s ? '?' + s : '';
}

/* فایل را با هدر ورود می‌گیریم و در مرورگر ذخیره می‌کنیم.
   اگر سرور نام فایل داده باشد، همان را می‌گذاریم. */
async function download(url, fallbackName) {
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  } catch {
    throw new Error('ارتباط با سرور برقرار نشد. مطمئن شوید سرور روشن است.');
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      onUnauthorized();
    }
    let msg = 'فایل خروجی ساخته نشد';
    try {
      const data = JSON.parse(await res.text());
      if (data?.error) msg = data.error;
    } catch {
      /* پاسخ متنی نبود */
    }
    throw new Error(msg);
  }

  const disp = res.headers.get('Content-Disposition') || '';
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disp);
  const plain = /filename="([^"]+)"/i.exec(disp);
  const name = star ? decodeURIComponent(star[1]) : plain?.[1] || fallbackName || 'export';

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
