import { Router } from 'express';
import { ClubMember } from '../models/ClubMember.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

/* عددهای فارسی و عربی را به لاتین برمی‌گرداند */
const toLatin = (s) =>
  String(s ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s-]/g, '');

/* ── عضویت (عمومی) ── */
router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const phone = toLatin(req.body.phone);
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const taste = String(req.body.taste || '').trim();

    if (!name) return res.status(400).json({ error: 'نام‌تان را بنویسید' });
    if (!/^0\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'شمارهٔ موبایل را کامل و با ۰ اول وارد کنید' });
    }

    /* اگر قبلاً عضو شده، اطلاعاتش را تازه می‌کنیم و
       همان پیام خوشامد را می‌دهیم — نه پیام خطا. */
    const existing = await ClubMember.findOne({ phone });
    if (existing) {
      existing.name = name;
      if (email) existing.email = email;
      if (taste) existing.taste = taste;
      existing.active = true;
      await existing.save();
      return res.json({ ok: true, already: true, name: existing.name });
    }

    const member = await ClubMember.create({ name, phone, email, taste });
    res.status(201).json({ ok: true, already: false, name: member.name });
  } catch (err) {
    next(err);
  }
});

/* ── مدیریت اعضا ── */

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const filter = {};

    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }

    const members = await ClubMember.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
    const total = await ClubMember.countDocuments();

    res.json({ members, total });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const member = await ClubMember.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ error: 'عضو پیدا نشد' });
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

/* خروجی CSV برای پیامک انبوه یا خبرنامه */
router.get('/export.csv', requireAdmin, async (_req, res, next) => {
  try {
    const members = await ClubMember.find().sort({ createdAt: -1 }).lean();

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['نام', 'موبایل', 'ایمیل', 'سلیقه', 'تاریخ عضویت'].map(esc).join(','),
      ...members.map((m) =>
        [m.name, m.phone, m.email, m.taste, new Date(m.createdAt).toISOString()].map(esc).join(',')
      )
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="club-members.csv"');
    /* BOM تا اکسل فارسی را درست باز کند */
    res.send('﻿' + rows);
  } catch (err) {
    next(err);
  }
});

export default router;
