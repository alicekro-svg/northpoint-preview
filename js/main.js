/* NorthPoint · site behaviour */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- WhatsApp links ---------- */
  var WA_NUMBER = "972543338815";
  var WA_TEXT = "היי יואנה, אשמח לאבחון חינם לעסק שלי";
  var waHref = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(WA_TEXT);
  document.querySelectorAll(".js-wa").forEach(function (a) {
    var t = a.getAttribute("data-wa-text");
    a.href = t ? "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(t) : waHref;
  });

  /* ---------- Start the intro once fonts are ready ---------- */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    requestAnimationFrame(function () {
      root.classList.add("is-loaded");
      root.dispatchEvent(new Event("np:loaded"));
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(start, 1200); // don't wait forever on slow networks
  } else {
    window.addEventListener("load", start);
  }

  /* ---------- Illustration: framing + when to animate ---------- */
  var art = document.querySelector(".hero-art");
  var artSvg = art && art.querySelector("svg");
  var mobileMQ = window.matchMedia("(max-width: 900px)");
  var vbDesktop = artSvg && artSvg.getAttribute("viewBox");
  var vbMobile = artSvg && artSvg.getAttribute("data-viewbox-mobile");
  function frameArt() {
    if (!artSvg) return;
    // on mobile: tighter crop, flat clean bottom edge, bigger mountain
    var vb = mobileMQ.matches ? vbMobile : vbDesktop;
    var p = vb.split(/\s+/);
    artSvg.setAttribute("viewBox", vb);
    artSvg.setAttribute("width", p[2]);   // keep the box ratio in sync with the crop
    artSvg.setAttribute("height", p[3]);
  }
  frameArt();
  if (mobileMQ.addEventListener) mobileMQ.addEventListener("change", frameArt);

  function playArt() { if (art) art.classList.add("art-in"); }
  if (art && mobileMQ.matches && "IntersectionObserver" in window) {
    // on mobile the mountain sits below the fold: play it when it scrolls into view
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && root.classList.contains("is-loaded")) { playArt(); io.disconnect(); }
      });
    }, { threshold: 0.9 });
    io.observe(art);
    root.addEventListener("np:loaded", function () { io.unobserve(art); io.observe(art); });
  } else {
    root.addEventListener("np:loaded", playArt);
  }

  /* ---------- Compact header on scroll ---------- */
  var header = document.querySelector(".site-header");
  var layers = Array.prototype.slice.call(document.querySelectorAll(".hero-art .px"));
  var hero = document.querySelector(".hero-card");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle("is-compact", y > 40);

    /* parallax: layers drift at different speeds while the hero is on screen */
    if (!reduceMotion.matches && !mobileMQ.matches && hero) {
      var rect = hero.getBoundingClientRect();
      if (rect.bottom > 0) {
        var p = Math.min(Math.max(-rect.top, 0), rect.height);
        layers.forEach(function (g) {
          var d = parseFloat(g.getAttribute("data-depth")) || 0;
          g.style.transform = "translate3d(0," + (p * d).toFixed(1) + "px,0)";
        });
      }
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();


  /* ---------- Scroll reveal for sections (same motion language everywhere) ---------- */
  var revealEls = document.querySelectorAll(".reveal-on-scroll");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); }
      });
    }, { threshold: 0.22, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) {
      // stacked icons on mobile animate one by one as they arrive, no extra stagger
      if (mobileMQ.matches && el.classList.contains("pillar")) el.style.setProperty("--d", "0ms");
      ro.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- horizontal carousels (100 days, reviews) ---------- */
  function carousel(track, items, prevBtn, nextBtn, curEl, bar, totalEl, controls) {
    if (!track || !items.length || !prevBtn || !nextBtn) return;
    var n = items.length;
    if (totalEl) totalEl.textContent = n;

    function stepSize() {
      var gap = parseFloat(getComputedStyle(items[0].parentNode).columnGap) || 0;
      return items[0].offsetWidth + gap;
    }
    function update() {
      var pos = Math.abs(track.scrollLeft);           // RTL: scrollLeft goes negative
      var max = track.scrollWidth - track.clientWidth;
      var atEnd = pos >= max - 2;
      var idx = atEnd ? n - 1 : Math.min(n - 1, Math.round(pos / stepSize()));
      if (curEl) curEl.textContent = idx + 1;
      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? (1 / n) + (pos / max) * (1 - 1 / n) : 1).toFixed(3) + ")";
      prevBtn.disabled = pos < 2;
      nextBtn.disabled = atEnd;
      // nothing to scroll (everything fits) → hide the controls
      if (controls) controls.classList.toggle("is-static", max <= 2);
    }
    function go(dir) { // dir: +1 = next item (further left in RTL)
      track.scrollBy({ left: -dir * stepSize(), behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
    prevBtn.addEventListener("click", function () { go(-1); });
    nextBtn.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", update);
    update();

    // drag to scroll with a mouse on desktop (touch/trackpad scroll natively)
    var drag = null;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft };
      track.style.scrollSnapType = "none";
      track.style.cursor = "grabbing";
    });
    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      track.scrollLeft = drag.left - (e.clientX - drag.x);
    });
    window.addEventListener("pointerup", function () {
      if (!drag) return;
      var left = track.scrollLeft;
      drag = null;
      track.style.cursor = "";
      track.style.scrollSnapType = "";
      track.scrollLeft = left; // let snap settle on the nearest item
    });
    track.style.cursor = "grab";
  }

  var jTrack = document.querySelector(".journey-track");
  if (jTrack) carousel(jTrack, jTrack.querySelectorAll(".step"),
    document.querySelector(".j-prev"), document.querySelector(".j-next"),
    document.querySelector(".j-cur"), document.querySelector(".j-progress i"), null, null);

  var rv = document.querySelector(".reviews");
  if (rv) carousel(rv.querySelector(".reviews-track"), rv.querySelectorAll(".rv-card"),
    rv.querySelector(".c-prev"), rv.querySelector(".c-next"),
    rv.querySelector(".c-cur"), rv.querySelector(".c-progress i"),
    rv.querySelector(".c-total"), rv.querySelector(".carousel-controls"));


  /* ---------- Accordion (bookkeeping) ---------- */
  document.querySelectorAll(".acc-item").forEach(function (item) {
    var btn = item.querySelector(".acc-head");
    btn.addEventListener("click", function () {
      var open = !item.classList.contains("open");
      // only one group open at a time
      if (open) {
        item.parentNode.querySelectorAll(".acc-item.open").forEach(function (other) {
          if (other === item) return;
          other.classList.remove("open");
          other.querySelector(".acc-head").setAttribute("aria-expanded", "false");
        });
      }
      item.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });


  /* ---------- Refresh always starts at the top; menu links don't stick in the URL ---------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  var nav0 = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var isReload = nav0 && nav0.type === "reload";
  var inFrame = false;
  try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  // inside the preview frame the host page re-sends its old #hash on every refresh, so ignore it there
  // a menu link on an inner page (index.html#journey) leaves the target here, because the hash itself is dropped in the preview frame
  var pending = null;
  try { pending = sessionStorage.getItem("np-target"); sessionStorage.removeItem("np-target"); } catch (e) {}
  if (isReload || inFrame || !location.hash) {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo(0, 0);
  }
  if (pending && !isReload && pending !== "top") {
    var pt = document.getElementById(pending);
    if (pt) setTimeout(function () { pt.scrollIntoView({ block: "start" }); }, 60);
  }
  document.querySelectorAll('a[href^="index.html#"]').forEach(function (a) {
    a.addEventListener("click", function () {
      try { sessionStorage.setItem("np-target", a.getAttribute("href").split("#")[1]); } catch (e) {}
    });
  });
  document.querySelectorAll('a[href^="#"]:not(.js-wa)').forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    if (!id) return;                       // WhatsApp buttons get their real href from JS
    a.addEventListener("click", function (e) {
      var target = id === "top" ? document.body : document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      if (id === "top") window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
      else target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    });
  });

  /* ---------- FAQ: one question open at a time (details[name] does it natively; fallback for older browsers) ---------- */
  document.querySelectorAll("details[name]").forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (!d.open) return;
      document.querySelectorAll('details[name="' + d.getAttribute("name") + '"]').forEach(function (o) {
        if (o !== d && o.open) o.open = false;
      });
    });
  });

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  function setMenu(open) {
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "סגירת התפריט" : "פתיחת התפריט");
  }
  toggle.addEventListener("click", function () { setMenu(!header.classList.contains("nav-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  document.addEventListener("click", function (e) { if (!header.contains(e.target)) setMenu(false); });
})();
