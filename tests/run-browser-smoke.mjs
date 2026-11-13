import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const artifacts = resolve(root, process.env.BROWSER_EVIDENCE_DIR || 'docs/evidence/huu-fe-phase1/final/browser')
mkdirSync(artifacts, { recursive: true })
const resultFile = resolve(artifacts, 'result.json')
writeFileSync(resultFile, JSON.stringify({ status: 'RUNNING', startedAt: new Date().toISOString() }, null, 2))
const cache = resolve(homedir(), '.cache/ms-playwright')
const cached = existsSync(cache) ? readdirSync(cache).filter((name) => name.startsWith('chromium-')).flatMap((name) =>
  ['chrome-linux64/chrome', 'chrome-linux/chrome'].map((binary) => resolve(cache, name, binary))) : []
const executable = process.env.BROWSER_PATH || [
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ...cached
].find(existsSync)
if (!executable || !existsSync(executable)) throw new Error('Set BROWSER_PATH to an installed Chrome/Chromium executable')
const env = { ...process.env, VITE_API_BASE_URL: '/api', VITE_USE_MOCK: 'false', BROWSER_PATH: executable }
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const build = spawnSync(npm, ['run', 'build'], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' })
if (build.error) throw build.error
if (build.status !== 0) {
  writeFileSync(resultFile, JSON.stringify({ status: 'BLOCKED_BUILD', exitCode: build.status, testedAt: new Date().toISOString() }, null, 2))
  process.exit(build.status ?? 1)
}
const result = spawnSync(process.execPath, ['tests/browser-smoke.mjs'], { cwd: root, env, stdio: 'inherit' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
