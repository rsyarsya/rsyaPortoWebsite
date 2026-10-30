import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// Runs only on the developer's machine; credentials are handled by GitHub CLI.
// The browser and production build use the committed, credential-free snapshot.
const username = 'rsyarsya';
const through = process.argv[2] ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(through) || new Date(`${through}T00:00:00Z`).toISOString().slice(0, 10) !== through) {
  throw new Error('Expected a valid end date: YYYY-MM-DD');
}
const end = new Date(`${through}T00:00:00Z`);
const start = new Date(end);
start.setUTCFullYear(start.getUTCFullYear() - 1);
start.setUTCDate(start.getUTCDate() + 1);
const from = start.toISOString().slice(0, 10);
const query = `query($user: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $user) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;
const response = JSON.parse(execFileSync('gh', [
  'api', 'graphql', '-f', `query=${query}`, '-f', `user=${username}`,
  '-f', `from=${from}T00:00:00Z`, '-f', `to=${through}T23:59:59Z`,
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
if (response.errors) throw new Error('GitHub GraphQL returned errors; existing snapshot was not changed.');
const calendar = response.data?.user?.contributionsCollection?.contributionCalendar;
if (!calendar) throw new Error('GitHub returned no contribution calendar.');
const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
const days = calendar.weeks.flatMap(week => week.contributionDays).map(day => ({
  date: day.date, count: day.contributionCount, level: levels.indexOf(day.contributionLevel),
}));
const expectedDays = Math.round((end - start) / 86400000) + 1;
if (days.length !== expectedDays || days.reduce((sum, day) => sum + day.count, 0) !== calendar.totalContributions) {
  throw new Error('Incomplete or inconsistent GitHub calendar; existing snapshot was not changed.');
}
days.forEach((day, i) => {
  const expected = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
  if (day.date !== expected || !Number.isInteger(day.count) || day.count < 0 || day.level < 0) {
    throw new Error('Invalid contribution day; existing snapshot was not changed.');
  }
});
const snapshot = {
  username, from, through,
  fetchedAt: new Date().toISOString(),
  source: `https://github.com/${username}?tab=overview&from=${from}&to=${through}`,
  total: calendar.totalContributions,
  days,
};
writeFileSync(new URL('../src/data/github-contributions.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved ${days.length} days and ${snapshot.total} contributions for ${username} (${from} to ${through}).`);
