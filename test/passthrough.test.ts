import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { makeEnv, type Env } from './harness.ts'

/**
 * Replace an installed script with a stand-in that records the arguments
 * it was given and exits with `exitCode`. Returns a function that reads
 * the recorded arguments.
 */
function stubInstalledScript (
    env:Env,
    script:string,
    exitCode = 0
):() => string[] {
    const dir = path.join(env.hermesHome, 'plugins', 'tiiny-router')
    const log = path.join(env.root, `${script}.argv.json`)
    writeFileSync(path.join(dir, 'scripts', script), [
        'import json, sys',
        `with open(${JSON.stringify(log)}, "w") as f:`,
        '    json.dump(sys.argv[1:], f)',
        `sys.exit(${exitCode})`,
        '',
    ].join('\n'))
    return () => JSON.parse(readFileSync(log, 'utf8')) as string[]
}

const TRICKY_ARGS = [
    'status', '--json', 'two words', '', '--help', '-h', '$HOME', '*',
]

test('ctl passes its arguments to the installed controller', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    const argv = stubInstalledScript(env, 'tiiny_ctl.py')
    const r = env.run(['ctl', ...TRICKY_ARGS])
    assert.equal(r.status, 0, r.stderr)
    assert.deepEqual(argv(), TRICKY_ARGS)
})

test('route-check passes its arguments to the installed checker', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    const argv = stubInstalledScript(env, 'route_check.py')
    const r = env.run(['route-check', ...TRICKY_ARGS])
    assert.equal(r.status, 0, r.stderr)
    assert.deepEqual(argv(), TRICKY_ARGS)
})

for (const [command, script] of [
    ['ctl', 'tiiny_ctl.py'],
    ['route-check', 'route_check.py'],
]) {
    test(`${command} exits with the script's exit code`, t => {
        const env = makeEnv()
        t.after(() => env.cleanup())
        assert.equal(env.run(['install']).status, 0)
        for (const code of [0, 3, 42]) {
            stubInstalledScript(env, script, code)
            assert.equal(env.run([command]).status, code)
        }
    })
}

for (const command of ['ctl', 'route-check']) {
    test(`${command} exits non-zero without an install`, t => {
        const env = makeEnv()
        t.after(() => env.cleanup())
        const r = env.run([command, 'status'])
        assert.ok(r.status !== null && r.status !== 0, `status ${r.status}`)
    })
}
