document.documentElement.classList.add("js");

document.getElementById("year").textContent = new Date().getFullYear();

// Mark the section currently in view in the masthead nav.
const links = [...document.querySelectorAll(".masthead nav a")];
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
