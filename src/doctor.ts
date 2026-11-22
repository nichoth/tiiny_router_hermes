// pattern: Imperative Shell
/**
 * `doctor`: check that the install is complete and healthy, one line per
 * check. Any failed check makes the exit code non-zero; an unreachable
 * device is only a warning.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import {
    compareManifest, listTree, readManifest,
} from './manifest.js'
import { hermesOutput } from './hermes.js'
import {
    PLUGIN_NAME, SOURCE_TREE, packageVersion, pluginDir,
} from './package.js'

type Outcome = 'pass'|'warn'|'fail'

interface Result {
    outcome:Outcome;
    detail:string;
}

interface Check {
    name:string;
    run():Result;
}

const pass = (detail:string):Result => ({ outcome: 'pass', detail })
const warn = (detail:string):Result => ({ outcome: 'warn', detail })
const fail = (detail:string):Result => ({ outcome: 'fail', detail })

/**
 * Ask the installed controller whether the device answers. Exit 0: it
 * answered; 3: no device key; anything else: it could not be reached.
 */
const DEVICE_PROBE = `
import sys
sys.path.insert(0, sys.argv[1])
import tiiny_ctl as c
key = c.device_key()
if not key:
    print("no device key found")
    sys.exit(3)
try:
    c._request(c.inference_base() + "/models", key, timeout=5)
except SystemExit as exc:
    print(exc)
    sys.exit(1)
print(c.inference_base())
`

function python3Version ():string|null {
    const r = spawnSync('python3', ['--version'], { encoding: 'utf8' })
    if (r.error || r.status !== 0) return null
    return (r.stdout || r.stderr).trim()
}

/** Read a plugin list using Hermes's machine-readable output. */
function pluginList (key:string):Array<string> {
    const r = hermesOutput(['config', 'get', key, '--json'])
    if (r.status !== 0) {
        throw new Error(`could not read ${key} (exit ${r.status})`)
    }
    let value:unknown
    try {
        value = JSON.parse(r.stdout)
    } catch {
        throw new Error(`invalid JSON from hermes config get ${key}`)
    }
    if (!Array.isArray(value) ||
        !value.every((name:unknown):name is string =>
            typeof name === 'string')) {
        throw new Error(`${key} must be a JSON array of plugin names`)
    }
    return value
}

function checks (dir:string):Check[] {
    const manifest = existsSync(dir) ? readManifest(dir) : null
    return [
        {
            name: 'installed directory',
            run: () => {
                if (!existsSync(dir)) {
                    return fail(`${dir} does not exist; run install`)
                }
                if (!manifest) {
                    return fail(
                        `${dir} has no install manifest from this package`
                    )
                }
                const missing = new Set(compareManifest(dir, manifest).missing)
                for (const rel of listTree(SOURCE_TREE)) {
                    if (!existsSync(path.join(dir, rel))) missing.add(rel)
                }
                if (missing.size) {
                    return fail(`missing ${[...missing].sort().join(', ')}`)
                }
                return pass(dir)
            },
        },
        {
            name: 'version',
            run: () => {
                if (!manifest) return fail('no install manifest to read')
                const want = packageVersion()
                if (manifest.version !== want) {
                    return fail(
                        `installed ${manifest.version}, package is ${want}; ` +
                        'run install to upgrade'
                    )
                }
                return pass(want)
            },
        },
        {
            name: 'local edits',
            run: () => {
                if (!manifest) return fail('no install manifest to compare')
                const { edited } = compareManifest(dir, manifest)
                if (edited.length) {
                    return fail(
                        `differ from the install: ${edited.join(', ')}`
                    )
                }
                return pass('every file matches the install manifest')
            },
        },
        {
            name: 'hermes plugins validate',
            run: () => {
                if (!existsSync(dir)) return fail('nothing to validate')
                const { status } = hermesOutput(['plugins', 'validate', dir])
                return status === 0 ?
                    pass('accepted') :
                    fail(`rejected the plugin (exit ${status})`)
            },
        },
        {
            name: 'delegation.backend',
            run: () => {
                const r = hermesOutput(['config', 'get', 'delegation.backend'])
                const value = r.stdout.trim().replace(/^(['"])(.*)\1$/, '$2')
                if (r.status === 0 && value === PLUGIN_NAME) {
                    return pass(PLUGIN_NAME)
                }
                return fail(
                    `is ${value ? `"${value}"` : 'not set'}; select it with ` +
                    `hermes config set delegation.backend ${PLUGIN_NAME}`
                )
            },
        },
        {
            name: 'plugin enabled',
            run: () => {
                const list = pluginList('plugins.enabled')
                if (!list.includes(PLUGIN_NAME)) {
                    return fail(
                        'not in plugins.enabled; run ' +
                        `hermes plugins enable ${PLUGIN_NAME}`
                    )
                }
                const dList = pluginList('plugins.disabled')
                if (dList.includes(PLUGIN_NAME)) {
                    return fail(
                        'listed in plugins.disabled; run ' +
                        `hermes plugins enable ${PLUGIN_NAME}`
                    )
                }
                return pass('enabled')
            },
        },
        {
            name: 'python3',
            run: () => {
                const version = python3Version()
                return version ? pass(version) : fail('not found on PATH')
            },
        },
        {
            name: 'device',
            run: () => {
                const scripts = path.join(dir, 'scripts')
                if (!existsSync(path.join(scripts, 'tiiny_ctl.py'))) {
                    return warn('controller not installed; not checked')
                }
                const r = spawnSync(
                    'python3',
                    ['-B', '-c', DEVICE_PROBE, scripts],
                    { encoding: 'utf8', timeout: 20_000 }
                )
                const out = (r.stdout ?? '').trim()
                if (r.status === 0) return pass(`answered at ${out}`)
                return warn(`not reachable (${out || 'no answer'})`)
            },
        },
    ]
}

const LABEL:Record<Outcome, string> = {
    pass: 'PASS',
    warn: 'WARN',
    fail: 'FAIL',
}

export function doctor ():number {
    let failed = 0
    for (const check of checks(pluginDir())) {
        let result:Result
        try {
            result = check.run()
        } catch (err) {
            result = fail((err as Error).message)
        }
        if (result.outcome === 'fail') failed++
        console.log(
            `${LABEL[result.outcome]}  ${check.name}: ${result.detail}`
        )
    }
    if (failed) console.log(`\n${failed} check(s) failed`)
    return failed ? 1 : 0
}
