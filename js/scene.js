/* =========================================================
   SCREEN MONK — scene.js
   Continuous cinematic scroll engine.

   The seven images live in ONE fixed stack (.scenery). Each
   image's opacity is derived CONTINUOUSLY from scroll
   progress — not toggled — so neighbors cross-dissolve
   smoothly into one another as you scroll. This is what makes
   the seven photographs read as one continuous world.

   Section copy (.display/.lede) reveals via an is-in
   class added when a section is firmly on screen, and the
   chapter rail + warmth (final section) + snow-melt are all
   driven from the same single scroll → rAF pass.
   ========================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var sections = Array.prototype.slice.call(document.querySelectorAll(".scene"));
  var layers = Array.prototype.slice.call(document.querySelectorAll(".scenery__layer"));
  var scenery = document.getElementById("scenery");
  var railLinks = Array.prototype.slice.call(document.querySelectorAll(".rail a"));

  // Each layer's <img> — lazy-load once (the img.src is the source of truth;
  // we just avoid re-querying data-src if it's already been set).
  function loadLayer(i) {
    if (!layers[i]) return;
    var img = layers[i].querySelector("img");
    if (!img || img.src) return;
    var src = img.getAttribute("data-src");
    if (src) img.src = src;
  }
  // Always preload the first two for a clean opening
  loadLayer(0); loadLayer(1);

  var warm = false;
  var activeIndex = 0;

  // ---- continuous opacity from a 0..1 scroll position ----
  // Returns opacity for layer i, given the section centre positions.
  // Layer i peaks (opacity 1) when section i is centred; falls off toward
  // neighbors across a blend window so two layers are visibly mid-fade
  // during the transition. This yields a true cross-dissolve.
  function layerOpacity(i, centres) {
    // centres[i] is the viewport-centre-normalized position of section i:
    //   0.0 = section i is exactly centred
    // values are distances; we want closest two layers to share the blend.
    var d = Math.abs(centres[i]);
    // blend window: full opacity when centred, fades over ~0.6 of a section
    var blend = 0.6;
    var o = 1 - (d / blend);
    // smoothstep for a softer shoulder
    o = Math.max(0, Math.min(1, o));
    return o * o * (3 - 2 * o);
  }

  function measure() {
    var vh = window.innerHeight;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var centreY = scrollTop + vh * 0.5;

    // normalized centre offset for each section: 0 = centred, +/- in section-units
    var centres = [];
    for (var i = 0; i < sections.length; i++) {
      var rect = sections[i].getBoundingClientRect();
      var secTop = scrollTop + rect.top;
      var secH = sections[i].offsetHeight || vh;
      // offset of viewport-centre from this section's centre, in section-height units
      centres.push((centreY - (secTop + secH / 2)) / secH);
    }

    // ---- drive layer opacities (cross-dissolve) ----
    if (!prefersReduced) {
      for (var k = 0; k < layers.length; k++) {
        var o = layerOpacity(k, centres);
        layers[k].style.opacity = o.toFixed(3);
        // subtle parallax: each layer drifts slightly as it leaves centre
        var drift = centres[k] * 40; // px
        layers[k].style.transform = "translate3d(0," + (-drift).toFixed(1) + "px,0)";
        // lazy load neighbors of the active region
        if (o > 0.02) { loadLayer(k); if (layers[k - 1]) loadLayer(k - 1); if (layers[k + 1]) loadLayer(k + 1); }
      }
    }

    // ---- pick active section (closest to centre) ----
    var best = 0, bestDist = Infinity;
    for (var j = 0; j < centres.length; j++) {
      var ad = Math.abs(centres[j]);
      if (ad < bestDist) { bestDist = ad; best = j; }
    }
    if (best !== activeIndex) setActive(best);

    // ---- reveal copy: add is-in when a section is within the central band ----
    for (var m = 0; m < sections.length; m++) {
      // 0.5 matches the cross-dissolve blend window so text only
      // "fades in" while its image is still ~halfway visible.
      var inBand = Math.abs(centres[m]) < 0.5;
      sections[m].classList.toggle("is-in", inBand);
    }

    // ---- credits section (The Monk): the closing chapter lives outside the
    //      .scene stack — no scenery image behind it, no is-in reveal to drive.
    //      When the user scrolls it into the central band, light up the 8th
    //      rail entry. The warm/cinematic state from scene 7 stays put.
    var creditsEl = document.getElementById("credits");
    if (creditsEl) {
      var cr = creditsEl.getBoundingClientRect();
      var cH = creditsEl.offsetHeight || vh;
      var cDist = Math.abs(centreY - (scrollTop + cr.top + cH / 2)) / cH;
      if (cDist < 0.5) {
        railLinks.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("data-rail") === "8");
        });
      }
    }
  }

  function setActive(i) {
    activeIndex = i;
    railLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-rail") === String(i + 1));
    });

    var nowWarm = (i === sections.length - 1);
    if (nowWarm !== warm) {
      warm = nowWarm;
      document.body.classList.toggle("is-warm", warm);
      if (window.ScreenMonkSnow) window.ScreenMonkSnow.setMelt(warm ? 1 : 0);
    }

    document.body.classList.toggle("is-cinematic", i >= 1 && i < sections.length - 1);

    // Note: scene-2 music trigger used to live here, but rAF-scheduled
    // play() isn't treated as user-activated in Safari (and some other
    // browsers), which made it unreliable. The trigger now lives
    // directly in index.html as an inline <script>, attached to
    // synchronous scroll/wheel/touch handlers — those ARE
    // user-activated. Scene 2 detection happens by checking
    // scene-2's bounding rect on every scroll event.

    document.dispatchEvent(new CustomEvent("sm:scene", {
      detail: { index: i, warm: warm, id: sections[i].id }
    }));
  }

  // ---- single rAF-scheduled scroll/resize handler ----
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      measure();
    });
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  // smooth-scroll for rail clicks
  railLinks.forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      var target = id && document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    });
  });

  // boot runs measure() which itself picks the correct active section from
  // the user's current scroll position. The old setActive(0) here was a
  // regression: it forced the rail to "The Peak" on every load, so a user
  // who reloaded the page while at the bottom (scene 7) would see "The Peak"
  // lit on the rail until they scrolled — the rail only self-corrected on
  // the next scroll event. measure() handles the initial state.
  function boot() { measure(); }
  window.ScreenMonkScene = { boot: boot, refresh: schedule };

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
