import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
    cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { makeEnv, REPO } from './harness.ts'

const MANIFEST = '.hermes-tiiny-router-manifest.json'

function packageVersion (root:string = REPO):string {
    const file = path.join(root, 'package.json')
    return JSON.parse(readFileSync(file, 'utf8')).version
}

/** The `version:` value of a YAML document (or front matter block). */
function yamlVersion (text:string):string|undefined {
    const m = text.match(/^version:\s*["']?([^"'\s]+)["']?\s*$/m)
    return m?.[1]
}

/** The `version:` value inside a markdown file's front matter. */
function frontMatterVersion (text:string):string|undefined {
    const m = text.match(/^---\n([\s\S]*?)\n---\n/)
    return m ? yamlVersion(m[1]) : undefined
}

test('installed plugin.yaml and manifest carry the package version', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install'])
    assert.equal(r.status, 0, r.stderr)
    const dir = path.join(env.hermesHome, 'plugins', 'tiiny-router')
    const want = packageVersion()
    const manifest = JSON.parse(
        readFileSync(path.join(dir, MANIFEST), 'utf8')
    )
    assert.equal(manifest.version, want)
    assert.equal(
        yamlVersion(readFileSync(path.join(dir, 'plugin.yaml'), 'utf8')),
        want
    )
})

test('installed SKILL.md front matter carries the package version', t => {
    const env = makeEnv()
    t.after(() => env.cleanup())
    const r = env.run(['install'])
    assert.equal(r.status, 0, r.stderr)
    const dir = path.join(env.hermesHome, 'plugins', 'tiiny-router')
    assert.equal(
        frontMatterVersion(readFileSync(path.join(dir, 'SKILL.md'), 'utf8')),
        packageVersion()
    )
})

test('the stamp script copies a new package version into the plugin', t => {
    const root = mkdtempSync(path.join(tmpdir(), 'htr-stamp-'))
    t.after(() => rmSync(root, { recursive: true, force: true }))
    for (const rel of [
        'package.json',
        'scripts/stamp-version.ts',
        'tiiny-router/plugin.yaml',
        'tiiny-router/SKILL.md',
    ]) {
        mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
        cpSync(path.join(REPO, rel), path.join(root, rel))
    }
    const pkgFile = path.join(root, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
    pkg.version = '7.3.1-rc.2'
    writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n')

    const skillBefore = readFileSync(
        path.join(root, 'tiiny-router', 'SKILL.md'), 'utf8')
    const r = spawnSync(
        process.execPath,
        [path.join(root, 'scripts', 'stamp-version.ts')],
        { encoding: 'utf8', cwd: tmpdir() }
    )
    assert.equal(r.status, 0, r.stderr)

    const plugin = readFileSync(
        path.join(root, 'tiiny-router', 'plugin.yaml'), 'utf8')
    const skill = readFileSync(
        path.join(root, 'tiiny-router', 'SKILL.md'), 'utf8')
    assert.equal(yamlVersion(plugin), '7.3.1-rc.2')
    assert.equal(frontMatterVersion(skill), '7.3.1-rc.2')
    assert.equal(
        skill.replace(/^version:.*$/m, ''),
        skillBefore.replace(/^version:.*$/m, ''),
        'only the version line changes'
    )
})
