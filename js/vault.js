/* =========================================================
   SCREEN MONK — vault.js
   The privacy counter on The Vault (scene 6). It stays at
   zero — that is the whole point — but it should feel alive
   rather than static: a faint, periodic "checked again, still
   zero" pulse, as if the vault keeps re-sealing itself.
   ========================================================= */
(function () {
  "use strict";

  var counter = document.getElementById("counter");
  if (!counter) return;

  var nums = Array.prototype.slice.call(counter.querySelectorAll("[data-count]"));
  // Set transition once — never re-set on every pulse.
  var TRANSITION = "text-shadow 1600ms ease, color 1600ms ease";
  nums.forEach(function (n) { n.style.transition = TRANSITION; });
  var lastPulse = 0;
  var running = true;

  function pulse() {
    // a brief, soft glow confirming the vault is still sealed
    nums.forEach(function (n) {
      n.style.textShadow = "0 0 24px rgba(201,214,227,0.5)";
      n.style.color = "#ffffff";
      setTimeout(function () {
        n.style.textShadow = "none";
        n.style.color = "";
      }, 1500);
    });
  }

  // Re-pulse every ~14s, but only while the vault section is on screen
  function maybePulse(now) {
    if (!running) return;
    if (now - lastPulse > 14000) {
      var rect = counter.getBoundingClientRect();
      var visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (visible) { pulse(); lastPulse = now; }
    }
    requestAnimationFrame(maybePulse);
  }

  // pause when tab hidden
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) { lastPulse = performance.now() - 13000; requestAnimationFrame(maybePulse); }
  });

  // initial pulse shortly after the section first becomes active
  document.addEventListener("sm:scene", function (e) {
    if (e.detail && e.detail.id === "scene-6") {
      lastPulse = performance.now() - 14000; // eligible to pulse immediately
    }
  });

  requestAnimationFrame(maybePulse);
})();
