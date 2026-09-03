# Chinmay Kumar T — portfolio

Single-page static portfolio. No build step.

- `index.html`, `styles.css`, `script.js` — the site
- `content/projects.json`, `content/skills.json` — the editable content. The page renders from these at load.
- `work/project.html` — one template that renders any project from `?p=<slug>`. The older per-project files redirect to it.
- `admin/` — the Decap CMS editor served at `/admin`
- `img/<project>/` — screenshots for that project page. Name them `1.png`, `2.png`, `3.png` ... (jpg/webp also fine). The page picks them up automatically and stops at the first missing number; the first image is shown full width.
- `Chinmay_Kumar_T.pdf` — résumé served by the "Résumé" link (regenerate from the `.docx` when it changes)

Preview locally:

    python -m http.server 4173

Deploy by pointing Netlify, Vercel or GitHub Pages at this folder.


## Editing after deployment

Go to `https://<your-site>/admin` and sign in. You get forms for Projects and
Skills; saving writes a commit to this repository and the host redeploys.

**One-time setup on Netlify** (the CMS talks to the repo through Netlify's
Git Gateway, so these steps must be done once before `/admin` will log in):

1. Netlify → Add new site → Import from Git → pick `ChinmayKumarT/portfolio`.
   No build command; publish directory is `/`.
2. Site configuration → Identity → Enable Identity.
3. Identity → Registration → set to **Invite only**.
4. Identity → Services → Git Gateway → Enable.
5. Identity → Invite users → invite your own email, then accept the emailed link
   and set a password.

To edit locally without Netlify, run `npx decap-server` in this folder, serve the
site, and open `/admin`; `local_backend: true` in `admin/config.yml` points the
editor at your working copy.

**Screenshots** still work without the CMS: drop `1.png`, `2.png` and so on into
`img/<project slug>/` and push. Images added through the CMS land in `img/uploads/`.

**Adding a skill** in the CMS: upload a single-colour SVG icon, type the name, and
give a hex colour dark enough to read on the pale card.
