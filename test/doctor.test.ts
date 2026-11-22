import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    appendFileSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { makeEnv } from './harness.ts'

const SELECTED = {
    'delegation.backend': 'tiiny-router',
    'plugins.enabled': 'tiiny-router',
}

/**
 * A fresh install. The harness points every run at a device address
 * nothing answers on, so the device check can only warn.
 */
function installed (t:{ after(fn:() => void):void }) {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install', '--no-configure'])
    assert.equal(r.status, 0, r.stderr)
    const dir = path.join(env.hermesHome, 'plugins', 'tiiny-router')
    return { env, dir }
}

test('doctor exits zero on a healthy install without a device', t => {
    const { env } = installed(t)
    const r = env.run(['doctor'], { hermesConfig: SELECTED })
    assert.equal(r.status, 0, r.stdout + r.stderr)
})

test('doctor exits non-zero when an installed file is deleted', t => {
    const { env, dir } = installed(t)
    rmSync(path.join(dir, 'tiers.py'))
    const r = env.run(['doctor'], { hermesConfig: SELECTED })
    assert.notEqual(r.status, 0, r.stdout)
})

test('doctor exits non-zero when the installed version differs', t => {
    const { env, dir } = installed(t)
    const file = path.join(dir, '.hermes-tiiny-router-manifest.json')
    const manifest = JSON.parse(readFileSync(file, 'utf8'))
    manifest.version = '0.0.1'
    writeFileSync(file, JSON.stringify(manifest))
    const r = env.run(['doctor'], { hermesConfig: SELECTED })
    assert.notEqual(r.status, 0, r.stdout)
})

test('doctor exits non-zero when an installed file is edited', t => {
    const { env, dir } = installed(t)
    appendFileSync(path.join(dir, 'tiers.py'), '\n# local edit\n')
    const r = env.run(['doctor'], { hermesConfig: SELECTED })
    assert.notEqual(r.status, 0, r.stdout)
})

for (const [label, config] of [
    ['set to another backend', { 'delegation.backend': 'default' }],
    ['not set', {}],
] as const) {
    test(`doctor exits non-zero when delegation.backend is ${label}`, t => {
        const { env } = installed(t)
        const r = env.run(['doctor'], { hermesConfig: config })
        assert.notEqual(r.status, 0, r.stdout)
        assert.ok(
            env.hermesCalls().some(argv =>
                argv.join(' ') === 'config get delegation.backend'),
            'reads the setting through `hermes config get`'
        )
    })
}

test('doctor exits non-zero when plugins.enabled does not list tiiny-router', t => {
    const { env } = installed(t)
    const r = env.run(['doctor'], {
        hermesConfig: {
            'delegation.backend': 'tiiny-router',
            'plugins.enabled': 'other-plugin',
        },
    })
    assert.notEqual(r.status, 0, r.stdout)
    assert.ok(
        env.hermesCalls().some(argv =>
            argv.join(' ') === 'config get plugins.enabled'),
        'reads plugins.enabled through `hermes config get`'
    )
})

test('doctor exits non-zero when plugins.disabled also lists tiiny-router', t => {
    const { env } = installed(t)
    const r = env.run(['doctor'], {
        hermesConfig: {
            'delegation.backend': 'tiiny-router',
            'plugins.enabled': 'tiiny-router',
            'plugins.disabled': 'tiiny-router',
        },
    })
    assert.notEqual(r.status, 0, r.stdout)
    assert.ok(
        env.hermesCalls().some(argv =>
            argv.join(' ') === 'config get plugins.disabled'),
        'reads plugins.disabled through `hermes config get`'
    )
})

test('doctor exits non-zero when plugins.enabled is not set', t => {
    const { env } = installed(t)
    const r = env.run(['doctor'], {
        hermesConfig: { 'delegation.backend': 'tiiny-router' },
    })
    assert.notEqual(r.status, 0, r.stdout)
})

test('doctor exits zero when tiiny-router is among several enabled plugins', t => {
    const { env } = installed(t)
    const r = env.run(['doctor'], {
        hermesConfig: {
            'delegation.backend': 'tiiny-router',
            'plugins.enabled': 'other-plugin,tiiny-router,another',
        },
    })
    assert.equal(r.status, 0, r.stdout + r.stderr)
})

test('doctor exits non-zero when hermes plugins validate fails', t => {
    const { env, dir } = installed(t)
    const r = env.run(['doctor'], {
        hermesConfig: SELECTED,
        hermesFailsOn: ['plugins', 'validate'],
    })
    assert.notEqual(r.status, 0, r.stdout)
    assert.ok(
        env.hermesCalls().some(argv =>
            argv.join(' ') === `plugins validate ${dir}`),
        'validates the installed directory'
    )
})
