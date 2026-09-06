/* ══════════════════════════════════════════════════
   شکل هر بخش از محتوای سایت.

   پنل مدیریت از روی همین توصیف، فرم را می‌سازد — پس
   برای اضافه کردن یک فیلد تازه فقط همین‌جا و فایل
   server/src/data/default-content.js عوض می‌شوند.

   نوع فیلدها:
     text     یک خط
     textarea چند خط
     check    بله / خیر
     select   انتخاب از فهرست
     lines    فهرست متن‌های کوتاه (هر خط یک مورد)
     list     فهرست موردهایی که خودشان چند فیلد دارند
   ══════════════════════════════════════════════════ */

/* نمادهای موجود در بخش «چرا از ما بخرید» — همان‌هایی که
   در components/ContentSections.jsx کشیده می‌شوند. */
export const ICON_OPTIONS = [
  ['calendar', 'تقویم'],
  ['scale', 'ترازو'],
  ['grinder', 'آسیاب'],
  ['cup', 'فنجان'],
  ['leaf', 'برگ'],
  ['chat', 'گفت‌وگو'],
  ['bean', 'دانهٔ قهوه'],
  ['truck', 'ارسال']
];

export const CONTENT_SCHEMA = [
  {
    key: 'whyUs',
    label: 'چرا از ما بخرید',
    note: 'بخش متقاعدکنندهٔ بالای صفحه، درست بعد از تصویر اصلی.',
    fields: [
      { key: 'eyebrow', label: 'تیتر کوچک بالای عنوان', type: 'text' },
      { key: 'title', label: 'عنوان', type: 'text' },
      { key: 'lead', label: 'متن معرفی', type: 'textarea' },
      {
        key: 'reasons',
        label: 'دلیل‌ها',
        type: 'list',
        itemLabel: 'دلیل',
        item: [
          { key: 'icon', label: 'نماد', type: 'select', options: ICON_OPTIONS },
          { key: 'title', label: 'عنوان', type: 'text' },
          { key: 'text', label: 'متن', type: 'textarea' }
        ]
      },
      { key: 'ctaText', label: 'متن دکمه', type: 'text' },
      { key: 'ctaHref', label: 'مقصد دکمه', type: 'text', hint: 'مثلاً ‎#products' }
    ]
  },

  {
    key: 'suggest',
    label: 'چه طعمی دوست دارید؟',
    note: 'پیشنهاد قهوه بر اساس سلیقهٔ مشتری. «شناسه» باید یکی از کلیدهای طعمی باشد تا با برچسب قهوه‌ها جور دربیاید.',
    fields: [
      { key: 'eyebrow', label: 'تیتر کوچک', type: 'text' },
      { key: 'title', label: 'عنوان', type: 'text' },
      { key: 'lead', label: 'متن معرفی', type: 'textarea' },
      {
        key: 'profiles',
        label: 'پروفایل‌های طعمی',
        type: 'list',
        itemLabel: 'پروفایل',
        item: [
          {
            key: 'key',
            label: 'شناسهٔ طعم',
            type: 'select',
            options: [
              ['sweet', 'شیرین'],
              ['fruity', 'میوه‌ای'],
              ['chocolate', 'شکلاتی'],
              ['nutty', 'آجیلی'],
              ['floral', 'عطری'],
              ['spicy', 'ادویه‌ای'],
              ['bold', 'پرقدرت'],
              ['smooth', 'ملایم']
            ]
          },
          { key: 'label', label: 'نامی که مشتری می‌بیند', type: 'text' },
          { key: 'hint', label: 'توضیح کوتاه زیر نام', type: 'text' },
          { key: 'advice', label: 'پیشنهاد ما', type: 'textarea' },
          {
            key: 'picks',
            label: 'شناسهٔ قهوه‌های پیشنهادی',
            type: 'lines',
            hint: 'هر خط یک شناسهٔ انگلیسی، مثل yirgacheffe. اگر خالی بگذارید یا کمتر از سه تا باشد، بقیه خودکار از روی برچسب طعمی قهوه‌ها پر می‌شود.'
          }
        ]
      }
    ]
  },

  {
    key: 'picks',
    label: 'پیشنهاد روز و پرفروش‌ها',
    note: 'کدام قهوه‌ها اینجا بیایند در فرم خود کالا تعیین می‌شود (بخش «ویترین»). اینجا فقط متن‌هاست.',
    fields: [
      { key: 'eyebrow', label: 'تیتر کوچک', type: 'text' },
      { key: 'title', label: 'عنوان بخش', type: 'text' },
      { key: 'lead', label: 'متن معرفی', type: 'textarea' },
      { key: 'featuredTitle', label: 'عنوان «پیشنهاد ما»', type: 'text' },
      { key: 'featuredNote', label: 'زیرنویس «پیشنهاد ما»', type: 'text' },
      { key: 'topTitle', label: 'عنوان «پرفروش‌ها»', type: 'text' },
      { key: 'topNote', label: 'زیرنویس «پرفروش‌ها»', type: 'text' },
      { key: 'emptyTop', label: 'متن وقتی هنوز سفارشی ثبت نشده', type: 'textarea' }
    ]
  },

  {
    key: 'blends',
    label: 'میکس‌های ویژه',
    note: 'خودِ میکس‌ها در بخش کالاها ساخته می‌شوند؛ کافی است در فرم قهوه، «میکس ویژهٔ خانه» را روشن کنید.',
    fields: [
      { key: 'eyebrow', label: 'تیتر کوچک', type: 'text' },
      { key: 'title', label: 'عنوان', type: 'text' },
      { key: 'lead', label: 'متن معرفی', type: 'textarea' },
      { key: 'customNote', label: 'راهنمای بالای اهرم‌ها', type: 'text' }
    ]
  },

  {
    key: 'club',
    label: 'باشگاه مشتریان',
    note: 'اعضای ثبت‌شده را در صفحهٔ «باشگاه» می‌بینید.',
    fields: [
      { key: 'eyebrow', label: 'تیتر کوچک', type: 'text' },
      { key: 'title', label: 'عنوان', type: 'text' },
      { key: 'lead', label: 'متن معرفی', type: 'textarea' },
      { key: 'benefits', label: 'مزیت‌های عضویت — هر خط یک مورد', type: 'lines' },
      { key: 'successTitle', label: 'عنوان پیام خوشامد', type: 'text' },
      { key: 'successText', label: 'متن پیام خوشامد', type: 'textarea' },
      { key: 'askEmail', label: 'ایمیل هم پرسیده شود (اختیاری برای مشتری)', type: 'check' },
      { key: 'askTaste', label: 'سلیقهٔ طعمی هم پرسیده شود', type: 'check' }
    ]
  },

  {
    key: 'about',
    label: 'دربارهٔ ما',
    fields: [
      { key: 'eyebrow', label: 'تیتر کوچک', type: 'text' },
      { key: 'title', label: 'عنوان', type: 'text' },
      { key: 'lead', label: 'متن معرفی', type: 'textarea' },
      { key: 'image', label: 'آدرس تصویر', type: 'text', hint: 'مثلاً ‎/img/roastery.svg' },
      { key: 'imageCaption', label: 'زیرنویس تصویر', type: 'text' },
      {
        key: 'facts',
        label: 'عددهای کوتاه',
        type: 'list',
        itemLabel: 'عدد',
        item: [
          { key: 'value', label: 'مقدار', type: 'text' },
          { key: 'label', label: 'برچسب', type: 'text' }
        ]
      },
      {
        key: 'sections',
        label: 'بخش‌های متنی',
        type: 'list',
        itemLabel: 'بخش',
        item: [
          { key: 'title', label: 'عنوان', type: 'text' },
          { key: 'text', label: 'متن', type: 'textarea' }
        ]
      },
      { key: 'addressTitle', label: 'عنوان بخش نشانی', type: 'text' },
      { key: 'address', label: 'نشانی', type: 'text' },
      { key: 'hours', label: 'ساعت کار', type: 'text' },
      { key: 'phone', label: 'تلفن', type: 'text' },
      { key: 'email', label: 'ایمیل', type: 'text' }
    ]
  },

  {
    key: 'grinds',
    label: 'گزینه‌های آسیاب',
    note: 'همین فهرست هم روی کارت هر قهوه دیده می‌شود، هم داخل سبد. «شناسه» را بعد از ثبت سفارش‌ها عوض نکنید.',
    fields: [
      {
        key: 'options',
        label: 'گزینه‌ها',
        type: 'list',
        itemLabel: 'گزینه',
        item: [
          { key: 'value', label: 'شناسهٔ انگلیسی', type: 'text', hint: 'مثلاً espresso' },
          { key: 'label', label: 'نامی که مشتری می‌بیند', type: 'text' },
          { key: 'desc', label: 'توضیح کوتاه', type: 'text' }
        ]
      }
    ]
  }
];
