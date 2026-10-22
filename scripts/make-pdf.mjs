// Builds JacobWood-CV.pdf from the page's print stylesheet so the PDF never drifts from the site
import { chromium } from '@playwright/test';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(root + 'index.html').href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: root + 'JacobWood-CV.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('Wrote JacobWood-CV.pdf');
