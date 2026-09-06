import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

/* ══════════════════════════════════════════════════
   یک پیکربندی در ریشه برای هر سه workspace.

   دلیلش این است که shared را هر دو طرف import می‌کنند و
   قاعده‌های سبک باید همه‌جا یکی باشد. تفاوت‌ها فقط در
   محیط اجراست: سرور globals نود دارد، و web هر دو را —
   چون یک فایلش روی سرور رندر می‌شود و فایل بغلی‌اش در
   مرورگر.

   eslint-config-prettier آخر می‌آید تا قاعده‌های
   ظاهری را خاموش کند — قالب‌بندی کار prettier است،
   نه eslint.
   ══════════════════════════════════════════════════ */

export default [
  {
    ignores: [
      '**/node_modules/**',
      'web/.next/**',
      'server/uploads/**',
      /* نسخهٔ ایستای اولیه (مورد ۱۸ سند ضعف‌ها) اجرا نمی‌شود
         و قرار است روزی به شاخهٔ legacy برود. تا آن روز از
         دید linter بیرون است تا هشدارهایش دیدِ کد زنده را
         کور نکند. */
      'script.js',
      'index.html',
      'style.css',
      'img/**'
    ]
  },

  js.configs.recommended,

  /* ── سرور: نود، ESM ── */
  {
    files: ['server/src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      /* پارامترهای بی‌استفاده در امضای میان‌افزار express
         اجباری‌اند (مثل _next در مبدل خطا) — قرارداد پروژه
         این است که با زیرخط شروع شوند. */
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none'
        }
      ]
    }
  },

  /* ── وب (Next): هم سرور، هم مرورگر ──
     یک فایل ممکن است روی سرور رندر شود و فایل بغلی‌اش در
     مرورگر. پس globals هر دو لازم است؛ مرزِ واقعی را
     'use client' و خودِ Next نگه می‌دارد، نه linter. */
  {
    files: ['web/src/**/*.{js,jsx}', 'web/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    settings: { react: { version: '19.2' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,

      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none'
        }
      ],

      /* پروژه TypeScript ندارد و prop-types هم ندارد —
         شکل داده در schema مونگوس و در کامنت‌ها است.
         (مورد ۱۵ سند ضعف‌ها، برای روزی که JSDoc بیاید.) */
      'react/prop-types': 'off',

      /* این قاعده الگوی «با mount داده را بگیر و در state
         بگذار» را خطا می‌داند. با آمدن رندر سمت سرور، داده
         دیگر این‌طور نمی‌آید — ولی چند جا هنوز لازم است و
         درست است: خواندن سبد از localStorage، و فهرست
         کالاها در پنل مدیریت که صفحه‌اش سروری نیست. هر
         دو در جای خودشان توضیح داده شده‌اند.

         پس هشدار می‌ماند تا موردِ تازه دیده شود، ولی جلوی
         CI را نمی‌گیرد. */
      'react-hooks/set-state-in-effect': 'warn'
    }
  },

  /* ── ابزارهای ساخت و تست ──
     تست‌ها روی نود اجرا می‌شوند، ولی دو تای‌شان محیط خود را
     به jsdom عوض می‌کنند و کامپوننت رندر می‌کنند: پس هم
     globals مرورگر لازم دارند و هم JSX. پیش از این، پسوند
     .jsx اصلاً در این فهرست نبود و آن دو فایل بی‌بررسی
     می‌ماندند. */
  {
    files: ['tests/**/*.{js,jsx}', '*.config.{js,mjs}', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    settings: { react: { version: '19.2' } },
    plugins: { react },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      'react/prop-types': 'off'
    }
  },

  /* ── ساخت مستندات: کدی که داخل مرورگر اجرا می‌شود ──
     صفحه‌بندِ سند در همان صفحه‌ای اجرا می‌شود که رندر می‌کنیم، و تکه‌های
     page.evaluate هم در مرورگرند؛ پس هر دو globals مرورگر لازم دارند.
     paginator.js اسکریپت خام مرورگر است (با readFileSync خوانده و درون
     HTML تزریق می‌شود)، نه ماژول نود — برای همین .js مانده و ESM نیست. */
  {
    files: ['scripts/docs/paginator.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: globals.browser
    }
  },
  {
    /* og-image.mjs هم page.evaluate دارد (منتظر آماده شدن فونت) */
    files: ['scripts/docs/{render,check-svg,zoom}.mjs', 'scripts/og-image.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  },

  prettier
];
