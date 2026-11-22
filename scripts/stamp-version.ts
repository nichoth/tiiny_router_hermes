/**
 * Copy the `package.json` version into the plugin tree: the top-level
 * `version:` of `tiiny-router/plugin.yaml` and the `version:` in the
 * front matter of `tiiny-router/SKILL.md`. `package.json` is the only
 * source of the version; npm's `version` script runs this.
 *
 * Paths are found relative to this file, which sits in `scripts/` at
 * the package root.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TREE = path.join(ROOT, 'tiiny-router')

/** A top-level (unindented) `version:` line. */
const VERSION_LINE = /^version:.*$/m

function setVersion (text:string, version:string, file:string):string {
    if (!VERSION_LINE.test(text)) {
        throw new Error(`no top-level version: line in ${file}`)
    }
    return text.replace(VERSION_LINE, `version: ${version}`)
}

function stampYaml (file:string, version:string):void {
    const text = readFileSync(file, 'utf8')
    writeFileSync(file, setVersion(text, version, file))
}

function stampFrontMatter (file:string, version:string):void {
    const text = readFileSync(file, 'utf8')
    const m = text.match(/^---\n[\s\S]*?\n---\n/)
    if (!m) throw new Error(`no front matter in ${file}`)
    const head = setVersion(m[0], version, file)
    writeFileSync(file, head + text.slice(m[0].length))
}

const pkg = JSON.parse(
    readFileSync(path.join(ROOT, 'package.json'), 'utf8')
) as { version?:string }
if (!pkg.version) throw new Error('package.json has no version')

stampYaml(path.join(TREE, 'plugin.yaml'), pkg.version)
stampFrontMatter(path.join(TREE, 'SKILL.md'), pkg.version)
console.log(`Stamped version ${pkg.version} into plugin.yaml and SKILL.md`)
