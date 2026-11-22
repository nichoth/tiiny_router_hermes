import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    existsSync, mkdirSync, readFileSync, statSync, writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { makeEnv } from './harness.ts'

test('uninstall removes the installed plugin directory', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    const r = env.run(['uninstall'])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(
        existsSync(path.join(env.hermesHome, 'plugins', 'tiiny-router')),
        false
    )
})

test('uninstall leaves the rest of HERMES_HOME unchanged', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    const other = path.join(env.hermesHome, 'plugins', 'other-plugin')
    mkdirSync(other, { recursive: true })
    const files = [
        path.join(env.hermesHome, 'config.yaml'),
        path.join(env.hermesHome, '.env'),
        path.join(other, 'plugin.yaml'),
    ]
    for (const f of files) writeFileSync(f, `contents of ${f}\n`)
    const before = files.map(f =>
        [readFileSync(f, 'utf8'), statSync(f).mtimeMs])

    assert.equal(env.run(['uninstall']).status, 0)

    files.forEach((f, i) => {
        assert.deepEqual(
            [readFileSync(f, 'utf8'), statSync(f).mtimeMs],
            before[i],
            `changed: ${f}`
        )
    })
    assert.ok(existsSync(path.join(env.hermesHome, 'plugins')))
})

test('uninstall refuses a directory with no manifest', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const dir = path.join(env.hermesHome, 'plugins', 'tiiny-router')
    mkdirSync(dir, { recursive: true })
    const file = path.join(dir, '__init__.py')
    writeFileSync(file, '# hand-installed copy\n')

    const r = env.run(['uninstall'])
    assert.notEqual(r.status, 0)
    assert.equal(readFileSync(file, 'utf8'), '# hand-installed copy\n')
})

test('uninstall refuses a manifest written by another package', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const dir = path.join(env.hermesHome, 'plugins', 'tiiny-router')
    mkdirSync(dir, { recursive: true })
    writeFileSync(
        path.join(dir, '.hermes-tiiny-router-manifest.json'),
        JSON.stringify({ package: 'someone-else', version: '1', files: {} })
    )
    assert.notEqual(env.run(['uninstall']).status, 0)
    assert.ok(existsSync(dir))
})

test('uninstall with nothing installed exits zero', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['uninstall']).status, 0)
})

test('uninstall makes no hermes config or plugins call', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    const callsBefore = env.hermesCalls().length
    assert.equal(env.run(['uninstall']).status, 0)
    const afterCalls = env.hermesCalls().slice(callsBefore)
    const configCalls = afterCalls.filter(argv => argv[0] === 'config')
    assert.deepEqual(configCalls, [], 'no hermes config calls')
    const pluginsCalls = afterCalls.filter(
        argv => argv[0] === 'plugins'
    )
    assert.deepEqual(pluginsCalls, [], 'no hermes plugins calls')
})
