# Lihan Zuo Academic Homepage

This branch contains the clean published static build for `zuo-lihan.github.io`.

- Live site: `https://zuo-lihan.github.io/`
- Published branch: `master`
- Development branch: `develop`
- Legacy site backup: `old`

GitHub Pages reads this branch from the repository root. The live page is served from `index.html`, with supporting files in `assets/`, `sections/`, `docs/`, and `img/`.

## Local Preview For This Branch

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173/index.html
```

## Maintenance Workflow

Use `develop` for normal editing. The editable source lives under `preview/` on that branch.

```bash
git switch develop
HOST=127.0.0.1 PORT=4173 node preview/dev-server.js
```

Open:

```text
http://127.0.0.1:4173/preview/index.html
```

The preview server supports hot refresh for HTML, CSS, JS, image, JSON, and Markdown changes under `preview/`. Stop it with `Ctrl-C`.

Before publishing a confirmed edit:

```bash
node preview/build.js
git add README.md preview/build.js preview/dev-server.js preview/index.html preview/assets preview/sections preview/docs
git commit -m "Update academic CV homepage"
git push origin develop
```

Then sync the confirmed static output from `preview/` into the clean `master` root and push `master`.

## Visitor Globe

The footer uses the LiveTrafficFeed 3D visitor map widget to record country-level visitor origins for this domain. The records are stored by the third-party service, not in this repository, and should persist across layout changes as long as the same widget/domain setup is kept.

The visitor globe is intentionally not part of the top navigation or the right-side progress dots.
