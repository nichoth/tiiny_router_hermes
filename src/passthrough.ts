/**
 * `ctl` and `route-check`: run a script from the installed plugin with the
 * system `python3`, passing arguments through and returning its exit code.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pluginDir } from './package.js'

export const SCRIPTS = {
    ctl: 'tiiny_ctl.py',
    'route-check': 'route_check.py',
} as const

export function runInstalledScript (script:string, args:string[]):number {
    const file = path.join(pluginDir(), 'scripts', script)
    if (!existsSync(file)) {
        console.error(
            `${file} not found; run \`hermesrouter install\` first`
        )
        return 1
    }
    const r = spawnSync('python3', ['-B', file, ...args], {
        stdio: 'inherit',
    })
    if (r.error) {
        const code = (r.error as NodeJS.ErrnoException).code
        if (code === 'ENOENT') {
            throw new Error('`python3` was not found on PATH')
        }
        throw r.error
    }
    // Killed by a signal: there is no exit code to pass through.
    if (r.status === null) return 1
    return r.status
}
