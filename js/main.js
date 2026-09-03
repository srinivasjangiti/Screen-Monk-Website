/* =========================================================
   SCREEN MONK — main.js
   The conductor. Owns the boot sequence:
     1. preload the first image (and let the rest stream in)
     2. drive the preloader progress bar honestly (image onload)
     3. release the preloader with a slow fade
     4. start the snow, prime the scene, prime audio on first gesture
   Also handles: keyboard accessibility, reduced-motion, and
   making sure nothing hammers the CPU when the tab is hidden.
   ========================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var body = document.body;
  body.classList.add("is-loading");

  var preloader = document.getElementById("preloader");
  var bar = document.getElementById("preloaderBar");
  var hint = document.getElementById("preloaderHint");

  var hints = [
    "the mountain is gathering snow",
    "stillness is loading",
    "the path is being cleared",
    "a quiet place is being prepared"
  ];
  var hintTimer = null;
  if (hint && !prefersReduced) {
    var hi = 0;
    function advanceHint() {
      clearInterval(hintTimer);
      if (preloader && preloader.classList.contains("is-done")) return;
      hi = (hi + 1) % hints.length;
      hint.style.opacity = "0";
      setTimeout(function () { hint.textContent = hints[hi]; hint.style.opacity = "1"; }, 500);
      hintTimer = setInterval(advanceHint, 2600);
    }
    hintTimer = setInterval(advanceHint, 2600);
    hint.style.transition = "opacity 500ms ease";
  }

  /* ---------- honest preloader progress ---------- */
  // We track real asset load (first hero image). While waiting, the bar
  // creeps toward 90% so it never feels stuck, then completes on load.
  var progress = 0;
  var target = 0;

  function setBar(p) {
    progress = Math.max(progress, p);
    if (bar) bar.style.width = Math.min(100, progress) + "%";
  }

  // creep
  var creepInterval = setInterval(function () {
    if (target > progress) setBar(progress + Math.max(0.5, (target - progress) * 0.08));
  }, 120);

  // listen for the hero image load (first scenery layer in the fixed stack)
  function onHeroReady() {
    target = 100;
    setBar(100);
    setTimeout(finish, prefersReduced ? 200 : 700);
  }

  var firstLayer = document.querySelector(".scenery__layer img");
  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(creepInterval);
    if (hintTimer) clearInterval(hintTimer);
    body.classList.remove("is-loading");
    if (preloader) preloader.classList.add("is-done");
    // start the snow once the veil lifts
    if (window.ScreenMonkSnow) window.ScreenMonkSnow.start();
    // ensure scene is primed
    if (window.ScreenMonkScene) window.ScreenMonkScene.boot();
  }

  // Watch for the hero image to actually load.
  if (firstLayer) {
    var onload = function () {
      firstLayer.removeEventListener("load", onload);
      onHeroReady();
    };
    if (firstLayer.complete && firstLayer.naturalWidth) {
      onHeroReady();
    } else {
      firstLayer.addEventListener("load", onload);
    }
    // hard safety net: never trap the visitor in the preloader
    setTimeout(function () { if (!finished) { target = 100; finish(); } }, 6000);
  } else {
    setTimeout(finish, 800);
  }

  // nudge target upward as time passes (gives a sense of progress)
  setTimeout(function () { target = 35; }, 300);
  setTimeout(function () { target = 60; }, 1100);

  /* ---------- music toggle (top-right) ----------
     The click handler lives in audio.js so the audio module owns
     its own button and the state machine is the single source of
     truth. main.js just orchestrates the boot sequence. */

  /* ---------- keyboard: arrow keys step between scenes for a11y ------- */
  document.addEventListener("keydown", function (e) {
    var scenes = document.querySelectorAll(".scene");
    if (!scenes.length) return;
    // find the section closest to viewport centre
    var vh = window.innerHeight;
    var centreY = (window.pageYOffset || 0) + vh / 2;
    var idx = 0, best = Infinity;
    for (var i = 0; i < scenes.length; i++) {
      var r = scenes[i].getBoundingClientRect();
      var c = (window.pageYOffset || 0) + r.top + r.height / 2;
      var d = Math.abs(c - centreY);
      if (d < best) { best = d; idx = i; }
    }
    if (e.key === "PageDown" || (e.key === "ArrowDown" && e.shiftKey)) {
      e.preventDefault();
      var n = scenes[idx + 1];
      if (n) n.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    } else if (e.key === "PageUp" || (e.key === "ArrowUp" && e.shiftKey)) {
      e.preventDefault();
      var p = scenes[idx - 1];
      if (p) p.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    }
  });

  /* ---------- final reassurance: if anything threw before finish, release */
  window.addEventListener("load", function () {
    setTimeout(function () { if (!finished) { target = 100; finish(); } }, 1500);
  });
})();
