// Launch readiness report: lists business facts and placeholder content that
// must be confirmed by the studio before the public site goes live
// (docs/LAUNCH-PLAN.md §6). Informational by default; `--strict` exits 1 while
// anything is outstanding, for use as a release gate.
//
//   npm run launch:check            # report
//   npm run launch:check -- --strict
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { missingBusinessFacts } from '../shared/business.js';
import { services } from '../shared/catalog.js';

const strict = process.argv.includes('--strict');
const file = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const issues = missingBusinessFacts().map(({ decision, label, path }) => ({
  decision,
  message: `${label} (shared/business.js → ${path})`,
}));

const home = await readFile(file('src/pages/Home.jsx'), 'utf8');
if (home.includes('amanpreet-placeholder'))
  issues.push({
    decision: 'D13',
    message: 'Tarot portrait is still the placeholder illustration',
  });
for (const reading of services)
  if (reading.price === null)
    issues.push({
      decision: 'D3',
      message: `“${reading.title}” has no confirmed price (shows “Ask for price”)`,
    });
issues.push({
  decision: 'D3',
  message:
    'Confirm the provisional astrology prices and inclusions in the studio editor',
});
try {
  await access(file('public/og-image.jpg'));
} catch {
  issues.push({ decision: '—', message: 'public/og-image.jpg is missing' });
}

const byDecision = Map.groupBy
  ? Map.groupBy(issues, (issue) => issue.decision)
  : issues.reduce(
      (map, issue) =>
        map.set(issue.decision, [...(map.get(issue.decision) ?? []), issue]),
      new Map(),
    );
console.log(
  issues.length
    ? `Launch check: ${issues.length} item(s) need the studio's confirmation.\n`
    : 'Launch check: all business facts confirmed.',
);
const order = (id) => Number(id.slice(1)) || 0;
for (const [decision, list] of [...byDecision].sort(
  ([a], [b]) => order(a) - order(b),
))
  for (const { message } of list) console.log(`  [${decision}] ${message}`);
if (issues.length && strict) process.exitCode = 1;
