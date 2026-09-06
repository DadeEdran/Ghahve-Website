
(function(){
  var FA = function(n){ return String(n).replace(/\d/g, function(d){ return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };
  var src  = document.getElementById('src');
  var book = document.getElementById('book');
  var TITLE = 'رُست‌خانهٔ دانه — مستندات فنی';

  var pageNo = 0, page = null, body = null, limit = 0;

  /* قاب صفحه ارتفاع ثابت دارد، پس scrollHeight آن هیچ‌وقت صفر نمی‌شود؛
     محتوا را در یک لایهٔ درونیِ ارتفاع‌آزاد می‌ریزیم تا «چقدر پر شده»
     واقعاً اندازه‌گیری شود. flow-root جلوی بیرون‌زدن حاشیه‌ها را می‌گیرد. */
  function newPage(){
    pageNo++;
    page = document.createElement('section');
    page.className = 'pg';
    var frame = document.createElement('div');
    frame.className = 'pg-body';
    body = document.createElement('div');
    body.className = 'pg-flow';
    frame.appendChild(body);
    var foot = document.createElement('footer');
    foot.className = 'pg-foot';
    foot.innerHTML = '<span class="ft">' + TITLE + '</span><span class="fn">' + FA(pageNo) + '</span>';
    page.appendChild(frame); page.appendChild(foot);
    book.appendChild(page);
    limit = frame.clientHeight;
  }

  function fits(){ return body.scrollHeight <= limit + 0.6; }
  function used(){ return body.scrollHeight; }
  function room(){ return limit - used(); }

  /* بلندی یک عنصر، بدون به‌هم زدن صفحه */
  function heightOf(el){
    body.appendChild(el);
    var h = el.offsetHeight
      + parseFloat(getComputedStyle(el).marginTop || 0)
      + parseFloat(getComputedStyle(el).marginBottom || 0);
    body.removeChild(el);
    return h;
  }

  /* ── تکه‌تکه کردن بلوک کد ── */
  function splitPre(el){
    var codeEl = el.querySelector('code') || el;
    var lines = codeEl.innerHTML.split('\n');
    var mk = function(html){
      var p = el.cloneNode(false);
      var c = document.createElement('code');
      c.innerHTML = html;
      p.appendChild(c);
      return p;
    };
    var cur = [], node = null;
    for (var i = 0; i < lines.length; i++){
      var next = cur.concat([lines[i]]);
      var probe = mk(next.join('\n'));
      if (node) body.removeChild(node);
      body.appendChild(probe);
      if (!fits() && cur.length){
        body.removeChild(probe);
        body.appendChild(mk(cur.join('\n')));
        newPage();
        cur = [lines[i]];
        node = mk(cur.join('\n'));
        body.appendChild(node);
      } else {
        cur = next;
        node = probe;
      }
    }
  }

  /* ── تکه‌تکه کردن جدول با تکرار سرستون ── */
  function splitTable(el){
    var tbl  = el.querySelector('table');
    var head = tbl.querySelector('thead');
    var rows = Array.prototype.slice.call(tbl.querySelectorAll('tbody tr'));
    var mk = function(){
      var w = document.createElement('div'); w.className = 'tw';
      var t = document.createElement('table');
      if (head) t.appendChild(head.cloneNode(true));
      var tb = document.createElement('tbody'); t.appendChild(tb);
      w.appendChild(t);
      return { w: w, tb: tb };
    };
    var cell = mk(); body.appendChild(cell.w);
    for (var i = 0; i < rows.length; i++){
      cell.tb.appendChild(rows[i]);
      if (!fits()){
        cell.tb.removeChild(rows[i]);
        if (cell.tb.children.length === 0){ cell.tb.appendChild(rows[i]); continue; }
        newPage();
        cell = mk(); body.appendChild(cell.w);
        cell.tb.appendChild(rows[i]);
      }
    }
  }

  /* ── تکه‌تکه کردن فهرست ── */
  function splitList(el){
    var items = Array.prototype.slice.call(el.children);
    var mk = function(){
      var u = el.cloneNode(false);
      return u;
    };
    var cur = mk(); body.appendChild(cur);
    for (var i = 0; i < items.length; i++){
      cur.appendChild(items[i]);
      if (!fits()){
        cur.removeChild(items[i]);
        if (cur.children.length === 0){ cur.appendChild(items[i]); continue; }
        newPage();
        cur = mk(); body.appendChild(cur);
        cur.appendChild(items[i]);
      }
    }
  }

  var SPLITTABLE = function(el){
    if (el.tagName === 'PRE') return splitPre;
    if (el.classList && el.classList.contains('tw')) return splitTable;
    if (el.tagName === 'UL' || el.tagName === 'OL') return splitList;
    return null;
  };

  /* ── تکه‌تکه کردن ظرفِ بلند: نقل‌قول و کال‌اوت ──
     این دو تا فرزند دارند ولی خودشان شکستنی نبودند. ظرفی که از یک صفحهٔ
     کامل بلندتر باشد، بقیه‌اش را از پایین قاب بیرون می‌انداخت — بی هیچ
     خطایی، فقط چند بند ناپدید می‌شدند. حالا ظرف کپی می‌شود و فرزندها
     یکی‌یکی داخلش می‌ریزند؛ نشانِ کال‌اوت خودش فرزند اول است، پس فقط در
     تکهٔ نخست می‌آید — همان چیزی که می‌خواهیم.

     فقط برای ظرفِ بلندتر از یک صفحه صدا زده می‌شود (شاخهٔ h > limit در
     place)، تا چیدمانِ بقیهٔ سند دست‌نخورده بماند. */
  function splitWrapper(el){
    var kids = Array.prototype.slice.call(el.children);
    var mk = function(){ return el.cloneNode(false); };

    /* اگر ته صفحه‌ایم، از اول صفحهٔ تازه شروع کن؛ وگرنه تکهٔ اول
       می‌تواند خالی دربیاید. */
    if (used() > 0 && room() < limit * 0.2) newPage();

    var cur = mk();
    body.appendChild(cur);

    for (var i = 0; i < kids.length; i++){
      var kid = kids[i];
      cur.appendChild(kid);
      if (fits()) continue;

      cur.removeChild(kid);

      /* ظرف خالی است، یعنی خودِ همین فرزند از یک صفحه بلندتر است */
      if (cur.children.length === 0){
        var inner = SPLITTABLE(kid);
        if (inner){
          body.removeChild(cur);
          inner(kid);
          cur = mk();
          body.appendChild(cur);
          continue;
        }
        /* چاره‌ای نیست: بگذارش و برو */
        cur.appendChild(kid);
        continue;
      }

      newPage();
      cur = mk();
      body.appendChild(cur);
      cur.appendChild(kid);
    }
  }

  /* ظرف‌هایی که فقط وقتی از یک صفحه بلندتر شدند شکسته می‌شوند */
  var WRAPPER = function(el){
    if (el.tagName === 'BLOCKQUOTE') return splitWrapper;
    if (el.classList && el.classList.contains('cal')) return splitWrapper;
    return null;
  };

  function place(el){
    /* اگر جا هست، همین‌جا */
    body.appendChild(el);
    if (fits()) return;
    body.removeChild(el);

    var splitter = SPLITTABLE(el);
    var h = heightOf(el);

    /* بلندتر از یک صفحهٔ کامل → حتماً باید شکسته شود */
    if (h > limit){
      if (splitter){ splitter(el); return; }
      var wrapper = WRAPPER(el);
      if (wrapper){ wrapper(el); return; }
      /* شکل نمودار: کوچکش می‌کنیم تا جا شود */
      if (el.tagName === 'FIGURE'){
        if (used() > 0) newPage();
        var w = 100;
        body.appendChild(el);
        while (!fits() && w > 32){ w -= 4; el.style.width = w + '%'; el.style.marginInline = 'auto'; }
        return;
      }
      if (used() > 0) newPage();
      body.appendChild(el);
      return;
    }

    /* جدول یا فهرست بلند: به‌جای جای خالی بزرگ، بشکن */
    if (splitter && el.tagName !== 'PRE' && h > limit * 0.55 && room() > limit * 0.28){
      splitter(el);
      return;
    }

    /* بلوک کد را دوست نداریم بشکنیم، اما وقتی هم بلند است و هم نصفِ صفحه
       خالی می‌ماند، شکستنش از آن حفرهٔ سفید بهتر است. */
    if (splitter && el.tagName === 'PRE' && h > limit * 0.5 && room() > limit * 0.35){
      splitter(el);
      return;
    }

    /* وگرنه: صفحهٔ تازه، بدون شکستن */
    if (used() > 0) newPage();
    body.appendChild(el);
  }

  /* تا فونت‌ها سوار نشده‌اند، اندازه‌ها با فونت جانشین گرفته می‌شود و بعدِ
     سوار شدن، چند خط از ته صفحه بیرون می‌زند. پس اول فونت، بعد صفحه‌بندی. */
  function run(){

  newPage();

  /* عنوان باید همراه چیزی که معرفی‌اش می‌کند برود. برای عنصرهای نشکستنی
     (نمودار، کال‌اوت) کل بلندی‌شان را لازم داریم، برای شکستنی‌ها فقط چند خط.
     سقف می‌گذاریم تا یک عنصرِ غول، عنوان را بی‌جهت جلو نیندازد. */
  function needAfter(next){
    if (!next) return 0;
    var h = Math.min(heightOf(next), limit);
    var tag = next.tagName;
    var cls = next.classList || { contains: function(){ return false; } };
    if (tag === 'FIGURE' || cls.contains('cal')) return Math.min(h, limit * 0.62);
    if (tag === 'PRE') return h > limit * 0.5 ? 56 : h;
    if (cls.contains('tw') || tag === 'UL' || tag === 'OL') return h > limit * 0.55 ? 80 : h;
    return Math.min(h, limit * 0.45);
  }

  Array.prototype.slice.call(src.children).forEach(function(section){
    var els = Array.prototype.slice.call(section.children);
    els.forEach(function(el, i){
      /* هر فصل از صفحهٔ تازه شروع می‌شود */
      if (el.tagName === 'H1' && used() > 0) newPage();

      /* عنوان نباید ته صفحه تنها بماند */
      if (/^H[234]$/.test(el.tagName) && used() > 0){
        var need = heightOf(el) + Math.max(needAfter(els[i + 1]), el.tagName === 'H2' ? 72 : 56);
        if (need > room()) newPage();
      }
      place(el);
    });
  });

  /* شمارهٔ صفحهٔ هر عنوان را در فهرست می‌نویسیم. باید همان عددی باشد که
     پایین صفحه چاپ می‌شود (جلد شماره ندارد)، وگرنه خواننده یکی آن‌طرف‌تر
     را باز می‌کند. */
  Array.prototype.slice.call(document.querySelectorAll('.pg')).forEach(function(pg, i){
    Array.prototype.slice.call(pg.querySelectorAll('[id]')).forEach(function(n){
      var t = document.querySelector('.toc-p[data-p="' + n.id + '"]');
      if (t && !t.textContent) t.textContent = FA(i + 1);
    });
  });

  document.documentElement.setAttribute('data-pages', document.querySelectorAll('.pg').length);
  document.documentElement.setAttribute('data-ready', '1');

  }

  /* متنِ خام داخل #src پنهان است، پس مرورگر فونت‌هایش را اصلاً درخواست
     نمی‌کند و fonts.ready بی‌درنگ برمی‌گردد. برای همین هر وزن را صریحاً
     می‌خواهیم؛ وگرنه صفحه‌بند با متریکِ فونت جانشین اندازه می‌گیرد. */
  var WANT = ['400 10pt Vazirmatn', '500 10pt Vazirmatn', '700 10pt Vazirmatn',
              '400 8pt JBMono', '700 8pt JBMono'];

  if (document.fonts && document.fonts.load){
    Promise.all(WANT.map(function(f){ return document.fonts.load(f, 'الف Ab۱'); }))
      .then(function(){ return document.fonts.ready; })
      .then(run, run);
  } else {
    window.addEventListener('load', run);
  }
})();
