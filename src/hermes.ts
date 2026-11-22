/**
 * Run the `hermes` command found on PATH. Its output goes straight to the
 * user's terminal.
 */
import { spawnSync } from 'node:child_process'

/** Run `hermes ...args` and return its exit code. */
export function runHermes (args:string[]):number {
    const r = spawnSync('hermes', args, { stdio: 'inherit' })
    if (r.error) {
        const code = (r.error as NodeJS.ErrnoException).code
        if (code === 'ENOENT') {
            throw new Error('`hermes` was not found on PATH')
        }
        throw r.error
    }
    return r.status ?? 1
}

/**
 * Run `hermes ...args` and capture its standard output. Errors still go
 * to the user's terminal.
 */
export function hermesOutput (args:string[]):{ status:number, stdout:string } {
    const r = spawnSync('hermes', args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
    })
    if (r.error) {
        const code = (r.error as NodeJS.ErrnoException).code
        if (code === 'ENOENT') {
            throw new Error('`hermes` was not found on PATH')
        }
        throw r.error
    }
    return { status: r.status ?? 1, stdout: r.stdout }
}
