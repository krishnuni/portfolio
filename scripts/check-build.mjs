import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve('dist');
const raw = (process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '');
const prefix = raw ? '/' + raw + '/' : '/';
const files = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk(root);
const issues = [];
let links = 0;
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  if (!html.includes('<main id="main">')) issues.push(`${file}: missing main landmark`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) issues.push(`${file}: expected one h1`);
  for (const match of html.matchAll(/\b(?:href|src|data)="([^"]+)"/g)) {
    let value = match[1].replaceAll('&amp;', '&');
    if (/^(https?:|mailto:|tel:|#|data:)/.test(value)) continue;
    value = value.split(/[?#]/)[0];
    if (!value) continue;
    links++;
    let path;
    if (value.startsWith('/')) {
      if (!value.startsWith(prefix)) {
        issues.push(`${file}: incorrect base in ${value}`);
        continue;
      }
      path = join(root, value.slice(prefix.length));
    } else path = resolve(file, '..', value);
    if (value.endsWith('/')) path = join(path, 'index.html');
    try {
      if (!(await stat(path)).isFile()) throw new Error('not a file');
    } catch {
      issues.push(`${file}: missing ${value}`);
    }
  }
}
const cv = await readFile(join(root, 'documents/Vai_Krishnan_CV.pdf'));
if (cv.subarray(0, 5).toString() !== '%PDF-') issues.push('CV is not a PDF.');
if (issues.length) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Build verified: ${files.filter((f) => f.endsWith('.html')).length} HTML documents, ${links} local references, actual CV PDF.`,
  );
