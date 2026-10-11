(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var skipBoot = root.classList.contains("no-boot") || reduceMotion;
  var bootDelay = skipBoot ? 200 : 1750;

  /* ---------- Boot ---------- */

  var boot = document.getElementById("boot");
  if (boot) {
    if (skipBoot) {
      boot.remove();
    } else {
      setTimeout(function () { boot.remove(); }, 2200);
    }
    try { sessionStorage.setItem("5gcx-boot", "1"); } catch (e) {}
  }

  /* ---------- Header + nav ---------- */

  var header = document.getElementById("site-header");
  var onScroll = function () {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Text scramble ---------- */

  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>*";

  function scramble(el) {
    if (el.dataset.scrambled) return;
    el.dataset.scrambled = "1";
    if (reduceMotion) return;

    var finalText = el.textContent;
    var duration = Math.min(1100, 400 + finalText.length * 28);
    var start = performance.now();
    el.setAttribute("aria-label", finalText);

    (function frame(now) {
      var progress = Math.min(1, (now - start) / duration);
      var out = "";
      for (var i = 0; i < finalText.length; i++) {
        var ch = finalText[i];
        if (ch === " " || progress > i / finalText.length) {
          out += ch;
        } else {
          out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      }
      el.textContent = out;
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = finalText;
        el.removeAttribute("aria-label");
      }
    })(start);
  }

  var heroScramble = document.querySelector(".hero__title [data-scramble]");
  if (heroScramble) setTimeout(function () { scramble(heroScramble); }, bootDelay);

  /* ---------- Reveal on scroll ---------- */

  var revealEls = document.querySelectorAll(".reveal");
  var scrambleEls = document.querySelectorAll("main section:not(.hero) [data-scramble]");

  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealObs.observe(el); });

    var scrambleObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          scramble(entry.target);
          scrambleObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    scrambleEls.forEach(function (el) { scrambleObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- HUD telemetry ---------- */

  var zulu = document.getElementById("zulu");
  var tAlt = document.getElementById("t-alt");
  var tMach = document.getElementById("t-mach");
  var tG = document.getElementById("t-g");
  var tHdg = document.getElementById("t-hdg");
  var alt = 32000, mach = 0.94, g = 1.0, hdg = 274;

  function pad(n) { return String(n).padStart(2, "0"); }

  function tickClock() {
    var d = new Date();
    if (zulu) zulu.textContent = pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + "Z";
  }
  tickClock();
  setInterval(tickClock, 1000);

  if (!reduceMotion && tAlt) {
    setInterval(function () {
      alt = Math.max(31800, Math.min(32200, alt + Math.round((Math.random() - 0.5) * 40)));
      mach = Math.max(0.91, Math.min(0.97, mach + (Math.random() - 0.5) * 0.004));
      g = Math.max(0.9, Math.min(1.3, g + (Math.random() - 0.5) * 0.05));
      hdg = Math.max(271, Math.min(277, hdg + Math.round((Math.random() - 0.5) * 1.4)));
      tAlt.textContent = alt.toLocaleString("en-CA");
      tMach.textContent = mach.toFixed(2);
      tG.textContent = g.toFixed(1);
      tHdg.textContent = hdg;
    }, 180);
  }

  var hero = document.getElementById("hero");

  /* ---------- Canvas helpers ---------- */

  function fitCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: rect.width, h: rect.height };
  }

  function whenVisible(el, cb) {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (entries) {
      cb(entries[0].isIntersecting);
    }).observe(el);
  }

  /* ---------- Hero node network ---------- */

  var net = document.getElementById("hero-net");
  if (net && !reduceMotion) {
    var netState, nodes = [], netRunning = false, netFrame;

    var setupNet = function () {
      netState = fitCanvas(net);
      var count = Math.round(Math.min(70, (netState.w * netState.h) / 22000));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * netState.w,
          y: Math.random() * netState.h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25
        });
      }
    };

    var drawNet = function () {
      var ctx = netState.ctx, w = netState.w, h = netState.h;
      var maxDist = 150;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.strokeStyle = "rgba(120,165,225," + (0.35 * (1 - dist / maxDist)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(160,190,220,0.75)";
        ctx.fillRect(a.x - 1, a.y - 1, 2, 2);
      }
      if (netRunning) netFrame = requestAnimationFrame(drawNet);
    };

    setupNet();
    window.addEventListener("resize", setupNet);
    whenVisible(hero, function (visible) {
      if (visible && !netRunning) { netRunning = true; drawNet(); }
      if (!visible) { netRunning = false; cancelAnimationFrame(netFrame); }
    });
  }

  /* ---------- Sensor fusion radar ---------- */

  var radar = document.getElementById("radar");
  if (radar) {
    var rState, rRunning = false, rFrame, lastSweep = 0;
    var SENSOR_COLORS = { R: "255,255,255", E: "255,210,159", D: "104,148,180" };
    var SWEEP_SPEED = 1.1;
    var TAU = Math.PI * 2;

    var contacts = [
      { a: 0.6, r: 0.62, s: "RED" },
      { a: 1.5, r: 0.38, s: "RE" },
      { a: 2.3, r: 0.8, s: "R" },
      { a: 2.9, r: 0.55, s: "ED" },
      { a: 3.8, r: 0.72, s: "RD" },
      { a: 4.4, r: 0.3, s: "E" },
      { a: 5.1, r: 0.66, s: "D" },
      { a: 5.7, r: 0.45, s: "RED" },
      { a: 0.1, r: 0.86, s: "R" }
    ].map(function (c) {
      return {
        a: c.a, r: c.r,
        va: (Math.random() - 0.5) * 0.02,
        vr: (Math.random() - 0.5) * 0.01,
        sensors: c.s.split(""),
        hit: -10
      };
    });

    var setupRadar = function () { rState = fitCanvas(radar); };

    var drawRadar = function (now) {
      var t = now / 1000;
      var ctx = rState.ctx, w = rState.w, h = rState.h;
      var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6;
      var sweep = reduceMotion ? 5.2 : (t * SWEEP_SPEED) % TAU;
      var dt = Math.min(0.1, t - lastSweep);
      lastSweep = t;

      ctx.clearRect(0, 0, w, h);

      var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      bg.addColorStop(0, "rgba(26,74,138,0.4)");
      bg.addColorStop(1, "rgba(63,67,126,0.12)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = "rgba(104,148,180,0.3)";
      ctx.lineWidth = 1;
      for (var ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (R * ring) / 4, 0, TAU);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
      ctx.stroke();

      ctx.strokeStyle = "rgba(104,148,180,0.55)";
      for (var d = 0; d < 72; d++) {
        var ang = (d / 72) * TAU;
        var len = d % 6 === 0 ? 10 : 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
        ctx.lineTo(cx + Math.cos(ang) * (R - len), cy + Math.sin(ang) * (R - len));
        ctx.stroke();
      }

      var trail = 0.9, steps = 36;
      for (var s = 0; s < steps; s++) {
        var a0 = sweep - (s / steps) * trail;
        var a1 = sweep - ((s + 1) / steps) * trail;
        ctx.fillStyle = "rgba(255,110,0," + (0.22 * (1 - s / steps)).toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a1, a0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,110,0,0.95)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
      ctx.stroke();

      var prevSweep = sweep - dt * SWEEP_SPEED;

      contacts.forEach(function (c) {
        if (!reduceMotion) {
          c.a = (c.a + c.va * dt + TAU) % TAU;
          c.r += c.vr * dt;
          if (c.r < 0.22 || c.r > 0.9) c.vr *= -1;
        }

        var diff = (sweep - c.a + TAU) % TAU;
        var prevDiff = (prevSweep - c.a + TAU) % TAU;
        if (diff < prevDiff || reduceMotion) c.hit = t;

        var age = t - c.hit;
        var alpha = reduceMotion ? 1 : Math.max(0, Math.exp(-age / 2.6));
        if (alpha < 0.02) return;

        var px = cx + Math.cos(c.a) * c.r * R;
        var py = cy + Math.sin(c.a) * c.r * R;
        var fused = c.sensors.length > 1;

        c.sensors.forEach(function (key, k) {
          var off = fused ? 9 : 0;
          var oa = c.a * 7 + k * 2.1;
          var sx = px + Math.cos(oa) * off;
          var sy = py + Math.sin(oa) * off;
          var col = SENSOR_COLORS[key];
          if (fused) {
            ctx.strokeStyle = "rgba(" + col + "," + (alpha * 0.5).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
          ctx.fillStyle = "rgba(" + col + "," + alpha.toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(sx, sy, fused ? 2.2 : 3, 0, TAU);
          ctx.fill();
        });

        if (fused) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.PI / 4);
          ctx.strokeStyle = "rgba(255,110,0," + alpha.toFixed(3) + ")";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "rgba(255,110,0,0.9)";
          ctx.shadowBlur = 8;
          ctx.strokeRect(-6, -6, 12, 12);
          ctx.restore();
        }
      });

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx + 5, cy + 5);
      ctx.lineTo(cx, cy + 2);
      ctx.lineTo(cx - 5, cy + 5);
      ctx.closePath();
      ctx.fill();

      if (rRunning && !reduceMotion) rFrame = requestAnimationFrame(drawRadar);
    };

    setupRadar();
    window.addEventListener("resize", setupRadar);
    whenVisible(radar, function (visible) {
      if (visible && !rRunning) {
        rRunning = true;
        lastSweep = performance.now() / 1000;
        rFrame = requestAnimationFrame(drawRadar);
      }
      if (!visible) { rRunning = false; cancelAnimationFrame(rFrame); }
    });
  }

  /* ---------- Contact form state ---------- */

  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("cwd-contact:success", function () { form.dataset.state = "success"; });
    form.addEventListener("cwd-contact:error", function () { form.dataset.state = "error"; });
    form.addEventListener("submit", function () { form.dataset.state = "sending"; });
  }
})();
