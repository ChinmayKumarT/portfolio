// Renders the Skills grid and the project list from the JSON files in content/,
// which is what the CMS at /admin edits. Nothing here needs a build step.
(function () {
  const base = document.body.dataset.base || "";
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // A path the CMS wrote starts at the site root; our own start beside the page.
  const asset = (p) => (String(p).startsWith("/") ? p : base + p);
  const get = (p, key) => fetch(base + p, { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(p + " " + r.status);
    return r.json();
  }).then((d) => (Array.isArray(d) ? d : d[key] || []));

  function renderSkills(skills) {
    const grid = document.getElementById("skill-grid");
    if (!grid) return;
    grid.innerHTML = skills.map((s) => `
      <li class="skill" style="--brand: ${esc(s.color || "#3a342c")}">
        <i class="skill-icon" style="--icon: url('${esc(asset(s.icon))}')" aria-hidden="true"></i>
        <span>${esc(s.name)}</span>
      </li>`).join("");
  }

  function projectBody(p) {
    const points = (p.points || []).map((t) => `<li>${esc(t)}</li>`).join("");
    const meta = (p.meta || []).map((m) => `<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join("");
    const rows = (p.results || []).map((r) => `<tr><td>${esc(r.metric)}</td><td><code>${esc(r.value)}</code></td></tr>`).join("");
    return `
      <p class="project-what">${esc(p.summary)}</p>
      ${points ? `<ul class="project-points">${points}</ul>` : ""}
      ${rows ? `<table class="results" aria-label="Model results">
        <thead><tr><th scope="col">Metric</th><th scope="col">Result</th></tr></thead>
        <tbody>${rows}</tbody></table>` : ""}
      ${meta ? `<dl class="project-meta">${meta}</dl>` : ""}`;
  }

  function renderProjects(projects) {
    const list = document.getElementById("project-list");
    if (!list) return;
    list.innerHTML = projects.map((p) => `
      <article class="project">
        <div class="project-head">
          <h3><a href="${base}work/project.html?p=${encodeURIComponent(p.slug)}">${esc(p.title)}</a></h3>
          <a class="live" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.host)}</a>
        </div>
        <div class="project-body">
          ${projectBody(p)}
          <a class="more" href="${base}work/project.html?p=${encodeURIComponent(p.slug)}">See the project</a>
        </div>
      </article>`).join("");
  }

  function renderDetail(projects) {
    const root = document.getElementById("project-detail");
    if (!root) return;
    const slug = new URLSearchParams(location.search).get("p");
    const p = projects.find((x) => x.slug === slug);
    if (!p) {
      root.innerHTML = `<h1>Project not found</h1>
        <p class="project-what">No project matches that address.
        <a href="${base}index.html#experience">See all work</a>.</p>`;
      return;
    }
    document.title = p.title + " — Chinmay Kumar T";
    root.innerHTML = `
      <section class="detail-intro">
        <a class="back" href="${base}index.html#experience">All work</a>
        <h1>${esc(p.title)}</h1>
        <a class="live" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.host)}</a>
      </section>
      <section class="detail-body">${projectBody(p)}</section>
      <section class="screens" id="screens" data-folder="${base}img/${esc(p.slug)}" hidden aria-labelledby="screens-title">
        <h2 id="screens-title">Screens</h2>
        <div class="screen-grid"></div>
      </section>
      <section class="detail-nav"><a class="back" href="${base}index.html#experience">Back to all work</a></section>`;
    document.dispatchEvent(new CustomEvent("screens:ready"));
  }

  const jobs = [];
  if (document.getElementById("skill-grid")) jobs.push(get("content/skills.json", "skills").then(renderSkills));
  if (document.getElementById("project-list") || document.getElementById("project-detail")) {
    jobs.push(get("content/projects.json", "projects").then((p) => { renderProjects(p); renderDetail(p); }));
  }
  Promise.all(jobs)
    .then(() => document.dispatchEvent(new CustomEvent("content:ready")))
    .catch((err) => {
      console.error(err);
      document.querySelectorAll("#skill-grid, #project-list, #project-detail").forEach((el) => {
        el.innerHTML = '<p class="load-error">This content could not be loaded. Please refresh the page.</p>';
      });
    });
})();
