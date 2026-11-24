import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist');
const read = (file) => fs.readFile(path.join(root, file), 'utf8');
const json = async (file) => JSON.parse(await read(file));
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );
const asScriptData = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const options = (areas) =>
  areas.map(({ id, name }) => `<option value="${escape(id)}">${escape(name)}</option>`).join('\n');
const sortAreas = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
const link = (label, url) => `<a class="textlink" href="${escape(url)}">${escape(label)}</a>`;

const [settings, { directories }, staffGuide, crisis, guidance, template] = await Promise.all([
  json('config/site.json'),
  json('config/call-areas.json'),
  json('config/staff-guide.json'),
  json('config/crisis-pathways.json'),
  json('config/workbook-guidance.json'),
  read('site/template.html'),
]);
let commit = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;
if (!commit) {
  try {
    commit = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    commit = 'local';
  }
}
const release = 'discharge-project@' + commit;
const navigatorOrigin = 'https://navigator.lxportal.space';
const directoryFiles = Object.fromEntries(
  directories.map(({ id, name }) => [
    id,
    {
      name,
      url: `${navigatorOrigin}/assets/Local_support_${id.replaceAll('-', '_')}.pdf`,
    },
  ]),
);
const crisisAreas = Object.entries(crisis.areas).map(([id, info]) => ({ id, ...info }));
function boroughPanel({ id, name, routes, notice }) {
  const services = routes
    .map(
      (route) => `<details class="disclosure">
    <summary>${escape(route.name)}</summary>
    <div><p>${escape(route.text)}</p>${link('Check service access details', route.url)}</div>
  </details>`,
    )
    .join('\n');
  return `<section class="borough-panel" id="crisis-${escape(id)}" data-borough="${escape(id)}" hidden>
    <h3>${escape(name)} crisis routes</h3>
    ${services}
    ${notice ? '<p>' + link(notice.text, notice.url) + '</p>' : ''}
  </section>`;
}
const values = {
  RELEASE_ID: encodeURIComponent(commit),
  MONITOR_ORIGIN: escape(new URL(settings.sentry.dsn).origin),
  PROJECT_DATA: asScriptData({ ...staffGuide, directories: directoryFiles }),
  CRISIS_DATA: asScriptData(crisis),
  DIRECTORY_AREAS: options(sortAreas(directories)),
  DIRECTORY_LINKS: Object.values(directoryFiles)
    .map((d) => `<li>${link(d.name + ' directory (PDF)', d.url)}</li>`)
    .join('\n'),
  STAFF_AREAS: options(directories.filter((d) => d.id !== 'wider-support')),
  CRISIS_AREAS: options(sortAreas(crisisAreas)),
  BOROUGH_PANELS: crisisAreas.map(boroughPanel).join('\n'),
  EMERGENCY_ADVICE: escape(crisis.emergency),
  URGENT_ADVICE: escape(crisis.urgent),
  SAFETY_NOTES: [crisis.ageNote, guidance.community, crisis.staff]
    .map((line) => '<p>' + escape(line) + '</p>')
    .join('\n'),
  CHECKED_DATE: new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(crisis.checkedOn + 'T00:00:00Z'),
  ),
};
const rendered = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
  if (!Object.hasOwn(values, key)) throw new Error('Unknown site template field ' + key);
  return values[key];
});
await fs.rm(out, { recursive: true, force: true });
await fs.cp(path.join(root, 'public'), out, { recursive: true });
await fs.copyFile(path.join(root, 'site/crisis-pathways.js'), path.join(out, 'assets/crisis-pathways.js'));
await build({
  entryPoints: [path.join(root, 'site/monitoring.js')],
  outfile: path.join(out, 'assets/monitoring.js'),
  bundle: true,
  minify: false,
  format: 'iife',
  target: 'es2022',
  sourcemap: false,
  legalComments: 'inline',
  define: { __DTP_MONITORING_CONFIG__: JSON.stringify({ ...settings.sentry, release }) },
});
await fs.writeFile(path.join(out, 'index.html'), rendered);
await fs.writeFile(
  path.join(out, '_routes.json'),
  JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }),
);
await fs.writeFile(path.join(out, 'build-info.json'), JSON.stringify({ release, commit, navigatorOrigin }));
console.log(JSON.stringify({ release, navigatorOrigin, output: 'dist' }));
