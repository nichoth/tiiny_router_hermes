import { test } from 'node:test'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import {
    existsSync, mkdirSync, readFileSync, realpathSync, statSync,
    writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { makeEnv, listFiles, SOURCE_TREE } from './harness.ts'

const MANIFEST_FILE = '.hermes-tiiny-router-manifest.json'

function assertCompleteCopy (pluginDir:string) {
    const installed = new Set(listFiles(pluginDir))
    for (const rel of listFiles(SOURCE_TREE)) {
        assert.ok(installed.has(rel), `missing ${rel}`)
        assert.deepEqual(
            readFileSync(path.join(pluginDir, rel)),
            readFileSync(path.join(SOURCE_TREE, rel)),
            `content differs: ${rel}`
        )
    }
}

test('install into an empty HERMES_HOME creates the plugin directory', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install'])
    assert.equal(r.status, 0, r.stderr)
    assertCompleteCopy(path.join(env.hermesHome, 'plugins', 'tiiny-router'))
})

test('install respects a non-default HERMES_HOME', t => {
    const env = makeEnv({ hermesHome: 'custom-hermes' })
    t.after(() => env.cleanup())
    const r = env.run(['install'])
    assert.equal(r.status, 0, r.stderr)
    assertCompleteCopy(path.join(env.hermesHome, 'plugins', 'tiiny-router'))
    assert.equal(
        existsSync(path.join(env.home, '.hermes')),
        false,
        'nothing is written to the default HERMES_HOME'
    )
})

test('install validates the installed directory with hermes', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install'])
    assert.equal(r.status, 0, r.stderr)
    const dir = path.join(env.hermesHome, 'plugins', 'tiiny-router')
    const validates = env.hermesCalls().filter(argv =>
        argv[0] === 'plugins' && argv[1] === 'validate')
    assert.equal(validates.length, 1)
    assert.equal(
        realpathSync(validates[0].at(-1)!),
        realpathSync(dir)
    )
})

test('install exits non-zero when hermes rejects the plugin', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install'], { hermesFails: true })
    assert.notEqual(r.status, 0)
})

test('installing twice with no edits in between succeeds', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    const r = env.run(['install'])
    assert.equal(r.status, 0, r.stderr)
    assertCompleteCopy(path.join(env.hermesHome, 'plugins', 'tiiny-router'))
})

test('install never modifies config.yaml or the secrets file', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    mkdirSync(env.hermesHome, { recursive: true })
    const config = path.join(env.hermesHome, 'config.yaml')
    const secrets = path.join(env.hermesHome, '.env')
    writeFileSync(config, 'delegation:\n  backend: default\n')
    writeFileSync(secrets, 'TIINY_API_KEY=not-a-real-key\n')
    const before = [statSync(config).mtimeMs, statSync(secrets).mtimeMs]

    assert.equal(env.run(['install']).status, 0)
    assert.equal(env.run(['install']).status, 0)

    assert.equal(
        readFileSync(config, 'utf8'),
        'delegation:\n  backend: default\n'
    )
    assert.equal(
        readFileSync(secrets, 'utf8'),
        'TIINY_API_KEY=not-a-real-key\n'
    )
    assert.deepEqual(
        [statSync(config).mtimeMs, statSync(secrets).mtimeMs],
        before
    )
})

function pluginDirOf (env:{ hermesHome:string }):string {
    return path.join(env.hermesHome, 'plugins', 'tiiny-router')
}

test('install stops when an installed file was edited', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    const edited = path.join(pluginDirOf(env), 'tiers.py')
    writeFileSync(edited, '# my local edit\n')

    const r = env.run(['install'])
    assert.notEqual(r.status, 0)
    assert.equal(readFileSync(edited, 'utf8'), '# my local edit\n')
})

test('install --force replaces an edited file', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    writeFileSync(path.join(pluginDirOf(env), 'tiers.py'), '# edit\n')

    const r = env.run(['install', '--force'])
    assert.equal(r.status, 0, r.stderr)
    assertCompleteCopy(pluginDirOf(env))
    // The new manifest matches, so a plain re-install succeeds again.
    assert.equal(env.run(['install']).status, 0)
})

function makeForeignDir (env:{ hermesHome:string }):string {
    const dir = pluginDirOf(env)
    mkdirSync(dir, { recursive: true })
    writeFileSync(path.join(dir, '__init__.py'), '# hand-installed\n')
    writeFileSync(path.join(dir, 'extra.txt'), 'mine\n')
    return dir
}

test('install leaves a directory it did not install untouched', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const dir = makeForeignDir(env)

    const r = env.run(['install'])
    assert.notEqual(r.status, 0)
    assert.deepEqual(listFiles(dir), ['__init__.py', 'extra.txt'])
    assert.equal(
        readFileSync(path.join(dir, '__init__.py'), 'utf8'),
        '# hand-installed\n'
    )
    assert.deepEqual(env.hermesCalls(), [])
})

test('install --force installs over a foreign directory', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const dir = makeForeignDir(env)

    const r = env.run(['install', '--force'])
    assert.equal(r.status, 0, r.stderr)
    assertCompleteCopy(dir)
    // Now ours: a plain re-install is no longer refused.
    assert.equal(env.run(['install']).status, 0)
})

/**
 * Make the installed directory look as if an earlier version had shipped
 * `rel`: write the file and record its hash in the manifest.
 */
function addFileFromOlderVersion (dir:string, rel:string):string {
    const file = path.join(dir, rel)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, '#!/bin/sh\necho old\n')
    const manifestFile = path.join(dir, MANIFEST_FILE)
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
    manifest.files[rel] = createHash('sha256')
        .update(readFileSync(file))
        .digest('hex')
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
    return file
}

test('upgrading removes files the new version no longer ships', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    const stale = addFileFromOlderVersion(
        pluginDirOf(env),
        'scripts/dropped-tool.sh'
    )

    const r = env.run(['install'])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(existsSync(stale), false)
    assertCompleteCopy(pluginDirOf(env))
})

test('upgrading keeps files the user added that no install wrote', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    assert.equal(env.run(['install']).status, 0)
    const own = path.join(pluginDirOf(env), 'scripts', 'my-notes.txt')
    writeFileSync(own, 'mine\n')

    const r = env.run(['install'])
    assert.equal(r.status, 0, r.stderr)
    assert.equal(readFileSync(own, 'utf8'), 'mine\n')
})
