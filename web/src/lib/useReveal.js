import { useEffect } from 'react';

/* انیمیشن ورود کارت‌ها هنگام اسکرول — همان رفتار نسخهٔ اولیه.
   با هر بار تغییر فهرست، کارت‌های تازه دوباره رصد می‌شوند. */
export function useReveal(deps = []) {
  useEffect(() => {
    const cards = [...document.querySelectorAll('.card:not(.is-in)')];
    if (cards.length === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cards.forEach((c) => c.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (!e.isIntersecting) return;
          setTimeout(() => e.target.classList.add('is-in'), i * 55);
          observer.unobserve(e.target);
        });
      },
      { threshold: 0.12 }
    );

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
