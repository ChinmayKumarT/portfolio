# Chinmay Kumar T — portfolio

Single-page static portfolio. No build step.

- `index.html`, `styles.css`, `script.js` — the site
- `work/*.html` — one page per project, linked from the project titles on the index
- `img/<project>/` — screenshots for that project page. Name them `1.png`, `2.png`, `3.png` ... (jpg/webp also fine). The page picks them up automatically and stops at the first missing number; the first image is shown full width.
- `Chinmay_Kumar_T.pdf` — résumé served by the "Résumé" link (regenerate from the `.docx` when it changes)

Preview locally:

    python -m http.server 4173

Deploy by pointing Netlify, Vercel or GitHub Pages at this folder.
