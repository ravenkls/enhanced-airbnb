import { readFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version) || process.env.GITHUB_REF_NAME !== `v${version}`) {
  throw new Error('Release tag must exactly match the three-part package.json version.');
}
