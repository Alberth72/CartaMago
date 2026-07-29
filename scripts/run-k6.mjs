import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const mode = process.argv[2] === 'cloud' ? 'cloud' : 'run'
const passthrough = process.argv.slice(mode === 'cloud' ? 3 : 2)
const fallbackPath = 'C:\\Program Files\\k6\\k6.exe'
const executable = existsSync(fallbackPath) ? fallbackPath : 'k6'
const args = mode === 'cloud'
  ? ['cloud', 'run', 'tests/stress/cartamago-load.js', '-e', 'K6_TARGET_ENV=cloud', ...passthrough]
  : ['run', 'tests/stress/cartamago-load.js', ...passthrough]

const result = spawnSync(executable, args, {
  stdio: 'inherit',
  shell: false,
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
