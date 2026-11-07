/* ============================================================
   APEX — premium fitness club · main.js
   Vanilla JS only · no libraries
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var fmt = function (n) { return Math.round(n).toLocaleString('ru-RU'); };

  var easeOutExpo = function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); };
  var easeInOutCubic = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* ============================================================
     1. PRELOADER — «APEX» punch-in + lime % counter + line 0→100
     ============================================================ */
  (function preloader() {
    var box = $('#preloader');
    if (!box) { document.body.classList.add('is-loaded'); return; }

    var numEl = $('#preloaderNum');
    var lineEl = $('#preloaderLine');
    var progress = 0;
    var target = 86;
    var loaded = false;
    var done = false;

    var finish = function () {
      if (done) return;
      done = true;
      progress = 100;
      if (numEl) numEl.textContent = '100';
      if (lineEl) lineEl.style.width = '100%';

      setTimeout(function () {
        box.classList.add('is-hide');
        document.body.classList.remove('is-locked');
        document.body.classList.add('is-loaded');
        setTimeout(function () { box.style.display = 'none'; }, 900);
      }, REDUCED ? 60 : 280);
    };

    if (REDUCED) { finish(); return; }

    window.addEventListener('load', function () { loaded = true; });
    setTimeout(function () { loaded = true; }, 5000); // safety net

    var tick = function () {
      if (done) return;
      target = loaded ? 100 : 88;
      progress += (target - progress) * 0.06;
      if (loaded && progress > 99.2) { finish(); return; }
      if (numEl) numEl.textContent = String(Math.floor(progress));
      if (lineEl) lineEl.style.width = progress.toFixed(1) + '%';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  /* ============================================================
     2. CUSTOM CURSOR — lime dot + trailing ring (rAF lerp)
     ============================================================ */
  (function cursor() {
    var dot = $('.cursor-dot');
    var ring = $('.cursor-ring');
    if (!dot || !ring || !FINE_POINTER) return;

    document.body.classList.add('has-cursor');
    if (REDUCED) {
      document.addEventListener('mousemove', function (e) {
        dot.style.transform = ring.style.transform =
          'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0) translate(-50%,-50%)';
      }, { passive: true });
      return;
    }

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%)';
    }, { passive: true });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('a, button, input, select, label, .coach, .plan')) ring.classList.add('is-hover');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest('a, button, input, select, label, .coach, .plan')) ring.classList.remove('is-hover');
    });
    document.addEventListener('mouseleave', function () { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { dot.style.opacity = ''; ring.style.opacity = ''; });
  })();

  /* ============================================================
     3. SCROLL: progress bar + header glass + back-to-top + parallax
     ============================================================ */
  (function scrollFx() {
    var bar = $('#progressBar');
    var header = $('#header');
    var toTop = $('#toTop');
    var parallaxItems = $$('.parallax[data-parallax]').map(function (w) {
      return { wrap: w, img: $('img', w), speed: parseFloat(w.getAttribute('data-parallax')) || 0.1 };
    });

    var ticking = false;

    var update = function () {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

      if (bar) bar.style.width = (y / max * 100).toFixed(2) + '%';
      if (header) header.classList.toggle('header--scrolled', y > 40);
      if (toTop) toTop.classList.toggle('is-visible', y > 600);

      if (!REDUCED && parallaxItems.length) {
        var vh = window.innerHeight;
        parallaxItems.forEach(function (item) {
          var r = item.wrap.getBoundingClientRect();
          if (r.bottom < -80 || r.top > vh + 80) return;
          var centerOffset = (r.top + r.height / 2) - vh / 2;
          var shift = clamp(-centerOffset * item.speed, -r.height * 0.4, r.height * 0.4);
          item.img.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0) scale(1.18)';
        });
      }
    };

    var onScroll = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
      });
    }
  })();

  /* ============================================================
     4. BURGER — fullscreen menu with staggered links
     ============================================================ */
  (function burger() {
    var btn = $('#burger');
    var menu = $('#mobileMenu');
    if (!btn || !menu) return;

    var setState = function (open) {
      document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    };

    btn.addEventListener('click', function () {
      setState(!document.body.classList.contains('menu-open'));
    });

    $$('.mobile-menu__link, .mobile-menu__phone', menu).forEach(function (a) {
      a.addEventListener('click', function () { setState(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setState(false);
    });
  })();

  /* ============================================================
     5. INTERSECTION OBSERVER — reveals with stagger
     ============================================================ */
  (function reveals() {
    var items = $$('.reveal');
    if (!items.length) return;

    items.forEach(function (el) {
      var d = parseInt(el.getAttribute('data-delay'), 10);
      if (!isNaN(d)) el.style.transitionDelay = d + 'ms';
    });

    if (REDUCED || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* ============================================================
     6. COUNTERS — lime numbers with easeOutExpo
     ============================================================ */
  (function counters() {
    var els = $$('[data-count]');
    if (!els.length) return;

    var run = function (el) {
      var end = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (REDUCED) { el.textContent = fmt(end); return; }
      var dur = 1800;
      var start = null;
      var step = function (ts) {
        if (start === null) start = ts;
        var t = clamp((ts - start) / dur, 0, 1);
        el.textContent = fmt(end * easeOutExpo(t));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          run(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    els.forEach(function (el) { io.observe(el); });
  })();

  /* ============================================================
     7. MAGNETIC BUTTONS
     ============================================================ */
  (function magnetic() {
    if (!FINE_POINTER || REDUCED) return;
    $$('.magnetic').forEach(function (el) {
      var strength = 0.28;

      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * strength).toFixed(1) + 'px,' + (dy * strength).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 500);
      });
    });
  })();

  /* ============================================================
     8. TABS (generic) — directions + schedule
     ============================================================ */
  (function tabs() {
    var initTabGroup = function (root, tabSel, panelSel) {
      var tabButtons = $$(tabSel, root);
      var panels = $$(panelSel, root);
      if (!tabButtons.length || !panels.length) return;

      tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-tab');
          if (!key || btn.classList.contains('is-active')) return;

          tabButtons.forEach(function (b) {
            var active = b === btn;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
          });

          panels.forEach(function (p) {
            var match = p.getAttribute('data-panel') === key;
            p.classList.toggle('is-active', match);
            if (match) { // restart fade-slide animation
              p.style.animation = 'none';
              void p.offsetWidth;
              p.style.animation = '';
            }
          });
        });
      });
    };

    var dirRoot = $('#dirTabs');
    if (dirRoot) initTabGroup(dirRoot, '.dir__tab', '.dir__panel');

    var schedRoot = $('#sched');
    if (schedRoot) initTabGroup(schedRoot, '.sched__tab', '.sched__panel');
  })();

  /* ============================================================
     9. BILLING SWITCHER — месяц / год (−20%) with price tween
     ============================================================ */
  (function billing() {
    var box = $('#billing');
    if (!box) return;
    var btns = $$('.billing__btn', box);
    var plans = $$('.plan__value');

    var state = {};
    plans.forEach(function (el, i) {
      state[i] = {
        current: parseInt(el.getAttribute('data-monthly'), 10) || 0,
        raf: null
      };
    });

    var animateValue = function (el, from, to) {
      var idx = plans.indexOf(el);
      var st = state[idx];
      if (st.raf) cancelAnimationFrame(st.raf);
      if (REDUCED || from === to) { el.textContent = fmt(to); return; }

      var dur = 600;
      var start = null;
      var step = function (ts) {
        if (start === null) start = ts;
        var t = clamp((ts - start) / dur, 0, 1);
        var v = from + (to - from) * easeInOutCubic(t);
        el.textContent = fmt(v);
        if (t < 1) {
          st.raf = requestAnimationFrame(step);
        } else {
          el.textContent = fmt(to);
          st.raf = null;
        }
      };
      st.raf = requestAnimationFrame(step);
    };

    var setMode = function (mode) {
      var isYear = mode === 'year';
      box.setAttribute('data-state', isYear ? 'year' : 'month');

      btns.forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-billing') === mode);
      });

      plans.forEach(function (el) {
        var from = parseInt(el.textContent.replace(/\s|\u00A0/g, ''), 10) || 0;
        var to = parseInt(el.getAttribute(isYear ? 'data-yearly' : 'data-monthly'), 10) || 0;
        animateValue(el, from, to);

        var card = el.closest('.plan');
        var period = card ? $('.plan__period', card) : null;
        if (period) period.textContent = isYear ? 'при оплате за год' : 'в месяц';
      });
    };

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        setMode(b.getAttribute('data-billing'));
      });
    });
  })();

  /* ============================================================
     10. SLIDER — dots / arrows / swipe / autoplay
     ============================================================ */
  (function slider() {
    var root = $('#reviewsSlider');
    if (!root) return;
    var track = $('.slider__track', root);
    var slides = $$('.review', root);
    var dotsBox = $('.slider__dots', root);
    var arrows = $$('.slider__arrow', root);
    if (!track || !slides.length) return;

    var index = 0;
    var timer = null;
    var AUTOPLAY_MS = 6000;

    var dots = slides.map(function (_, i) {
      var d = document.createElement('button');
      d.className = 'slider__dot' + (i === 0 ? ' is-active' : '');
      d.type = 'button';
      d.setAttribute('aria-label', 'Отзыв ' + (i + 1));
      d.addEventListener('click', function () { go(i, true); });
      if (dotsBox) dotsBox.appendChild(d);
      return d;
    });

    var go = function (i, user) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === index); });
      if (user) restartAutoplay();
    };

    var restartAutoplay = function () {
      stopAutoplay();
      if (REDUCED) return;
      timer = setInterval(function () { go(index + 1); }, AUTOPLAY_MS);
    };
    var stopAutoplay = function () { if (timer) { clearInterval(timer); timer = null; } };

    arrows.forEach(function (btn) {
      btn.addEventListener('click', function () {
        go(index + (btn.getAttribute('data-dir') === 'prev' ? -1 : 1), true);
      });
    });

    root.addEventListener('mouseenter', stopAutoplay);
    root.addEventListener('mouseleave', restartAutoplay);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAutoplay(); else restartAutoplay();
    });

    /* swipe */
    var startX = 0, deltaX = 0, dragging = false;

    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      deltaX = 0;
      track.classList.add('is-dragging');
      stopAutoplay();
    });

    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      deltaX = e.clientX - startX;
      var pct = -index * 100 + (deltaX / track.offsetWidth) * 100;
      track.style.transform = 'translateX(' + pct + '%)';
    });

    var endDrag = function () {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      if (Math.abs(deltaX) > 50) {
        go(index + (deltaX < 0 ? 1 : -1));
      } else {
        go(index);
      }
      restartAutoplay();
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('pointerleave', endDrag);

    restartAutoplay();
    go(0);
  })();

  /* ============================================================
     11. TILT CARDS — trainers
     ============================================================ */
  (function tilt() {
    if (!FINE_POINTER || REDUCED) return;
    $$('[data-tilt]').forEach(function (card) {
      var MAX = 5;

      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(900px) rotateX(' + (-py * MAX).toFixed(2) + 'deg) rotateY(' + (px * MAX).toFixed(2) + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform .6s cubic-bezier(.22,.61,.36,1)';
        card.style.transform = '';
        setTimeout(function () { card.style.transition = ''; }, 600);
      });
    });
  })();

  /* ============================================================
     12. FORM — validation + phone mask + tariff prefill + success
     ============================================================ */
  (function form() {
    var form = $('#trialForm');
    var success = $('#formSuccess');
    if (!form) return;

    var nameInput = $('#fName');
    var phoneInput = $('#fPhone');
    var dirSelect = $('#fDir');
    var tariffSelect = $('#fTariff');
    var formWrap = form.closest('.trial__formwrap');

    /* --- phone mask: +7 (XXX) XXX-XX-XX --- */
    var maskPhone = function (raw) {
      var digits = raw.replace(/\D/g, '');
      if (!digits) return '';
      if (digits[0] === '8') digits = '7' + digits.slice(1);
      if (digits[0] !== '7') digits = '7' + digits;
      digits = digits.slice(0, 11);

      var out = '+7';
      if (digits.length > 1) out += ' (' + digits.slice(1, 4);
      if (digits.length >= 4) out += ')';
      if (digits.length > 4) out += ' ' + digits.slice(4, 7);
      if (digits.length > 7) out += '-' + digits.slice(7, 9);
      if (digits.length > 9) out += '-' + digits.slice(9, 11);
      return out;
    };

    if (phoneInput) {
      phoneInput.addEventListener('input', function () {
        phoneInput.value = maskPhone(phoneInput.value);
        phoneInput.closest('.field').classList.remove('is-error');
      });
    }
    if (nameInput) {
      nameInput.addEventListener('input', function () {
        nameInput.closest('.field').classList.remove('is-error');
      });
    }

    /* --- tariff prefill from «Оформить» buttons --- */
    $$('[data-tariff]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tariff = btn.getAttribute('data-tariff');
        if (tariffSelect) tariffSelect.value = tariff;

        var target = $('#trial');
        if (target) {
          var top = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: top, behavior: REDUCED ? 'auto' : 'smooth' });
        }
        if (formWrap) {
          formWrap.classList.remove('is-flash');
          void formWrap.offsetWidth;
          formWrap.classList.add('is-flash');
          setTimeout(function () { formWrap.classList.remove('is-flash'); }, 1700);
        }
        if (form.hidden) { // allow a second request after success
          form.hidden = false;
          if (success) success.hidden = true;
        }
      });
    });

    /* --- submit + validation --- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;

      if (nameInput) {
        var validName = nameInput.value.trim().length >= 2;
        nameInput.closest('.field').classList.toggle('is-error', !validName);
        ok = ok && validName;
      }
      if (phoneInput) {
        var digits = phoneInput.value.replace(/\D/g, '');
        var validPhone = digits.length === 11;
        phoneInput.closest('.field').classList.toggle('is-error', !validPhone);
        ok = ok && validPhone;
      }
      if (!ok) return;

      if (dirSelect && tariffSelect) {
        //eslint-disable-next-line no-console
        console.log('[APEX] Заявка:', {
          name: nameInput ? nameInput.value.trim() : '',
          phone: phoneInput ? phoneInput.value : '',
          direction: dirSelect.value,
          tariff: tariffSelect.value || 'Не выбран'
        });
      }

      form.hidden = true;
      if (success) {
        success.hidden = false;
        var clone = success.querySelector('svg');
        if (clone) { // restart SVG draw animation
          var copy = clone.cloneNode(true);
          clone.parentNode.replaceChild(copy, clone);
        }
      }
    });
  })();

  /* ============================================================
     13. SMOOTH ANCHORS with header offset
     ============================================================ */
  (function anchors() {
    var header = $('#header');

    $$('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (!target) return;

        e.preventDefault();
        var headerH = header ? header.offsetHeight : 0;
        var top = target.getBoundingClientRect().top + window.scrollY - headerH - 6;

        window.scrollTo({ top: Math.max(0, top), behavior: REDUCED ? 'auto' : 'smooth' });
        if (target.id === 'hero') window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
      });
    });
  })();

  /* ============================================================
     14. VIDEO FALLBACK — dark-lime animated gradient
     ============================================================ */
  (function videoFallback() {
    var video = $('#heroVideo');
    var hero = $('.hero');
    if (!video || !hero) return;

    var killed = false;
    var kill = function () {
      if (killed) return;
      killed = true;
      try { video.pause(); } catch (err) { /* noop */ }
      video.removeAttribute('src');
      video.load();
      video.remove();
      hero.classList.add('hero--no-video');
    };

    var source = video.querySelector('source');
    if (source) source.addEventListener('error', kill);
    video.addEventListener('error', kill);

    try {
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* keep poster */ });
    } catch (err) { /* noop */ }

    // if nothing decoded in 4s — fall back to gradient
    setTimeout(function () {
      if (!killed && video.readyState < 2) kill();
    }, 4000);
  })();

  /* ============================================================
     15. SCROLLSPY — active nav link
     ============================================================ */
  (function scrollspy() {
    var links = $$('.nav__link');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    links.forEach(function (l) {
      var id = (l.getAttribute('href') || '').slice(1);
      if (id) map[id] = l;
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('is-active'); });
        var link = map[entry.target.id];
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
  })();

})();
