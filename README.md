# Jacob Wood - CV

My CV as a web page styled like a Playwright test report. Plain HTML, CSS and JS with no framework or build step. Hosted on GitHub Pages.

## Local preview

```sh
npm install
npm run serve        # http://localhost:4173
```

## Tests

```sh
npx playwright install chromium
npm test
```

The suite covers page load, nav anchors, the theme toggle, report filters, the terminal animation (including reduced motion), mobile layout and axe accessibility checks in both themes. It also checks that no phone number appears on the page. CI runs it on every push.

## PDF

`JacobWood-CV.pdf` is generated from the page's print stylesheet:

```sh
npm run pdf
```

Run this after any content change and commit the new PDF so the download stays in sync.

## Files

- `index.html` - all content
- `styles.css` - theme tokens, layout and print styles
- `script.js` - terminal animation, theme toggle, report filters and mobile nav
- `scripts/serve.mjs` - dependency-free static server for preview and tests
- `scripts/make-pdf.mjs` - PDF generator
- `tests/cv.spec.ts` - Playwright tests
