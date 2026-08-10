/* mattmckelvy.com v2 — tabs, hue drift, cursor, case viewer */
(function () {
  "use strict";
  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- slow hue drift: full cycle ≈ 3.5 minutes ---------- */
  var hue = 26;
  if (!reduced) {
    var lastT = performance.now();
    (function drift(now) {
      var dt = Math.min((now - lastT) / 1000, 0.1); lastT = now;
      hue = (hue + dt * 1.7) % 360;
      document.documentElement.style.setProperty("--hue", hue.toFixed(2));
      if (window.PIT) window.PIT.setHue(hue);
      requestAnimationFrame(drift);
    })(lastT);
  }

  /* ---------- custom cursor ---------- */
  var cur = document.getElementById("cur"), ring = document.getElementById("curRing");
  if (cur && !reduced && matchMedia("(pointer:fine)").matches) {
    var cx = -100, cy = -100, rx = -100, ry = -100;
    addEventListener("pointermove", function (e) { cx = e.clientX; cy = e.clientY; }, { passive: true });
    (function follow() {
      rx += (cx - rx) * 0.22; ry += (cy - ry) * 0.22;
      cur.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
      ring.style.left = rx + "px"; ring.style.top = ry + "px";
      requestAnimationFrame(follow);
    })();
    document.addEventListener("mouseover", function (e) {
      var hot = e.target.closest && e.target.closest("a,button,[data-hover]");
      ring.classList.toggle("hot", !!hot);
    });
  }

  /* ---------- tab engine ---------- */
  var tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
  var panels = {};
  tabs.forEach(function (t) { panels[t.dataset.panel] = document.getElementById(t.getAttribute("aria-controls")); });
  var current = "home";
  function show(name, push) {
    if (name === current || !panels[name]) return;
    var from = panels[current], to = panels[name];
    var dir = tabs.findIndex(function(t){return t.dataset.panel===name}) >
              tabs.findIndex(function(t){return t.dataset.panel===current}) ? 1 : -1;
    from.classList.remove("active");
    from.classList.toggle("exit-left", dir === 1);
    setTimeout(function () { if (!from.classList.contains("active")) from.hidden = true; }, reduced ? 0 : 460);
    to.hidden = false;
    to.classList.toggle("exit-left", dir === -1);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      to.classList.remove("exit-left"); to.classList.add("active");
    }); });
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.panel === name)); });
    current = name;
    if (push !== false) { try { history.replaceState(null, "", "#" + name); } catch (e) {} }
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { show(t.dataset.panel); }); });
  document.getElementById("wm").addEventListener("click", function () { show("home"); });
  document.querySelectorAll("[data-goto]").forEach(function (b) {
    b.addEventListener("click", function () { show(b.dataset.goto); });
  });
  /* arrow keys move between tabs (unless a dialog is open) */
  addEventListener("keydown", function (e) {
    if (document.getElementById("casewrap").hidden === false) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || "")) return;
    var i = tabs.findIndex(function (t) { return t.dataset.panel === current; });
    if (e.key === "ArrowRight" && i < tabs.length - 1) show(tabs[i + 1].dataset.panel);
    if (e.key === "ArrowLeft" && i > 0) show(tabs[i - 1].dataset.panel);
  });
  /* deep link */
  var h = location.hash.replace("#", "");
  if (h && panels[h]) { panels.home.classList.remove("active"); panels.home.hidden = true;
    panels[h].hidden = false; panels[h].classList.add("active");
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.panel === h)); });
    current = h; }

  /* ---------- case viewer ---------- */
  var wrap = document.getElementById("casewrap"),
      content = document.getElementById("caseContent"),
      closeBtn = document.getElementById("caseClose"),
      lastFocus = null;
  function openCase(id) {
    var tpl = document.getElementById("tpl-" + id);
    if (!tpl) return;
    content.innerHTML = "";
    content.appendChild(tpl.content.cloneNode(true));
    wrap.hidden = false; lastFocus = document.activeElement;
    closeBtn.focus();
  }
  function closeCase() {
    wrap.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.querySelectorAll(".wcard").forEach(function (c) {
    c.addEventListener("click", function () { openCase(c.dataset.case); });
  });
  closeBtn.addEventListener("click", closeCase);
  wrap.addEventListener("click", function (e) { if (e.target === wrap) closeCase(); });
  addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !wrap.hidden) closeCase();
    if (e.key === "Tab" && !wrap.hidden) {           /* focus trap */
      var f = wrap.querySelectorAll("button,a");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- copy link ---------- */
  var copyBtn = document.getElementById("copyLink");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var t = copyBtn.textContent;
    function done(ok) { copyBtn.textContent = ok ? "Copied ✓" : "mattmckelvy.com"; setTimeout(function () { copyBtn.textContent = t; }, 1600); }
    if (navigator.clipboard) navigator.clipboard.writeText("https://mattmckelvy.com/").then(function(){done(true)},function(){done(false)});
    else done(false);
  });
})();
