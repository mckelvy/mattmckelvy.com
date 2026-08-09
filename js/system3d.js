/* The system: ROLES · MARKET · PAY — an interactive constellation.
   Drag to spin. Hover to poke a node. Colors follow the site's hue drift. */
(function () {
  "use strict";
  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function init() {
    var host = document.getElementById("sys3d");
    if (!host || typeof THREE === "undefined") return;
    var W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) { setTimeout(init, 150); return; }

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { return; }  /* no WebGL — hero still works without the toy */
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setSize(W, H);
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.2, 8.4);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    var key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(3, 4, 5); scene.add(key);

    var G = new THREE.Group(); scene.add(G);

    /* three clusters on a ring */
    var CLUSTERS = [
      { name: "ROLES",  hueOff: 0 },
      { name: "MARKET", hueOff: 45 },
      { name: "PAY",    hueOff: 90 }
    ];
    var nodes = [], nodeMats = [], linkPts = [];
    var rng = (function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(42);

    CLUSTERS.forEach(function (c, ci) {
      var a = ci / 3 * Math.PI * 2 + 0.6;
      var cx = Math.cos(a) * 2.1, cy = Math.sin(a) * 1.35, cz = Math.sin(a * 2) * 0.6;
      c.center = new THREE.Vector3(cx, cy, cz);
      for (var i = 0; i < 15; i++) {
        var r = 0.05 + rng() * 0.09;
        var m = new THREE.MeshLambertMaterial({ color: 0x888888 });
        var s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m);
        s.position.set(
          cx + (rng() - 0.5) * 2.1,
          cy + (rng() - 0.5) * 1.7,
          cz + (rng() - 0.5) * 1.7
        );
        s.userData = { cluster: ci, baseScale: 1, pulse: 0, r: r };
        G.add(s); nodes.push(s); nodeMats.push(m);
        linkPts.push(s.position, c.center);
      }
      /* a few cross-links to the next cluster's center */
      var next = CLUSTERS[(ci + 1) % 3];
    });
    /* cross-cluster spine */
    for (var ci = 0; ci < 3; ci++) {
      linkPts.push(CLUSTERS[ci].center, CLUSTERS[(ci + 1) % 3].center);
    }
    var linkGeo = new THREE.BufferGeometry().setFromPoints(linkPts);
    var linkMat = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.22 });
    G.add(new THREE.LineSegments(linkGeo, linkMat));

    /* cluster labels — canvas sprites */
    var labelMats = [];
    CLUSTERS.forEach(function (c) {
      var cv = document.createElement("canvas"); cv.width = 256; cv.height = 64;
      var x = cv.getContext("2d");
      x.font = "600 34px 'IBM Plex Mono', monospace";
      x.textAlign = "center"; x.fillStyle = "#444";
      x.fillText(c.name, 128, 42);
      var tex = new THREE.CanvasTexture(cv);
      var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85 });
      var sp = new THREE.Sprite(mat);
      sp.position.copy(c.center).multiplyScalar(1.18);
      sp.position.y += 0.55;
      sp.scale.set(1.6, 0.4, 1);
      G.add(sp); labelMats.push({ mat: mat, canvas: cv, ctx: x, name: c.name, tex: tex });
    });

    /* interaction: drag with inertia + hover pulse */
    var dragging = false, px = 0, py = 0, vx = 0, vy = 0;
    var ray = new THREE.Raycaster(), mouse = new THREE.Vector2(-2, -2);
    host.addEventListener("pointerdown", function (e) {
      dragging = true; px = e.clientX; py = e.clientY; host.setPointerCapture(e.pointerId);
    });
    host.addEventListener("pointermove", function (e) {
      var rect = host.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (dragging) {
        vy = (e.clientX - px) * 0.005; vx = (e.clientY - py) * 0.004;
        G.rotation.y += vy; G.rotation.x += vx;
        px = e.clientX; py = e.clientY;
      }
    });
    addEventListener("pointerup", function () { dragging = false; });
    host.addEventListener("pointerleave", function () { mouse.set(-2, -2); });

    var hue = 18;
    window.SYS3D = { setHue: function (h) { hue = h; } };

    var running = true;
    document.addEventListener("visibilitychange", function () { running = !document.hidden; });

    (function loop() {
      requestAnimationFrame(loop);
      if (!running) return;
      /* motion */
      if (!dragging) {
        G.rotation.y += reduced ? 0 : 0.0022 + vy;
        G.rotation.x += vx;
        vx *= 0.94; vy *= 0.94;
        G.rotation.x = Math.max(-0.7, Math.min(0.7, G.rotation.x));
      }
      /* hue-synced colors */
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var h = ((hue + CLUSTERS[n.userData.cluster].hueOff) % 360) / 360;
        nodeMats[i].color.setHSL(h, 0.55, 0.42);
        if (n.userData.pulse > 0) {
          n.userData.pulse -= 0.04;
          n.scale.setScalar(1 + n.userData.pulse * 0.9);
        } else n.scale.setScalar(1);
      }
      linkMat.color.setHSL((hue % 360) / 360, 0.3, 0.45);
      /* hover pulse */
      ray.setFromCamera(mouse, camera);
      var hits = ray.intersectObjects(nodes, false);
      if (hits.length) { hits[0].object.userData.pulse = 1; host.style.cursor = "grab"; }
      renderer.render(scene, camera);
    })();

    /* resize */
    var ro = new ResizeObserver(function () {
      var w = host.clientWidth, h2 = host.clientHeight;
      if (!w || !h2) return;
      renderer.setSize(w, h2);
      camera.aspect = w / h2; camera.updateProjectionMatrix();
    });
    ro.observe(host);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
