document.documentElement.classList.add("js");

document.getElementById("year").textContent = new Date().getFullYear();

// Keep anchored sections clear of the sticky header, whatever height it wraps to.
(function () {
  const head = document.querySelector(".masthead");
  const set = () => document.documentElement.style.setProperty("--head-h", head.offsetHeight + "px");
  set();
  window.addEventListener("resize", set);
  // The initial hash jump happened before the offset was known; redo it.
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: "instant", block: "start" }));
  }
})();

// Project pages: fill the Screens gallery from img/<project>/1.png, 2.png, ...
// (also .jpg / .webp). Drop files in the folder; no HTML edits needed.
// Stops at the first missing number. The section stays hidden when the folder is empty.
(function () {
  const section = document.getElementById("screens");
  if (!section) return;
  const grid = section.querySelector(".screen-grid");
  const folder = section.dataset.folder;
  const exts = ["png", "jpg", "jpeg", "webp"];

  function tryLoad(n) {
    let i = 0;
    return new Promise((resolve) => {
      const attempt = () => {
        if (i >= exts.length) return resolve(null);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => { i += 1; attempt(); };
        img.src = folder + "/" + n + "." + exts[i];
      };
      attempt();
    });
  }

  (async () => {
    for (let n = 1; n <= 24; n += 1) {
      const img = await tryLoad(n);
      if (!img) break;
      const fig = document.createElement("figure");
      img.alt = "Screen " + n;
      img.loading = "lazy";
      img.decoding = "async";
      if (n === 1 || img.naturalWidth > img.naturalHeight * 1.6) fig.classList.add("wide");
      fig.appendChild(img);
      grid.appendChild(fig);
      section.hidden = false;
    }
  })();
})();

// Mark the section currently in view in the masthead nav.
const links = [...document.querySelectorAll(".masthead nav a")].filter((a) => a.getAttribute("href").startsWith("#"));
const sections = links
  .map((a) => document.querySelector(a.getAttribute("href")))
  .filter(Boolean);

function markCurrent() {
  const mid = window.scrollY + window.innerHeight * 0.4;
  let current = null;
  sections.forEach((s) => { if (s.offsetTop <= mid) current = s; });
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) current = sections[sections.length - 1];
  links.forEach((a) => {
    if (current && a.getAttribute("href") === "#" + current.id) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}
window.addEventListener("scroll", markCurrent, { passive: true });
window.addEventListener("resize", markCurrent);
markCurrent();

// Hero object: a faceted mint solid inside a taupe wireframe shell, with a
// slow drift and a gentle tilt toward the pointer. Static frame under reduced motion.
(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || typeof THREE === "undefined") return;
  const host = canvas.parentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    host.hidden = true;
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4);

  const group = new THREE.Group();
  scene.add(group);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.55, 1),
    new THREE.MeshStandardMaterial({ color: 0xc0dbc4, flatShading: true, roughness: 0.55, metalness: 0.08 })
  );
  group.add(core);

  const shellGeo = new THREE.IcosahedronGeometry(2.35, 1);
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(shellGeo),
    new THREE.LineBasicMaterial({ color: 0x6a6053, transparent: true, opacity: 0.55 })
  );
  group.add(shell);

  const nodes = new THREE.Points(
    shellGeo,
    new THREE.PointsMaterial({ color: 0x6a6053, size: 0.075, sizeAttenuation: true })
  );
  group.add(nodes);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.0, 0.012, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0x92958a, transparent: true, opacity: 0.8 })
  );
  ring.rotation.x = Math.PI / 2.4;
  group.add(ring);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x92958a, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd3ebd3, 0.8);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  let targetX = 0, targetY = 0;
  if (!reduce) {
    window.addEventListener("pointermove", (e) => {
      targetY = (e.clientX / window.innerWidth - 0.5) * 0.7;
      targetX = (e.clientY / window.innerHeight - 0.5) * 0.5;
    }, { passive: true });
  }

  let visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);
  }

  const clock = new THREE.Clock();
  group.rotation.set(0.35, -0.5, 0);
  function frame() {
    if (visible) {
      const t = clock.getElapsedTime();
      group.rotation.y += ((targetY + t * 0.12) - group.rotation.y) * 0.04;
      group.rotation.x += ((targetX + Math.sin(t * 0.4) * 0.12) - group.rotation.x) * 0.04;
      shell.rotation.y = -t * 0.05;
      nodes.rotation.y = -t * 0.05;
      ring.rotation.z = t * 0.08;
      renderer.render(scene, camera);
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  frame();
})();
