/* GARAGE ONE — подстановка контента из content.json.
   Если файл недоступен (открыто как file://), сайт показывает встроенный статический контент. */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function nl2br(s) { return esc(s).split('\n').join('<br>'); }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function brandHTML(brand) {
    var parts = String(brand || '').split(' ');
    if (parts.length < 2) return esc(brand);
    var last = parts.pop();
    return esc(parts.join(' ')) + ' <b>' + esc(last) + '</b>';
  }

  function fillSelect(sel, opts) {
    var el = typeof sel === 'string' ? q(sel) : sel;
    if (!el || !Array.isArray(opts)) return;
    el.innerHTML = opts.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>'; }).join('');
  }

  function recount() {
    var s = q('#service'), a = q('#car'), u = q('#urgency'), t = q('#total');
    if (!s || !a || !u || !t) return;
    function cc() { t.textContent = Math.round(+s.value * +a.value * +u.value).toLocaleString('ru-RU') + ' ₽'; }
    [s, a, u].forEach(function (x) { x.onchange = cc; });
    cc();
  }

  function bindChoices() {
    var name = q('#problemName'), price = q('#problemPrice');
    qa('#diagnosis .choice').forEach(function (x) {
      x.onclick = function () {
        qa('#diagnosis .choice').forEach(function (y) { y.classList.remove('active'); });
        x.classList.add('active');
        if (name) name.textContent = x.dataset.name;
        if (price) price.textContent = x.dataset.price;
      };
    });
  }

  async function main() {
    var c;
    try {
      var r = await fetch('content.json?t=' + Date.now());
      if (!r.ok) return;
      c = await r.json();
    } catch (e) { return; }

    var g = c.global || {}, h = c.hero || {};

    // Шапка и бренд
    qa('header .brand, footer .brand').forEach(function (el) { if (g.brand) el.innerHTML = brandHTML(g.brand); });
    var phone = q('header a.phone');
    if (phone && g.phone) { phone.href = 'tel:+' + String(g.phone).replace(/\D/g, ''); if (g.phoneFormatted) phone.textContent = g.phoneFormatted; }
    qa('.mobilebar a[href^="tel:"]').forEach(function (a) { if (g.phone) a.href = 'tel:+' + String(g.phone).replace(/\D/g, ''); });

    // Hero
    if (h.eyebrow) setIf('.hero .eyebrow', h.eyebrow);
    var h1 = q('.hero h1'); if (h1 && h.title) h1.innerHTML = nl2br(h.title);
    var hp = q('.hero .container > p'); if (hp && h.text) hp.textContent = h.text;
    var ctas = qa('.hero .actions a');
    if (ctas[0] && h.cta1_text) { ctas[0].textContent = h.cta1_text; if (h.cta1_href) ctas[0].href = h.cta1_href; }
    if (ctas[1] && h.cta2_text) { ctas[1].textContent = h.cta2_text; if (h.cta2_href) ctas[1].href = h.cta2_href; }
    if (Array.isArray(h.stats)) {
      var boxes = qa('.hero .stats > div');
      h.stats.slice(0, boxes.length).forEach(function (s, i) {
        var strong = q('strong', boxes[i]), span = q('span', boxes[i]);
        if (strong) strong.textContent = s.v;
        if (span) span.textContent = s.l;
      });
    }
    var vid = q('video.herovideo'), src = q('video.herovideo source'), hb = q('.heroimg');
    if (h.video && src && src.getAttribute('src') !== h.video) { src.src = h.video; if (vid) vid.load(); }
    if (h.poster) { if (vid) vid.poster = h.poster; if (hb) hb.style.backgroundImage = 'url("' + h.poster + '")'; }

    // Услуги
    var sc = c.services || {};
    var sh2 = q('#services .sectionhead h2'); if (sh2 && sc.title) sh2.innerHTML = nl2br(sc.title);
    var shp = q('#services .sectionhead p'); if (shp && sc.text) shp.textContent = sc.text;
    var grid = q('#services .grid');
    if (grid && Array.isArray(sc.items)) {
      grid.innerHTML = sc.items.map(function (it, i) {
        var n = String(i + 1).padStart(2, '0');
        return '<div class="card"><span class="num">' + n + '</span><h3>' + esc(it.t) + '</h3><p>' + esc(it.d) + '</p></div>';
      }).join('');
    }

    // Диагностика
    var dg = c.diagnosis || {};
    var dh2 = q('#diagnosis .sectionhead h2'); if (dh2 && dg.title) dh2.innerHTML = nl2br(dg.title);
    var dhp = q('#diagnosis .sectionhead p'); if (dhp && dg.text) dhp.textContent = dg.text;
    var pl = q('#diagnosis .problem-list');
    if (pl && Array.isArray(dg.symptoms)) {
      pl.innerHTML = dg.symptoms.map(function (s) { return '<div class="choice" data-name="' + esc(s.n) + '" data-price="' + esc(s.p) + '">' + esc(s.n) + '</div>'; }).join('');
      bindChoices();
    }
    var est = q('#diagnosis .estimate');
    if (est) {
      var sm = qa('.small', est);
      if (sm[0] && dg.aside_small) sm[0].textContent = dg.aside_small;
      var pn = q('#problemName'); if (pn && dg.aside_default) pn.textContent = dg.aside_default;
      if (sm[1] && dg.aside_note) sm[1].textContent = dg.aside_note;
      var cta = q('a.btn', est); if (cta && dg.aside_cta) cta.textContent = dg.aside_cta;
    }

    // Калькулятор
    var cc2 = c.calculator || {};
    var ch2 = q('#calculator .sectionhead h2'); if (ch2 && cc2.title) ch2.innerHTML = nl2br(cc2.title);
    var chp = q('#calculator .sectionhead p'); if (chp && cc2.text) chp.textContent = cc2.text;
    fillSelect('#service', cc2.serviceOpts);
    fillSelect('#car', cc2.carOpts);
    fillSelect('#urgency', cc2.urgencyOpts);
    var cl = q('#calculator .calcbox span'); if (cl && cc2.total_label) cl.textContent = cc2.total_label;
    recount();

    // До/после
    var wk = c.works || {};
    var wh2 = q('#works .sectionhead h2'); if (wh2 && wk.title) wh2.innerHTML = nl2br(wk.title);
    var whp = q('#works .sectionhead p'); if (whp && wk.text) whp.textContent = wk.text;
    var photos = qa('#works .photo');
    if (photos[0] && wk.before && wk.before[0]) photos[0].style.backgroundImage = 'url("' + wk.before[0] + '")';
    if (photos[1] && wk.after && wk.after[0]) photos[1].style.backgroundImage = 'url("' + wk.after[0] + '")';

    // Доверие
    var tr = c.trust || {};
    var trust = q('.trust');
    if (trust && Array.isArray(tr.items)) {
      trust.innerHTML = tr.items.map(function (it) { return '<div><strong>' + esc(it.v) + '</strong><span>' + esc(it.l) + '</span></div>'; }).join('');
    }

    // Этапы
    var pr = c.process || {};
    var probSecs = qa('section.problem');
    var procSec = probSecs.length > 1 ? probSecs[probSecs.length - 1] : null;
    if (procSec) {
      var ph2 = q('.sectionhead h2', procSec); if (ph2 && pr.title) ph2.innerHTML = nl2br(pr.title);
      var steps = q('.process', procSec);
      if (steps && Array.isArray(pr.steps)) {
        steps.innerHTML = pr.steps.map(function (s, i) {
          return '<div class="step"><b>' + String(i + 1).padStart(2, '0') + '</b><h3>' + esc(s.t) + '</h3><p>' + esc(s.d) + '</p></div>';
        }).join('');
      }
    }

    // Запись
    var bk = c.booking || {};
    if (bk.eyebrow) setIf('#booking .eyebrow', bk.eyebrow);
    var bh2 = q('#booking h2'); if (bh2 && bk.title) bh2.innerHTML = nl2br(bk.title);
    var bsmall = q('#booking p.small'); if (bsmall && bk.text) bsmall.textContent = bk.text;
    var bsel = q('#booking select');
    if (bsel && Array.isArray(bk.services)) {
      bsel.innerHTML = '<option>' + esc(bk.services_placeholder || 'Выберите услугу') + '</option>' +
        bk.services.map(function (s) { return '<option>' + esc(typeof s === 'string' ? s : s.v) + '</option>'; }).join('');
    }
    var bbtn = q('#booking button'); if (bbtn && bk.submit) bbtn.textContent = bk.submit;

    // Футер
    if (g.footerAbout) setIf('footer p', g.footerAbout);
    var addr = q('.footgrid div:last-child'); if (addr && g.address) addr.innerHTML = nl2br(g.address);
  }

  function setIf(sel, txt) { var el = q(sel); if (el && txt != null) el.textContent = txt; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();
