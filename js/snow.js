/* =========================================================
   SCREEN MONK — snow.js
   Heavy, two-layer canvas snowfall. Back layer: small, slow,
   drifting, low opacity (depth). Front layer: larger, faster,
   sharper (presence). Wind ebbs and flows. Density scales with
   viewport. Snow fades to nothing as the visitor reaches the
   warm final section — warmth melts the snow. Reduced-motion
   users get a static, sparse dusting.
   ========================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function Layer(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.opts = opts;
    this.flakes = [];
    this.w = 0; this.h = 0;
    this.alpha = 1;        // current opacity (driven by warmth / focus veil)
    this.targetAlpha = 1;
    this.melted = false;   // true on the warm (final) section
    this.hidden = false;   // true while the focus veil is open
    this.wind = 0;         // current wind
    this.windTarget = opts.windBase;
    this.recomputeAlpha();
    this.resize();
  }

  // Target alpha is derived from two independent flags. Tracking them
  // separately means closing the focus veil on the warm section does NOT
  // bring the snow back (and opening it on a cold section still hides
  // snow even though it isn't melted).
  Layer.prototype.recomputeAlpha = function () {
    var a = (this.melted || this.hidden) ? 0 : 1;
    this.targetAlpha = prefersReduced ? a * 0.5 : a;
  };

  Layer.prototype.resize = function () {
    var oldW = this.w, oldH = this.h;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // First resize: scatter across the viewport.
    // Later resizes: keep existing flakes alive and just clamp to the new
    // bounds — re-scattering on every window resize looked like snow
    // teleporting around, which broke the calm.
    if (oldW === 0 || oldH === 0) {
      this.populate();
    } else {
      var sx = this.w / oldW, sy = this.h / oldH;
      for (var i = 0; i < this.flakes.length; i++) {
        var f = this.flakes[i];
        f.x = (f.x * sx) % this.w;
        if (f.x < 0) f.x += this.w;
        f.y = (f.y * sy) % this.h;
        if (f.y < 0) f.y += this.h;
      }
      // top up if the new viewport is significantly larger
      this.rebalance();
    }
  };

  Layer.prototype.rebalance = function () {
    // Add or remove flakes to match current target density without a full
    // re-spawn — keeps visible flakes stable across minor resizes.
    var area = this.w * this.h;
    var target = Math.round((area / 1e6) * this.opts.perArea);
    target = Math.max(this.opts.min, Math.min(this.opts.max, target));
    if (prefersReduced) target = Math.round(target * 0.25);
    if (this.w < 600) target = Math.max(20, Math.round(target * 0.4));
    while (this.flakes.length < target) this.flakes.push(this.makeFlake(true));
    if (this.flakes.length > target) this.flakes.length = target;
  };

  Layer.prototype.populate = function () {
    // Density proportional to viewport area, clamped.
    var area = this.w * this.h;
    var per = this.opts.perArea;        // flakes per million px^2
    var count = Math.round((area / 1e6) * per);
    count = Math.max(this.opts.min, Math.min(this.opts.max, count));
    if (prefersReduced) count = Math.round(count * 0.25);
    // Halve the floor on small screens — the minimum counts (160 + 70)
    // were designed for desktop and visibly jank low-end mobile.
    if (this.w < 600) count = Math.max(20, Math.round(count * 0.4));

    this.flakes = [];
    for (var i = 0; i < count; i++) this.flakes.push(this.makeFlake(true));
  };

  Layer.prototype.makeFlake = function (scatter) {
    var r = rand(this.opts.rMin, this.opts.rMax);
    return {
      x: Math.random() * this.w,
      y: scatter ? Math.random() * this.h : -10,
      r: r,
      // fall speed proportional to radius (bigger = closer = faster)
      vy: this.opts.fall * (0.6 + r / this.opts.rMax) * rand(0.7, 1.3),
      swayAmp: rand(this.opts.swayMin, this.opts.swayMax),
      swaySpd: rand(0.0004, 0.0014),
      phase: Math.random() * Math.PI * 2,
      opacity: rand(this.opts.oMin, this.opts.oMax),
      flicker: rand(0.0008, 0.002)
    };
  };

  Layer.prototype.step = function (dt, t) {
    var ctx = this.ctx;
    // ease alpha toward target (melt on warm section / hide during focus)
    // 0.1 ≈ 95% of the way in ~28 frames (~0.5s at 60fps), so by the time
    // the visitor lands on the warm section, the snow is visually gone.
    this.alpha += (this.targetAlpha - this.alpha) * 0.1;
    // ease wind toward a slowly wandering target
    this.windTarget += (rand(-1, 1) * 0.02);
    if (this.windTarget > this.opts.windBase + this.opts.windGust)
      this.windTarget = this.opts.windBase + this.opts.windGust;
    if (this.windTarget < this.opts.windBase - this.opts.windGust)
      this.windTarget = this.opts.windBase - this.opts.windGust;
    this.wind += (this.windTarget - this.wind) * 0.01;

    ctx.clearRect(0, 0, this.w, this.h);
    if (this.alpha < 0.01) return;

    ctx.save();
    var flakes = this.flakes;
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.vy * dt;
      f.phase += f.swaySpd * dt;
      var sway = Math.sin(f.phase) * f.swayAmp;
      var x = f.x + sway + this.wind * (f.r / this.opts.rMax) * dt * 0.06;
      // wrap horizontally
      if (x < -10) x += this.w + 20; else if (x > this.w + 10) x -= this.w + 20;

      // recycle to top when below screen
      if (f.y > this.h + 6) {
        f.y = -6;
        f.x = Math.random() * this.w;
      }

      // subtle twinkle
      var o = f.opacity * (0.8 + 0.2 * Math.sin(t * f.flicker + f.phase));
      o *= this.alpha;

      ctx.beginPath();
      ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(220, 232, 245," + o + ")";
      if (this.opts.blur && f.r > 2.2) {
        ctx.shadowColor = "rgba(220, 232, 245," + (o * 0.6) + ")";
        ctx.shadowBlur = this.opts.blur;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }
    ctx.restore();
  };

  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---- instantiate the two layers ----
  var back = new Layer(document.getElementById("snowBack"), {
    perArea: 40, min: 160, max: 620,
    rMin: 0.8, rMax: 2.6,
    oMin: 0.25, oMax: 0.6,
    fall: 0.016,            // px per ms baseline
    swayMin: 8, swayMax: 22,
    windBase: 8, windGust: 14,
    blur: 0
  });

  var front = new Layer(document.getElementById("snowFront"), {
    perArea: 16, min: 70, max: 280,
    rMin: 2.0, rMax: 5.6,
    oMin: 0.5, oMax: 0.95,
    fall: 0.038,
    swayMin: 12, swayMax: 34,
    windBase: 12, windGust: 20,
    blur: 8
  });

  var layers = [back, front];

  // ---- animation loop ----
  var running = true;
  var last = performance.now();

  function frame(now) {
    if (!running) return;
    var dt = Math.min(now - last, 48); // clamp delta (tab switches)
    last = now;
    for (var i = 0; i < layers.length; i++) layers[i].step(dt, now);
    requestAnimationFrame(frame);
  }

  // ---- resize handling (debounced) ----
  var rT;
  window.addEventListener("resize", function () {
    clearTimeout(rT);
    rT = setTimeout(function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (var i = 0; i < layers.length; i++) layers[i].resize();
    }, 180);
  });

  // ---- visibility: pause when tab hidden (saves battery) ----
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      running = false;
    } else if (!prefersReduced) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  });

  // ---- public control surface (used by scene.js / main.js) ----
  window.ScreenMonkSnow = {
    // meltValue 0 = full snow, 1 = no snow (warm section).
    setMelt: function (m) {
      var melt = m > 0.5;
      for (var i = 0; i < layers.length; i++) {
        layers[i].melted = melt;
        layers[i].recomputeAlpha();
      }
    },
    // hide entirely (focus veil open, or any other reason).
    setHidden: function (h) {
      for (var i = 0; i < layers.length; i++) {
        layers[i].hidden = h;
        layers[i].recomputeAlpha();
      }
    },
    start: function () {
      if (prefersReduced) {
        // draw one static frame, no loop — and don't even schedule rAF
        for (var i = 0; i < layers.length; i++) layers[i].step(16, performance.now());
        return;
      }
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  };
})();
